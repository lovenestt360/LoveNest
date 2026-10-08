import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getFcmAccessToken, sendFcmMessage, FCM_PROJECT_ID } from "../_shared/fcm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function preferenceCategoryForType(type: string | null | undefined): string | null {
  switch (type) {
    case "chat": return "chat";
    case "humor": return "humor";
    case "tarefas":
    case "agenda":
    case "routine":
    case "plano": return "plano";
    case "memorias": return "memorias";
    case "oracao": return "oracao";
    case "conflitos": return "conflitos";
    case "ciclo_par": return "ciclo_par";
    case "biblioteca": return "biblioteca";
    case "location": return "location";
    case "streak_alert": return "engagement";
    default: return null;
  }
}

// ── Edge Function ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fcmVapidKey    = Deno.env.get("FCM_VAPID_KEY");
  const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
  const fcmPrivateKey  = Deno.env.get("FCM_PRIVATE_KEY");

  const logInternal = async (eventType: string, payload: unknown) => {
    if (supabaseUrl && serviceRoleKey) {
      try {
        const client = createClient(supabaseUrl, serviceRoleKey);
        await client.from("edge_function_logs").insert({
          function_name: "send-push",
          event_type: eventType,
          payload,
        });
      } catch { /* tabela pode não existir */ }
    }
  };

  // GET — devolve a FCM VAPID public key (usada pelo cliente em getToken())
  if (req.method === "GET") {
    return new Response(fcmVapidKey || "", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  try {
    await logInternal("POST_RECEIVED", { url: req.url });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !serviceRoleKey || !fcmClientEmail || !fcmPrivateKey) {
      const missing = {
        url: !!supabaseUrl,
        role: !!serviceRoleKey,
        email: !!fcmClientEmail,
        key: !!fcmPrivateKey,
      };
      await logInternal("CONFIG_MISSING", missing);
      return new Response(JSON.stringify({ error: "Server misconfigured", missing }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { couple_space_id, title, body: notifBody, url, type, is_test, template_key, ping, broadcast } = payload;
    await logInternal("PAYLOAD_DATA", { couple_space_id, is_test, template_key, broadcast });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let finalTitle = title;
    let finalBody  = notifBody;

    if (template_key) {
      const { data: template } = await adminClient
        .from("notification_templates")
        .select("*")
        .eq("key", template_key)
        .eq("is_active", true)
        .maybeSingle();

      if (template) {
        finalTitle = template.title;
        finalBody  = template.body;
      }
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      await logInternal("AUTH_VERIFY_FAILED", { userError });

      if (ping) {
        return new Response(
          JSON.stringify({ status: "Function reachable", auth_error: userError?.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Unauthorized", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderId = user.id;

    // Autorização: broadcast exige admin; envio a um espaço exige que o
    // remetente pertença a esse espaço. Sem isto, qualquer conta autenticada
    // podia pedir um broadcast global ou notificar um espaço alheio.
    if (broadcast) {
      const { data: adminRow } = await adminClient
        .from("admin_users")
        .select("id")
        .eq("user_id", senderId)
        .maybeSingle();

      if (!adminRow) {
        await logInternal("BROADCAST_DENIED", { senderId });
        return new Response(JSON.stringify({ error: "Apenas administradores podem enviar notificações globais" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: membership } = await adminClient
        .from("members")
        .select("id")
        .eq("user_id", senderId)
        .eq("couple_space_id", couple_space_id)
        .maybeSingle();

      if (!membership) {
        await logInternal("MEMBERSHIP_DENIED", { senderId, couple_space_id });
        return new Response(JSON.stringify({ error: "Não pertences a este espaço" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let query = adminClient
      .from("push_subscriptions")
      .select("id, fcm_token, user_id")
      .not("fcm_token", "is", null);

    if (broadcast) {
      // sem filtro — envia a todos (já validado que o remetente é admin acima)
    } else {
      query = query.eq("couple_space_id", couple_space_id);
      if (is_test) {
        query = query.eq("user_id", senderId);
      } else {
        query = query.neq("user_id", senderId);
      }
    }

    const { data: rawSubs, error: subsError } = await query;
    if (subsError) throw subsError;

    let subs = rawSubs ?? [];
    const preferenceCategory = preferenceCategoryForType(type);

    // Immediate push preferences are server-authoritative. The client cache
    // only controls in-app feedback; disabling a category here must stop the
    // actual FCM delivery on every device.
    if (!is_test && preferenceCategory && subs.length > 0) {
      const recipientIds = [...new Set(subs.map((sub) => sub.user_id))];
      const { data: settings, error: settingsError } = await adminClient
        .from("notification_settings")
        .select("user_id, enabled")
        .eq("category", preferenceCategory)
        .in("user_id", recipientIds);

      if (settingsError) throw settingsError;

      const disabledUsers = new Set(
        (settings ?? [])
          .filter((row) => row.enabled === false)
          .map((row) => row.user_id)
      );

      subs = subs.filter((sub) => !disabledUsers.has(sub.user_id));

      await logInternal("PREFERENCE_FILTER", {
        category: preferenceCategory,
        before: rawSubs?.length ?? 0,
        after: subs.length,
      });
    }

    await logInternal("SUBS_FOUND", { count: subs.length });

    if (subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No enabled recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obter access token Google uma única vez para todo o batch
    const accessToken = await getFcmAccessToken(fcmClientEmail, fcmPrivateKey);

    let sentCount = 0;
    const errors: { subscription_id: string; error: string }[] = [];

    for (const sub of subs) {
      const result = await sendFcmMessage(
        accessToken,
        FCM_PROJECT_ID,
        sub.fcm_token!,
        finalTitle || "LoveNest",
        finalBody  || "",
        url || "/chat",
        type ? String(type) : undefined,
      );

      if (result.ok) {
        sentCount++;
      } else {
        errors.push({ subscription_id: sub.id, error: result.error! });
        // Token inválido/expirado → remover do BD
        if (result.error === "UNREGISTERED" || result.error === "INVALID_ARGUMENT") {
          await adminClient.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await logInternal("RESULT", { sentCount, errorCount: errors.length });

    return new Response(JSON.stringify({ sent: sentCount, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Final catch in send-push:", err);
    await logInternal("CRASH", { message: err.message });
    return new Response(
      JSON.stringify({ error: "Edge Function Error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

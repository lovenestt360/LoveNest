import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── FCM HTTP v1 helpers ──────────────────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getFcmAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .trim();

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    )
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, sigInput);
  const jwt = `${header}.${payload}.${toBase64Url(sig)}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token as string;
}

async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  url: string
): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          // notification: Firebase mostra a notificação automaticamente em background
          notification: { title, body },
          data: {
            url: url || "/chat",
          },
          webpush: {
            notification: {
              icon: "https://lovenestt.com/icon-192.png",
              badge: "https://lovenestt.com/icon-192.png",
              tag: "lovenest-notif",
            },
            fcm_options: { link: `https://lovenestt.com${url || "/"}` },
            headers: { TTL: "86400" },
          },
        },
      }),
    }
  );

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    const code = errBody?.error?.details?.[0]?.errorCode ?? errBody?.error?.status ?? resp.status;
    return { ok: false, error: String(code) };
  }

  return { ok: true };
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

    let query = adminClient
      .from("push_subscriptions")
      .select("id, fcm_token, user_id")
      .not("fcm_token", "is", null);

    if (broadcast) {
      // sem filtro — envia a todos
    } else {
      query = query.eq("couple_space_id", couple_space_id);
      if (is_test) {
        query = query.eq("user_id", senderId);
      } else {
        query = query.neq("user_id", senderId);
      }
    }

    const { data: subs, error: subsError } = await query;
    if (subsError) throw subsError;

    await logInternal("SUBS_FOUND", { count: subs?.length ?? 0 });

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obter access token Google uma única vez para todo o batch
    const accessToken = await getFcmAccessToken(fcmClientEmail, fcmPrivateKey);
    const projectId   = "lovenest-d7f81";

    let sentCount = 0;
    const errors: { token: string; error: string }[] = [];

    for (const sub of subs) {
      const result = await sendFcmMessage(
        accessToken,
        projectId,
        sub.fcm_token!,
        finalTitle || "LoveNest",
        finalBody  || "",
        url || "/chat"
      );

      if (result.ok) {
        sentCount++;
      } else {
        errors.push({ token: sub.fcm_token!.slice(0, 20), error: result.error! });
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  // Helper for remote logging
  const logToDB = async (eventType: string, payload: any) => {
    if (supabaseUrl && serviceRoleKey) {
      const client = createClient(supabaseUrl, serviceRoleKey);
      await client.from("edge_function_logs").insert({
        function_name: "send-push",
        event_type: eventType,
        payload: payload
      }).catch(err => console.error("Log to DB failed", err));
    }
  };

  // GET: return VAPID public key
  if (req.method === "GET") {
    return new Response(vapidPublicKey || "", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  try {
    await logToDB("execution_start", { method: req.method });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await logToDB("auth_error", { message: "No auth header" });
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { couple_space_id, title, is_test } = body;
    await logToDB("request_body", body);

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      const missing = { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey, vapidPublicKey: !!vapidPublicKey, vapidPrivateKey: !!vapidPrivateKey };
      await logToDB("config_error", missing);
      throw new Error(`Missing configuration: ${JSON.stringify(missing)}`);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify User
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !user) {
      await logToDB("user_verification_failed", { userError });
      return new Response(JSON.stringify({ error: "Invalid token", details: userError }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logToDB("user_verified", { userId: user.id });

    // Get Subscriptions
    let query = adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("couple_space_id", couple_space_id);
    
    if (is_test) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.neq("user_id", user.id);
    }

    const { data: subs, error: subsError } = await query;
    if (subsError) {
      await logToDB("db_query_error", { subsError });
      throw subsError;
    }

    await logToDB("subscriptions_found", { count: subs?.length || 0 });

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active subscriptions found for target." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stable Import
    await logToDB("importing_webpush", {});
    const webpush = await import("https://esm.sh/web-push@3.6.7");
    webpush.default.setVapidDetails(
      "mailto:app@lovenestt.lovable.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const notificationPayload = JSON.stringify({
      title: title || "LoveNest",
      body: body.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: body.url || "/chat", type: body.type || "chat" },
    });

    let sent = 0;
    const errors = [];

    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        );
        sent++;
      } catch (err: any) {
        errors.push({ endpoint: sub.endpoint, error: err.message });
        if (err.statusCode === 410 || err.statusCode === 404) {
          await adminClient.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await logToDB("execution_complete", { sent, errorCount: errors.length });

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("send-push fatal:", err);
    // Attempt to log final crash if possible
    await logToDB("fatal_error", { message: err.message, stack: err.stack });
    
    return new Response(JSON.stringify({ 
      error: "Edge Function Fatal Crash", 
      message: err.message,
      stack: err.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

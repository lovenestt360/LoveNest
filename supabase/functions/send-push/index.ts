import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * send-push Edge Function
 * Handles both GET (VAPID key) and POST (Send push)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  // Helper for internal logging (graceful if table missing)
  const logInternal = async (eventType: string, payload: any) => {
    if (supabaseUrl && serviceRoleKey) {
      try {
        const client = createClient(supabaseUrl, serviceRoleKey);
        await client.from("edge_function_logs").insert({
          function_name: "send-push",
          event_type: eventType,
          payload: payload
        });
      } catch (e) {
        console.error("Internal log failed (this is usually fine if table not created yet):", e);
      }
    }
  };

  // GET: return VAPID public key
  if (req.method === "GET") {
    return new Response(vapidPublicKey || "", {
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

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      const missing = { 
        url: !!supabaseUrl, 
        role: !!serviceRoleKey, 
        pub: !!vapidPublicKey, 
        priv: !!vapidPrivateKey 
      };
      await logInternal("CONFIG_MISSING", missing);
      return new Response(JSON.stringify({ error: "Server misconfigured", missing }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { couple_space_id, title, body, url, type, is_test } = await req.json();
    await logInternal("PAYLOAD_DATA", { couple_space_id, is_test, has_title: !!title });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get Sender ID from Token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    // If auth fails, we check if it was just a ping
    if (userError || !user) {
      await logInternal("AUTH_VERIFY_FAILED", { userError, token_preview: token.substring(0, 10) });
      
      // If it's a manual ping from debug console, allow it to return config info
      const { ping } = await req.json().catch(() => ({}));
      if (ping) {
        return new Response(JSON.stringify({ 
          status: "Function reachable", 
          auth_error: userError?.message,
          config: { url: !!supabaseUrl, pub: !!vapidPublicKey, priv: !!vapidPrivateKey }
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unauthorized access", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderId = user.id;

    // Fetch Target Subscriptions
    let query = adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("couple_space_id", couple_space_id);
    
    if (is_test) {
      query = query.eq("user_id", senderId);
    } else {
      query = query.neq("user_id", senderId);
    }

    const { data: subs, error: subsError } = await query;
    if (subsError) throw subsError;

    await logInternal("SUBS_FOUND", { count: subs?.length || 0 });

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use npm:web-push for better Deno compatibility
    const webpush = await import("npm:web-push");
    webpush.default.setVapidDetails(
      "mailto:app@lovenestt.lovable.app",
      vapidPublicKey.trim(),
      vapidPrivateKey.trim()
    );

    const notificationPayload = JSON.stringify({
      title: title || "LoveNest",
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/chat", type: type || "chat" },
    });

    let sentCount = 0;
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
        sentCount++;
      } catch (err: any) {
        errors.push({ endpoint: sub.endpoint, error: err.message });
        // Cleanup expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
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
    return new Response(JSON.stringify({ 
      error: "Edge Function Error", 
      message: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // GET: return VAPID public key
  if (req.method === "GET") {
    return new Response(vapidPublicKey || "", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { couple_space_id, title, body, url, type, is_test } = await req.json();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration (URL or Service Role Key)");
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID keys");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get current user ID from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token", details: userError }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderId = user.id;

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

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webpush = await import("npm:web-push");
    webpush.default.setVapidDetails(
      "mailto:app@lovenestt.lovable.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: title || "LoveNest",
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/chat", type: type || "chat" },
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
          payload
        );
        sent++;
      } catch (err: any) {
        errors.push({ endpoint: sub.endpoint, error: err.message });
        if (err.statusCode === 410 || err.statusCode === 404) {
          await adminClient.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ 
      error: "Edge Function Error", 
      message: err.message,
      stack: err.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

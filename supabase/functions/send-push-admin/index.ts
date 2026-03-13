import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    // For admin, we could require a specific admin token or use the service role key.
    // Assuming the frontend will send the admin token or service role key.
    // For simplicity, let's verify if the request has authorization.
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { title, body, url, type } = await req.json();
    if (!title) {
      return new Response(
        JSON.stringify({ error: "Missing title" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use the admin/service role client to fetch ALL subscriptions
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all unique endpoints
    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("*");

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    // Use web-push npm package
    const webpush = await import("https://esm.sh/web-push@3.6.7");
    webpush.setVapidDetails(
      "mailto:app@lovenestt.lovable.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: title || "LoveNest Admin",
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/", type: type || "admin_announcement" },
    });

    let sent = 0;
    // To avoid spamming our own function we will send sequentially,
    // though in production chunking with Promise.all is better.
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // If subscription expired (410), remove it
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await adminClient
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        console.error("Push send error:", err?.message);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push-admin error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

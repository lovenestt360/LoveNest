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

  // GET: return VAPID public key as raw text
  if (req.method === "GET") {
    const key = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
    return new Response(key, {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // POST: send push notification
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const senderId = claimsData.claims.sub;

    const { couple_space_id, title, body, url, type } = await req.json();
    if (!couple_space_id || !title) {
      return new Response(
        JSON.stringify({ error: "Missing couple_space_id or title" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get push subscriptions for the OTHER member
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("couple_space_id", couple_space_id)
      .neq("user_id", senderId);

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
      title: title || "LoveNest",
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/chat", type: type || "chat" },
    });

    let sent = 0;
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
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

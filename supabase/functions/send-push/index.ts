import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  // GET: return VAPID public key
  if (req.method === "GET") {
    return new Response(Deno.env.get("VAPID_PUBLIC_KEY") || "", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  try {
    // 1. Log immediately to see if we reached this code
    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.from("edge_function_logs").insert({
        function_name: "send-push",
        event_type: "BOOT_OK",
        payload: { method: req.method, ua: req.headers.get("user-agent") }
      });
    }

    // 2. Try to parse body
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = { error: "Failed to parse JSON body" };
    }

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.from("edge_function_logs").insert({
        function_name: "send-push",
        event_type: "BODY_RECEIVED",
        payload: body
      });
    }

    return new Response(JSON.stringify({ 
      status: "alive", 
      received: body 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("send-push boot error:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

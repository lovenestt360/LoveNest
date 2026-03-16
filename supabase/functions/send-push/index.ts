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

  if (req.method === "GET") {
    return new Response(Deno.env.get("VAPID_PUBLIC_KEY") || "", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  try {
    const adminClient = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
    
    // Attempt log
    if (adminClient) {
      await adminClient.from("edge_function_logs").insert({
        function_name: "send-push",
        event_type: "ALIVE_CHECK",
        payload: { method: req.method }
      }).catch(e => console.error("Log failed, table probably missing", e));
    }

    const configReport = {
      has_url: !!supabaseUrl,
      has_service_role: !!serviceRoleKey,
      has_vapid_public: !!Deno.env.get("VAPID_PUBLIC_KEY"),
      has_vapid_private: !!Deno.env.get("VAPID_PRIVATE_KEY"),
      env_keys: Object.keys(Deno.env.toObject()).filter(k => k.includes("SUPABASE") || k.includes("VAPID"))
    };

    return new Response(JSON.stringify({ 
      status: "alive", 
      config: configReport 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

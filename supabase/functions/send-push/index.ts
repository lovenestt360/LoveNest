const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Basic GET
  if (req.method === "GET") {
    return new Response("OK", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // Basic POST
  try {
    const body = await req.json().catch(() => ({}));
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Server reached!", 
      method: req.method,
      received: body
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

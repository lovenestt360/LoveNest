import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * admin-claim Edge Function
 *
 * Substitui o INSERT direto do cliente em admin_users (que dependia de uma
 * política pública "WITH CHECK (true)" — qualquer visitante conseguia
 * criar-se a si próprio como admin). Agora a ligação a uma conta admin
 * exige uma sessão real do Supabase Auth (o chamador já fez signUp/signIn)
 * e a chave de setup é validada aqui, do lado do servidor, contra um
 * segredo de Edge Function — nunca contra a variável VITE_* exposta no
 * bundle do cliente.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const setupKey = Deno.env.get("ADMIN_SETUP_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Servidor mal configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sem sessão" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { setup_key, username } = await req.json();

    if (!setupKey) {
      return new Response(JSON.stringify({ error: "Setup desativado no servidor (ADMIN_SETUP_KEY em falta)" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (setup_key !== setupKey) {
      return new Response(JSON.stringify({ error: "Chave incorreta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count } = await admin.from("admin_users").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Já existe um administrador" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await admin.from("admin_users").insert({
      user_id: user.id,
      username: username || user.email || user.id,
    });
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ ok: true }), {
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

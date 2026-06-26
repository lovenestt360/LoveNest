import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYSUITE_BASE_URL = "https://paysuite.tech/api/v1";

/**
 * create-paysuite-payment Edge Function
 *
 * Cria um pagamento na PaySuite (M-Pesa, e-Mola ou cartão) para um plano
 * de subscrição, e devolve o checkout_url para o cliente redirecionar o
 * utilizador. A confirmação real chega depois via webhook (ver função
 * paysuite-webhook), que marca o pagamento como aprovado e activa a
 * subscrição automaticamente — sem precisar de aprovação manual de admin.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paysuiteApiKey = Deno.env.get("PAYSUITE_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Servidor mal configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sem cabeçalho de autorização" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { couple_space_id, plan_id, method } = await req.json();

    if (!couple_space_id || !plan_id || !["mpesa", "emola", "credit_card"].includes(method)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirma que o utilizador pertence mesmo a este couple_space
    const { data: member } = await adminClient
      .from("members")
      .select("couple_space_id")
      .eq("user_id", user.id)
      .eq("couple_space_id", couple_space_id)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Não pertences a este espaço" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan, error: planError } = await adminClient
      .from("subscription_plans")
      .select("id, name, price_mzn")
      .eq("id", plan_id)
      .maybeSingle();

    if (planError || !plan || !plan.price_mzn) {
      return new Response(JSON.stringify({ error: "Plano sem preço automático configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paysuiteApiKey) {
      return new Response(JSON.stringify({ error: "Pagamento automático ainda não está disponível. Usa o método manual por enquanto." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regista o pagamento como pendente antes de chamar a PaySuite — o
    // id desta linha é usado como "reference" para o webhook encontrar
    // depois a linha certa.
    const { data: payment, error: insertError } = await adminClient
      .from("payments")
      .insert({
        couple_space_id,
        plan_name: plan.name,
        amount: String(plan.price_mzn),
        method,
        status: "pending",
        provider: "paysuite",
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      throw insertError ?? new Error("Falha ao registar pagamento");
    }

    const origin = req.headers.get("origin") ?? "https://lovenest-theta.vercel.app";

    const paysuiteRes = await fetch(`${PAYSUITE_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paysuiteApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.price_mzn,
        reference: payment.id,
        method,
        description: `LoveNest — ${plan.name}`,
        return_url: `${origin}/subscricao?status=pending`,
        callback_url: `${supabaseUrl}/functions/v1/paysuite-webhook`,
      }),
    });

    const paysuiteData = await paysuiteRes.json();

    if (!paysuiteRes.ok || !paysuiteData?.checkout_url) {
      // Não deixa a linha pendente órfã sem explicação
      await adminClient.from("payments").update({ status: "rejected" }).eq("id", payment.id);
      return new Response(JSON.stringify({ error: paysuiteData?.message ?? "Erro ao iniciar pagamento na PaySuite" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (paysuiteData.id) {
      await adminClient.from("payments").update({ external_id: String(paysuiteData.id) }).eq("id", payment.id);
    }

    return new Response(JSON.stringify({ checkout_url: paysuiteData.checkout_url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[create-paysuite-payment] Exception:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

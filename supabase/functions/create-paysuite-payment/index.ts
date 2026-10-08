import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { parsePaySuitePaymentResponse } from "../_shared/paysuite.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYSUITE_BASE_URL = "https://paysuite.tech/api/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paysuiteApiKey = Deno.env.get("PAYSUITE_API_KEY");
  const appUrl = (Deno.env.get("APP_URL") || "https://www.lovenestt.com").replace(/\/+$/, "");

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Servidor mal configurado" }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sem cabeçalho de autorização" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) return json({ error: "Sessão inválida" }, 401);

    const { couple_space_id, plan_id, method } = await req.json();

    if (!couple_space_id || !plan_id || !["mpesa", "emola", "credit_card"].includes(method)) {
      return json({ error: "Parâmetros inválidos" }, 400);
    }

    const { data: member } = await adminClient
      .from("members")
      .select("couple_space_id")
      .eq("user_id", user.id)
      .eq("couple_space_id", couple_space_id)
      .maybeSingle();

    if (!member) return json({ error: "Não pertences a este espaço" }, 403);

    const { data: plan, error: planError } = await adminClient
      .from("subscription_plans")
      .select("id, name, price_mzn, is_active")
      .eq("id", plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan || plan.price_mzn == null || Number(plan.price_mzn) <= 0) {
      return json({ error: "Plano indisponível para pagamento automático" }, 400);
    }

    if (!paysuiteApiKey) {
      return json({
        error: "Pagamento automático ainda não está disponível. Usa o método manual por enquanto.",
      }, 503);
    }

    const { data: payment, error: insertError } = await adminClient
      .from("payments")
      .insert({
        couple_space_id,
        plan_id: plan.id,
        created_by: user.id,
        plan_name: plan.name,
        amount: String(plan.price_mzn),
        method,
        status: "pending",
        provider: "paysuite",
      })
      .select("id")
      .single();

    if (insertError || !payment) throw insertError ?? new Error("Falha ao registar pagamento");

    const paysuiteRes = await fetch(`${PAYSUITE_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paysuiteApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        amount: Number(plan.price_mzn),
        reference: payment.id,
        method,
        description: `LoveNest — ${plan.name}`,
        return_url: `${appUrl}/subscricao?status=pending`,
        callback_url: `${supabaseUrl}/functions/v1/paysuite-webhook`,
      }),
    });

    const paysuiteData = await paysuiteRes.json().catch(() => null);
    const normalized = parsePaySuitePaymentResponse(paysuiteData);

    if (!paysuiteRes.ok || !normalized.checkoutUrl) {
      await adminClient
        .from("payments")
        .update({
          status: "rejected",
          admin_notes: paysuiteData?.message ?? "PaySuite não devolveu checkout_url",
        })
        .eq("id", payment.id);

      return json({
        error: paysuiteData?.message ?? "Erro ao iniciar pagamento na PaySuite",
      }, 502);
    }

    if (normalized.externalId) {
      await adminClient
        .from("payments")
        .update({ external_id: normalized.externalId })
        .eq("id", payment.id);
    }

    return json({ checkout_url: normalized.checkoutUrl });
  } catch (err: any) {
    console.error("[create-paysuite-payment] Exception:", err);
    return json({ error: err?.message ?? "Erro inesperado" }, 500);
  }
});

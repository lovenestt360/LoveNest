import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { amountsMatch } from "../_shared/paysuite.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-signature, x-account-id",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifySignature(rawBody: string, signatureHex: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHex.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("PAYSUITE_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Servidor mal configurado" }, 500);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const logInternal = async (eventType: string, payload: unknown) => {
    try {
      await adminClient.from("edge_function_logs").insert({
        function_name: "paysuite-webhook",
        event_type: eventType,
        payload,
      });
    } catch {
      // Logging must never break payment processing.
    }
  };

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Webhook-Signature") ?? "";

    if (!webhookSecret) {
      await logInternal("MISSING_SECRET", { note: "PAYSUITE_WEBHOOK_SECRET não configurado" });
      return json({ error: "Webhook não configurado" }, 503);
    }

    if (!signature || !(await verifySignature(rawBody, signature, webhookSecret))) {
      await logInternal("INVALID_SIGNATURE", { signaturePresent: !!signature });
      return json({ error: "Assinatura inválida" }, 401);
    }

    const body = JSON.parse(rawBody);
    await logInternal("WEBHOOK_RECEIVED", body);

    const eventType: string = body?.event ?? body?.type ?? "";
    const data = body?.data ?? body;
    const reference: string | undefined = data?.reference;
    const externalId = data?.id != null ? String(data.id) : null;

    if (!reference) return json({ error: "Sem reference no payload" }, 400);

    const { data: payment } = await adminClient
      .from("payments")
      .select("id, couple_space_id, plan_id, plan_name, amount, status, provider, external_id")
      .eq("id", reference)
      .maybeSingle();

    if (!payment) return json({ error: "Pagamento não encontrado" }, 404);

    if (payment.provider !== "paysuite") {
      await logInternal("WRONG_PROVIDER", { reference, provider: payment.provider });
      return json({ ok: true, note: "reference does not belong to PaySuite" });
    }

    if (payment.status === "approved" || payment.status === "rejected") {
      return json({ ok: true, note: "already processed" });
    }

    if (payment.external_id && externalId && String(payment.external_id) !== externalId) {
      await logInternal("EXTERNAL_ID_MISMATCH", {
        paymentId: payment.id,
        expected: payment.external_id,
        received: externalId,
      });
      return json({ ok: true, note: "provider payment id mismatch, ignored" });
    }

    const FAILURE_EVENTS = new Set(["payment.failed", "payment.cancelled", "payment.expired"]);
    const SUCCESS_EVENTS = new Set(["payment.success", "payment.completed", "payment.paid"]);

    if (FAILURE_EVENTS.has(eventType)) {
      const { error: rejectError } = await adminClient
        .from("payments")
        .update({
          status: "rejected",
          external_id: externalId ?? payment.external_id ?? null,
          admin_notes: data?.error ? String(data.error) : null,
        })
        .eq("id", payment.id)
        .eq("status", "pending");

      if (rejectError) {
        await logInternal("REJECT_UPDATE_FAILED", { message: rejectError.message, paymentId: payment.id });
        return json({ error: "Falha ao marcar pagamento como rejeitado" }, 500);
      }
      return json({ ok: true });
    }

    if (!SUCCESS_EVENTS.has(eventType)) {
      await logInternal("UNKNOWN_EVENT_TYPE", { eventType, reference, paymentId: payment.id });
      return json({ ok: true, note: "unhandled event type, ignored" });
    }

    if (!amountsMatch(payment.amount, data?.amount)) {
      await logInternal("AMOUNT_MISMATCH", {
        paymentId: payment.id,
        expected: payment.amount,
        received: data?.amount,
      });
      // Signed event, but it does not match what LoveNest requested. Keep it
      // pending for manual investigation instead of granting premium.
      return json({ ok: true, note: "amount mismatch, ignored" });
    }

    let planQuery = adminClient.from("subscription_plans").select("id");
    if (payment.plan_id) {
      planQuery = planQuery.eq("id", payment.plan_id);
    } else {
      planQuery = planQuery.ilike("name", payment.plan_name);
    }

    const { data: plan, error: planError } = await planQuery.maybeSingle();
    if (planError || !plan) {
      await logInternal("PLAN_RESOLUTION_FAILED", {
        paymentId: payment.id,
        planId: payment.plan_id,
        planName: payment.plan_name,
        message: planError?.message,
      });
      return json({ error: "Plano do pagamento não encontrado" }, 500);
    }

    const { error: spaceError } = await adminClient.rpc("activate_paid_subscription", {
      p_couple_space_id: payment.couple_space_id,
      p_plan_id: plan.id,
      p_effective_at: new Date().toISOString(),
    });

    if (spaceError) {
      await logInternal("SPACE_ACTIVATION_FAILED", { message: spaceError.message, paymentId: payment.id });
      return json({ error: "Falha ao ativar subscrição" }, 500);
    }

    const { error: approveError } = await adminClient
      .from("payments")
      .update({
        status: "approved",
        external_id: externalId ?? payment.external_id ?? null,
      })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (approveError) {
      await logInternal("APPROVE_UPDATE_FAILED", { message: approveError.message, paymentId: payment.id });
      return json({ error: "Falha ao marcar pagamento como aprovado" }, 500);
    }

    return json({ ok: true });
  } catch (err: any) {
    console.error("[paysuite-webhook] Exception:", err);
    await logInternal("EXCEPTION", { message: err?.message });
    return json({ error: err?.message ?? "Erro inesperado" }, 500);
  }
});

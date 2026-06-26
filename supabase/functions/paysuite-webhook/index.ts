import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-signature, x-account-id",
};

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

/**
 * paysuite-webhook Edge Function
 *
 * Recebe payment.success / payment.failed da PaySuite e replica o mesmo
 * efeito final que Admin.tsx → handleApprovePayment fazia manualmente:
 * marca o pagamento e activa (ou rejeita) a subscrição da couple_space.
 *
 * NOTA: os nomes exactos dos campos do payload (event/type, reference,
 * id) são os documentados em paysuite.tech/docs no momento em que isto
 * foi escrito. Se o primeiro webhook real chegar com nomes diferentes,
 * o log em edge_function_logs (se a tabela existir) mostra o payload
 * em bruto para ajustar — ver o catch-all de log mais abaixo.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("PAYSUITE_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Servidor mal configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const logInternal = async (eventType: string, payload: unknown) => {
    try {
      await adminClient.from("edge_function_logs").insert({
        function_name: "paysuite-webhook",
        event_type: eventType,
        payload,
      });
    } catch {
      // tabela pode não existir — não é crítico
    }
  };

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Webhook-Signature") ?? "";

    if (!webhookSecret) {
      await logInternal("MISSING_SECRET", { note: "PAYSUITE_WEBHOOK_SECRET não configurado" });
      return new Response(JSON.stringify({ error: "Webhook não configurado" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = signature && (await verifySignature(rawBody, signature, webhookSecret));
    if (!valid) {
      await logInternal("INVALID_SIGNATURE", { signaturePresent: !!signature });
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
    await logInternal("WEBHOOK_RECEIVED", body);

    const eventType: string = body?.event ?? body?.type ?? "";
    const data = body?.data ?? body;
    const reference: string | undefined = data?.reference;
    const externalId: string | undefined = data?.id ?? data?.transaction_id;

    if (!reference) {
      return new Response(JSON.stringify({ error: "Sem reference no payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment } = await adminClient
      .from("payments")
      .select("id, couple_space_id, plan_name, status")
      .eq("id", reference)
      .maybeSingle();

    if (!payment) {
      return new Response(JSON.stringify({ error: "Pagamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotente — se a PaySuite reenviar o mesmo webhook, não processa duas vezes.
    if (payment.status === "approved" || payment.status === "rejected") {
      return new Response(JSON.stringify({ ok: true, note: "already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "payment.failed") {
      await adminClient.from("payments").update({ status: "rejected", external_id: externalId ?? null }).eq("id", payment.id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // payment.success (ou qualquer outro evento de sucesso) — replica handleApprovePayment
    await adminClient.from("payments").update({ status: "approved", external_id: externalId ?? null }).eq("id", payment.id);

    const { data: plan } = await adminClient
      .from("subscription_plans")
      .select("id, tier_level")
      .ilike("name", payment.plan_name)
      .maybeSingle();

    await adminClient
      .from("couple_spaces")
      .update({
        subscription_status: "active",
        ...(plan?.id ? { plan_id: plan.id } : {}),
        ...(plan?.tier_level ? { tier_level: plan.tier_level } : {}),
      })
      .eq("id", payment.couple_space_id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[paysuite-webhook] Exception:", err);
    await logInternal("EXCEPTION", { message: err?.message });
    return new Response(JSON.stringify({ error: err?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

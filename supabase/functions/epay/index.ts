import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Pagamentos pela EPay (https://painel.epay.co.mz/docs/api). Uma só função:
//  - { action: "create", plan_id }    cria o pagamento e devolve o link do checkout;
//  - { action: "check", payment_id }  ao voltar do checkout, confirma o estado;
//  - aviso da EPay (X-EducavelPay-Signature) quando o pagamento é pago ou falha.
// O plano só ativa depois de perguntar à própria EPay (GET /payments/{id}): nem o
// regresso ao site nem o corpo do aviso chegam para dar acesso.
// Precisa de "Verify JWT" desligado: a EPay não envia sessão, e os pedidos da app
// são validados aqui. Segredo: EPAY_SECRET_KEY (sk_test_… ou sk_live_…).

const EPAY_API = "https://checkout.epay.co.mz/api/v1";
const APP_URL = "https://www.lovenestt.com";
const REUSE_PENDING_MS = 30 * 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola", izi: "IZI" };

const amountOf = (price: unknown) => {
  const n = parseFloat(String(price ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const secretKey = Deno.env.get("EPAY_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  if (!secretKey) return json({ error: "Pagamentos ainda não configurados" }, 500);

  const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const epay = (path: string, init?: RequestInit) =>
    fetch(`${EPAY_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", Accept: "application/json" },
    });

  /** Pergunta à EPay o estado real e aplica-o. Devolve o estado final na nossa tabela. */
  const syncPayment = async (row: any): Promise<string> => {
    if (row.status === "approved") return "approved";
    const res = await epay(`/payments/${encodeURIComponent(row.external_id)}`);
    if (!res.ok) throw new Error(`EPay respondeu ${res.status}`);
    const remote = await res.json();

    if (remote.status === "paid") {
      const matches = remote.external_reference === row.id && remote.currency === "MZN" &&
        Math.abs(amountOf(remote.amount) - amountOf(row.amount)) < 0.01;
      if (!matches) {
        console.error("EPay: pagamento não corresponde ao pedido", row.id);
        return row.status;
      }
      const { error } = await sb.rpc("epay_mark_paid", {
        p_payment_id: row.id,
        p_method: METHOD_LABEL[remote.payment_type] ?? "EPay",
      });
      if (error) throw error;
      return "approved";
    }
    if ((remote.status === "failed" || remote.status === "cancelled") && row.status === "pending") {
      await sb.from("payments")
        .update({ status: "rejected", admin_notes: "O pagamento não foi concluído. Podem tentar outra vez." })
        .eq("id", row.id).eq("status", "pending");
      return "rejected";
    }
    return row.status;
  };

  try {
    // ── Aviso da EPay ──────────────────────────────────────────────────────
    const signature = req.headers.get("X-EducavelPay-Signature");
    if (signature !== null) {
      const raw = await req.text();
      if (!safeEqual(await hmacHex(secretKey, raw), signature.trim().toLowerCase())) {
        return json({ error: "Assinatura inválida" }, 401);
      }
      const event = JSON.parse(raw);
      if (!UUID_RE.test(String(event.external_reference ?? ""))) return json({ ignored: true });

      const { data: row } = await sb.from("payments").select("*")
        .eq("id", event.external_reference).eq("provider", "epay").eq("external_id", event.id).maybeSingle();
      if (!row) return json({ ignored: true });

      return json({ status: await syncPayment(row) });
    }

    // ── Pedidos da app ─────────────────────────────────────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = token ? await sb.auth.getUser(token) : { data: { user: null } };
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const { data: member } = await sb.from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
    if (!member) return json({ error: "Sem casa associada" }, 403);
    const spaceId = member.couple_space_id;

    const body = await req.json();

    if (body.action === "check") {
      if (!UUID_RE.test(String(body.payment_id ?? ""))) return json({ error: "Pagamento inválido" }, 422);
      const { data: row } = await sb.from("payments").select("*")
        .eq("id", body.payment_id).eq("couple_space_id", spaceId).eq("provider", "epay").maybeSingle();
      if (!row?.external_id) return json({ error: "Pagamento não encontrado" }, 404);
      return json({ status: await syncPayment(row) });
    }

    if (body.action === "create") {
      if (!UUID_RE.test(String(body.plan_id ?? ""))) return json({ error: "Plano inválido" }, 422);
      const { data: plan } = await sb.from("subscription_plans").select("id, name, price")
        .eq("id", body.plan_id).eq("is_active", true).maybeSingle();
      const amount = amountOf(plan?.price);
      if (!plan || amount < 1) return json({ error: "Plano indisponível" }, 422);

      // Quem voltou atrás no checkout continua o mesmo pagamento, em vez de criar outro.
      const { data: open } = await sb.from("payments").select("*")
        .eq("couple_space_id", spaceId).eq("provider", "epay").eq("status", "pending").eq("plan_id", plan.id)
        .gte("created_at", new Date(Date.now() - REUSE_PENDING_MS).toISOString())
        .not("external_id", "is", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (open && amountOf(open.amount) === amount) {
        const res = await epay(`/payments/${encodeURIComponent(open.external_id)}`);
        if (res.ok) {
          const remote = await res.json();
          if (remote.status === "pending" && remote.payment_url) {
            return json({ payment_id: open.id, payment_url: remote.payment_url });
          }
        }
      }

      const { data: row, error: insertError } = await sb.from("payments").insert({
        couple_space_id: spaceId,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: plan.price,
        method: "EPay",
        provider: "epay",
        status: "pending",
        created_by: user.id,
      }).select().single();
      if (insertError) throw insertError;

      const { data: profile } = await sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const res = await epay("/payments", {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency: "MZN",
          description: `LoveNest · ${plan.name}`,
          external_reference: row.id,
          customer_name: profile?.display_name ?? undefined,
          customer_email: user.email ?? undefined,
          return_url: `${APP_URL}/subscricao?pagamento=${row.id}`,
          cancel_url: `${APP_URL}/subscricao?cancelado=1`,
          callback_url: `${supabaseUrl}/functions/v1/epay`,
        }),
      });
      if (!res.ok) {
        console.error("EPay: não criou o pagamento", res.status, res.headers.get("X-Request-Id"));
        await sb.from("payments").delete().eq("id", row.id);
        return json({ error: res.status === 503 ? "Os pagamentos estão suspensos por momentos. Tenta daqui a pouco." : "Não foi possível iniciar o pagamento." }, 502);
      }
      const created = await res.json();
      await sb.from("payments").update({ external_id: created.id }).eq("id", row.id);
      return json({ payment_id: row.id, payment_url: created.payment_url });
    }

    return json({ error: "Ação desconhecida" }, 422);
  } catch (err: any) {
    // 5xx faz a EPay repetir o aviso mais tarde.
    console.error("epay:", err?.message ?? err);
    return json({ error: "Erro ao processar o pagamento" }, 500);
  }
});

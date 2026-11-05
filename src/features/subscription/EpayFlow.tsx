import { useCallback, useEffect, useRef, useState } from "react";
import { addMonths, addYears, format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { cn } from "@/lib/utils";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";
import mpesaLogo from "@/assets/payments/mpesa.png";
import emolaLogo from "@/assets/payments/emola.png";
import iziLogo from "@/assets/payments/izi.png";
import "./epay.css";

/* Pagamento pela EPay: escolher o plano, confirmar e, ao voltar do checkout, a confirmação. */

const LOGOS = [
  { name: "M-Pesa", src: mpesaLogo },
  { name: "e-Mola", src: emolaLogo },
  { name: "IZI", src: iziLogo },
];
const logoOf = (method?: string | null) => LOGOS.find(l => l.name === method)?.src;

const BILLING_LABELS: Record<string, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
  lifetime: "Vitalício",
};
const BILLING_ORDER: Record<string, number> = { annual: 0, semiannual: 1, monthly: 2, lifetime: 3 };
const BILLING_MONTHS: Record<string, number> = { semiannual: 6, annual: 12 };
const PERK_ORDER = ["Nossa História", "Memórias", "Cápsulas", "LoveWrapped", "Localização"];
const MAX_PERKS = 4;

const CTA = "flex h-[52px] w-full items-center justify-center rounded-[17px] bg-[#0B1324] text-[15px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(11,19,36,0.65)] transition-transform active:scale-[0.99] disabled:opacity-60 dark:bg-foreground dark:text-background";

export const amountOf = (price: unknown) => {
  const n = parseFloat(String(price ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const mt = (price: unknown) => `${amountOf(price).toLocaleString("pt-PT")} MT`;

export function sortPlans<T extends { tier_level?: number | null; billing_type?: string | null }>(plans: T[]): T[] {
  return [...plans].sort((a, b) =>
    (a.tier_level ?? 0) - (b.tier_level ?? 0) ||
    (BILLING_ORDER[a.billing_type ?? "monthly"] ?? 9) - (BILLING_ORDER[b.billing_type ?? "monthly"] ?? 9));
}

/** Preço por mês e quanto poupam face ao mensal do mesmo nível (semestrais e anuais). */
function savingsOf(plan: any, plans: any[]) {
  const months = BILLING_MONTHS[plan.billing_type];
  if (!months) return null;
  const price = amountOf(plan.price);
  if (!price) return null;
  const monthly = plans.find(x => x.tier_level === plan.tier_level && (x.billing_type ?? "monthly") === "monthly");
  const saved = monthly ? Math.round(amountOf(monthly.price) * months - price) : 0;
  return { perMonth: Math.round(price / months), saved: Math.max(saved, 0) };
}

/** A mesma regra do servidor: o tempo soma ao que ainda têm. Vitalício não tem fim. */
function endDateOf(plan: any, house: any): Date | null {
  const current = house?.subscription_ends_at ? new Date(house.subscription_ends_at) : null;
  const base = current && current.getTime() > Date.now() ? current : new Date();
  switch (plan?.billing_type) {
    case "semiannual": return addMonths(base, 6);
    case "annual": return addYears(base, 1);
    case "lifetime": return null;
    default: return addMonths(base, 1);
  }
}
const longDate = (d: Date) => format(d, "d 'de' MMMM 'de' yyyy", { locale: pt });

function LogoTile({ src, name, className }: { src: string; name: string; className?: string }) {
  return (
    <span className={cn("flex items-center justify-center rounded-[10px] border border-[#ECE8E3] bg-white dark:border-border", className)}>
      <img src={src} alt={name} className="block max-h-full max-w-full object-contain" />
    </span>
  );
}

function Check() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#EAF6EE] text-[#1E7A44]">
      <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.500 4.500L19 7.500" />
      </svg>
    </span>
  );
}

// ── 1. Escolher o plano ────────────────────────────────────────────────

export function PlanChooser({ plans, selected, onSelect, onContinue, onManual, canManual }: {
  plans: any[];
  selected: any;
  onSelect: (plan: any) => void;
  onContinue: () => void;
  onManual: () => void;
  canManual: boolean;
}) {
  const features: string[] = selected?.features ?? [];
  const ranked = [...features].sort((a, b) => {
    const ia = PERK_ORDER.indexOf(a), ib = PERK_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const perks = ranked.slice(0, MAX_PERKS);
  const moreCount = ranked.length - perks.length;
  const severalTiers = new Set(plans.map(p => p.tier_level)).size > 1;

  return (
    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <img src={faisca} alt="" className="h-auto w-[54px] shrink-0" />
        <div>
          <h2 className="text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">Guardem tudo o que é vosso</h2>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">Um só plano para os dois.</p>
        </div>
      </div>

      {perks.length > 0 && (
        <div className="grid gap-2">
          {perks.map(p => (
            <div key={p} className="flex items-center gap-2 text-[13.5px] font-medium"><Check />{p}</div>
          ))}
          {moreCount > 0 && <p className="pl-[26px] text-[12.5px] text-muted-foreground">E mais {moreCount} {moreCount === 1 ? "função" : "funções"}</p>}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="rounded-[18px] border border-[#ECE8E3] p-6 text-center text-[13.5px] text-muted-foreground dark:border-border">Nenhum plano disponível de momento.</p>
      ) : (
        <div role="radiogroup" aria-label="Plano" className="grid gap-3 pt-1">
          {plans.map(p => {
            const on = selected?.id === p.id;
            const s = savingsOf(p, plans);
            const lifetime = p.billing_type === "lifetime";
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => onSelect(p)}
                className={cn("relative flex w-full items-center gap-3 rounded-[18px] bg-white p-[13px] text-left dark:bg-card",
                  on ? "border-2 border-[#0B1324] shadow-[0_12px_24px_-18px_rgba(11,19,36,0.55)] dark:border-foreground" : "border-2 border-[#ECE8E3] dark:border-border")}>
                {p.billing_type === "annual" && s && s.saved > 0 && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-[#0B1324] px-2.5 py-0.5 text-[10.5px] font-semibold text-white dark:bg-foreground dark:text-background">Mais vantajoso</span>
                )}
                <span className={cn("h-5 w-5 shrink-0 rounded-full", on ? "border-[6px] border-[#0B1324] dark:border-foreground" : "border-[1.5px] border-[#CFCAC3] dark:border-border")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{severalTiers ? p.name : BILLING_LABELS[p.billing_type] ?? p.name}</span>
                  <span className="block text-[12.5px] text-muted-foreground">
                    {s || lifetime ? `${mt(p.price)} de uma vez` : "Paguem mês a mês"}
                  </span>
                  {s && s.saved > 0 && <span className="block text-[12.5px] font-semibold text-[#1E7A44]">Poupam {s.saved.toLocaleString("pt-PT")} MT</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block whitespace-nowrap text-[18px] font-bold tracking-[-0.025em]">{s ? `${s.perMonth} MT` : mt(p.price)}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{lifetime ? "para sempre" : "por mês"}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button type="button" onClick={onContinue} disabled={!selected} className={cn(CTA, "mt-2")}>Continuar</button>

      <div className="flex justify-center gap-2">
        {LOGOS.map(l => <LogoTile key={l.name} {...l} className="h-[38px] w-[50px] p-1" />)}
      </div>
      <p className="text-center text-[12.5px] text-muted-foreground">Sem renovação automática.</p>
      {canManual && (
        <button type="button" onClick={onManual} className="pb-2 text-center text-[12.5px] font-semibold text-muted-foreground underline underline-offset-2">
          Já pagaste por M-Pesa? Enviar comprovativo
        </button>
      )}
    </div>
  );
}

// ── 2. Confirmar ───────────────────────────────────────────────────────

export function ConfirmPlan({ plan, house, paying, onBack, onPay }: {
  plan: any; house: any; paying: boolean; onBack: () => void; onPay: () => void;
}) {
  const end = endDateOf(plan, house);
  const rows: [string, string][] = [
    ["Plano", plan.name],
    ["Para", "Os dois"],
    ["Ativo até", end ? longDate(end) : "Para sempre"],
  ];
  return (
    <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onBack} disabled={paying} aria-label="Voltar aos planos"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#F2F0ED] dark:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-[22px] font-bold tracking-[-0.025em]">Confirmar o plano</h2>
      </div>

      <div className="rounded-[18px] border border-[#ECE8E3] px-4 py-1 dark:border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-[#F0EDE9] py-2.5 text-[14px] first:border-t-0 dark:border-border/60">
            <span className="text-muted-foreground">{k}</span><span className="text-right font-semibold">{v}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-[#F0EDE9] py-3 text-[16px] font-semibold dark:border-border/60">
          <span>Total</span><span className="font-bold tracking-[-0.02em]">{mt(plan.price)}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-muted-foreground">Podem pagar com</p>
        <div className="grid grid-cols-3 gap-2">
          {LOGOS.map(l => <LogoTile key={l.name} {...l} className="h-[66px] rounded-[14px] p-2" />)}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-[14px] bg-[#F7F5F2] px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground dark:bg-muted">
        <Lock className="mt-0.5 h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
        <span>Pagamento seguro pela EPay, processado pelo Millennium bim. A LoveNest não vê o vosso PIN.</span>
      </div>

      <button type="button" onClick={onPay} disabled={paying} className={cn(CTA, "mt-2")}>
        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pagar ${mt(plan.price)}`}
      </button>
      <p className="text-center text-[12.5px] text-muted-foreground">Escolhem o método no passo seguinte.</p>
    </div>
  );
}

// ── 3. Ao voltar do checkout ───────────────────────────────────────────

const POLL_MS = 4000;
const POLL_TRIES = 30;

export function PaymentReturn({ paymentId, onFailed, onLeave, onDone, onHome, onStart }: {
  paymentId: string;
  onFailed: (message?: string) => void;
  /** Voltar aos planos sem pagamento confirmado. */
  onLeave: () => void;
  /** O pagamento ficou aprovado. */
  onDone: () => void;
  onHome: () => void;
  onStart: () => void;
}) {
  const { partner } = usePartnerProfile();
  const [payment, setPayment] = useState<any>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  const [paid, setPaid] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [checking, setChecking] = useState(false);
  const tries = useRef(0);
  const finished = useRef(false);

  const check = useCallback(async () => {
    if (finished.current) return;
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("epay", { body: { action: "check", payment_id: paymentId } });
    setChecking(false);
    if (finished.current || error) return;

    if (data?.status === "approved") {
      finished.current = true;
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: row }, { data: profile }] = await Promise.all([
        supabase.from("payments").select("*").eq("id", paymentId).maybeSingle(),
        user ? supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (row?.couple_space_id) {
        const { data: house } = await (supabase as any).from("couple_spaces").select("subscription_ends_at").eq("id", row.couple_space_id).maybeSingle();
        setEndsAt(house?.subscription_ends_at ?? null);
      }
      setMyName((profile?.display_name ?? "").split(" ")[0]);
      setPayment(row);
      setPaid(true);
      onDone();
    } else if (data?.status === "rejected") {
      finished.current = true;
      const { data: row } = await supabase.from("payments").select("admin_notes").eq("id", paymentId).maybeSingle();
      onFailed(row?.admin_notes ?? undefined);
    }
  }, [paymentId, onDone, onFailed]);

  useEffect(() => {
    check();
    const id = window.setInterval(() => {
      tries.current += 1;
      if (finished.current || tries.current > POLL_TRIES) {
        window.clearInterval(id);
        if (!finished.current) setGaveUp(true);
        return;
      }
      check();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [check]);

  if (paid && payment) {
    const end = endsAt ? new Date(endsAt) : null;
    const partnerName = (partner?.display_name ?? "").split(" ")[0];
    const names = [myName, partnerName].filter(Boolean).join(" e ");
    const logo = logoOf(payment.method);
    return (
      <div className="ep-paid flex min-h-[78dvh] flex-col gap-3 pb-2">
        <div className="flex flex-col items-center pt-8 text-center">
          <div className="relative mb-4 h-[84px] w-[84px]">
            <span className="ep-wave absolute inset-1.5 rounded-full bg-[#EAF6EE]" />
            <svg viewBox="0 0 64 64" className="relative h-full w-full overflow-visible" fill="none" aria-hidden="true">
              <circle className="ep-disc" cx="32" cy="32" r="27" fill="#EAF6EE" />
              <circle className="ep-arc" cx="32" cy="32" r="27" stroke="#1E7A44" strokeWidth={2.5} strokeLinecap="round" pathLength={1} />
              <path className="ep-mark" d="M21 33l8 8 15-16" stroke="#1E7A44" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
            </svg>
          </div>
          <h2 className="ep-rise ep-d1 text-[22px] font-bold leading-tight tracking-[-0.03em]">Pagamento confirmado</h2>
          <p className="ep-rise ep-d2 mt-1.5 text-[14px] text-muted-foreground">
            O {payment.plan_name} já é vosso{names ? `, ${names}` : ""}.
          </p>
        </div>

        <div className="ep-rise ep-d3 mt-2 rounded-[20px] border border-[#ECE8E3] bg-white shadow-[0_16px_30px_-24px_rgba(11,19,36,0.4)] dark:border-border dark:bg-card">
          <div className="px-4 pb-3.5 pt-[15px]">
            <div className="flex items-center justify-between gap-2">
              <b className="text-[15.5px] font-bold tracking-[-0.02em]">{payment.plan_name}</b>
              <span className="rounded-full bg-[#EAF6EE] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1E7A44]">Ativo</span>
            </div>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">Para os dois{end ? `, até ${longDate(end)}` : ", para sempre"}</p>
          </div>
          <div className="ep-cut relative border-t-[1.5px] border-dashed border-[#ECE8E3] dark:border-border" />
          <div className="flex items-center gap-2.5 px-4 py-[11px]">
            {logo && <LogoTile src={logo} name={payment.method} className="h-[34px] w-[34px] shrink-0 p-1" />}
            <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">Pago com {payment.method}</span>
            <b className="whitespace-nowrap text-[15px] font-bold tracking-[-0.02em]">{mt(payment.amount)}</b>
          </div>
        </div>

        <div className="flex-1" />

        <div className="ep-rise ep-d4 flex items-center gap-2.5">
          <img src={faisca} alt="" className="ep-bob h-auto w-[42px] shrink-0" />
          <p className="rounded-[14px] rounded-bl-[4px] bg-[#F7F5F2] px-3 py-2 text-[13px] font-medium leading-snug dark:bg-muted">
            Agora a Nossa História é vossa. Começamos?
          </p>
        </div>
        <button type="button" onClick={onStart} className={cn(CTA, "ep-rise ep-d5")}>Escrever o primeiro capítulo</button>
        <button type="button" onClick={onHome} className="py-1 text-center text-[12.5px] font-semibold text-muted-foreground underline underline-offset-2">Ir para a Home</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-2 text-center">
      <img src={faisca} alt="" className="ep-bob h-auto w-[96px]" />
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">A confirmar o pagamento</h2>
      <p className="max-w-[32ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {gaveUp
          ? "Ainda não recebemos a confirmação. Se já pagaste, o plano ativa sozinho assim que ela chegar."
          : "Costuma demorar poucos segundos. Podes sair daqui: o plano ativa sozinho."}
      </p>
      <button type="button" disabled={checking} onClick={check} className="mt-3 h-11 rounded-[14px] bg-[#F2F0ED] px-5 text-[14px] font-semibold disabled:opacity-60 dark:bg-muted">
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar outra vez"}
      </button>
      <button type="button" onClick={onLeave} className="text-[12.5px] font-semibold text-muted-foreground underline underline-offset-2">Voltar aos planos</button>
    </div>
  );
}

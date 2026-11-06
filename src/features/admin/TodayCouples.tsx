import { useMemo, useState } from "react";
import { format, addMonths, addYears, differenceInCalendarDays, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Clock, CreditCard, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { BTN, CARD, GHOST, ROW, Segmented } from "./ui";

/* Painel admin (parte 2): "Hoje" e "Casais", na linguagem branca da app. */

const TIER: Record<number, string> = { 1: "Plus", 2: "Pro", 3: "Max" };
const BILLING: Record<string, string> = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual", lifetime: "Vitalício" };

type Status = "paid" | "trial" | "none";

export interface AdminData {
  houses: any[];
  users: any[];
  payments: any[];
  verifications: any[];
  plans: any[];
}

const d = (iso?: string | null, f = "d MMM") => (iso ? format(new Date(iso), f, { locale: pt }) : "");

/** Casa com uma só pessoa. É uma nota à parte: não esconde o plano. */
const isSolo = (h: any) => (h.members?.length ?? 0) < 2;

function statusOf(h: any): Status {
  const now = Date.now();
  if (h.subscription_status === "active" && (!h.subscription_ends_at || new Date(h.subscription_ends_at).getTime() > now)) return "paid";
  if (h.trial_ends_at && new Date(h.trial_ends_at).getTime() > now) return "trial";
  return "none";
}

function planOf(h: any, plans: any[]) {
  return plans.find(p => String(p.id) === String(h.plan_id));
}

export function useNames(data: Pick<AdminData, "users">) {
  return useMemo(() => {
    const byId = new Map(data.users.map((u: any) => [u.user_id, u]));
    const people = (h: any) => (h.members ?? []).map((m: any) => byId.get(m.user_id)).filter(Boolean);
    const coupleName = (h: any) => {
      const ps = people(h).map((p: any) => (p.display_name || "").split(" ")[0]).filter(Boolean);
      if (ps.length) return ps.join(" & ") + (ps.length === 1 ? " (sem par)" : "");
      return h.house_name?.trim() || [h.partner1_name, h.partner2_name].filter(Boolean).join(" & ") || "Casa sem nome";
    };
    return { people, coupleName };
  }, [data.users]);
}

/* ═══════════════ Hoje ═══════════════ */

export function TodayView({ data, adminName, onOpenReceipt, onApprove, onReview, onOpenCouple, onAnnounce }: {
  data: AdminData;
  adminName: string;
  onOpenReceipt: (ref: string) => void;
  onApprove: (paymentId: string, houseId: string, planName: string) => Promise<void> | void;
  onReview: () => void;
  onOpenCouple: (houseId: string) => void;
  onAnnounce: () => void;
}) {
  const { coupleName } = useNames(data);
  const now = Date.now();
  const week = 7 * 86_400_000;
  const statuses = data.houses.map(statusOf);
  const pending = data.payments.filter(p => p.status === "pending");
  const pendingVer = data.verifications.filter(v => v.status === "pending");
  const ending = data.houses.filter(h => statusOf(h) === "paid" && h.subscription_ends_at && new Date(h.subscription_ends_at).getTime() - now < week);
  const trialsEnding = data.houses.filter(h => statusOf(h) === "trial" && new Date(h.trial_ends_at).getTime() - now < week);
  const newThisWeek = data.houses.filter(h => h.created_at && now - new Date(h.created_at).getTime() < week).length;
  const [busy, setBusy] = useState<string | null>(null);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[24px] font-bold tracking-[-0.025em]">{hello}{adminName ? `, ${adminName}` : ""}</h2>
        <span className="text-[13px] text-[#7A7F8C] first-letter:uppercase">{format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[[data.houses.length, "casais"], [statuses.filter(s => s === "paid").length, "com plano pago"], [statuses.filter(s => s === "trial").length, "em experiência"], [newThisWeek, "novos esta semana"]].map(([n, l]) => (
          <div key={l as string} className={cn(CARD, "px-4 py-3")}>
            <p className="text-[24px] font-bold tracking-[-0.03em] tabular-nums">{n}</p>
            <p className="text-[12px] font-medium text-[#7A7F8C]">{l}</p>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <p className="px-4 pb-1 pt-3 text-[14px] font-semibold">Precisa de ti</p>
        {pending.length === 0 && pendingVer.length === 0 && ending.length === 0 && trialsEnding.length === 0 && (
          <p className="px-4 pb-4 text-[13.5px] text-[#7A7F8C]">Está tudo em dia.</p>
        )}
        {pending.map(p => (
          <div key={p.id} className={ROW}>
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F7F5F2] dark:bg-muted"><CreditCard className="h-4 w-4" strokeWidth={1.7} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{coupleName(data.houses.find(h => h.id === p.couple_space_id) ?? {})} pagaram o {p.plan_name}</p>
              <p className="text-[12.5px] text-[#7A7F8C]">{p.amount} · {p.method} · {d(p.created_at, "d MMM, HH:mm")}</p>
            </div>
            {p.proof_url && <button className={GHOST} onClick={() => onOpenReceipt(p.proof_url)}>Comprovativo</button>}
            <button className={BTN} disabled={busy === p.id}
              onClick={async () => { setBusy(p.id); await onApprove(p.id, p.couple_space_id, p.plan_name); setBusy(null); }}>
              {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
            </button>
          </div>
        ))}
        {pendingVer.length > 0 && (
          <div className={ROW}>
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F7F5F2] dark:bg-muted"><ShieldCheck className="h-4 w-4" strokeWidth={1.7} /></span>
            <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{pendingVer.length} {pendingVer.length === 1 ? "verificação" : "verificações"} por rever</p></div>
            <button className={GHOST} onClick={onReview}>Rever</button>
          </div>
        )}
        {ending.map(h => (
          <div key={h.id} className={ROW}>
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F7F5F2] dark:bg-muted"><Clock className="h-4 w-4" strokeWidth={1.7} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{coupleName(h)} terminam a {d(h.subscription_ends_at)}</p>
              <p className="text-[12.5px] text-[#7A7F8C]">{planOf(h, data.plans)?.name ?? "Plano"} · lembrar de renovar</p>
            </div>
            <button className={GHOST} onClick={() => onOpenCouple(h.id)}>Abrir</button>
          </div>
        ))}
        {trialsEnding.length > 0 && (
          <div className={ROW}>
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F7F5F2] dark:bg-muted"><Clock className="h-4 w-4" strokeWidth={1.7} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">{trialsEnding.length} {trialsEnding.length === 1 ? "experiência termina" : "experiências terminam"} esta semana</p>
              <p className="text-[12.5px] text-[#7A7F8C]">Boa altura para um aviso com a oferta</p>
            </div>
            <button className={GHOST} onClick={onAnnounce}>Criar aviso</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Casais ═══════════════ */

type Filter = "all" | "paid" | "trial" | "none" | "solo";
type Action = "change" | "renew" | "extend" | "remove" | "suspend" | "removeTrial" | "giveTrial" | null;
type SuspendReason = "subscription" | "irregular";

export function CouplesView({ data, initialId, onChanged }: { data: AdminData; initialId?: string | null; onChanged: () => void }) {
  const { toast } = useToast();
  const { people, coupleName } = useNames(data);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? data.houses[0]?.id ?? null);
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  // formulários
  const activePlans = data.plans.filter(p => p.is_active);
  const [planId, setPlanId] = useState<string>("");
  const [method, setMethod] = useState("M-Pesa");
  const [days, setDays] = useState(15);
  const [reason, setReason] = useState<SuspendReason>("subscription");
  const [note, setNote] = useState("");

  const list = data.houses.filter(h => {
    if (filter === "solo" ? !isSolo(h) : filter !== "all" && statusOf(h) !== filter) return false;
    if (!q.trim()) return true;
    const hay = (coupleName(h) + " " + people(h).map((p: any) => `${p.display_name ?? ""} ${p.email ?? ""}`).join(" ")).toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  const h = data.houses.find(x => x.id === selectedId) ?? null;
  const plan = h ? planOf(h, data.plans) : null;
  const status = h ? statusOf(h) : "none";
  const endsAt = h?.subscription_ends_at ? new Date(h.subscription_ends_at) : null;

  const open = (a: Action) => {
    setPlanId(String(plan?.id ?? activePlans[0]?.id ?? ""));
    setMethod("M-Pesa"); setDays(15); setReason("subscription"); setNote(""); setAction(a);
  };

  /** A data em que o plano acaba depois de somar a duração (mesma regra do servidor). */
  const endAfter = (p: any) => {
    if (!p) return null;
    const base = endsAt && endsAt.getTime() > Date.now() ? endsAt : new Date();
    switch (p.billing_type) {
      case "monthly": return addMonths(base, 1);
      case "semiannual": return addMonths(base, 6);
      case "annual": return addYears(base, 1);
      default: return null;
    }
  };

  const run = async (fn: () => Promise<{ error: any }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: ok });
    setAction(null);
    onChanged();
  };

  const chosen = activePlans.find(p => String(p.id) === planId);
  const statusPill = (s: Status, x: any) => {
    if (s === "paid") {
      const left = x.subscription_ends_at ? differenceInCalendarDays(new Date(x.subscription_ends_at), new Date()) : null;
      if (left !== null && left <= 7) return <span className="rounded-full bg-[#FEF5E7] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#B45309]">Termina em {left} {left === 1 ? "dia" : "dias"}</span>;
      return <span className="rounded-full bg-[#EEF3FF] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#3557C8]">{TIER[planOf(x, data.plans)?.tier_level] ?? "Pago"}</span>;
    }
    if (s === "trial") return <span className="rounded-full bg-[#F7F5F2] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#4A5060]">Experiência</span>;
    if (isSolo(x)) return <span className="rounded-full bg-[#F7F5F2] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#4A5060]">Sem par</span>;
    return <span className="rounded-full bg-[#F7F5F2] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#4A5060]">Sem plano</span>;
  };
  const subtitle = (x: any) => {
    const s = statusOf(x);
    const solo = isSolo(x) ? " · ainda sem par" : "";
    if (s === "paid") return `${planOf(x, data.plans)?.name ?? "Plano"}${x.subscription_ends_at ? ` · até ${d(x.subscription_ends_at)}` : " · vitalício"}${solo}`;
    if (s === "trial") return `Experiência até ${d(x.trial_ends_at)}${solo}`;
    return isSolo(x) ? "Ainda não convidou o par" : "Sem plano";
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[24px] font-bold tracking-[-0.025em]">Casais</h2>
        <span className="text-[13px] text-[#7A7F8C]">{data.houses.length} casais · {data.users.length} pessoas</span>
      </div>
      <div className="mt-3">
        <Segmented<Filter> value={filter} onChange={setFilter}
          options={[["all", "Todos"], ["paid", "Pagos"], ["trial", "Experiência"], ["none", "Sem plano"], ["solo", "Sem par"]]} />
      </div>
      <label className="mt-3 flex h-10 max-w-sm items-center gap-2 rounded-xl border border-[#ECE8E3] bg-white px-3 dark:border-border dark:bg-card">
        <Search className="h-4 w-4 text-[#9AA0AB]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar por nome" className="flex-1 bg-transparent text-[14px] outline-none" />
      </label>

      <div className="mt-3 grid gap-3.5 md:grid-cols-[1fr_320px]">
        <div className={cn(CARD, "max-h-[70vh] overflow-y-auto")}>
          {list.length === 0 && <p className="px-4 py-6 text-[13.5px] text-[#7A7F8C]">Nenhum casal aqui.</p>}
          {list.map(x => {
            const ps = people(x);
            return (
              <button key={x.id} onClick={() => setSelectedId(x.id)}
                className={cn(ROW, "w-full text-left", selectedId === x.id && "bg-[#F7F5F2] dark:bg-muted")}>
                <span className="flex shrink-0">
                  {(ps.length ? ps : [{ display_name: "?" }]).slice(0, 2).map((p: any, i: number) => (
                    <span key={i} className={cn("flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white dark:ring-card", i === 1 && "-ml-2")}
                      style={{ background: i === 0 ? "#E5466D" : "#4D7CFE" }}>
                      {(p.display_name || "?").charAt(0).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{coupleName(x)}</span>
                  <span className="block truncate text-[12.5px] text-[#7A7F8C]">{subtitle(x)}</span>
                </span>
                {statusPill(statusOf(x), x)}
              </button>
            );
          })}
        </div>

        {h && (
          <div className={cn(CARD, "h-fit p-4")}>
            <p className="text-[17px] font-bold tracking-[-0.02em]">{coupleName(h)}</p>
            <p className="mt-0.5 text-[12.5px] text-[#7A7F8C]">Na app desde {d(h.created_at, "d MMM yyyy")}{h.is_suspended && <b className="ml-1.5 font-semibold text-[#B91C1C]">· suspensa ({h.suspension_reason === "irregular" ? "irregularidade" : "subscrição"})</b>}</p>
            <div className="mt-3 text-[13px]">
              {people(h).map((p: any) => (
                <div key={p.user_id} className="flex justify-between gap-3 border-t border-[#F0EDE9] py-2 dark:border-border/60">
                  <span className="text-[#7A7F8C]">{(p.display_name || "Sem nome").split(" ")[0]}</span>
                  <b className="truncate text-right font-semibold">{p.verification_status === "verified" ? "verificado" : p.verification_status === "pending" ? "verificação pendente" : "—"}</b>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#F0EDE9] py-2 dark:border-border/60"><span className="text-[#7A7F8C]">Plano</span><b className="font-semibold">{status === "paid" ? plan?.name ?? "Pago" : status === "trial" ? "Experiência" : "Sem plano"}</b></div>
              <div className="flex justify-between border-t border-[#F0EDE9] py-2 dark:border-border/60"><span className="text-[#7A7F8C]">Até</span><b className="font-semibold">{status === "paid" ? (endsAt ? d(h.subscription_ends_at, "d 'de' MMMM yyyy") : "Vitalício") : status === "trial" ? d(h.trial_ends_at, "d 'de' MMMM") : "—"}</b></div>
              <div className="flex justify-between border-t border-[#F0EDE9] py-2 dark:border-border/60"><span className="text-[#7A7F8C]">Pagamentos</span><b className="font-semibold">{data.payments.filter(p => p.couple_space_id === h.id && p.status === "approved").length} aprovados</b></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button className={BTN} onClick={() => open("change")}>Mudar plano</button>
              <button className={GHOST} onClick={() => open("renew")}>Renovar</button>
              {status === "paid" && endsAt && <button className={GHOST} onClick={() => open("extend")}>Prolongar</button>}
              {status === "paid" && <button className={GHOST} onClick={() => open("remove")}>Remover plano</button>}
              {status !== "paid" && <button className={GHOST} onClick={() => open("giveTrial")}>{status === "trial" ? "Prolongar experiência" : "Dar experiência"}</button>}
              {status === "trial" && <button className={GHOST} onClick={() => open("removeTrial")}>Remover experiência</button>}
              {h.is_suspended ? (
                <button className={GHOST} disabled={busy}
                  onClick={() => run(() => supabase.rpc("admin_set_suspended" as any, { p_couple_space_id: h.id, p_suspended: false }) as any, "Casa reativada")}>
                  Reativar casa
                </button>
              ) : (
                <button className={cn(GHOST, "text-[#B91C1C]")} onClick={() => open("suspend")}>Suspender casa</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═════ Janelas ═════ */}
      {action && h && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1324]/35 p-4" onClick={() => !busy && setAction(null)}>
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-[18px] dark:bg-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[18px] font-bold tracking-[-0.02em]">
                  {action === "change" ? "Mudar plano" : action === "renew" ? "Renovar" : action === "extend" ? "Prolongar sem pagamento" : action === "suspend" ? "Suspender casa" : action === "removeTrial" ? "Remover a experiência?" : action === "giveTrial" ? (status === "trial" ? "Prolongar a experiência" : "Dar experiência") : "Remover o plano?"}
                </p>
                <p className="mt-0.5 text-[12.5px] text-[#7A7F8C]">
                  {action === "renew" ? "Para quando o casal pagou por fora (ex.: pelo WhatsApp)" : action === "extend" ? "Uma oferta: compensar uma falha, agradecer, promoção" : `${coupleName(h)} · ${subtitle(h)}`}
                </p>
              </div>
              <button onClick={() => setAction(null)} aria-label="Fechar" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#7A7F8C] dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>

            {(action === "change" || action === "renew") && (
              <>
                <p className="mb-2 mt-4 text-[12.5px] font-semibold text-[#7A7F8C]">{action === "change" ? "Novo plano" : "Plano pago"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {activePlans.map(p => (
                    <button key={p.id} onClick={() => setPlanId(String(p.id))}
                      className={cn("h-[34px] rounded-full border px-3 text-[13px] font-semibold", planId === String(p.id) ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border")}>
                      {p.name} <span className="font-medium opacity-70">{p.price}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {action === "renew" && (
              <>
                <p className="mb-2 mt-4 text-[12.5px] font-semibold text-[#7A7F8C]">Como pagou</p>
                <div className="flex flex-wrap gap-1.5">
                  {["M-Pesa", "e-Mola", "mKesh", "Dinheiro", "Outro"].map(m => (
                    <button key={m} onClick={() => setMethod(m)}
                      className={cn("h-[34px] rounded-full border px-3 text-[13px] font-semibold", method === m ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border")}>{m}</button>
                  ))}
                </div>
              </>
            )}
            {(action === "extend" || action === "giveTrial") && (
              <>
                <p className="mb-2 mt-4 text-[12.5px] font-semibold text-[#7A7F8C]">Mais quanto tempo</p>
                <div className="flex flex-wrap gap-1.5">
                  {[7, 15, 30].map(n => (
                    <button key={n} onClick={() => setDays(n)}
                      className={cn("h-[34px] rounded-full border px-3 text-[13px] font-semibold", days === n ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border")}>{n === 30 ? "1 mês" : `${n} dias`}</button>
                  ))}
                </div>
              </>
            )}
            {action === "remove" && (
              <div className="mt-3 rounded-[14px] bg-[#FDF3F2] px-3.5 py-3 text-[13px] leading-relaxed text-[#8A1C1C]">
                O casal perde já o acesso às funções do plano. As memórias, fotos e capítulos ficam guardados e voltam quando tiverem plano outra vez. Não há reembolso automático.
              </div>
            )}

            {action === "removeTrial" && (
              <div className="mt-3 rounded-[14px] bg-[#FDF3F2] px-3.5 py-3 text-[13px] leading-relaxed text-[#8A1C1C]">
                A experiência termina já e a casa vê o ecrã "O vosso teste grátis terminou". As memórias ficam guardadas. Não pode começar outro teste; para voltar a dar tempo, usa Mudar plano.
              </div>
            )}
            {action === "suspend" && (
              <>
                <p className="mb-2 mt-4 text-[12.5px] font-semibold text-[#7A7F8C]">Porquê</p>
                <div className="grid gap-2">
                  {([["subscription", "Falta de pagamento", "Sai sozinha quando o pagamento for confirmado."], ["irregular", "Algo irregular", "Pagar não resolve. Só tu podes reativar."]] as [SuspendReason, string, string][]).map(([k, t, sub]) => (
                    <button key={k} type="button" onClick={() => setReason(k)}
                      className={cn("rounded-[14px] border px-3.5 py-2.5 text-left", reason === k ? "border-2 border-[#0B1324] dark:border-foreground" : "border-[#ECE8E3] dark:border-border")}>
                      <span className="block text-[14px] font-semibold">{t}</span>
                      <span className="block text-[12.5px] text-[#7A7F8C]">{sub}</span>
                    </button>
                  ))}
                </div>
                {reason === "irregular" && (
                  <>
                    <label htmlFor="suspend-note" className="mb-1.5 mt-3 block text-[12.5px] font-semibold text-[#7A7F8C]">Mensagem para a casa (opcional)</label>
                    <textarea id="suspend-note" rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={240}
                      placeholder="Se ficar vazia, a casa vê uma mensagem geral a pedir para falar connosco."
                      className="w-full rounded-xl border border-[#ECE8E3] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#0B1324] dark:border-border dark:bg-card" />
                  </>
                )}
              </>
            )}

            {/* Resumo */}
            {action === "giveTrial" && (
              <div className="mt-4 rounded-[14px] bg-[#F7F5F2] px-3.5 py-3 text-[13.5px] leading-relaxed dark:bg-muted">
                Todas as funções abertas até <b>{format(addDays(h.trial_ends_at && new Date(h.trial_ends_at).getTime() > Date.now() ? new Date(h.trial_ends_at) : new Date(), days), "d 'de' MMMM yyyy", { locale: pt })}</b>. Sem pagamento e sem entrar nas contas de pagamentos.
              </div>
            )}
            {action !== "remove" && action !== "suspend" && action !== "removeTrial" && action !== "giveTrial" && (
              <div className="mt-4 rounded-[14px] bg-[#F7F5F2] px-3.5 py-3 text-[13.5px] leading-relaxed dark:bg-muted">
                {action === "extend" ? (
                  <>Passa de {endsAt ? d(h.subscription_ends_at, "d 'de' MMMM") : "hoje"} para <b>{format(addDays(endsAt && endsAt.getTime() > Date.now() ? endsAt : new Date(), days), "d 'de' MMMM yyyy", { locale: pt })}</b>. Não entra nas contas de pagamentos.</>
                ) : chosen ? (
                  <>Fica com <b>{chosen.name}</b>{endAfter(chosen) ? <> até <b>{format(endAfter(chosen)!, "d 'de' MMMM yyyy", { locale: pt })}</b></> : " para sempre"}.
                    {endsAt && endsAt.getTime() > Date.now() ? " O tempo que ainda tinham não se perde." : ""}
                    {action === "renew" && <> Fica no histórico de pagamentos ({chosen.price}, {method}).</>}</>
                ) : "Escolhe um plano."}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={() => setAction(null)} disabled={busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
              <button disabled={busy || ((action === "change" || action === "renew") && !chosen)}
                className={cn(BTN, "h-11 flex-1 rounded-[14px]", (action === "remove" || action === "suspend" || action === "removeTrial") && "bg-[#B91C1C] dark:bg-[#B91C1C] dark:text-white")}
                onClick={() => {
                  if (action === "change" && chosen) return run(() => supabase.rpc("admin_assign_plan" as any, { p_couple_space_id: h.id, p_plan_id: chosen.id, p_tier_level: chosen.tier_level ?? 1, p_trial_days: 0 }) as any, "Plano mudado");
                  if (action === "renew" && chosen) return run(() => supabase.rpc("admin_renew_subscription" as any, { p_couple_space_id: h.id, p_plan_id: chosen.id, p_method: method }) as any, "Renovado");
                  if (action === "extend") return run(() => supabase.rpc("admin_extend_subscription" as any, { p_couple_space_id: h.id, p_days: days }) as any, "Prolongado");
                  if (action === "suspend") return run(() => supabase.rpc("admin_set_suspended" as any, { p_couple_space_id: h.id, p_suspended: true, p_reason: reason, p_note: reason === "irregular" ? note : null }) as any, "Casa suspensa");
                  if (action === "giveTrial") return run(() => supabase.rpc("admin_grant_trial" as any, { p_couple_space_id: h.id, p_days: days }) as any, "Experiência ativada");
                  if (action === "removeTrial") return run(() => supabase.rpc("admin_remove_trial" as any, { p_couple_space_id: h.id }) as any, "Experiência removida");
                  if (action === "remove") return run(() => supabase.rpc("admin_remove_plan" as any, { p_couple_space_id: h.id }) as any, "Plano removido");
                }}>
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : action === "change" ? "Mudar plano" : action === "renew" ? "Renovar" : action === "extend" ? "Prolongar" : action === "suspend" ? "Suspender" : action === "removeTrial" ? "Remover experiência" : action === "giveTrial" ? "Ativar" : "Remover plano"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { BILLING };

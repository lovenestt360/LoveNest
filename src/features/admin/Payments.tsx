import { ReactNode, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2, Plus, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useNames } from "./TodayCouples";
import { LIVE_FEATURES } from "./liveFeatures";

/* Painel admin (parte 3): Pagamentos — Por aprovar, Histórico, Planos, Contas e WhatsApp. */

const CARD = "rounded-[20px] border border-[#ECE8E3] bg-white dark:border-border dark:bg-card";
const ROW = "flex flex-wrap items-center gap-3 border-t border-[#F0EDE9] px-4 py-3 first:border-t-0 dark:border-border/60";
const BTN = "h-[34px] shrink-0 whitespace-nowrap rounded-full bg-[#0B1324] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60 dark:bg-foreground dark:text-background";
const GHOST = "h-[34px] shrink-0 whitespace-nowrap rounded-full bg-[#F7F5F2] px-3.5 text-[13px] font-semibold text-[#0B1324] disabled:opacity-60 dark:bg-muted dark:text-foreground";
const INPUT = "h-11 w-full rounded-xl border border-[#ECE8E3] bg-white px-3 text-[14px] outline-none focus:border-[#0B1324] dark:border-border dark:bg-card";
const LABEL = "mb-1.5 block text-[12.5px] font-semibold text-[#7A7F8C]";
const MUTED = "text-[#7A7F8C]";
const TIER: Record<number, string> = { 0: "Grátis", 1: "Plus", 2: "Pro", 3: "Max" };
const BILLING: [string, string][] = [["monthly", "Mensal"], ["semiannual", "Semestral"], ["annual", "Anual"], ["lifetime", "Vitalício"]];

export type PaymentsTab = "pending" | "history" | "plans" | "accounts";

const d = (iso?: string | null, f = "d MMM, HH:mm") => (iso ? format(new Date(iso), f, { locale: pt }) : "");
const money = (v: any) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function Chips<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={cn("h-[34px] rounded-full border px-3 text-[13px] font-semibold",
            value === k ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border")}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1324]/35 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-[18px] dark:bg-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[18px] font-bold tracking-[-0.02em]">{title}</p>
            {subtitle && <p className={cn("mt-0.5 text-[12.5px]", MUTED)}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#7A7F8C] dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PaymentsView({ data, paymentSettings, featureTiers, tab, onTab, freeModeSlot, onOpenReceipt, onApprove, onChanged }: {
  data: { houses: any[]; users: any[]; payments: any[]; plans: any[] };
  paymentSettings: any;
  featureTiers: any[];
  tab: PaymentsTab;
  onTab: (t: PaymentsTab) => void;
  freeModeSlot?: ReactNode;
  onOpenReceipt: (ref: string) => void;
  onApprove: (paymentId: string, houseId: string, planName: string) => Promise<void> | void;
  onChanged: () => void;
}) {
  const pending = data.payments.filter(p => p.status === "pending");

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-[24px] font-bold tracking-[-0.025em]">Pagamentos</h2>
      <div className="mt-3 inline-flex flex-wrap rounded-xl bg-[#F2F0ED] p-[3px] dark:bg-muted">
        {([["pending", `Por aprovar${pending.length ? ` (${pending.length})` : ""}`], ["history", "Histórico"], ["plans", "Planos"], ["accounts", "Contas e WhatsApp"]] as [PaymentsTab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => onTab(k)}
            className={cn("h-8 rounded-[9px] px-3 text-[13px] font-semibold", tab === k ? "bg-white text-[#0B1324] shadow-sm dark:bg-card dark:text-foreground" : "text-[#7A7F8C]")}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === "pending" && <PendingTab data={data} onOpenReceipt={onOpenReceipt} onApprove={onApprove} onChanged={onChanged} />}
        {tab === "history" && <HistoryTab data={data} onOpenReceipt={onOpenReceipt} />}
        {tab === "plans" && <PlansTab plans={data.plans} featureTiers={featureTiers} freeModeSlot={freeModeSlot} onChanged={onChanged} />}
        {tab === "accounts" && <AccountsTab settings={paymentSettings} onChanged={onChanged} />}
      </div>
    </div>
  );
}

/* ─────────── Por aprovar ─────────── */

function PendingTab({ data, onOpenReceipt, onApprove, onChanged }: {
  data: { houses: any[]; users: any[]; payments: any[]; plans: any[] };
  onOpenReceipt: (ref: string) => void;
  onApprove: (paymentId: string, houseId: string, planName: string) => Promise<void> | void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const { coupleName } = useNames(data);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [note, setNote] = useState("");
  const pending = data.payments.filter(p => p.status === "pending");
  const houseOf = (p: any) => data.houses.find(h => h.id === p.couple_space_id) ?? p.couple_spaces ?? {};

  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    const { error } = await supabase.rpc("admin_reject_payment" as any, { p_payment_id: rejecting.id, p_notes: note.trim() || null });
    setBusy(null);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pagamento rejeitado" });
    setRejecting(null); setNote("");
    onChanged();
  };

  if (pending.length === 0) {
    return <div className={cn(CARD, "px-4 py-8 text-center text-[13.5px]", MUTED)}>Nenhum pagamento à espera. Quando um casal enviar um comprovativo, aparece aqui.</div>;
  }
  return (
    <>
      <div className={CARD}>
        {pending.map(p => (
          <div key={p.id} className={ROW}>
            <div className="min-w-[180px] flex-1">
              <p className="truncate text-[14px] font-semibold">{coupleName(houseOf(p))}</p>
              <p className={cn("text-[12.5px]", MUTED)}>{p.plan_name} · <b className="font-semibold text-[#0B1324] dark:text-foreground">{p.amount}</b> · {p.method} · {d(p.created_at)}</p>
            </div>
            <div className="flex gap-1.5">
              {p.proof_url ? <button className={GHOST} onClick={() => onOpenReceipt(p.proof_url)}>Comprovativo</button>
                : <span className={cn("self-center text-[12.5px]", MUTED)}>Sem comprovativo</span>}
              <button className={GHOST} disabled={busy === p.id} onClick={() => { setNote(""); setRejecting(p); }}>Rejeitar</button>
              <button className={BTN} disabled={busy === p.id}
                onClick={async () => { setBusy(p.id); await onApprove(p.id, p.couple_space_id, p.plan_name); setBusy(null); }}>
                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className={cn("mt-2 px-1 text-[12.5px]", MUTED)}>Ao aprovar, o plano fica ativo para o casal na hora. Se ainda tinham tempo, soma-se.</p>

      {rejecting && (
        <Modal title="Rejeitar pagamento?" subtitle={`${coupleName(houseOf(rejecting))} · ${rejecting.plan_name} · ${rejecting.amount}`} onClose={() => !busy && setRejecting(null)}>
          <label className={cn(LABEL, "mt-4")}>Porquê (o casal vê esta nota)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Ex.: o valor do comprovativo não corresponde ao plano"
            className="w-full rounded-xl border border-[#ECE8E3] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#0B1324] dark:border-border dark:bg-card" />
          <div className="mt-4 flex gap-2">
            <button onClick={() => setRejecting(null)} disabled={!!busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
            <button onClick={reject} disabled={!!busy} className={cn(BTN, "h-11 flex-1 rounded-[14px] bg-[#B91C1C] dark:bg-[#B91C1C] dark:text-white")}>
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Rejeitar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ─────────── Histórico ─────────── */

function HistoryTab({ data, onOpenReceipt }: { data: { houses: any[]; users: any[]; payments: any[] }; onOpenReceipt: (ref: string) => void }) {
  const { coupleName } = useNames(data);
  const [status, setStatus] = useState<"all" | "approved" | "rejected" | "pending">("all");
  const [q, setQ] = useState("");
  const houseOf = (p: any) => data.houses.find(h => h.id === p.couple_space_id) ?? p.couple_spaces ?? {};
  const now = new Date();
  const thisMonth = data.payments.filter(p => p.status === "approved" && new Date(p.created_at).getMonth() === now.getMonth() && new Date(p.created_at).getFullYear() === now.getFullYear());
  const total = thisMonth.reduce((s, p) => s + money(p.amount), 0);

  const list = data.payments.filter(p => {
    if (status !== "all" && p.status !== status) return false;
    if (!q.trim()) return true;
    return `${coupleName(houseOf(p))} ${p.plan_name ?? ""} ${p.method ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
  });

  const pill = (s: string) => s === "approved"
    ? <span className="rounded-full bg-[#EAF6EE] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1E7A44]">Aprovado</span>
    : s === "rejected"
      ? <span className="rounded-full bg-[#FDF3F2] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#B91C1C]">Rejeitado</span>
      : <span className="rounded-full bg-[#FEF5E7] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#B45309]">Por aprovar</span>;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 md:max-w-md">
        <div className={cn(CARD, "px-4 py-3")}>
          <p className="text-[22px] font-bold tracking-[-0.03em] tabular-nums">{total.toLocaleString("pt-PT")} MZN</p>
          <p className={cn("text-[12px] font-medium", MUTED)}>recebido em {format(now, "MMMM", { locale: pt })}</p>
        </div>
        <div className={cn(CARD, "px-4 py-3")}>
          <p className="text-[22px] font-bold tracking-[-0.03em] tabular-nums">{thisMonth.length}</p>
          <p className={cn("text-[12px] font-medium", MUTED)}>pagamentos aprovados</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chips<"all" | "approved" | "rejected" | "pending"> value={status} onChange={setStatus} options={[["all", "Todos"], ["approved", "Aprovados"], ["rejected", "Rejeitados"], ["pending", "Por aprovar"]]} />
        <label className="flex h-[34px] min-w-[200px] flex-1 items-center gap-2 rounded-full border border-[#ECE8E3] bg-white px-3 dark:border-border dark:bg-card md:max-w-xs">
          <Search className="h-4 w-4 text-[#9AA0AB]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar casal ou plano" className="flex-1 bg-transparent text-[13.5px] outline-none" />
        </label>
      </div>
      <div className={cn(CARD, "mt-3")}>
        {list.length === 0 && <p className={cn("px-4 py-6 text-[13.5px]", MUTED)}>Nada aqui.</p>}
        {list.map(p => (
          <div key={p.id} className={ROW}>
            <div className="min-w-[180px] flex-1">
              <p className="truncate text-[14px] font-semibold">{coupleName(houseOf(p))}</p>
              <p className={cn("text-[12.5px]", MUTED)}>
                {p.plan_name} · {p.amount} · {p.method}{p.provider === "admin" ? " · registado no painel" : ""} · {d(p.created_at, "d MMM yyyy")}
              </p>
              {p.status === "rejected" && p.admin_notes && <p className="mt-0.5 text-[12.5px] text-[#B91C1C]">{p.admin_notes}</p>}
            </div>
            {p.proof_url && <button className={GHOST} onClick={() => onOpenReceipt(p.proof_url)}>Comprovativo</button>}
            {pill(p.status)}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────── Planos ─────────── */

function PlansTab({ plans, featureTiers, freeModeSlot, onChanged }: { plans: any[]; featureTiers: any[]; freeModeSlot?: ReactNode; onChanged: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null); // {} = novo
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", billing_type: "monthly", tier_level: 1 });

  /** O que um nível desbloqueia vem de "Funções" (feature_tiers), não de uma lista à parte. */
  const includes = (tier: number) =>
    featureTiers.filter(f => LIVE_FEATURES.has(f.feature_id) && (f.min_tier ?? 0) >= 1 && f.min_tier <= tier).map(f => f.feature_label || f.feature_id);
  const tiersUsed = useMemo(() => Array.from(new Set([1, 2, ...plans.map(p => p.tier_level ?? 1)])).sort(), [plans]);
  const sorted = [...plans].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0) || (a.tier_level ?? 0) - (b.tier_level ?? 0) || money(a.price) - money(b.price));

  const open = (p: any | null) => {
    setForm(p ? { name: p.name ?? "", price: p.price ?? "", billing_type: p.billing_type ?? "monthly", tier_level: p.tier_level ?? 1 }
      : { name: "", price: "", billing_type: "monthly", tier_level: 1 });
    setConfirmDelete(false);
    setEditing(p ?? {});
  };

  const save = async () => {
    if (!form.name.trim() || !form.price.trim()) return;
    setBusy(true);
    const row = { name: form.name.trim(), price: form.price.trim(), billing_type: form.billing_type, tier_level: form.tier_level, features: includes(form.tier_level), price_mzn: null };
    const { error } = editing?.id
      ? await supabase.from("subscription_plans").update(row).eq("id", editing.id)
      : await supabase.from("subscription_plans").insert({ ...row, is_active: true });
    setBusy(false);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing?.id ? "Plano guardado" : "Plano criado" });
    setEditing(null);
    onChanged();
  };

  const toggle = async (p: any) => {
    const { error } = await supabase.from("subscription_plans").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: p.is_active ? "Plano escondido dos casais" : "Plano visível para os casais" });
    onChanged();
  };

  const remove = async () => {
    if (!editing?.id) return;
    setBusy(true);
    const { error } = await supabase.from("subscription_plans").delete().eq("id", editing.id);
    setBusy(false);
    if (error) {
      toast({ title: "Não dá para apagar", description: "Este plano já tem pagamentos ou casais. Desliga-o em vez de apagar.", variant: "destructive" });
      return;
    }
    toast({ title: "Plano apagado" });
    setEditing(null);
    onChanged();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-[13px]", MUTED)}>Os preços que os casais veem na app. O que cada nível inclui define-se em <b className="font-semibold text-[#0B1324] dark:text-foreground">Funções</b>.</p>
        <button className={cn(BTN, "inline-flex items-center gap-1.5")} onClick={() => open(null)}><Plus className="h-4 w-4" /> Novo plano</button>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(p => {
          const inc = includes(p.tier_level ?? 1);
          return (
            <div key={p.id} className={cn(CARD, "flex flex-col p-4", !p.is_active && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{p.name}</p>
                  <p className={cn("text-[12.5px]", MUTED)}>{BILLING.find(b => b[0] === p.billing_type)?.[1] ?? "Mensal"} · {TIER[p.tier_level] ?? `Nível ${p.tier_level}`}</p>
                </div>
                <Switch checked={!!p.is_active} onCheckedChange={() => toggle(p)} aria-label="Visível para os casais" />
              </div>
              <p className="mt-3 text-[24px] font-bold tracking-[-0.03em]">{p.price}</p>
              <p className={cn("mt-1 line-clamp-2 text-[12.5px] leading-relaxed", MUTED)}>
                {inc.length ? `Inclui ${inc.join(", ")}` : "Só as funções grátis"}
              </p>
              <div className="mt-auto pt-3">
                <button className={GHOST} onClick={() => open(p)}>Editar</button>
              </div>
            </div>
          );
        })}
      </div>
      {freeModeSlot && <div className="mt-6">{freeModeSlot}</div>}

      {editing && (
        <Modal title={editing.id ? "Editar plano" : "Novo plano"} subtitle={editing.id ? "As mudanças valem para quem paga a partir de agora" : undefined} onClose={() => !busy && setEditing(null)}>
          <div className="mt-4 space-y-4">
            <div>
              <label className={LABEL}>Nome</label>
              <input className={INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: LovePlus" />
            </div>
            <div>
              <label className={LABEL}>Preço (como aparece na app)</label>
              <input className={INPUT} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Ex.: 250 MZN" />
            </div>
            <div>
              <label className={LABEL}>Duração</label>
              <Chips value={form.billing_type} onChange={v => setForm({ ...form, billing_type: v })} options={BILLING} />
            </div>
            <div>
              <label className={LABEL}>Nível</label>
              <Chips value={String(form.tier_level)} onChange={v => setForm({ ...form, tier_level: Number(v) })}
                options={tiersUsed.map(t => [String(t), TIER[t] ?? `Nível ${t}`] as [string, string])} />
            </div>
            <div className="rounded-[14px] bg-[#F7F5F2] px-3.5 py-3 text-[13px] leading-relaxed dark:bg-muted">
              {includes(form.tier_level).length ? <>Inclui <b>{includes(form.tier_level).join(", ")}</b>.</> : "Só as funções grátis."}
            </div>
          </div>
          {confirmDelete ? (
            <div className="mt-4 rounded-[14px] bg-[#FDF3F2] px-3.5 py-3 text-[13px] text-[#8A1C1C]">
              Apagar este plano de vez? Se já tiver pagamentos, não dá: desliga-o em vez disso.
              <div className="mt-2.5 flex gap-2">
                <button className={GHOST} onClick={() => setConfirmDelete(false)} disabled={busy}>Não</button>
                <button className={cn(BTN, "bg-[#B91C1C] dark:bg-[#B91C1C] dark:text-white")} onClick={remove} disabled={busy}>Apagar</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              {editing.id && <button className={cn(GHOST, "h-11 rounded-[14px] text-[#B91C1C]")} onClick={() => setConfirmDelete(true)} disabled={busy}>Apagar</button>}
              <button onClick={() => setEditing(null)} disabled={busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
              <button onClick={save} disabled={busy || !form.name.trim() || !form.price.trim()} className={cn(BTN, "h-11 flex-1 rounded-[14px]")}>
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Guardar"}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

/* ─────────── Contas e WhatsApp ─────────── */

const VARS: [string, string, string][] = [
  ["{user_name}", "nome", "Ana"],
  ["{house_name}", "casa", "Ana & Rui"],
  ["{plan_name}", "plano", "LovePlus"],
  ["{plan_price}", "preço", "250 MZN"],
  ["{user_email}", "email", "ana@exemplo.com"],
];

function AccountsTab({ settings, onChanged }: { settings: any; onChanged: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ mpesa_number: "", emola_number: "", mkesh_number: "", account_name: "", whatsapp_number: "", whatsapp_message_template: "" });
  useEffect(() => {
    if (!settings) return;
    setF({
      mpesa_number: settings.mpesa_number ?? "", emola_number: settings.emola_number ?? "", mkesh_number: settings.mkesh_number ?? "",
      account_name: settings.account_name ?? "", whatsapp_number: settings.whatsapp_number ?? "", whatsapp_message_template: settings.whatsapp_message_template ?? "",
    });
  }, [settings]);

  const preview = VARS.reduce((m, [k, , ex]) => m.split(k).join(ex), f.whatsapp_message_template || "Olá, acabei de pagar o plano LoveNest. Segue o comprovativo.");

  const save = async () => {
    setBusy(true);
    const payload = { ...f, updated_at: new Date().toISOString() };
    const { error } = settings?.id
      ? await supabase.from("payment_settings").update(payload).eq("id", settings.id)
      : await supabase.from("payment_settings").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Guardado" });
    onChanged();
  };

  const field = (k: keyof typeof f, label: string, ph: string) => (
    <div>
      <label className={LABEL}>{label}</label>
      <input className={INPUT} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={ph} inputMode={k === "account_name" ? "text" : "tel"} />
    </div>
  );

  return (
    <div className="grid gap-3.5 md:grid-cols-2">
      <div className={cn(CARD, "p-4")}>
        <p className="text-[15px] font-bold">Contas para onde pagam</p>
        <p className={cn("mt-1 text-[13px] leading-relaxed", MUTED)}>Quando um casal escolhe um plano, a app mostra estes números para fazer a transferência. Deixa vazio o que não usas e esse método não aparece.</p>
        <div className="mt-4 space-y-3">
          {field("mpesa_number", "M-Pesa", "84 123 4567")}
          {field("emola_number", "e-Mola", "86 123 4567")}
          {field("mkesh_number", "mKesh", "82 123 4567")}
          {field("account_name", "Nome que aparece na conta", "Ex.: Dilson Quissico")}
        </div>
      </div>

      <div className={cn(CARD, "p-4")}>
        <p className="text-[15px] font-bold">WhatsApp do comprovativo</p>
        <p className={cn("mt-1 text-[13px] leading-relaxed", MUTED)}>Depois de pagar, o casal toca em "Enviar pelo WhatsApp" e abre uma conversa com este número, já com a mensagem escrita. Tu recebes o comprovativo e aprovas em Por aprovar.</p>
        <div className="mt-4 space-y-3">
          {field("whatsapp_number", "Número (com 258 à frente)", "258841234567")}
          <div>
            <label className={LABEL}>Mensagem que já vem escrita</label>
            <textarea rows={4} value={f.whatsapp_message_template} onChange={e => setF({ ...f, whatsapp_message_template: e.target.value })}
              className="w-full rounded-xl border border-[#ECE8E3] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#0B1324] dark:border-border dark:bg-card" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VARS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setF({ ...f, whatsapp_message_template: `${f.whatsapp_message_template}${f.whatsapp_message_template.endsWith(" ") || !f.whatsapp_message_template ? "" : " "}${k}` })}
                  className="h-7 rounded-full border border-[#ECE8E3] px-2.5 text-[12px] font-semibold text-[#4A5060] dark:border-border">+ {l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={LABEL}>Assim chega ao teu WhatsApp</p>
            <div className="rounded-[14px] rounded-tr-[4px] bg-[#E7F7EC] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#0B1324] dark:bg-muted dark:text-foreground">{preview}</div>
          </div>
        </div>
      </div>

      <div className="md:col-span-2">
        <button onClick={save} disabled={busy} className={cn(BTN, "h-11 rounded-[14px] px-6")}>{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Guardar"}</button>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGlyph } from "@/features/home/FeatureIcon";
import faisca from "@/features/entry/assets/faisca.webp";
import { notifyPartner } from "@/lib/notifyPartner";
import { cn } from "@/lib/utils";
import { addDays, daysBetween, getDayType, type CyclePhase } from "./engine";
import type { CycleData } from "./useCycleData";
import { CycleIcon } from "./CycleIcon";
import type { CycleIconKind } from "./cycleIconsSvg";
import { CycleRing } from "./CycleRing";
import { CycleSheet, btnGhost, btnInk, picked } from "./CycleSheet";
import {
  PHASE_SUGGESTIONS, SYMPTOMS, SYMPTOM_GROUPS, readSelection, selectionPayload, type SymptomKey,
} from "./cycleSymptoms";
import {
  CARD, CARD_TITLE, DAY_CLS, PHASE_CHIP, PHASE_GLYPH, PMS_CHIP, SymptomTile, WD_SHORT, asDate, fmtDay, relDay,
} from "./cycleUi";

const FLOWS: { value: string; label: string; icon: CycleIconKind }[] = [
  { value: "spotting", label: "Manchas", icon: "manchas" },
  { value: "light", label: "Pouco", icon: "fluxo1" },
  { value: "medium", label: "Médio", icon: "fluxo2" },
  { value: "heavy", label: "Muito", icon: "fluxo3" },
];

const PROTECTION = [
  { value: "nenhum", label: "Nenhum" },
  { value: "preservativo", label: "Preservativo" },
  { value: "pilula", label: "Pílula" },
  { value: "diu", label: "DIU" },
  { value: "outro", label: "Outro" },
];

/** Escolha de data: hoje, ontem ou outra (sem dias no futuro). */
function DatePick({ today, value, onChange, min }: { today: string; value: string; onChange: (v: string) => void; min?: string }) {
  const yesterday = addDays(today, -1);
  const other = value !== today && value !== yesterday;
  const chip = (on: boolean) => cn("h-10 rounded-full border border-[#ECE8E3] bg-white px-4 text-[13.5px] font-medium text-[#3A4150] dark:border-border dark:bg-card dark:text-foreground/80", on && cn(picked, "font-semibold text-[#0B1324] dark:text-foreground"));
  return (
    <div className="mt-5 space-y-3 text-left">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(value === today)} onClick={() => onChange(today)}>Hoje</button>
        {(!min || yesterday >= min) && <button type="button" className={chip(value === yesterday)} onClick={() => onChange(yesterday)}>Ontem</button>}
        <label className={cn(chip(other), "relative inline-flex cursor-pointer items-center")}>
          {other ? fmtDay(value) : "Outro dia"}
          <input type="date" value={value} max={today} min={min} onChange={(e) => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher data" />
        </label>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function CycleToday({ data, onOpenCalendar }: { data: CycleData; onOpenCalendar?: () => void }) {
  if (data.isMale && !data.profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-semibold text-foreground">Ciclo ainda por configurar</p>
        <p className="mx-auto mt-1 max-w-[30ch] text-[13px] text-muted-foreground">A tua parceira ainda não começou a acompanhar o ciclo.</p>
      </div>
    );
  }
  if (!data.engine || !data.lastPeriod) return <CycleWelcome data={data} />;
  return <TodayView data={data} onOpenCalendar={onOpenCalendar} />;
}

function TodayView({ data, onOpenCalendar }: { data: CycleData; onOpenCalendar?: () => void }) {
  const {
    engine, learned, lastPeriod, openPeriod, periods, todaySymptoms, todayIntimacy, profile,
    reload, ensureProfile, spaceId, user, today, pregnancyRisk,
  } = data;
  const e = engine!;

  // ── Registo do dia: guarda sozinho, sem botão ──────────────────────────────
  const [sel, setSel] = useState<Set<SymptomKey>>(() => readSelection(todaySymptoms));
  const [notes, setNotes] = useState(todaySymptoms?.notes ?? "");
  const [intimacy, setIntimacy] = useState<string | null>(todayIntimacy?.protection_method ?? null);
  const [savedAt, setSavedAt] = useState(0);
  const rowId = useRef<string | null>(todaySymptoms?.id ?? null);
  const rowPrev = useRef(todaySymptoms);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<number>();

  useEffect(() => {
    rowId.current = todaySymptoms?.id ?? null;
    rowPrev.current = todaySymptoms;
    setSel(readSelection(todaySymptoms));
    setNotes(todaySymptoms?.notes ?? "");
  }, [todaySymptoms]);
  useEffect(() => setIntimacy(todayIntimacy?.protection_method ?? null), [todayIntimacy]);

  const persist = useCallback((nextSel: Set<SymptomKey>, nextNotes: string) => {
    if (!user || !spaceId) return;
    // Em fila: dois toques rápidos nunca criam duas linhas para o mesmo dia.
    chain.current = chain.current.then(async () => {
      await ensureProfile();
      const payload = {
        user_id: user.id, couple_space_id: spaceId, day_key: today,
        ...selectionPayload(nextSel, rowPrev.current),
        notes: nextNotes.trim() || null,
        tpm: e.isInPmsWindow,
      };
      if (rowId.current) {
        await supabase.from("daily_symptoms").update(payload as any).eq("id", rowId.current);
      } else {
        const { data: row } = await supabase.from("daily_symptoms").insert(payload as any).select("id").single();
        rowId.current = (row as { id: string } | null)?.id ?? null;
      }
      setSavedAt(Date.now());
    }).catch((err) => console.error("[ciclo] guardar dia:", err));
  }, [user, spaceId, today, ensureProfile, e.isInPmsWindow]);

  const schedule = (nextSel: Set<SymptomKey>, nextNotes: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(nextSel, nextNotes), 500);
  };
  const toggle = (k: SymptomKey) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      schedule(next, notes);
      return next;
    });
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const saveIntimacy = async (method: string | null) => {
    if (!user || !spaceId) return;
    setIntimacy(method);
    await ensureProfile();
    if (method === null) {
      if (todayIntimacy) await (supabase.from("intimacy_logs" as any).delete().eq("id", todayIntimacy.id) as any);
    } else {
      await (supabase.from("intimacy_logs" as any).upsert(
        { user_id: user.id, couple_space_id: spaceId, day_key: today, protection_method: method },
        { onConflict: "user_id,couple_space_id,day_key" },
      ) as any);
    }
    setSavedAt(Date.now());
  };

  // "Guardado" aparece por instantes depois de cada gravação.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const t = window.setTimeout(() => setShowSaved(false), 1600);
    return () => window.clearTimeout(t);
  }, [savedAt]);

  // ── Período: começar, terminar e fluxo ─────────────────────────────────────
  const [flow, setFlow] = useState(openPeriod?.flow_level ?? "medium");
  useEffect(() => setFlow(openPeriod?.flow_level ?? "medium"), [openPeriod]);
  const [dateSheet, setDateSheet] = useState<null | "start" | "end">(null);
  const [pickDate, setPickDate] = useState(today);
  const [busy, setBusy] = useState(false);

  const tellPartner = (body: string) => {
    if (!spaceId || !profile || profile.share_level === "private") return;
    notifyPartner({ couple_space_id: spaceId, title: "Ciclo", body, url: "/ciclo", type: "ciclo_par" });
  };

  const startPeriod = async (date: string) => {
    if (!user || !spaceId) return;
    setBusy(true);
    await ensureProfile();
    await supabase.from("period_entries").insert({ user_id: user.id, couple_space_id: spaceId, start_date: date, flow_level: "medium" });
    tellPartner("O período começou");
    setBusy(false); setDateSheet(null); setAsk(null);
    reload();
  };
  const endPeriod = async (date: string) => {
    if (!openPeriod) return;
    setBusy(true);
    await supabase.from("period_entries").update({ end_date: date }).eq("id", openPeriod.id);
    tellPartner("O período terminou");
    setBusy(false); setDateSheet(null); setAsk(null);
    reload();
  };
  const changeFlow = async (value: string) => {
    if (!openPeriod) return;
    setFlow(value);
    await supabase.from("period_entries").update({ flow_level: value }).eq("id", openPeriod.id);
    setSavedAt(Date.now());
  };

  // ── Perguntas automáticas (menos registo manual) ───────────────────────────
  // No dia previsto pergunta se já começou; se o período passa do costume,
  // pergunta se já terminou. "Ainda não" volta a perguntar no dia seguinte.
  const periodDay = openPeriod ? daysBetween(openPeriod.start_date, today) + 1 : 0;
  const askKey = `cycle_ask_${openPeriod ? "end" : "start"}_${today}`;
  const wantsAsk = openPeriod ? periodDay > e.periodLength : e.daysUntilNextPeriod <= 0;
  const [ask, setAsk] = useState<null | "start" | "end">(null);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(askKey); } catch { /* sem armazenamento */ }
    if (!wantsAsk || dismissed) return;
    const t = window.setTimeout(() => setAsk(openPeriod ? "end" : "start"), 900);
    return () => window.clearTimeout(t);
  }, [askKey, wantsAsk, openPeriod]);
  const dismissAsk = () => {
    try { localStorage.setItem(askKey, "1"); } catch { /* sem armazenamento */ }
    setAsk(null);
  };

  // ── Textos do topo ─────────────────────────────────────────────────────────
  // Com um período aberto é sempre "Período", mesmo que dure mais do que o costume.
  const phase: CyclePhase = openPeriod ? "menstrual" : e.phase;
  const chip = e.isInPmsWindow && !openPeriod ? PMS_CHIP : PHASE_CHIP[phase];
  const late = !openPeriod && e.daysUntilNextPeriod < 0;
  let headline: string;
  let sub: string;
  if (openPeriod) {
    const end = addDays(openPeriod.start_date, e.periodLength - 1);
    headline = periodDay <= e.periodLength ? `Deve terminar ${relDay(end, today)}` : `Dia ${periodDay} do período`;
    sub = `Costuma durar ${e.periodLength} dias · cuida de ti`;
  } else {
    const n = e.daysUntilNextPeriod;
    headline = n > 1 ? `Menstruação daqui a ${n} dias` : n === 1 ? "Menstruação prevista para amanhã" : n === 0 ? "Menstruação prevista para hoje" : `Atraso de ${-n} ${n === -1 ? "dia" : "dias"}`;
    sub = late
      ? "Pequenos atrasos são comuns. Se já começou, marca abaixo."
      : `Prevista para ${fmtDay(e.nextPeriodStr)} · ${learned.cyclesUsed ? `aprendida com ${learned.cyclesUsed} ${learned.cyclesUsed === 1 ? "ciclo" : "ciclos"}` : "estimativa inicial"}`;
  }

  // ── Próximos 7 dias ────────────────────────────────────────────────────────
  const week = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(today, i);
    let type = getDayType(iso, e, periods, today) as string;
    if (!openPeriod && iso >= e.nextPeriodStr && iso < addDays(e.nextPeriodStr, e.periodLength)) type = "predicted";
    return { iso, type };
  });
  const firstOf = (t: string) => week.find((d) => d.type === t && d.iso !== today);
  const weekNote = (() => {
    const pred = firstOf("predicted");
    if (pred) return `O período deve chegar ${relDay(pred.iso, today)}.`;
    const pms = firstOf("pms");
    if (pms && !e.isInPmsWindow) return `A partir de ${relDay(pms.iso, today)} é comum sentir mais cansaço e sensibilidade.`;
    const fertile = firstOf("fertile") ?? firstOf("ovulation");
    if (fertile && !e.isInFertileWindow) return `A janela fértil começa ${relDay(fertile.iso, today)}.`;
    if (e.isInFertileWindow) return "Estás na janela fértil.";
    if (e.isInPmsWindow) return "Dias de TPM: sê gentil contigo.";
    return null;
  })();
  const suggestions = PHASE_SUGGESTIONS[phase];
  const [moreOpen, setMoreOpen] = useState(false);
  const extra = [...sel].filter((k) => !suggestions.includes(k)).length;

  return (
    <div className="space-y-3.5">
      {/* ── Anel e previsão ── */}
      <div className="flex flex-col items-center pt-1">
        <CycleRing engine={e} lastPeriodDate={lastPeriod!.start_date} periodDays={openPeriod ? Math.max(periodDay, e.periodLength) : undefined}>
          <FeatureGlyph kind={PHASE_GLYPH[phase]} size={30} />
          <span className="mt-1 text-[46px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">Dia {e.cycleDay}</span>
          <span className={cn("mt-2 rounded-full px-3 py-1 text-[13px] font-semibold", chip.cls)}>{chip.label}</span>
        </CycleRing>
        <p className="mt-1.5 text-center text-[17px] font-semibold tracking-[-0.02em] text-foreground">{headline}</p>
        <p className="mt-0.5 max-w-[36ch] text-center text-[13px] text-muted-foreground">
          {/* Cada parte fica inteira numa linha; a quebra só acontece entre partes. */}
          {sub.split(" · ").map((part, i, all) => (
            <span key={i}>{i > 0 && " · "}<span className={cn(all.length > 1 && "whitespace-nowrap")}>{part}</span></span>
          ))}
        </p>
      </div>

      {/* ── Fluxo (só durante o período) ── */}
      {openPeriod && (
        <section className={CARD}>
          <h3 className={cn(CARD_TITLE, "mb-3")}>Fluxo de hoje</h3>
          <div className="flex gap-2">
            {FLOWS.map((f) => (
              <button key={f.value} type="button" onClick={() => changeFlow(f.value)} aria-pressed={flow === f.value}
                className={cn("flex flex-1 flex-col items-center gap-1 rounded-2xl border border-[#ECE8E3] px-1 pb-2 pt-2.5 text-[11.5px] font-semibold text-[#3A4150] transition-[border-color,box-shadow] dark:border-border dark:text-foreground/80",
                  flow === f.value && cn(picked, "text-[#0B1324] dark:text-foreground"))}>
                <CycleIcon kind={f.icon} size={30} />{f.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Como estás hoje ── */}
      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className={CARD_TITLE}>Como estás hoje?</h3>
          <span className={cn("text-[12px] transition-colors", showSaved ? "font-semibold text-[#23733F]" : "text-muted-foreground")}>
            {showSaved ? "Guardado" : "Toca no que sentes"}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-x-1 gap-y-3">
          {suggestions.map((k) => (
            <SymptomTile key={k} icon={SYMPTOMS[k].icon} label={SYMPTOMS[k].label} on={sel.has(k)} onClick={() => toggle(k)} />
          ))}
          <SymptomTile icon="mais" label={extra ? `Mais · ${extra}` : "Mais"} dashed onClick={() => setMoreOpen(true)} />
        </div>
      </section>

      {/* ── Próximos dias ── */}
      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className={CARD_TITLE}>Próximos dias</h3>
          {onOpenCalendar && (
            <button type="button" onClick={onOpenCalendar} className="text-[13px] font-semibold text-foreground underline underline-offset-[3px]">Calendário</button>
          )}
        </div>
        <div className="flex justify-between">
          {week.map(({ iso, type }) => {
            const d = asDate(iso);
            const isToday = iso === today;
            return (
              <div key={iso} className="flex w-10 flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{isToday ? "Hoje" : WD_SHORT[d.getDay()]}</span>
                <span className={cn("grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-semibold tabular-nums text-[#3A4150] dark:text-foreground/80",
                  isToday ? "bg-[#0B1324] text-white dark:bg-foreground dark:text-background" : DAY_CLS[type])}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
        {weekNote && <p className="mt-2.5 text-[12.5px] leading-snug text-muted-foreground">{weekNote}</p>}
      </section>

      {/* ── Risco de gravidez (só quando há algo a dizer) ── */}
      {(pregnancyRisk.level === "alto" || pregnancyRisk.level === "moderado") && (
        <section className={cn(CARD, "flex items-start gap-3")}>
          <CycleIcon kind="intimidade" size={30} />
          <div>
            <p className="text-[14px] font-semibold text-foreground">{pregnancyRisk.label}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{pregnancyRisk.description}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground/80">Estimativa informativa. Não substitui um método contracetivo nem aconselhamento médico.</p>
          </div>
        </section>
      )}

      {/* ── Começou / terminou ── */}
      <button type="button" className={btnGhost} onClick={() => { setPickDate(today); setDateSheet(openPeriod ? "end" : "start"); }}>
        {openPeriod ? "O período terminou" : "O período começou"}
      </button>

      {/* ── Folha: todos os sintomas ── */}
      <CycleSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="O que sentes hoje" description="Tudo opcional. Guarda sozinho.">
        {SYMPTOM_GROUPS.map((g) => (
          <div key={g} className="mt-4">
            <p className="mb-2.5 text-[12px] font-semibold text-muted-foreground">{g}</p>
            <div className="grid grid-cols-4 gap-x-1.5 gap-y-3.5">
              {(Object.keys(SYMPTOMS) as SymptomKey[]).filter((k) => SYMPTOMS[k].group === g).map((k) => (
                <SymptomTile key={k} icon={SYMPTOMS[k].icon} label={SYMPTOMS[k].label} on={sel.has(k)} onClick={() => toggle(k)} />
              ))}
              {g === "Também" && (
                <SymptomTile icon="intimidade" label="Intimidade" on={intimacy !== null}
                  onClick={() => saveIntimacy(intimacy === null ? "nenhum" : null)} />
              )}
            </div>
          </div>
        ))}
        {intimacy !== null && (
          <div className="mt-4">
            <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Prevenção</p>
            <div className="flex flex-wrap gap-2">
              {PROTECTION.map((p) => (
                <button key={p.value} type="button" onClick={() => saveIntimacy(p.value)} aria-pressed={intimacy === p.value}
                  className={cn("h-9 rounded-full border border-[#ECE8E3] px-3.5 text-[13px] font-medium text-[#3A4150] dark:border-border dark:text-foreground/80",
                    intimacy === p.value && cn(picked, "font-semibold text-[#0B1324] dark:text-foreground"))}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5">
          <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Nota</p>
          <textarea value={notes} rows={2} placeholder="Algo que queiras lembrar sobre hoje"
            onChange={(ev) => { setNotes(ev.target.value); schedule(sel, ev.target.value); }}
            className="w-full resize-none rounded-[16px] border border-[#ECE8E3] bg-[#F7F5F2] px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-[#77736C] focus:border-[#0B1324] focus:bg-white dark:border-border dark:bg-muted dark:focus:bg-card" />
        </div>
        <button type="button" className={cn(btnInk, "mt-4")} onClick={() => setMoreOpen(false)}>Feito</button>
      </CycleSheet>

      {/* ── Folha: data de início/fim ── */}
      <CycleSheet open={dateSheet !== null} onClose={() => setDateSheet(null)}
        title={dateSheet === "end" ? "Quando terminou?" : "Quando começou?"}
        description={dateSheet === "end" ? "Marca o último dia com fluxo." : "Marca o primeiro dia com fluxo."}>
        <DatePick today={today} value={pickDate} onChange={setPickDate} min={dateSheet === "end" ? openPeriod?.start_date : undefined} />
        <button type="button" disabled={busy} className={cn(btnInk, "mt-5")}
          onClick={() => (dateSheet === "end" ? endPeriod(pickDate) : startPeriod(pickDate))}>
          Guardar
        </button>
      </CycleSheet>

      {/* ── Folha: a app pergunta ── */}
      <CycleSheet open={ask !== null} onClose={dismissAsk}
        hero={<img src={faisca} alt="" className="mx-auto h-28 w-28 object-contain" />}
        title={ask === "end" ? "Ainda estás com o período?" : "Já começou?"}
        description={ask === "end"
          ? `Já vai no dia ${periodDay}, mais do que o costume. Se já terminou, eu marco por ti.`
          : `${e.daysUntilNextPeriod < 0 ? `Estava previsto para ${relDay(e.nextPeriodStr, today)}.` : "Hoje é o dia previsto."} Se já veio, eu marco por ti e ajusto as próximas previsões.`}>
        <div className="mt-5 grid gap-2.5">
          {ask === "end" ? (
            <>
              <button type="button" disabled={busy} className={btnInk} onClick={() => endPeriod(addDays(today, -1))}>Já terminou</button>
              <button type="button" className={btnGhost} onClick={() => { setAsk(null); setPickDate(today); setDateSheet("end"); }}>Terminou noutro dia</button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} className={btnInk} onClick={() => startPeriod(today)}>Sim, começou hoje</button>
              <button type="button" className={btnGhost} onClick={() => { setAsk(null); setPickDate(addDays(today, -1)); setDateSheet("start"); }}>Começou noutro dia</button>
            </>
          )}
          <button type="button" onClick={dismissAsk} className="mt-1 text-[13px] text-muted-foreground">
            {ask === "end" ? "Ainda estou" : "Ainda não"} · <span className="font-semibold text-foreground">pergunta amanhã</span>
          </button>
        </div>
      </CycleSheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Primeira vez: duas perguntas, o resto aprende-se.

function CycleWelcome({ data }: { data: CycleData }) {
  const { user, spaceId, today, ensureProfile, reload } = data;
  const [start, setStart] = useState(addDays(today, -7));
  const [days, setDays] = useState<number | null>(5);
  const [busy, setBusy] = useState(false);
  const weekAgo = addDays(today, -7);
  const chip = (on: boolean) => cn("h-10 rounded-full border border-[#ECE8E3] bg-white px-4 text-[13.5px] font-medium text-[#3A4150] dark:border-border dark:bg-card dark:text-foreground/80", on && cn(picked, "font-semibold text-[#0B1324] dark:text-foreground"));
  const other = ![today, addDays(today, -1), weekAgo].includes(start);

  const begin = async () => {
    if (!user || !spaceId) return;
    setBusy(true);
    const profile = await ensureProfile();
    if (profile && days) await supabase.from("cycle_profiles").update({ avg_period_length: days }).eq("id", profile.id);
    const end = addDays(start, (days ?? 5) - 1);
    await supabase.from("period_entries").insert({
      user_id: user.id, couple_space_id: spaceId, start_date: start,
      end_date: end < today ? end : null, flow_level: "medium",
    });
    setBusy(false);
    reload();
  };

  return (
    <div className="flex flex-col gap-5 pt-2">
      <img src={faisca} alt="" className="mx-auto h-28 w-28 object-contain" />
      <div className="text-center">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-foreground">Vamos conhecer o teu ciclo</h2>
        <p className="mx-auto mt-1.5 max-w-[32ch] text-[14px] leading-normal text-muted-foreground">Duas perguntas e eu trato das contas. Vou aprendendo contigo a cada mês.</p>
      </div>
      <div>
        <p className="mb-2.5 text-[15px] font-semibold text-foreground">Quando começou a última menstruação?</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(start === today)} onClick={() => setStart(today)}>Hoje</button>
          <button type="button" className={chip(start === addDays(today, -1))} onClick={() => setStart(addDays(today, -1))}>Ontem</button>
          <button type="button" className={chip(start === weekAgo)} onClick={() => setStart(weekAgo)}>Há 1 semana</button>
          <label className={cn(chip(other), "relative inline-flex cursor-pointer items-center")}>
            {other ? fmtDay(start) : "Escolher data"}
            <input type="date" value={start} max={today} onChange={(ev) => ev.target.value && setStart(ev.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher data" />
          </label>
        </div>
      </div>
      <div>
        <p className="mb-2.5 text-[15px] font-semibold text-foreground">Quantos dias costuma durar?</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button type="button" aria-label="Menos um dia" onClick={() => setDays((d) => Math.max(2, (d ?? 5) - 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#ECE8E3] text-[20px] text-foreground dark:border-border">−</button>
            <span className="min-w-[80px] text-center text-[22px] font-bold tracking-[-0.03em] text-foreground">{days ? `${days} dias` : "Não sei"}</span>
            <button type="button" aria-label="Mais um dia" onClick={() => setDays((d) => Math.min(10, (d ?? 5) + 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#ECE8E3] text-[20px] text-foreground dark:border-border">+</button>
          </div>
          <button type="button" onClick={() => setDays(null)}
            className={cn("text-[13px] font-semibold underline underline-offset-[3px]", days === null ? "text-foreground" : "text-muted-foreground")}>Não sei</button>
        </div>
      </div>
      <button type="button" disabled={busy} className={cn(btnInk, "mt-2")} onClick={begin}>Começar →</button>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGlyph } from "@/features/home/FeatureIcon";
import { cn } from "@/lib/utils";
import { addDays, daysBetween } from "./engine";
import type { CycleData, DailySymptom } from "./useCycleData";
import { CycleIcon } from "./CycleIcon";
import { SYMPTOMS, readSelection } from "./cycleSymptoms";
import { CARD, CARD_TITLE, DAY_CLS, MONTHS_LONG, ROUND, SubHeader, asDate } from "./cycleUi";

const WD = ["S", "T", "Q", "Q", "S", "S", "D"];
const FLOW_LABEL: Record<string, string> = { spotting: "Manchas", light: "Fluxo pouco", medium: "Fluxo médio", heavy: "Fluxo muito" };
const KIND_LABEL: Record<string, string> = {
  period: "Período", predicted: "Período previsto", fertile: "Janela fértil", ovulation: "Ovulação prevista", pms: "Dias de TPM",
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CycleCalendar({ data, onBack, onOpenHistory }: { data: CycleData; onBack: () => void; onOpenHistory: () => void }) {
  const { engine: e, periods, lastPeriod, learned, today, targetUserId } = data;
  const [month, setMonth] = useState(() => { const d = asDate(today); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today);
  const [logs, setLogs] = useState<Record<string, DailySymptom>>({});

  const first = iso(month);
  const last = iso(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  // Registos do mês, para os pontos e o resumo do dia.
  useEffect(() => {
    if (!targetUserId) return;
    let alive = true;
    supabase.from("daily_symptoms").select("*").eq("user_id", targetUserId).gte("day_key", first).lte("day_key", last)
      .then(({ data: rows }) => {
        if (!alive) return;
        setLogs(Object.fromEntries(((rows as DailySymptom[] | null) ?? []).map((r) => [r.day_key, r])));
      });
    return () => { alive = false; };
  }, [targetUserId, first, last]);

  // Tipo de cada dia: períodos registados no passado; fases e períodos
  // previstos a partir do ciclo atual (até 4 ciclos para a frente).
  const kindOf = useMemo(() => {
    const len = e?.cycleLength ?? 28;
    const start = lastPeriod?.start_date;
    const fertileOff = e && start ? daysBetween(start, e.fertileStartStr) : 0;
    const ovuOff = e && start ? daysBetween(start, e.ovulationDateStr) : 0;
    const pmsDays = e ? daysBetween(e.pmsStartStr, e.nextPeriodStr) : 0;
    return (day: string): string => {
      for (const p of periods) {
        const end = p.end_date ?? addDays(p.start_date, (e?.periodLength ?? 5) - 1);
        if (day >= p.start_date && day <= end) return "period";
      }
      if (!e || !start || day < start) return "";
      for (let k = 0; k < 4; k++) {
        const s = addDays(start, k * len);
        if (k > 0 && day >= s && day < addDays(s, e.periodLength)) return "predicted";
        if (day === addDays(s, ovuOff)) return "ovulation";
        if (day >= addDays(s, fertileOff) && day < addDays(s, ovuOff)) return "fertile";
        if (day >= addDays(s, len - pmsDays) && day < addDays(s, len)) return "pms";
      }
      return "";
    };
  }, [e, periods, lastPeriod]);

  const cells = useMemo(() => {
    const lead = (month.getDay() + 6) % 7;
    const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => iso(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  }, [month]);

  // Resumo do dia tocado.
  const sel = selected >= first && selected <= last ? selected : null;
  const selKind = sel ? kindOf(sel) : "";
  const selPeriod = sel ? periods.find((p) => sel >= p.start_date && sel <= (p.end_date ?? addDays(p.start_date, (e?.periodLength ?? 5) - 1))) : undefined;
  const cycleStart = sel ? [...periods].map((p) => p.start_date).filter((s) => s <= sel).sort().pop() : undefined;
  const cycleDay = sel && cycleStart ? (e && sel >= (lastPeriod?.start_date ?? "") ? (daysBetween(lastPeriod!.start_date, sel) % e.cycleLength) + 1 : daysBetween(cycleStart, sel) + 1) : null;
  const symptoms = sel ? [...readSelection(logs[sel])].map((k) => SYMPTOMS[k].label) : [];
  const detail = [
    selPeriod ? FLOW_LABEL[selPeriod.flow_level] ?? "Período" : sel && sel > today && selKind ? KIND_LABEL[selKind] : null,
    ...symptoms,
  ].filter(Boolean).join(" · ");

  const move = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="space-y-4">
      <SubHeader title="Calendário" onBack={onBack} />

      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" onClick={() => move(-1)} className={ROUND}><ChevronLeft className="h-[18px] w-[18px]" /></button>
        <div className="text-center">
          <p className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">{MONTHS_LONG[month.getMonth()][0].toUpperCase() + MONTHS_LONG[month.getMonth()].slice(1)}</p>
          <p className="text-[12px] text-muted-foreground">{month.getFullYear()}</p>
        </div>
        <button type="button" aria-label="Mês seguinte" onClick={() => move(1)} className={ROUND}><ChevronRight className="h-[18px] w-[18px]" /></button>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {WD.map((w, i) => <span key={i} className="pb-1 text-[11px] font-semibold text-muted-foreground">{w}</span>)}
        {cells.map((day, i) => {
          if (!day) return <span key={`b${i}`} />;
          const kind = kindOf(day);
          const isToday = day === today;
          const hasLog = !!logs[day] && readSelection(logs[day]).size > 0;
          return (
            <button key={day} type="button" onClick={() => setSelected(day)} aria-label={day}
              className="relative flex h-[42px] items-center justify-center">
              <span className={cn(
                "grid h-[36px] w-[36px] place-items-center rounded-full text-[13.5px] font-medium tabular-nums text-[#3A4150] dark:text-foreground/80",
                isToday ? "bg-[#0B1324] font-semibold text-white dark:bg-foreground dark:text-background" : DAY_CLS[kind],
                selected === day && !isToday && "ring-2 ring-[#0B1324] ring-offset-2 ring-offset-white dark:ring-foreground dark:ring-offset-background",
              )}>
                {asDate(day).getDate()}
              </span>
              {hasLog && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-[#0B1324]/45 dark:bg-foreground/50" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-2 text-[12px] text-[#3A4150] dark:text-foreground/75">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#E8456B]" />Período</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-[1.6px] border-dashed border-[#E8456B]" />Previsto</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#CDE9F9]" />Fértil</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#FFF4DA] shadow-[inset_0_0_0_1.6px_#F2A91F]" />Ovulação</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#E2DAFD]" />TPM</span>
      </div>

      {sel && (
        <section className={cn(CARD, "flex items-center gap-3")}>
          {selKind === "period" || selKind === "predicted" ? <FeatureGlyph kind="menstrual" size={32} /> : <CycleIcon kind="calendario" size={32} />}
          <div className="min-w-0 flex-1">
            <p className={CARD_TITLE}>
              {asDate(sel).getDate()} de {MONTHS_LONG[asDate(sel).getMonth()]}{cycleDay ? ` · Dia ${cycleDay}` : ""}
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {detail || (sel > today ? "Ainda não chegou." : "Sem registos neste dia.")}
            </p>
          </div>
        </section>
      )}

      <button type="button" onClick={onOpenHistory} className={cn(CARD, "flex w-full items-center gap-3 text-left transition-colors hover:bg-[#F7F5F2] dark:hover:bg-muted")}>
        <div className="min-w-0 flex-1">
          <p className={CARD_TITLE}>O teu ritmo</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Ciclo de {e?.cycleLength ?? 28} dias · período de {e?.periodLength ?? 5} dias
          </p>
        </div>
        {learned.cyclesUsed >= 2 && (
          <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold",
            learned.regular ? "bg-[#EEF8F1] text-[#23733F]" : "bg-[#FFF4DA] text-[#8A5A06]")}>
            {learned.regular ? "Regular" : "Irregular"}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

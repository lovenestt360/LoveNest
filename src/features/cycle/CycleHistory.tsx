import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { addDays, daysBetween } from "./engine";
import type { CycleData, DailySymptom } from "./useCycleData";
import { CycleIcon } from "./CycleIcon";
import { SYMPTOMS, readSelection, type SymptomKey } from "./cycleSymptoms";
import { CARD, CARD_TITLE, MONTHS, ROUND, SubHeader, asDate } from "./cycleUi";

type Moment = "periodo" | "antes" | "outro";
const MOMENT_TEXT: Record<Moment, string> = {
  periodo: "sobretudo durante o período",
  antes: "sobretudo nos dias antes do período",
  outro: "noutras fases do ciclo",
};

export function CycleHistory({
  data, onBack, onOpenShare, onReset,
}: { data: CycleData; onBack: () => void; onOpenShare: () => void; onReset: () => void }) {
  const { engine: e, learned, periods, lastPeriod, today, targetUserId } = data;
  const [rows, setRows] = useState<DailySymptom[]>([]);

  // Seis meses de registos, para descobrir o que se repete.
  useEffect(() => {
    if (!targetUserId) return;
    let alive = true;
    supabase.from("daily_symptoms").select("*").eq("user_id", targetUserId).gte("day_key", addDays(today, -200))
      .then(({ data: r }) => { if (alive) setRows((r as DailySymptom[] | null) ?? []); });
    return () => { alive = false; };
  }, [targetUserId, today]);

  const repeats = useMemo(() => {
    const starts = periods.map((p) => p.start_date).sort();
    const momentOf = (day: string): Moment => {
      for (const p of periods) {
        const end = p.end_date ?? addDays(p.start_date, (e?.periodLength ?? 5) - 1);
        if (day >= p.start_date && day <= end) return "periodo";
      }
      const next = starts.find((s) => s > day);
      return next && daysBetween(day, next) <= 5 ? "antes" : "outro";
    };
    const tally = new Map<SymptomKey, { days: number; moments: Record<Moment, number> }>();
    for (const r of rows) {
      const m = momentOf(r.day_key);
      for (const k of readSelection(r)) {
        const t = tally.get(k) ?? { days: 0, moments: { periodo: 0, antes: 0, outro: 0 } };
        t.days++; t.moments[m]++;
        tally.set(k, t);
      }
    }
    return [...tally.entries()]
      .filter(([, t]) => t.days >= 2)
      .sort((a, b) => b[1].days - a[1].days)
      .slice(0, 4)
      .map(([k, t]) => {
        const top = (Object.keys(t.moments) as Moment[]).sort((a, b) => t.moments[b] - t.moments[a])[0];
        return { key: k, days: t.days, moment: top };
      });
  }, [rows, periods, e?.periodLength]);

  // Barras: o ciclo em curso e os últimos completos.
  const pmsDays = e ? daysBetween(e.pmsStartStr, e.nextPeriodStr) : 5;
  const bars = [
    ...(lastPeriod && e ? [{ label: "Agora", start: lastPeriod.start_date, length: Math.min(e.cycleDay, e.cycleLength), period: e.periodLength, current: true }] : []),
    ...learned.cycles.map((c) => ({ label: MONTHS[asDate(c.start).getMonth()], start: c.start, length: c.length, period: c.periodLength ?? e?.periodLength ?? 5, current: false })),
  ];
  const scale = Math.max(35, ...bars.map((b) => b.length), e?.cycleLength ?? 28);

  const stat = (value: string, label: string) => (
    <div className="rounded-[18px] border border-[#ECE8E3] px-3 py-3 dark:border-border">
      <p className="text-[20px] font-bold tracking-[-0.03em] text-foreground">{value}</p>
      <p className="text-[11.5px] text-muted-foreground">{label}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <SubHeader title="Histórico" onBack={onBack}
        right={<button type="button" onClick={onOpenShare} aria-label="Partilha com o par" className={ROUND}><CycleIcon kind="partilha" size={22} /></button>} />

      <div className="grid grid-cols-3 gap-2">
        {stat(`${e?.cycleLength ?? 28} dias`, "Ciclo médio")}
        {stat(`${e?.periodLength ?? 5} dias`, "Período médio")}
        {stat(learned.cyclesUsed >= 2 ? `±${learned.variation} dias` : "—", "Variação")}
      </div>

      <section className={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className={CARD_TITLE}>Últimos ciclos</h3>
          {learned.cyclesUsed >= 2 && (
            <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold",
              learned.regular ? "bg-[#EEF8F1] text-[#23733F]" : "bg-[#FFF4DA] text-[#8A5A06]")}>
              {learned.regular ? "Regular" : "Irregular"}
            </span>
          )}
        </div>
        {bars.length ? (
          <div className="grid gap-2.5">
            {bars.map((b) => (
              <div key={b.start} className="grid grid-cols-[44px_1fr_26px] items-center gap-2 text-[12px] text-muted-foreground">
                <span className="capitalize">{b.label}</span>
                <div className="relative h-3 overflow-hidden rounded-md">
                  <div className={cn("absolute inset-y-0 left-0 rounded-md", b.current ? "bg-[#F4F1EC] dark:bg-muted" : "bg-[#F4F1EC] dark:bg-muted")}
                    style={{ width: `${(b.length / scale) * 100}%` }} />
                  {b.current && <div className="absolute inset-y-0 left-0 rounded-md border-[1.5px] border-dashed border-[#DCD7CF] dark:border-border" style={{ width: `${((e?.cycleLength ?? 28) / scale) * 100}%` }} />}
                  {!b.current && <div className="absolute inset-y-0 rounded-md bg-[#DCD4FB]" style={{ left: `${((b.length - pmsDays) / scale) * 100}%`, width: `${(pmsDays / scale) * 100}%` }} />}
                  <div className="absolute inset-y-0 left-0 rounded-md bg-[#E8456B]" style={{ width: `${(b.period / scale) * 100}%` }} />
                </div>
                <b className="text-right text-[12.5px] font-semibold tabular-nums text-foreground">{b.length}</b>
              </div>
            ))}
            <p className="mt-1 text-[12px] text-muted-foreground">Rosa: período · lilás: dias de TPM</p>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Ainda sem ciclos completos.</p>
        )}
        {learned.cyclesUsed < 2 && bars.length > 0 && (
          <p className="mt-2 text-[12px] text-muted-foreground">Com mais um ou dois ciclos registados, as previsões ficam mais certas.</p>
        )}
      </section>

      <section className={CARD}>
        <h3 className={cn(CARD_TITLE, "mb-1")}>O que se repete</h3>
        {repeats.length ? repeats.map((r, i) => (
          <div key={r.key} className={cn("flex items-center gap-3 py-2.5", i > 0 && "border-t border-[#ECE8E3] dark:border-border")}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#ECE8E3] dark:border-border">
              <CycleIcon kind={SYMPTOMS[r.key].icon} size={30} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">{SYMPTOMS[r.key].label}</p>
              <p className="text-[12.5px] text-muted-foreground">Em {r.days} dias, {MOMENT_TEXT[r.moment]}</p>
            </div>
          </div>
        )) : (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            Quando tocares no que sentes, aqui vais ver o que se repete e em que altura do ciclo.
          </p>
        )}
      </section>

      <button type="button" onClick={onReset} className="mx-auto block pt-1 text-[13px] font-medium text-[#C92D52] underline underline-offset-[3px]">
        Apagar os dados do ciclo
      </button>
    </div>
  );
}

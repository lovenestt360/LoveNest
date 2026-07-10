import { cn } from "@/lib/utils";
import { addDays, getDayType } from "./engine";
import type { DayType } from "./engine";
import type { CycleData } from "./useCycleData";

// Pill fill per day type — solid = já aconteceu, tracejado = previsto
// Each phase has its own hue so they're distinguishable at a glance.
function pillClass(dayType: DayType, isFuture: boolean): string {
  switch (dayType) {
    case "period":
      return isFuture
        ? "border border-dashed border-rose-400 dark:border-rose-700"
        : "bg-rose-500";
    case "ovulation":
      return isFuture
        ? "border border-dashed border-emerald-400 dark:border-emerald-600"
        : "bg-emerald-400 dark:bg-emerald-600/70";
    case "fertile":
      return isFuture
        ? "border border-dashed border-sky-300 dark:border-sky-600"
        : "bg-sky-300 dark:bg-sky-600/60";
    case "pms":
      return isFuture
        ? "border border-dashed border-violet-300 dark:border-violet-600"
        : "bg-violet-300 dark:bg-violet-600/50";
    default:
      return "bg-muted border border-border";
  }
}

export function CycleHistoryStrip({ data }: { data: CycleData }) {
  const { engine, periods, lastPeriod, today } = data;
  if (!engine || !lastPeriod) return null;

  const totalDays = Math.max(engine.cycleLength, engine.cycleDay);
  const days = Array.from({ length: totalDays }, (_, i) => {
    const dayStr = addDays(lastPeriod.start_date, i);
    return {
      dayStr,
      dayType: getDayType(dayStr, engine, periods, today),
      isToday: dayStr === today,
      isFuture: dayStr > today,
    };
  });

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Histórico do ciclo</p>
        <p className="text-xs text-muted-foreground">Dia {engine.cycleDay} de {engine.cycleLength}</p>
      </div>

      <div className="flex items-center gap-[3px]">
        {days.map(({ dayStr, dayType, isToday, isFuture }) => (
          <div
            key={dayStr}
            className={cn(
              "flex-1 h-7 rounded-full transition-colors",
              pillClass(dayType, isFuture),
              isToday && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-card animate-glow-pulse"
            )}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Período
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 dark:bg-emerald-600/70" />
          Ovulação
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-300 dark:bg-sky-600/60" />
          Fértil
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-300 dark:bg-violet-600/50" />
          TPM
        </span>
      </div>
    </div>
  );
}

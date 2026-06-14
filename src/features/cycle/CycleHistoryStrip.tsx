import { cn } from "@/lib/utils";
import { addDays, getDayType } from "./engine";
import type { DayType } from "./engine";
import type { CycleData } from "./useCycleData";

// Pill fill per day type — solid = já aconteceu, tracejado = previsto
function pillClass(dayType: DayType, isFuture: boolean): string {
  switch (dayType) {
    case "period":
      return "bg-rose-500";
    case "ovulation":
      return isFuture
        ? "border border-dashed border-rose-300 dark:border-rose-800"
        : "bg-rose-300 dark:bg-rose-800/60";
    case "fertile":
      return isFuture
        ? "border border-dashed border-rose-200 dark:border-rose-900"
        : "bg-rose-100 dark:bg-rose-950/40";
    case "pms":
      return isFuture
        ? "border border-dashed border-border"
        : "bg-muted-foreground/15";
    default:
      return "bg-muted";
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
              isToday && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-card"
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
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300 dark:bg-rose-800/60" />
          Ovulação
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-100 dark:bg-rose-950/40" />
          Fértil
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-rose-300 dark:border-rose-800" />
          Previsto
        </span>
      </div>
    </div>
  );
}

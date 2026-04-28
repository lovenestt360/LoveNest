import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineDayLog } from "@/hooks/useRoutineLogs";

const WEEK_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface RoutineCalendarProps {
  logs: RoutineDayLog[];
  year: number;
  month: number;
  onChangeMonth: (y: number, m: number) => void;
  onSelectDay?: (day: string) => void;
  selectedDay?: string;
  hideLegendStatus?: ("completed" | "partial" | "failed")[];
}

// Status → small dot color only (not full cell bg)
function dotColor(status: string | undefined) {
  switch (status) {
    case "completed": return "bg-green-500";
    case "partial":   return "bg-amber-400";
    case "failed":    return "bg-red-400";
    default:          return "";
  }
}

export function RoutineCalendar({
  logs, year, month, onChangeMonth, onSelectDay, selectedDay, hideLegendStatus,
}: RoutineCalendarProps) {
  const logMap = useMemo(() => {
    const m = new Map<string, RoutineDayLog>();
    logs.forEach(l => m.set(l.day, l));
    return m;
  }, [logs]);

  const cells = useMemo(() => {
    const first    = new Date(year, month - 1, 1);
    const startDow = first.getDay();
    const daysInM  = new Date(year, month, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInM; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const monthLabel = new Date(year, month - 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const today = new Date().toISOString().slice(0, 10);

  const prev = () => month === 1 ? onChangeMonth(year - 1, 12) : onChangeMonth(year, month - 1);
  const next = () => month === 12 ? onChangeMonth(year + 1, 1) : onChangeMonth(year, month + 1);

  return (
    <div className="glass-card p-4">

      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prev}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={1.5} />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={next}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-foreground" strokeWidth={1.5} />
        </button>
      </div>

      {/* Week labels */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_LABELS.map((l, i) => (
          <span key={i} className="text-center text-[10px] font-medium text-[#717171]">{l}</span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;

          const dayStr   = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const log      = logMap.get(dayStr);
          const status   = log?.status;
          const isToday  = dayStr === today;
          const isSel    = dayStr === selectedDay;
          const dot      = status && status !== "unlogged" ? dotColor(status) : "";

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay?.(dayStr)}
              className={cn(
                "flex flex-col items-center justify-center h-10 w-full rounded-xl text-xs font-medium transition-all active:scale-95",
                isSel
                  ? "bg-foreground text-white"
                  : isToday
                    ? "ring-1 ring-rose-400 text-rose-500 font-semibold"
                    : "text-foreground hover:bg-[#f5f5f5]",
              )}
            >
              <span>{d}</span>
              {dot && (
                <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5", dot)} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[#717171]">
        {!hideLegendStatus?.includes("completed") && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Completo
          </span>
        )}
        {!hideLegendStatus?.includes("partial") && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Parcial
          </span>
        )}
        {!hideLegendStatus?.includes("failed") && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" /> Falhou
          </span>
        )}
      </div>
    </div>
  );
}

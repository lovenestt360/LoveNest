import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function statusColor(log: RoutineDayLog | undefined) {
    if (!log || log.status === "unlogged") return "";
    switch (log.status) {
        case "completed": return "bg-green-500 text-white hover:bg-green-600";
        case "partial": return "bg-amber-400 text-white hover:bg-amber-500";
        case "failed": return "bg-red-400 text-white hover:bg-red-500";
        default: return "";
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
        const first = new Date(year, month - 1, 1);
        const startDow = first.getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const arr: (number | null)[] = [];
        for (let i = 0; i < startDow; i++) arr.push(null);
        for (let d = 1; d <= daysInMonth; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [year, month]);

    const monthLabel = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const prev = () => {
        if (month === 1) onChangeMonth(year - 1, 12);
        else onChangeMonth(year, month - 1);
    };
    const next = () => {
        if (month === 12) onChangeMonth(year + 1, 1);
        else onChangeMonth(year, month + 1);
    };

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="rounded-2xl border bg-card p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold capitalize">{monthLabel}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Week labels */}
            <div className="grid grid-cols-7 mb-1">
                {WEEK_LABELS.map((l, i) => (
                    <span key={i} className="text-center text-[10px] font-medium text-muted-foreground">{l}</span>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const log = logMap.get(dayStr);
                    const isToday = dayStr === today;
                    const isSelected = dayStr === selectedDay;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onSelectDay?.(dayStr)}
                            className={cn(
                                "flex items-center justify-center h-9 w-full rounded-lg text-xs font-medium transition-all",
                                statusColor(log),
                                !log?.status || log.status === "unlogged"
                                    ? "hover:bg-muted text-foreground"
                                    : "",
                                isToday && !log?.status ? "ring-1 ring-primary" : "",
                                isSelected && "ring-2 ring-primary ring-offset-1",
                            )}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
                {!hideLegendStatus?.includes("completed") && (
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Completo</span>
                )}
                {!hideLegendStatus?.includes("partial") && (
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Parcial</span>
                )}
                {!hideLegendStatus?.includes("failed") && (
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Falhou</span>
                )}
            </div>
        </div>
    );
}

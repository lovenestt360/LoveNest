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
        case "completed": return "bg-slate-900 text-white shadow-apple";
        case "partial": return "bg-amber-100 text-amber-700 font-black";
        case "failed": return "bg-red-50 text-red-400 font-black";
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
        <div className="p-2 w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-50 hover:bg-slate-100" onClick={prev}>
                    <ChevronLeft className="h-5 w-5 text-slate-400" />
                </Button>
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 capitalize">{monthLabel}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-50 hover:bg-slate-100" onClick={next}>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                </Button>
            </div>

            {/* Week labels */}
            <div className="grid grid-cols-7 mb-4">
                {WEEK_LABELS.map((l, i) => (
                    <span key={i} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{l}</span>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                    if (d === null) return <div key={i} className="h-10 w-full" />;
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
                                "flex items-center justify-center h-10 w-full rounded-2xl text-[12px] font-black transition-all active:scale-90",
                                statusColor(log),
                                !log?.status || log.status === "unlogged"
                                    ? "bg-transparent text-slate-900 hover:bg-slate-50"
                                    : "",
                                isToday && !log?.status ? "text-primary ring-2 ring-primary/20 ring-offset-2" : "",
                                isSelected && "ring-2 ring-slate-900 ring-offset-2",
                            )}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-8 text-[9px] font-black uppercase tracking-widest text-slate-300">
                {!hideLegendStatus?.includes("completed") && (
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-900" /> Completo</span>
                )}
                {!hideLegendStatus?.includes("partial") && (
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> Parcial</span>
                )}
                {!hideLegendStatus?.includes("failed") && (
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-400" /> Falhou</span>
                )}
            </div>
        </div>
    );
}

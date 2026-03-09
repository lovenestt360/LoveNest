import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UseFastingReturn } from "./useFasting";
import { DayResult, dayResultColor } from "./types";

interface Props {
    data: UseFastingReturn;
    onDaySelect: (dayKey: string) => void;
}

const RESULT_CLASSES: Record<NonNullable<DayResult>, string> = {
    cumprido: "bg-green-500 text-white",
    parcial: "bg-yellow-400 text-white",
    falhei: "bg-red-500 text-white",
};

export function FastingCalendar({ data, onDaySelect }: Props) {
    const { profile, dayLogs } = data;
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const today = new Date().toISOString().slice(0, 10);

    const isInPlan = (dateStr: string): boolean => {
        if (!profile) return false;
        return dateStr >= profile.start_date && dateStr <= profile.end_date;
    };

    const prev = () => setCurrentMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });
    const next = () => setCurrentMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });

    const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

    return (
        <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />Cumprido</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" />Parcial</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Falhei</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-muted inline-block" />Não registado</span>
            </div>

            <div className="glass-card rounded-2xl p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={prev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="font-bold capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: pt })}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={next}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Week headers */}
                <div className="grid grid-cols-7 text-center">
                    {weekDays.map(d => (
                        <span key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</span>
                    ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-0.5">
                    {days.map(day => {
                        const dateStr = day.toISOString().slice(0, 10);
                        const log = dayLogs[dateStr];
                        const result = log?.result ?? null;
                        const inMonth = isSameMonth(day, currentMonth);
                        const inPlan = isInPlan(dateStr);
                        const isToday = dateStr === today;

                        return (
                            <button
                                key={dateStr}
                                onClick={() => inPlan && onDaySelect(dateStr)}
                                disabled={!inPlan}
                                className={cn(
                                    "relative flex flex-col items-center justify-center rounded-lg aspect-square text-xs font-medium transition-all",
                                    !inMonth && "opacity-30",
                                    !inPlan && "opacity-20 cursor-default",
                                    inPlan && "cursor-pointer hover:scale-105 active:scale-95",
                                    isToday && "ring-2 ring-primary ring-offset-1",
                                    result === "cumprido" && inPlan && RESULT_CLASSES.cumprido,
                                    result === "parcial" && inPlan && RESULT_CLASSES.parcial,
                                    result === "falhei" && inPlan && RESULT_CLASSES.falhei,
                                    !result && inPlan && "bg-muted/60 text-foreground",
                                    !inPlan && "text-muted-foreground",
                                )}
                            >
                                <span className={cn("text-[11px]", result ? "text-white" : "")}>
                                    {format(day, "d")}
                                </span>
                                {log?.finalized && (
                                    <span className="absolute bottom-0.5 right-0.5 text-[8px]">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {!profile && (
                <p className="text-center text-sm text-muted-foreground">
                    Cria um plano de jejum para ver o teu calendário.
                </p>
            )}
        </div>
    );
}

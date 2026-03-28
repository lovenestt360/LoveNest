import { Flame, TrendingUp, CalendarCheck, Target } from "lucide-react";
import type { RoutineDayLog } from "@/hooks/useRoutineLogs";

interface RoutineProgressCardsProps {
    todayLog: RoutineDayLog | null;
    todayDone: number;
    todayTotal: number;
    streak: number;
    avgRate: number;
    completedDays: number;
    hideStreak?: boolean;
}

export function RoutineProgressCards({
    todayLog, todayDone, todayTotal, streak, avgRate, completedDays, hideStreak,
}: RoutineProgressCardsProps) {
    const todayRate = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    return (
        <div className="grid grid-cols-2 gap-2">
            {/* Today */}
            <div className="rounded-2xl border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Hoje</span>
                </div>
                <p className="text-2xl font-bold">
                    {todayDone}<span className="text-sm font-normal text-muted-foreground">/{todayTotal}</span>
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${todayRate}%` }}
                    />
                </div>
            </div>

            {/* Streak */}
            {!hideStreak && (
                <div className="rounded-2xl border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-medium text-muted-foreground">Streak</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {streak} <span className="text-sm font-normal text-muted-foreground">{streak === 1 ? "dia" : "dias"}</span>
                    </p>
                </div>
            )}

            {/* Average rate */}
            <div className="rounded-2xl border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">Média</span>
                </div>
                <p className="text-2xl font-bold">{avgRate}<span className="text-sm font-normal text-muted-foreground">%</span></p>
            </div>

            {/* Days completed this month */}
            <div className="rounded-2xl border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                    <CalendarCheck className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Este mês</span>
                </div>
                <p className="text-2xl font-bold">
                    {completedDays} <span className="text-sm font-normal text-muted-foreground">completos</span>
                </p>
            </div>
        </div>
    );
}

import { useMemo } from "react";
import type { RoutineDayLog } from "@/hooks/useRoutineLogs";

export function useRoutineStats(logs: RoutineDayLog[]) {
    return useMemo(() => {
        const sorted = [...logs].sort((a, b) => b.day.localeCompare(a.day));

        // Current streak (consecutive completed days from today backwards)
        let streak = 0;
        const today = new Date().toISOString().slice(0, 10);
        const dateSet = new Map(sorted.map(l => [l.day, l]));

        const d = new Date();
        for (let i = 0; i < 365; i++) {
            const key = d.toISOString().slice(0, 10);
            const log = dateSet.get(key);
            // Skip future days or today without a log yet
            if (key > today) break;
            if (!log) {
                if (key === today) { d.setDate(d.getDate() - 1); continue; } // today not logged yet, skip
                break;
            }
            if (log.status === "completed") {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }

        // Average completion rate (last 30 days with logs)
        const last30 = sorted.filter(l => l.status !== "unlogged").slice(0, 30);
        const avgRate = last30.length > 0
            ? last30.reduce((sum, l) => sum + l.completion_rate, 0) / last30.length
            : 0;

        // Days logged this month
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthLogs = sorted.filter(l => l.day.startsWith(thisMonth) && l.status !== "unlogged");
        const completedDays = monthLogs.filter(l => l.status === "completed").length;
        const totalLoggedDays = monthLogs.length;

        // Today log
        const todayLog = dateSet.get(today) ?? null;

        return {
            streak,
            avgRate: Math.round(avgRate * 100),
            completedDays,
            totalLoggedDays,
            todayLog,
        };
    }, [logs]);
}

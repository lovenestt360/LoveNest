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
        <div className="grid grid-cols-2 gap-4">
            {/* Today */}
            <div className="rounded-apple bg-white shadow-apple p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <Target className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hoje</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900 leading-tight">
                      {todayDone}<span className="text-sm font-black text-slate-300">/{todayTotal}</span>
                  </p>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-50 overflow-hidden">
                      <div
                          className="h-full rounded-full bg-slate-900 transition-all duration-300"
                          style={{ width: `${todayRate}%` }}
                      />
                  </div>
                </div>
            </div>

            {/* Streak */}
            {!hideStreak && (
                <div className="rounded-apple bg-white shadow-apple p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                          <Flame className="h-4 w-4 fill-current" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Streak</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 leading-tight">
                        {streak} <span className="text-sm font-black text-slate-300 uppercase">{streak === 1 ? "dia" : "dias"}</span>
                    </p>
                </div>
            )}

            {/* Average rate */}
            <div className="rounded-apple bg-white shadow-apple p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Média</span>
                </div>
                <p className="text-3xl font-black text-slate-900 leading-tight">{avgRate}<span className="text-sm font-black text-slate-300">%</span></p>
            </div>

            {/* Este Mês */}
            <div className="rounded-apple bg-white shadow-apple p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Este Mês</span>
                </div>
                <p className="text-3xl font-black text-slate-900 leading-tight">
                    {completedDays} <span className="text-sm font-black text-slate-300 uppercase">Dias</span>
                </p>
            </div>
        </div>
    );
}

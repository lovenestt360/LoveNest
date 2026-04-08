import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { useRoutineStats } from "@/hooks/useRoutineStats";
import { RoutineCalendar } from "@/components/routine/RoutineCalendar";
import { RoutineChecklist } from "@/components/routine/RoutineChecklist";
import { RoutineProgressCards } from "@/components/routine/RoutineProgressCards";
import { PartnerRoutinePanel } from "@/components/routine/PartnerRoutinePanel";
import { Button } from "@/components/ui/button";
import { Loader2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "mine" | "partner";

export default function Routine() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>("mine");

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const { activeItems, loading: itemsLoading } = useRoutineItems();
    const { logs, loading: logsLoading, isReady, fetchMonth, upsertLog, getLogForDay } = useRoutineLogs();
    const stats = useRoutineStats(logs);

    // Fetch current month on mount and when month changes
    useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

    const today = new Date().toISOString().slice(0, 10);
    const todayLog = getLogForDay(today);
    const todayChecked = (todayLog?.checked_item_ids ?? []) as string[];

    // Toggle a habit for today
    const handleToggle = useCallback((itemId: string) => {
        const newChecked = todayChecked.includes(itemId)
            ? todayChecked.filter(id => id !== itemId)
            : [...todayChecked, itemId];
        upsertLog(today, newChecked, activeItems.length);
    }, [todayChecked, today, activeItems, upsertLog]);

    const todayDone = todayChecked.filter(id => activeItems.some(i => i.id === id)).length;
    const loading = itemsLoading || logsLoading;

    return (
        <section className="space-y-4 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">📋 Rotina</h1>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/rotina/gerir")}>
                    <Settings2 className="h-4 w-4" /> Gerir
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                {([["mine", "Minha rotina"], ["partner", "Do meu amor"]] as const).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                            "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                            tab === key ? "bg-background shadow-sm" : "text-muted-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === "mine" ? (
                loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <RoutineProgressCards
                            todayLog={todayLog}
                            todayDone={todayDone}
                            todayTotal={activeItems.length}
                            streak={stats.streak}
                            avgRate={stats.avgRate}
                            completedDays={stats.completedDays}
                        />

                        <RoutineCalendar
                            logs={logs}
                            year={year}
                            month={month}
                            onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                            onSelectDay={(day) => navigate(`/rotina/dia/${day}`)}
                        />

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground px-1">
                                Hoje — {todayDone}/{activeItems.length}
                            </p>
                            <RoutineChecklist
                                items={activeItems}
                                checkedIds={todayChecked}
                                onToggle={(id) => isReady && handleToggle(id)}
                                readOnly={!isReady}
                            />
                        </div>
                    </>
                )
            ) : (
                <PartnerRoutinePanel />
            )}
        </section>
    );
}

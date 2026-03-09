import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFastingReturn } from "./useFasting";
import { getEasterDate, dayResultLabel, dayResultColor } from "./types";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

function Countdown() {
    const easterStr = getEasterDate();
    const easter = new Date(easterStr + "T00:00:00");
    const now = new Date();
    const diff = easter.getTime() - now.getTime();

    if (diff <= 0) return (
        <div className="text-center text-sm text-muted-foreground">🎉 A Páscoa chegou!</div>
    );

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);

    return (
        <div className="glass-card rounded-2xl p-4 text-center space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                🕯️ Tempo para a Páscoa
            </p>
            <div className="flex items-center justify-center gap-3">
                {[{ v: days, l: "dias" }, { v: hours, l: "hrs" }, { v: mins, l: "min" }].map(({ v, l }, i) => (
                    <div key={l} className="flex items-center gap-3">
                        {i > 0 && <span className="text-lg font-bold text-muted-foreground/40">:</span>}
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-extrabold tabular-nums text-foreground">
                                {String(v).padStart(2, "0")}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</span>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
                Páscoa: {format(easter, "d 'de' MMMM", { locale: pt })}
            </p>
        </div>
    );
}

interface Props {
    data: UseFastingReturn;
    onRegister: () => void;
}

export function FastingOverview({ data, onRegister }: Props) {
    const { profile, todayLog, stats, dayLogs } = data;

    const today = new Date().toISOString().slice(0, 10);

    const dayNumber = useMemo(() => {
        if (!profile) return 0;
        const start = new Date(profile.start_date + "T00:00:00");
        const now = new Date();
        return Math.max(1, differenceInDays(now, start) + 1);
    }, [profile]);

    const progressPct = profile
        ? Math.min(100, Math.round((stats.loggedDays / profile.total_days) * 100))
        : 0;

    const todayResult = todayLog?.result ?? null;

    return (
        <div className="space-y-4 animate-fade-in">
            <Countdown />

            {profile && (
                <>
                    {/* Progress bar */}
                    <div className="glass-card rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Flame className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{profile.plan_name}</span>
                            </div>
                            <span className="text-xs font-bold text-primary">
                                Dia {dayNumber}/{profile.total_days}
                            </span>
                        </div>
                        <Progress value={progressPct} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Início: {format(new Date(profile.start_date + "T12:00:00"), "d MMM", { locale: pt })}</span>
                            <span>{stats.loggedDays} dias registados</span>
                            <span>Fim: {format(new Date(profile.end_date + "T12:00:00"), "d MMM", { locale: pt })}</span>
                        </div>
                    </div>

                    {/* Today status */}
                    <div className="glass-card rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold">Hoje</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
                                </p>
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white",
                                todayResult === "cumprido" ? "bg-green-500" :
                                    todayResult === "parcial" ? "bg-yellow-500" :
                                        todayResult === "falhei" ? "bg-red-500" :
                                            "bg-muted text-muted-foreground"
                            )}>
                                {dayResultLabel(todayResult)}
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-green-500/10 p-2 text-center">
                                <p className="text-lg font-extrabold text-green-600">
                                    {Object.values(dayLogs).filter(l => l.result === "cumprido").length}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Cumpridos</p>
                            </div>
                            <div className="rounded-xl bg-yellow-400/10 p-2 text-center">
                                <p className="text-lg font-extrabold text-yellow-600">
                                    {Object.values(dayLogs).filter(l => l.result === "parcial").length}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Parciais</p>
                            </div>
                            <div className="rounded-xl bg-red-500/10 p-2 text-center">
                                <p className="text-lg font-extrabold text-red-600">
                                    {Object.values(dayLogs).filter(l => l.result === "falhei").length}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Falhados</p>
                            </div>
                        </div>

                        <Button className="w-full" onClick={onRegister}>
                            <Heart className="mr-2 h-4 w-4" />
                            {todayLog ? "Actualizar registo de hoje" : "Registar hoje"}
                        </Button>
                    </div>

                    {/* Streak */}
                    {stats.streak > 0 && (
                        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-500 text-xl">
                                🔥
                            </div>
                            <div>
                                <p className="text-sm font-bold">{stats.streak} dia{stats.streak !== 1 ? "s" : ""} seguidos</p>
                                <p className="text-xs text-muted-foreground">Continua assim! Não quebres o streak.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

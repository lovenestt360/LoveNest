import { UseFastingReturn } from "./useFasting";
import { cn } from "@/lib/utils";

interface Props {
    data: UseFastingReturn;
}

function Bar({ rate }: { rate: number }) {
    return (
        <div className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full rounded-full bg-muted h-24 flex flex-col-reverse overflow-hidden">
                <div
                    className={cn("rounded-full w-full transition-all", rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-yellow-400" : "bg-red-400")}
                    style={{ height: `${Math.max(rate, 3)}%` }}
                />
            </div>
            <span className="text-[9px] text-muted-foreground">{rate}%</span>
        </div>
    );
}

export function FastingStats({ data }: Props) {
    const { stats, dayLogs, profile } = data;

    if (!profile) return (
        <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Cria um plano para ver as estatísticas.</p>
        </div>
    );

    const cumpridos = Object.values(dayLogs).filter(l => l.result === "cumprido").length;
    const parciais = Object.values(dayLogs).filter(l => l.result === "parcial").length;
    const falhados = Object.values(dayLogs).filter(l => l.result === "falhei").length;

    const bestWeek = stats.weeklyData.reduce((best, w) => w.rate > best.rate ? w : best, { weekLabel: "—", rate: 0 });
    const worstWeek = stats.weeklyData.filter(w => w.rate > 0).reduce((worst, w) => w.rate < worst.rate ? w : worst, { weekLabel: "—", rate: 100 });

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Main metrics */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-2xl p-4 text-center space-y-1">
                    <p className="text-4xl font-extrabold text-amber-500">🔥{stats.streak}</p>
                    <p className="text-xs text-muted-foreground">Dias seguidos</p>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center space-y-1">
                    <p className="text-4xl font-extrabold text-primary">{stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de cumprimento</p>
                </div>
            </div>

            {/* Breakdown */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Breakdown de dias</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                        <p className="text-2xl font-extrabold text-green-600">{cumpridos}</p>
                        <p className="text-[10px] text-muted-foreground">✅ Cumpridos</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-extrabold text-yellow-600">{parciais}</p>
                        <p className="text-[10px] text-muted-foreground">⚠️ Parciais</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-extrabold text-red-600">{falhados}</p>
                        <p className="text-[10px] text-muted-foreground">❌ Falhados</p>
                    </div>
                </div>
                <div className="text-center pt-1">
                    <p className="text-xs text-muted-foreground">
                        {stats.loggedDays} de {profile.total_days} dias registados
                    </p>
                </div>
            </div>

            {/* Weekly chart */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evolução semanal</p>
                <div className="flex items-end gap-1.5 pt-2">
                    {stats.weeklyData.map(w => (
                        <div key={w.weekLabel} className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-full rounded-t-lg bg-muted h-20 flex flex-col-reverse overflow-hidden">
                                <div
                                    className={cn("w-full transition-all",
                                        w.rate >= 70 ? "bg-green-500" : w.rate >= 40 ? "bg-yellow-400" : w.rate > 0 ? "bg-red-400" : "")}
                                    style={{ height: `${Math.max(w.rate, w.rate > 0 ? 5 : 0)}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{w.weekLabel}</span>
                            <span className="text-[9px] font-bold">{w.rate > 0 ? `${w.rate}%` : "—"}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insight messages */}
            <div className="glass-card rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo</p>
                {bestWeek.rate > 0 && (
                    <p className="text-sm">
                        💪 <strong>Semana mais forte:</strong> {bestWeek.weekLabel} ({bestWeek.rate}% de cumprimento)
                    </p>
                )}
                {worstWeek.rate < 100 && worstWeek.rate > 0 && worstWeek.weekLabel !== bestWeek.weekLabel && (
                    <p className="text-sm">
                        ⚠️ <strong>Semana mais difícil:</strong> {worstWeek.weekLabel} ({worstWeek.rate}% de cumprimento)
                    </p>
                )}
                {stats.completionRate === 0 && (
                    <p className="text-sm text-muted-foreground">Começa a registar os teus dias para ver as estatísticas!</p>
                )}
                {stats.completionRate >= 80 && (
                    <p className="text-sm text-green-600">🌟 Excelente desempenho! Continua assim.</p>
                )}
                {stats.completionRate > 0 && stats.completionRate < 40 && (
                    <p className="text-sm text-muted-foreground">Não desistas! Cada dia é uma nova oportunidade. 🙏</p>
                )}
            </div>
        </div>
    );
}

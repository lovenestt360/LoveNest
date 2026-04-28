import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import { Flame, Shield, AlertCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="glass-card p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-[#f5f5f5] rounded-full" />
        <div className="h-10 w-16 bg-[#f5f5f5] rounded-lg" />
        <div className="h-3 w-32 bg-[#f5f5f5] rounded-full" />
      </div>
    );
  }

  const { currentStreak, longestStreak, bothActiveToday, streakAtRisk,
          shieldsRemaining, shieldUsedToday } = streak;
  const isZero = currentStreak === 0;

  const statusLabel = shieldUsedToday
    ? "Shield activado"
    : bothActiveToday
      ? "Hoje completo"
      : streakAtRisk
        ? "Falta alguém"
        : isZero
          ? "Comecem hoje"
          : "A aguardar";

  const statusColor = shieldUsedToday
    ? "text-blue-500"
    : bothActiveToday
      ? "text-rose-500"
      : streakAtRisk
        ? "text-amber-500"
        : "text-[#717171]";

  return (
    <button
      onClick={() => navigate("/lovestreak")}
      className="glass-card glass-card-hover w-full p-5 text-left active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-rose-500" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
            LoveStreak
          </span>
        </div>
        <span className={cn("text-[11px] font-semibold", statusColor)}>
          {statusLabel}
        </span>
      </div>

      {/* Streak number */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className={cn(
          "text-5xl font-bold tabular-nums tracking-tight",
          bothActiveToday ? "text-rose-500" : shieldUsedToday ? "text-blue-500" : "text-foreground"
        )}>
          {currentStreak}
        </span>
        <span className="text-base font-medium text-[#717171]">dias</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0] mt-3">
        <span className="text-[11px] text-[#717171]">
          Recorde: <span className="font-semibold text-foreground">{longestStreak}d</span>
        </span>
        <div className="flex items-center gap-2">
          {shieldsRemaining > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-blue-400">
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              <span>{shieldsRemaining}</span>
            </div>
          )}
          {streakAtRisk && !shieldUsedToday && (
            <div className="flex items-center gap-1 text-[11px] text-amber-500">
              <AlertCircle className="w-3 h-3" strokeWidth={1.5} />
              <span>Não falhem hoje</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-[#c4c4c4]" strokeWidth={1.5} />
        </div>
      </div>
    </button>
  );
}

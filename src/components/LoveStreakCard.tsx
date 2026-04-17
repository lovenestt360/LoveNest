import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import { Flame, AlertCircle, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const navigate = useNavigate();

  // ── LOADING STATE ───────────────────────────────
  if (loading) {
    return (
      <div className="glass-card rounded-[2rem] p-5 space-y-4 shadow-sm border-white/20 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-end gap-2">
          <Skeleton className="h-12 w-16 rounded-lg" />
          <Skeleton className="h-5 w-10 mb-1 rounded" />
        </div>
        <Skeleton className="h-3 w-36 rounded-full" />
        <div className="flex justify-between pt-1 border-t border-border/30">
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
      </div>
    );
  }

  // ── NUNCA return null — mostrar sempre o card ───

  const currentStreak   = streak.currentStreak;
  const longestStreak   = streak.longestStreak;
  const bothActive      = streak.bothActiveToday;
  const isAtRisk        = streak.streakAtRisk;
  const isZero          = currentStreak === 0;
  const shieldsRemaining = streak.shieldsRemaining;
  const shieldUsedToday  = streak.shieldUsedToday;

  // Mensagem emocional
  let emotionalMsg = "Comecem hoje 💛";
  if (currentStreak >= 1  && currentStreak <= 3)  emotionalMsg = "Bom começo ✨";
  else if (currentStreak > 3  && currentStreak <= 7)  emotionalMsg = "Continuem assim 💖";
  else if (currentStreak > 7  && currentStreak <= 30) emotionalMsg = "Vocês estão consistentes 💕";
  else if (currentStreak > 30) emotionalMsg = "Lendários! 🏆";

  if (shieldUsedToday) emotionalMsg = "🛡️ Shield protegeu a chama!";

  return (
    <div
      onClick={() => navigate("/lovestreak")}
      className={cn(
        "cursor-pointer active:scale-[0.98] glass-card rounded-[2rem] p-5 space-y-3 shadow-md transition-all duration-300 hover:shadow-lg",
        isAtRisk && !shieldUsedToday
          ? "border-amber-500/30 bg-amber-50/10"
          : shieldUsedToday
            ? "border-blue-500/20 bg-blue-50/10"
            : "border-primary/10 hover:border-primary/20",
        !bothActive && !isZero && !shieldUsedToday ? "opacity-90 hover:opacity-100" : "opacity-100"
      )}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
        <div className="flex items-center gap-1.5 text-primary/80">
          <Flame className={cn("w-3.5 h-3.5", bothActive && "fill-primary animate-pulse")} />
          <span>LoveStreak</span>
        </div>

        {/* STATUS LABEL */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest",
          shieldUsedToday
            ? "bg-blue-500/10 text-blue-600"
            : bothActive
              ? "bg-primary/10 text-primary"
              : isAtRisk
                ? "bg-amber-500/10 text-amber-600 animate-pulse"
                : "bg-muted text-muted-foreground"
        )}>
          {shieldUsedToday && <Shield className="w-2.5 h-2.5" />}
          {shieldUsedToday
            ? "Shield usado 🛡️"
            : bothActive
              ? "Hoje completo 💕"
              : isAtRisk
                ? "Falta alguém ⚠️"
                : "A aguardar ⏳"}
        </div>
      </div>

      {/* STREAK NUMBER */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            "text-4xl tabular-nums font-black tracking-tighter transition-all",
            shieldUsedToday
              ? "text-blue-500"
              : bothActive
                ? "text-primary"
                : "text-foreground"
          )}>
            {currentStreak}
          </span>
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
            dias
          </span>
        </div>

        <span className="text-[11px] font-bold text-muted-foreground/80 lowercase mt-1">
          {emotionalMsg}
        </span>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
          Recorde: {longestStreak} d
        </span>

        <div className="flex items-center gap-2">
          {/* Shields badge */}
          {shieldsRemaining > 0 && (
            <span className="text-[9px] font-black text-blue-500/70 flex items-center gap-0.5">
              🛡️ {shieldsRemaining}
            </span>
          )}

          {isAtRisk && !shieldUsedToday && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600/80 uppercase">
              <AlertCircle className="w-3 h-3" />
              Não falhem hoje
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

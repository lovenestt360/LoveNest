import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import { Flame, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="glass-card rounded-[2rem] p-5 space-y-4 shadow-sm border-white/20 opacity-80 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
        <div className="flex items-end gap-2">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-6 w-10 mb-1" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  // Se não existir dados ou o streak estiver num estado inválido
  if (!streak || streak.status === "invalid") {
    return null;
  }

  // EMOTIONAL MICRO UX
  let emotionalMsg = "Comecem hoje 💛";
  if (streak.currentStreak >= 1 && streak.currentStreak <= 3) emotionalMsg = "Bom começo ✨";
  else if (streak.currentStreak > 3 && streak.currentStreak <= 7) emotionalMsg = "Continuem assim 💖";
  else if (streak.currentStreak > 7) emotionalMsg = "Vocês estão consistentes 💕";

  const isAtRisk = streak.streakAtRisk;
  const bothActive = streak.bothActiveToday;
  const isZero = streak.currentStreak === 0;

  return (
    <div 
      onClick={() => navigate("/lovestreak")}
      className={cn(
        "cursor-pointer active:scale-[0.98] glass-card rounded-[2rem] p-5 space-y-3 shadow-md transition-all duration-300 hover:shadow-lg",
        isAtRisk ? "border-amber-500/30 bg-amber-50/10" : "border-primary/10 hover:border-primary/20",
        (!bothActive && !isZero) ? "opacity-90 hover:opacity-100" : "opacity-100"
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
          "px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest",
          bothActive 
            ? "bg-primary/10 text-primary" 
            : isAtRisk 
               ? "bg-amber-500/10 text-amber-600 animate-pulse" 
               : "bg-muted text-muted-foreground"
        )}>
          {bothActive 
            ? "Hoje completo 💕" 
            : isAtRisk 
               ? "Falta alguém hoje ⚠️" 
               : "A aguardar hoje ⏳"}
        </div>
      </div>

      {/* MAIN STREAK NUMBER */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            "text-4xl tabular-nums font-black tracking-tighter transition-all",
            bothActive ? "text-primary" : "text-foreground"
          )}>
            {streak.currentStreak}
          </span>
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
            dias
          </span>
        </div>
        
        {/* EMOTIONAL MESSAGE */}
        <span className="text-[11px] font-bold text-muted-foreground/80 lowercase mt-1">
          {emotionalMsg}
        </span>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
          Recorde: {streak.longestStreak}
        </span>
        
        {isAtRisk && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600/80 uppercase">
            <AlertCircle className="w-3 h-3" />
            Não falhem hoje
          </div>
        )}
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { Flame, Shield, ArrowRight, Circle, CheckCircle2 } from "lucide-react";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { cn } from "@/lib/utils";

export function LoveStreakHomeCard() {
  const { data, dailyStatus, loading } = useLoveStreak();
  const navigate = useNavigate();

  if (loading || !data) return null;

  const level = getStreakLevel(data.current_streak);
  const nextLevel = getNextLevel(data.current_streak);
  const daysToNextLevel = nextLevel ? nextLevel.min - data.current_streak : 0;
  
  const bothToday = dailyStatus?.day_complete;

  return (
    <div className="px-0.5">
      <button
        onClick={() => navigate("/ranking?tab=streak")}
        className={cn(
          "w-full text-left rounded-3xl p-5 shadow-sm border border-pink-100/50 transition-all active:scale-[0.98]",
          "bg-gradient-to-br from-orange-50/90 via-pink-50/60 to-white dark:from-orange-950/20 dark:via-pink-950/10 dark:to-background"
        )}
      >
        {/* Top Section */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex gap-4">
            {/* Soft Orange Icon Box */}
            <div className="h-12 w-12 rounded-[1.25rem] bg-orange-100/70 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-orange-400 stroke-[1.5]" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground flex items-center gap-1.5 leading-none">
                  🔥 LoveStreak
                </span>
                <span className="bg-orange-100/70 dark:bg-orange-500/20 text-orange-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
                  {data.current_streak} dias
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium pt-0.5">
                {level.title} &bull; Melhor: {data.best_streak} dias &bull; {data.total_points || 0} pts
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground/40 mt-1 shrink-0" />
        </div>

        {/* Middle Section (Status & Message) */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-4">
            {/* Tu Status */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-9 w-9 rounded-full border border-muted-foreground/20 flex items-center justify-center bg-white dark:bg-background/50 shadow-sm">
                {dailyStatus?.me_active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30 stroke-[1.5]" />
                )}
              </div>
              <span className="text-[10px] font-bold text-foreground">Tu</span>
            </div>
            
            {/* Par Status */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-9 w-9 rounded-full border border-muted-foreground/20 flex items-center justify-center bg-white dark:bg-background/50 shadow-sm">
                {dailyStatus?.partner_active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30 stroke-[1.5]" />
                )}
              </div>
              <span className="text-[10px] font-bold text-foreground">Par</span>
            </div>
          </div>

          <div className="flex-1 text-[11px] font-bold text-orange-500 flex items-start sm:items-center gap-1.5 leading-snug tracking-tight">
            <Flame className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
            {bothToday 
              ? "A vossa chama está segura hoje! 🔥" 
              : "Falta pouco... não deixem o vosso streak cair 🔥"}
          </div>
        </div>

        {/* Bottom Section (Shields & Next Level) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 outline outline-2 outline-offset-1 outline-transparent text-muted-foreground/40 stroke-[1.5]" />
            
            <div className="flex gap-1 ml-1">
               {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center border",
                    i < data.loveshield_count 
                      ? "border-blue-100 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-500 dark:border-blue-800 dark:from-blue-900/50 dark:to-blue-900" 
                      : "border-muted/50 bg-muted/20 text-muted-foreground/30 grayscale opacity-40 shadow-none"
                  )}>
                     <Shield className="w-3 h-3 fill-current stroke-[1.5]" />
                  </div>
               ))}
            </div>
            
            <span className="text-[11px] text-muted-foreground font-medium pl-1 tracking-tight">
              LoveShield
            </span>
          </div>

          <div className="text-[10px] text-muted-foreground">
            Próximo nível: <span className="font-bold text-foreground">{nextLevel?.title || "Máximo"}</span> 
            {nextLevel && ` (${daysToNextLevel} dias restantes)`}
          </div>
        </div>
      </button>
    </div>
  );
}

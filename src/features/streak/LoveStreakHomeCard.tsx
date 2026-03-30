import { useNavigate } from "react-router-dom";
import { Flame, Shield, Trophy, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useLoveStreak, getStreakLevel } from "@/hooks/useLoveStreak";
import { cn } from "@/lib/utils";

export function LoveStreakHomeCard() {
  const { data, dailyStatus, loading, streakIncreased } = useLoveStreak();
  const navigate = useNavigate();

  if (loading) return (
    <div className="h-24 w-full bg-muted/5 animate-pulse rounded-[2rem] border border-dashed border-primary/10 flex items-center justify-center">
      <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20">A carregar chama...</span>
    </div>
  );

  if (!data) return null;

  const level = getStreakLevel(data.current_streak);
  const bothToday = dailyStatus?.day_complete;
  
  return (
    <div className="relative group px-0.5">
      {/* Streak Animation Overlay */}
      {streakIncreased && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500 pointer-events-none">
          <div className="text-center space-y-4 animate-in zoom-in duration-500 scale-110">
            <div className="text-8xl drop-shadow-[0_0_30px_rgba(249,115,22,0.8)] animate-bounce">🔥</div>
            <h2 className="text-4xl font-black text-white tracking-tighter">Streak UP! 🔥</h2>
            <p className="text-xl text-white/90 font-bold">
              <span className="text-amber-400">{data.current_streak}</span> dias de pura conexão!
            </p>
          </div>
        </div>
      )}

      {/* NEW COMPACT PREMIUM CARD */}
      <button
        onClick={() => navigate("/ranking?tab=streak")}
        className={cn(
          "relative w-full overflow-hidden rounded-[2.5rem] transition-all duration-500 group active:scale-[0.97]",
          "border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
          bothToday 
            ? "bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10" 
            : "bg-white/40 dark:bg-black/40 backdrop-blur-xl"
        )}
      >
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Main Info Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* VIBRANT FLAME BOX */}
              <div className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-3xl transition-all duration-700 shadow-xl overflow-hidden",
                bothToday 
                  ? "bg-gradient-to-tr from-orange-500 via-orange-400 to-red-500 scale-105 rotate-3 shadow-orange-500/40" 
                  : "bg-muted/30 border border-white/10"
              )}>
                {/* Glow effect for flame */}
                <div className={cn(
                  "absolute inset-0 opacity-40 blur-xl transition-all duration-1000",
                  bothToday ? "bg-white animate-pulse" : "bg-orange-500/20"
                )} />
                
                <Flame className={cn(
                  "h-9 w-9 z-10 transition-all duration-500 drop-shadow-md",
                  bothToday 
                    ? "text-white fill-white/20 animate-pulse scale-110" 
                    : "text-orange-500/40 fill-orange-500/10"
                )} />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-black tracking-tighter leading-none text-foreground drop-shadow-sm">
                    {data.current_streak}
                    <span className="text-base font-bold ml-1 text-muted-foreground/60 tracking-tight">dias</span>
                  </h3>
                  {data.loveshield_count > 0 && (
                    <div className="flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full border border-blue-500/20 animate-in fade-in zoom-in">
                      <Shield className="w-3 h-3 fill-current" />
                      <span className="text-[10px] font-black">{data.loveshield_count}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {level.title}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
                    {data.total_points || 0} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/20 dark:bg-white/5 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* STATUS INTEGRATED ROW */}
          <div className="flex items-center justify-between gap-3 bg-white/20 dark:bg-black/20 p-2.5 rounded-[1.75rem] border border-white/10 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {/* Me Status Mini */}
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative bg-background",
                  dailyStatus?.me_active 
                    ? "border-green-500 text-green-500 shadow-sm shadow-green-500/30" 
                    : "border-white/10 text-muted-foreground/30 opacity-40"
                )}>
                  <CheckCircle2 className="w-5 h-5" />
                  {dailyStatus?.me_active && <span className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />}
                </div>
                {/* Partner Status Mini */}
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative bg-background",
                  dailyStatus?.partner_active 
                    ? "border-green-500 text-green-500 shadow-sm shadow-green-500/30" 
                    : "border-white/10 text-muted-foreground/30 opacity-40"
                )}>
                  <CheckCircle2 className="w-5 h-5" />
                  {dailyStatus?.partner_active && <span className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />}
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                bothToday ? "text-orange-500" : "text-muted-foreground/40"
              )}>
                {bothToday ? "A vossa chama arde! 🔥" : "Mantenham a chama ✨"}
              </span>
            </div>

            {/* Missions Bubble - Now much smaller */}
            {dailyStatus?.missions && dailyStatus.missions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-2xl border border-primary/10">
                <Sparkles className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-tight">
                  {dailyStatus.missions.filter(m => m.completed).length}/{dailyStatus.missions.length} Missões
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Background Shimmer if not complete */}
        {!bothToday && (
           <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent w-full animate-shimmer" />
        )}
      </button>
    </div>
  );
}

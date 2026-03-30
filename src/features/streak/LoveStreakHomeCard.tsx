import { useNavigate } from "react-router-dom";
import { Flame, Shield, Trophy, ArrowRight, Sparkles, CheckCircle2, Timer, Heart, Zap, AlertCircle } from "lucide-react";
import { useLoveStreak, getStreakLevel } from "@/hooks/useLoveStreak";
import { cn } from "@/lib/utils";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { Progress } from "@/components/ui/progress";

export function LoveStreakHomeCard() {
  const { data, dailyStatus, loading, streakIncreased, dailyProgressRate } = useLoveStreak();
  const avatars = useCoupleAvatars();
  const navigate = useNavigate();

  if (loading) return (
    <div className="h-48 w-full bg-muted/5 animate-pulse rounded-[2.5rem] border border-dashed border-primary/10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Heart className="w-8 h-8 text-primary/20 animate-beat text-pink-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20 italic">Sintonizando corações...</span>
      </div>
    </div>
  );

  if (!data) return null;

  const level = getStreakLevel(data.current_streak);
  const bothToday = dailyStatus?.day_complete;
  
  // Color logic for progress bar
  const getProgressColor = () => {
    if (dailyProgressRate >= 100) return "bg-green-500";
    if (dailyProgressRate >= 50) return "bg-amber-400";
    return "bg-rose-500";
  };

  return (
    <div className="relative group px-0.5">
      {/* ── STREAK CELEBRATION OVERLAY ── */}
      {streakIncreased && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-xl animate-in fade-in duration-700 pointer-events-none">
          <div className="text-center space-y-6 animate-in zoom-in duration-500 scale-110">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-40 animate-pulse rounded-full" />
               <div className="text-9xl drop-shadow-2xl animate-bounce relative z-10">🔥</div>
            </div>
            <div className="space-y-2">
               <h2 className="text-5xl font-black text-foreground tracking-tighter">🔥 +1 Dia Juntos!</h2>
               <p className="text-xl text-muted-foreground font-medium italic">Continuem assim ❤️</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN PREMIUM HERO CARD ── */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate("/ranking?tab=streak")}
          className={cn(
            "relative w-full overflow-hidden rounded-[2.8rem] transition-all duration-700 group active:scale-[0.98] border shadow-2xl",
            "border-white/40 dark:border-white/10",
            bothToday 
              ? "bg-gradient-to-br from-pink-100/40 via-orange-100/40 to-amber-100/40 dark:from-pink-500/10 dark:via-orange-500/10 dark:to-amber-500/10" 
              : "bg-white/60 dark:bg-black/40 backdrop-blur-2xl"
          )}
        >
          {/* Subtle Glow Background */}
          <div className={cn(
            "absolute -top-24 -left-24 w-64 h-64 blur-[100px] rounded-full transition-all duration-1000",
            bothToday ? "bg-orange-400/20" : "bg-primary/10"
          )} />
          
          <div className="p-6 sm:p-7 relative z-10 space-y-6">
            {/* Header: Streak Number & Points */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                     <div className={cn(
                       "absolute inset-0 blur-xl opacity-60 rounded-full animate-pulse transition-colors duration-1000",
                       bothToday ? "bg-orange-500" : "bg-primary/40"
                     )} />
                     <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground relative z-10 flex items-center gap-2">
                       <span className="animate-pulse">🔥</span> {data.current_streak}
                       <span className="text-lg font-black text-muted-foreground/30 uppercase tracking-widest mt-4">Dias</span>
                     </span>
                  </div>
                </div>
                <p className="text-sm font-bold text-muted-foreground italic tracking-tight animate-in slide-in-from-left-4 duration-1000">
                  {data.streak_message}
                </p>
              </div>

              {/* Floating Shield Badge */}
              <div className="group/shield relative">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-500 shadow-lg backdrop-blur-md",
                  data.loveshield_count > 0 
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-600 animate-in zoom-in" 
                    : "bg-muted/50 border-white/10 text-muted-foreground opacity-40"
                )}>
                  <Shield className={cn("w-5 h-5 fill-current", data.loveshield_count > 0 && "animate-pulse")} />
                  <span className="text-lg font-black">{data.loveshield_count}</span>
                </div>
                {/* Tooltip */}
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-black py-1.5 px-3 rounded-full opacity-0 group-hover/shield:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none uppercase tracking-widest">
                   Protege o streak caso falhem 🛡️
                </span>
              </div>
            </div>

            {/* AVATARS & STATUS SECTION */}
            <div className="flex items-center justify-center gap-6 py-2">
               {/* TU */}
               <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className={cn(
                      "w-16 h-16 rounded-3xl overflow-hidden border-2 transition-all duration-500",
                      dailyStatus?.me_active 
                        ? "border-green-500 shadow-lg shadow-green-500/20 scale-105" 
                        : "border-white/10 grayscale opacity-60"
                    )}>
                      {avatars.me?.avatarUrl ? (
                         <img src={avatars.me.avatarUrl} alt="Tu" className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full bg-muted flex items-center justify-center text-xl font-bold">T</div>
                      )}
                    </div>
                    {dailyStatus?.me_active && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-background shadow-lg">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tu</span>
               </div>

               {/* Connector / Heart Animation */}
               <div className="flex flex-col items-center flex-1 max-w-[60px] gap-2 pt-2">
                  <div className={cn(
                    "h-0.5 w-full rounded-full transition-all duration-1000",
                    bothToday ? "bg-gradient-to-r from-green-500 to-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]" : "bg-white/20"
                  )} />
                  <Heart className={cn(
                    "w-5 h-5 transition-all duration-700",
                    bothToday ? "text-pink-500 fill-pink-500 animate-beat scale-125" : "text-white/20"
                  )} />
               </div>

               {/* PAR */}
               <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className={cn(
                      "w-16 h-16 rounded-3xl overflow-hidden border-2 transition-all duration-500",
                      dailyStatus?.partner_active 
                        ? "border-green-500 shadow-lg shadow-green-500/20 scale-105" 
                        : "border-white/10 grayscale opacity-60"
                    )}>
                      {avatars.partner?.avatarUrl ? (
                         <img src={avatars.partner.avatarUrl} alt="Par" className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full bg-muted flex items-center justify-center text-xl font-bold">P</div>
                      )}
                    </div>
                    {dailyStatus?.partner_active && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-background shadow-lg">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Par</span>
               </div>
            </div>

            {/* EMOTIONAL PROGRESS BAR */}
            <div className="space-y-2">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Progresso de Hoje</span>
                  <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full", 
                    bothToday ? "bg-green-500/10 text-green-600" : "bg-amber-400/10 text-amber-600"
                  )}>
                    {bothToday ? "🔥 Streak Protegido!" : dailyProgressRate + "% Sincronia"}
                  </span>
               </div>
               <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden shadow-inner border border-white/5">
                  <div 
                    className={cn("h-full transition-all duration-1000 ease-out", getProgressColor(), "shadow-[0_0_10px_currentColor]")} 
                    style={{ width: `${dailyProgressRate}%` }} 
                  />
               </div>
            </div>

            {/* MICRO MISSIONS INTEGRATED */}
            {dailyStatus?.missions && dailyStatus.missions.length > 0 && (
              <div className="bg-white/20 dark:bg-black/20 rounded-3xl p-4 border border-white/10 space-y-3">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2">
                       <Sparkles className="w-3 h-3" /> Missões Diárias
                    </h4>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
                       +20 pts hoje
                    </span>
                 </div>
                 <div className="space-y-2">
                    {dailyStatus.missions.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-3 group/mission">
                         <div className="flex items-center gap-2 truncate">
                            <span className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-sm shadow-sm border border-white/5">{m.emoji}</span>
                            <span className={cn("text-[11px] font-bold truncate", m.completed ? "text-green-600 line-through opacity-50" : "text-foreground")}>
                               {m.title}
                            </span>
                         </div>
                         {m.completed && (
                            <div className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-lg border border-green-500/10 text-[9px] font-black flex items-center animate-in zoom-in">
                               +10 pts
                            </div>
                         )}
                      </div>
                    ))}
                 </div>
              </div>
            )}
            
            {/* CTA / Quick Insights */}
            <div className="flex justify-center pt-2">
               <div className="h-1.5 w-12 bg-muted/20 rounded-full" />
            </div>
          </div>

          <div className="absolute top-4 right-6 text-muted-foreground/20 italic font-black text-[9px] uppercase tracking-widest group-hover:text-primary transition-colors">
             Ver Rankings <ArrowRight className="w-3 h-3 inline-block ml-1" />
          </div>
        </button>

        {/* ── SOFT WARNING CARD (Alternative to Red Box) ── */}
        {!bothToday && !loading && (
          <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-[2rem] p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600">
                      <AlertCircle className="w-6 h-6" />
                   </div>
                   <div className="space-y-0.5">
                      <h4 className="text-sm font-black tracking-tight text-foreground">A vossa chama está a diminuir... ⚠️</h4>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Protejam o vosso streak hoje ❤️</p>
                   </div>
                </div>
                <button 
                  onClick={() => navigate("/chat")}
                  className="bg-amber-500 text-white text-[10px] font-black px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 shrink-0 h-10"
                >
                   Enviar algo agora <Zap className="w-3 h-3 fill-current" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

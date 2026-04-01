import { useNavigate } from "react-router-dom";
import { Flame, Shield, ArrowRight, Heart, Sparkles } from "lucide-react";
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
          "w-full text-left rounded-3xl p-4 shadow-sm border border-pink-100/50 transition-all active:scale-[0.98] flex flex-col gap-3",
          "bg-gradient-to-br from-orange-50/90 via-pink-50/60 to-white dark:from-orange-950/20 dark:via-pink-950/10 dark:to-background"
        )}
      >
        {/* Top Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Elaborate Floating Flame */}
            <div className="relative mt-1">
               <div className="absolute inset-0 bg-orange-500/40 blur-md rounded-full animate-pulse" />
               <Flame className="w-8 h-8 text-orange-500 fill-orange-400 drop-shadow-md relative z-10 stroke-[1.5]" />
            </div>
            
            <div className="space-y-1">
               <div className="flex items-center gap-2">
                  <span className="font-black text-foreground text-lg leading-none tracking-tight">
                    LoveStreak
                  </span>
                  <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase leading-none">
                    {data.current_streak} dias
                  </span>
               </div>
               {/* Dedicated Streak Phrase Line */}
               <p className="text-[11px] font-bold text-orange-500/90 pt-0.5 leading-tight tracking-tight">
                  <Flame className="w-3 h-3 inline-block -mt-1 mr-1" />
                  {bothToday ? "A vossa chama está segura hoje! ✨" : "Falta pouco... não deixem cair 🔥"}
               </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 mt-2 shrink-0" />
        </div>

        {/* Info Line */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium px-1 mt-1 opacity-80">
           <span>{level.title}</span>
           <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
           <span>Melhor: {data.best_streak}</span>
           <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
           <span>{data.total_points} pts</span>
        </div>

        {/* Bottom Bar: Status Hearts & Shields */}
        <div className="flex items-center justify-between bg-white/50 dark:bg-black/20 px-4 py-2.5 rounded-[1.25rem] border border-white/30 shadow-inner mt-1">
           {/* Hearts Status */}
           <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                 <Heart className={cn("w-4 h-4 transition-all duration-300", 
                   dailyStatus?.me_active ? "text-pink-500 fill-pink-500 animate-in zoom-in" : "text-muted-foreground/30 stroke-[1.5]"
                 )} />
                 <span className="text-[10px] font-bold text-foreground/70">Tu</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <Heart className={cn("w-4 h-4 transition-all duration-300", 
                   dailyStatus?.partner_active ? "text-pink-500 fill-pink-500 animate-in zoom-in" : "text-muted-foreground/30 stroke-[1.5]"
                 )} />
                 <span className="text-[10px] font-bold text-foreground/70">Par</span>
              </div>
           </div>

           {/* Small divider */}
           <div className="h-4 w-px bg-muted-foreground/10" />

           {/* Shields Section */}
           <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                 {Array.from({ length: 5 }).map((_, i) => (
                   <Shield key={i} className={cn(
                     "w-3.5 h-3.5 transition-all duration-500",
                     i < data.loveshield_count 
                       ? "text-blue-500 fill-blue-500 drop-shadow-[0_0_2px_rgba(59,130,246,0.6)]" 
                       : "text-muted-foreground/20 fill-muted-foreground/5 stroke-[1.5]"
                   )} />
                 ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">
                 Shields
              </span>
           </div>
        </div>
        {/* Missions Section - Realtime Progress */}
        <div className="flex flex-col gap-2 mt-1">
           <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                 Missões do Dia
              </span>
              <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
           </div>
           
           <div className="grid grid-cols-1 gap-2">
              {dailyStatus?.missions && dailyStatus.missions.length > 0 ? (
                dailyStatus.missions.map((mission) => (
                  <div 
                    key={mission.id}
                    className={cn(
                      "flex flex-col gap-1.5 p-3 rounded-2xl border transition-all duration-300",
                      mission.completed 
                        ? "bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30" 
                        : "bg-white/40 border-white/60 dark:bg-white/5 dark:border-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="text-base">{mission.emoji}</span>
                          <span className={cn(
                            "text-[11px] font-bold leading-none tracking-tight",
                            mission.completed ? "text-green-600 dark:text-green-400" : "text-foreground/80"
                          )}>
                             {mission.title}
                          </span>
                       </div>
                       <span className="text-[9px] font-black text-muted-foreground/40 tabular-nums">
                          {mission.current} / {mission.target}
                       </span>
                    </div>

                    <div className="relative h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className={cn(
                           "absolute inset-y-0 left-0 transition-all duration-500 rounded-full",
                           mission.completed ? "bg-green-500" : "bg-pink-500"
                         )}
                         style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}
                       />
                    </div>

                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-tighter opacity-60">
                       <span className={mission.completed ? "text-green-600" : "text-muted-foreground"}>
                          {mission.completed ? "Concluída! ✨" : "Em progresso..."}
                       </span>
                       <span className="flex items-center gap-0.5">
                          <Sparkles className="w-2 h-2" />
                          {mission.reward} pts
                       </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center border border-dashed rounded-2xl border-muted-foreground/20">
                   <p className="text-[10px] font-bold text-muted-foreground/40 italic">
                      Preparando novos desafios para vocês... ✨
                   </p>
                </div>
              )}
           </div>
        </div>
      </button>
    </div>
  );
}

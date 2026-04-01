import { useNavigate } from "react-router-dom";
import { Flame, Shield, ArrowRight, Heart, Sparkles, Check } from "lucide-react";
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
        {/* Missions Section - Ultra Compact View */}
        <div className="flex items-center justify-between mt-1 bg-white/40 dark:bg-black/10 px-4 py-2.5 rounded-2xl border border-white/60 dark:border-white/5 shadow-inner">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                 Missões
              </span>
              <div className="flex gap-1.5 ml-1">
                 {dailyStatus?.missions && dailyStatus.missions.length > 0 ? (
                   dailyStatus.missions.map((m) => (
                     <div 
                       key={m.id} 
                       className={cn(
                         "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-all duration-300",
                         m.completed 
                           ? "bg-green-500/20 border-green-500 text-green-600 shadow-[0_0_8px_rgba(34,197,94,0.3)]" 
                           : "bg-white/50 border-white/80 dark:bg-white/5 dark:border-white/10 text-muted-foreground"
                       )}
                       title={m.title}
                     >
                       {m.completed ? <Check className="w-3 h-3" /> : m.emoji}
                     </div>
                   ))
                 ) : (
                   <span className="text-[10px] font-bold text-muted-foreground/30 italic">Gerando...</span>
                 )}
              </div>
           </div>

           <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded-full">
                 <Sparkles className="w-2.5 h-2.5 text-pink-500" />
                 <span className="text-[10px] font-black text-pink-600 tabular-nums">
                    {dailyStatus?.missions?.filter(m => m.completed).length || 0}/3
                 </span>
              </div>
           </div>
        </div>
      </button>
    </div>
  );
}

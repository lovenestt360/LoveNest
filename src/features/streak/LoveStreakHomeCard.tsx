import { useNavigate } from "react-router-dom";
import { Flame, Shield, Trophy, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LoveStreakHomeCard() {
  const { data, dailyStatus, loading, streakIncreased } = useLoveStreak();
  const navigate = useNavigate();

  if (loading) return (
    <div className="h-44 w-full bg-muted/10 animate-pulse rounded-[2.5rem] border border-dashed border-primary/20 flex items-center justify-center">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-20">A carregar chama...</span>
    </div>
  );

  if (!data) return null;

  const level = getStreakLevel(data.current_streak);
  const bothToday = dailyStatus?.day_complete;
  
  // Emotional Feedback Text
  const getStatusMessage = () => {
    if (bothToday) return "🔥 Streak mantida! A vossa chama está viva.";
    if (dailyStatus?.me_active || dailyStatus?.partner_active) return "⚡ Falta pouco para manter a chama hoje!";
    return "💛 Vocês continuam conectados. Vamos interagir?";
  };

  return (
    <div className="space-y-3">
      {/* Streak Animation Overlay */}
      {streakIncreased && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500 pointer-events-none">
          <div className="text-center space-y-3 animate-in zoom-in duration-500">
            <div className="text-7xl animate-bounce">🔥</div>
            <h2 className="text-3xl font-black text-white">Streak aumentado!</h2>
            <p className="text-lg text-white/80">
              Vocês estão juntos há <span className="font-bold text-amber-400">{data.current_streak}</span> dias consecutivos.
            </p>
          </div>
        </div>
      )}

      {/* Main Streak Card */}
      <button
        onClick={() => navigate("/ranking?tab=streak")}
        className={cn(
          "glass-card glass-card-hover relative flex w-full flex-col rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-all duration-300 shadow-xl border border-white/10",
          bothToday && "ring-2 ring-orange-500/50 shadow-orange-500/20"
        )}
      >
        <div className={cn(
          "p-5 space-y-4 w-full transition-colors duration-500",
          bothToday ? "bg-gradient-to-br from-orange-500/20 via-red-500/10 to-pink-500/20" : "bg-gradient-to-br from-muted/50 to-background/50"
        )}>
          {/* Header with Streak & Shields */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 shadow-lg",
                bothToday 
                  ? "bg-orange-500 text-white animate-pulse shadow-orange-500/40 rotate-3" 
                  : "bg-muted text-muted-foreground rotate-0"
              )}>
                <Flame className={cn("h-8 w-8", bothToday && "animate-pulse")} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tighter text-foreground">
                    {data.current_streak} dias
                  </span>
                  {data.loveshield_count > 0 && (
                    <div className="flex items-center gap-1 bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20">
                      <Shield className="w-3 h-3 fill-current" />
                      <span className="text-[10px] font-black">{data.loveshield_count}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                  <Trophy className="w-3 h-3" /> {level.title} • {data.total_points || 0} pts
                </p>
              </div>
            </div>
            <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </div>

          {/* Activity Status Indicators */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-6">
              {/* Me Status */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                  dailyStatus?.me_active 
                    ? "bg-green-500/20 border-green-500 text-green-500 shadow-lg shadow-green-500/20" 
                    : "bg-muted/50 border-white/10 text-muted-foreground"
                )}>
                  <CheckCircle2 className={cn("w-5 h-5", dailyStatus?.me_active && "animate-in zoom-in duration-300")} />
                  {dailyStatus?.me_active && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-[10px] font-black uppercase opacity-60">Tu</span>
              </div>

              {/* Connector Line */}
              <div className={cn(
                "h-0.5 w-8 rounded-full transition-colors duration-1000",
                bothToday ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "bg-white/10"
              )} />

              {/* Partner Status */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                  dailyStatus?.partner_active 
                    ? "bg-green-500/20 border-green-500 text-green-500 shadow-lg shadow-green-500/20" 
                    : "bg-muted/50 border-white/10 text-muted-foreground"
                )}>
                  <CheckCircle2 className={cn("w-5 h-5", dailyStatus?.partner_active && "animate-in zoom-in duration-300")} />
                  {dailyStatus?.partner_active && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-[10px] font-black uppercase opacity-60">Amor</span>
              </div>
            </div>

            {/* Emotional Text Badge */}
            <div className="flex-1 flex justify-end">
              <span className={cn(
                "text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all duration-500 text-center animate-in fade-in slide-in-from-right-2",
                bothToday 
                  ? "bg-orange-500/10 border-orange-500/20 text-orange-600" 
                  : "bg-white/5 border-white/10 text-muted-foreground"
              )}>
                {getStatusMessage()}
              </span>
            </div>
          </div>

          {/* Missions Mini Tracker */}
          <div className="space-y-2 pt-1">
            {dailyStatus?.missions && dailyStatus.missions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {dailyStatus.missions.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 bg-white/5 p-2 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">{m.emoji}</span>
                      <span className={cn(
                        "text-[10px] font-bold truncate transition-all",
                        m.completed ? "text-green-600/60 line-through" : "text-muted-foreground"
                      )}>
                        {m.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000 ease-out", 
                            m.completed ? "bg-green-500" : "bg-orange-400"
                          )}
                          style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black tabular-nums opacity-40">
                        {m.current}/{m.target}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground/60 py-1">
                <Sparkles className="w-3 h-3" />
                <p className="text-[10px] font-bold italic tracking-wide uppercase">Prontos para novas aventuras juntos?</p>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

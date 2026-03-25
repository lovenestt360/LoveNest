import { useNavigate } from "react-router-dom";
import { Flame, Shield, Trophy, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LoveStreakHomeCard() {
  const { data, dailyStatus, loading, streakIncreased, useShield, confirmAction } = useLoveStreak();
  const navigate = useNavigate();

  if (loading || !data) return null;

  const level = getStreakLevel(data.current_streak);
  const nextLevel = getNextLevel(data.current_streak);
  const bothToday = dailyStatus?.day_complete;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmAction();
    if (ok) {
      toast.success("Ação confirmada! ✨");
    }
  };

  return (
    <div className="space-y-3">
      {/* Streak Animation Overlay */}
      {streakIncreased && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="text-center space-y-3 animate-scale-in">
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
        className="glass-card glass-card-hover relative flex w-full flex-col rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
      >
        <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-4 space-y-3 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                bothToday ? "bg-orange-500/20 text-orange-500 animate-pulse-glow" : "bg-orange-500/10 text-orange-400 animate-streak-shake"
              )}>
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  🔥 LoveStreak
                  {data.current_streak > 0 && (
                    <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      {data.current_streak} dia{data.current_streak !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    {level.title} • Melhor: {data.best_streak} dias
                  </p>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <p className="text-[10px] font-bold text-primary">
                    {data.total_points || 0} pts
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Today status */}
          <div className="flex items-center gap-3 text-xs">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full font-bold",
              dailyStatus?.me_active
                ? "bg-green-500/15 text-green-700"
                : "bg-muted text-muted-foreground"
            )}>
              {dailyStatus?.me_active ? "✓" : "○"} Tu
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full font-bold",
              dailyStatus?.partner_active
                ? "bg-green-500/15 text-green-700"
                : "bg-muted text-muted-foreground"
            )}>
              {dailyStatus?.partner_active ? "✓" : "○"} Par
            </div>
            
            {bothToday ? (
              <span className="text-green-600 font-bold flex items-center gap-1 animate-fade-slide-up">
                <Sparkles className="w-3 h-3" /> Streak Seguro! 💛
              </span>
            ) : (
              <span className="text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3" /> Falta pouco 🔥
              </span>
            )}
          </div>

          {/* Shields */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span className="font-bold text-blue-600 bg-blue-500/10 px-1.5 rounded-full">
              {data.loveshield_count}
            </span>
            <span className="ml-1">LoveShields disponíveis</span>
          </div>
        </div>
      </button>

      {/* Daily Love Mission Card */}
      {dailyStatus && dailyStatus.mission_title && (
        <div 
          className="glass-card rounded-2xl p-4 space-y-3 border-primary/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> MISSÃO DO DIA 📸✨
            </span>
            <span className="text-xs font-bold text-primary">+{dailyStatus.mission_points} pts</span>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {dailyStatus.mission_emoji} {dailyStatus.mission_title}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight italic">
              {dailyStatus.mission_description}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {dailyStatus.me_active ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-500/10 px-3 py-1.5 rounded-xl w-full justify-center">
                <CheckCircle2 className="w-4 h-4" /> Ação Confirmada
              </div>
            ) : (
              <Button 
                onClick={handleConfirm}
                className="w-full text-xs font-bold h-9 rounded-xl shadow-lg shadow-primary/20"
              >
                Confirmar Ação
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <span>Status do Par:</span>
            <span className={cn(
              "font-bold",
              dailyStatus.partner_active ? "text-green-600" : "text-amber-500"
            )}>
              {dailyStatus.partner_active ? "✓ Concluído" : "○ Pendente"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

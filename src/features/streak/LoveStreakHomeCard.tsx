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
        className="glass-card glass-card-hover relative flex w-full flex-col rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform duration-150 shadow-md"
      >
        <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-3.5 space-y-2.5 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                bothToday ? "bg-orange-500/20 text-orange-500 animate-pulse-glow" : "bg-orange-500/10 text-orange-400"
              )}>
                <Flame className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-tighter">
                  LoveStreak
                  {data.current_streak > 0 && (
                    <span className="text-[10px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded-md">
                      {data.current_streak}
                    </span>
                  )}
                </span>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                  {level.title} • {data.total_points || 0} pts
                </p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1",
                dailyStatus?.me_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground/50"
              )}>
                {dailyStatus?.me_active ? <CheckCircle2 className="w-2.5 h-2.5" /> : "○"} TU
              </div>
              <div className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1",
                dailyStatus?.partner_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground/50"
              )}>
                {dailyStatus?.partner_active ? <CheckCircle2 className="w-2.5 h-2.5" /> : "○"} PAR
              </div>
            </div>

            {!dailyStatus?.me_active && dailyStatus?.mission_title && (
              <Button 
                onClick={handleConfirm}
                size="sm"
                className="h-6 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary animate-pulse-glow"
              >
                Missão
              </Button>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

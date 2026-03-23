import { useNavigate } from "react-router-dom";
import { Flame, Shield, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoveStreakHomeCard() {
  const { data, loading, streakIncreased, canUseShield, useShield, isPartner1 } = useLoveStreak();
  const { challenges, completions, partnerCompletions } = useDailyChallenge();
  const challenge = challenges[0];
  const completed = challenge ? completions[challenge.id] : false;
  const partnerCompleted = challenge ? partnerCompletions[challenge.id] : false;
  const navigate = useNavigate();

  if (loading || !data) return null;

  const level = getStreakLevel(data.current_streak);
  const nextLevel = getNextLevel(data.current_streak);
  const bothToday = data.partner1_interacted_today && data.partner2_interacted_today;

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

      {/* Shield Alert */}
      {canUseShield && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold text-foreground">
                Perderam o LoveStreak ontem! 😢
              </p>
              <p className="text-xs text-muted-foreground">
                Usem um <strong>LoveShield</strong> para restaurar ({data.shield_remaining}/3 restantes)
              </p>
              <Button
                size="sm"
                className="text-xs"
                onClick={async () => {
                  const ok = await useShield();
                  if (ok) {
                    // Could show toast
                  }
                }}
              >
                <Shield className="w-3 h-3 mr-1" /> Restaurar Streak
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Streak Card */}
      <button
        onClick={() => navigate("/ranking?tab=streak")}
        className="glass-card glass-card-hover relative flex w-full flex-col rounded-[2.5rem] overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
      >
        <div className="p-6 space-y-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                bothToday ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground/40"
              )}>
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <span className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  LoveStreak
                  {data.current_streak > 0 && (
                    <span className="text-[10px] font-black text-orange-500 bg-orange-500/5 px-2 py-0.5 rounded-full border border-orange-500/10">
                      {data.current_streak} DIAS
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                    {level.title} • Recorde: {data.best_streak}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 py-1">
            {(() => {
              const meInteracted = isPartner1 ? data.partner1_interacted_today : data.partner2_interacted_today;
              const partnerInteracted = isPartner1 ? data.partner2_interacted_today : data.partner1_interacted_today;
              
              return (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    meInteracted ? "bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "bg-muted"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Tu</span>
                  
                  <div className="w-4" />
                  
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    partnerInteracted ? "bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "bg-muted"
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Par</span>
                </div>
              );
            })()}
          </div>

          {!bothToday && (
            <p className="text-[10px] text-orange-500/80 font-black uppercase tracking-widest animate-pulse">
              Falta pouco para manter a chama acesa... 🔥
            </p>
          )}

          {/* Shields */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">LoveShield</span>
            <div className="flex gap-1.5 text-xs">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={cn(
                  "opacity-50 grayscale transition-all",
                  i < data.shield_remaining ? "opacity-100 grayscale-0" : "opacity-20"
                )}>
                  🛡️
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>

      {/* Daily Challenge Card */}
      {challenge && (
        <div 
          className="glass-card rounded-2xl p-4 space-y-2 cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={() => navigate("/ranking?tab=tasks")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Criem um momento juntos hoje 📸✨
            </span>
            <span className="text-xs font-bold text-primary">+{challenge.points} pts</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {challenge.emoji} {challenge.challenge_text}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              "px-2 py-0.5 rounded-full font-bold",
              completed ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground"
            )}>
              {completed ? "✓ Tu" : "○ Tu"}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-bold",
              partnerCompleted ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground"
            )}>
              {partnerCompleted ? "✓ Par" : "○ Par"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

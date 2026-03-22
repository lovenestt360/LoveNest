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
        className="glass-card glass-card-hover relative flex w-full flex-col rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
      >
        <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-4 space-y-3 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-500">
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
            {(() => {
              const meInteracted = isPartner1 ? data.partner1_interacted_today : data.partner2_interacted_today;
              const partnerInteracted = isPartner1 ? data.partner2_interacted_today : data.partner1_interacted_today;
              
              return (
                <>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full font-bold",
                    meInteracted
                      ? "bg-green-500/15 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {meInteracted ? "✓" : "○"} Tu
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full font-bold",
                    partnerInteracted
                      ? "bg-green-500/15 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {partnerInteracted ? "✓" : "○"} Par
                  </div>
                </>
              );
            })()}
            {bothToday ? (
              <span className="text-green-600 font-bold flex items-center gap-1 animate-in fade-in duration-500">
                <Sparkles className="w-3 h-3" /> Vocês apareceram um para o outro hoje 💛
              </span>
            ) : (
              <span className="text-amber-600 font-bold flex items-center gap-1 animate-in pulse duration-1000">
                <Flame className="w-3 h-3" /> Falta pouco… não deixem o vosso streak cair 😢
              </span>
            )}
          </div>

          {/* Shields */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                i < data.shield_remaining
                  ? "bg-blue-500/20 text-blue-600"
                  : "bg-muted text-muted-foreground/40"
              )}>
                🛡️
              </span>
            ))}
            <span className="ml-1">LoveShield</span>
          </div>

          {/* Next level progress */}
          {nextLevel && (
            <div className="text-[10px] text-muted-foreground">
              <span>Próximo nível: <strong className="text-foreground">{nextLevel.title}</strong> ({nextLevel.min - data.current_streak} dias restantes)</span>
            </div>
          )}
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

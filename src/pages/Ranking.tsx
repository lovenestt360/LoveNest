import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { Flame, Shield, Trophy, Medal, Crown, Star, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RankEntry {
  couple_space_id: string;
  current_streak: number;
  best_streak: number;
  level_title: string;
  house_name: string | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Ranking() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { data: streakData, canUseShield, useShield } = useLoveStreak();
  const { challenge, completed, completeChallenge } = useDailyChallenge();
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      // Get all streaks with couple space names
      const { data: streaks } = await supabase
        .from("love_streaks")
        .select("couple_space_id, current_streak, best_streak, level_title")
        .order("current_streak", { ascending: false })
        .limit(50);

      if (!streaks) {
        setLoading(false);
        return;
      }

      // Fetch house names
      const spaceIds = streaks.map(s => s.couple_space_id);
      const { data: spaces } = await supabase
        .from("couple_spaces")
        .select("id, house_name")
        .in("id", spaceIds);

      const nameMap = new Map((spaces || []).map(s => [s.id, s.house_name]));

      const ranked: RankEntry[] = streaks.map(s => ({
        ...s,
        house_name: nameMap.get(s.couple_space_id) || "LoveNest",
      }));

      setRanking(ranked);
      setLoading(false);
    };

    fetchRanking();
  }, []);

  const myRank = ranking.findIndex(r => r.couple_space_id === spaceId) + 1;
  const level = streakData ? getStreakLevel(streakData.current_streak) : null;
  const nextLevel = streakData ? getNextLevel(streakData.current_streak) : null;
  const nextLevelProgress = nextLevel && streakData
    ? Math.min(100, Math.round((streakData.current_streak / nextLevel.min) * 100))
    : 100;

  return (
    <section className="space-y-6 pb-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" /> LoveNest Ranking
        </h1>
        <p className="text-sm text-muted-foreground">Casais com os maiores LoveStreaks</p>
      </header>

      {/* My Stats */}
      {streakData && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-black">{streakData.current_streak}</p>
                <p className="text-xs text-muted-foreground">Streak atual</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-muted-foreground">{streakData.best_streak}</p>
              <p className="text-xs text-muted-foreground">Melhor streak</p>
            </div>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" /> {level?.title}
              </span>
              {myRank > 0 && (
                <span className="text-xs text-muted-foreground">
                  #{myRank} no ranking
                </span>
              )}
            </div>
            {nextLevel && (
              <div className="space-y-1">
                <Progress value={nextLevelProgress} className="h-2" />
                <p className="text-[10px] text-muted-foreground">
                  {nextLevel.min - streakData.current_streak} dias para <strong>{nextLevel.title}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Shields */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold">LoveShield:</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={cn(
                "text-sm",
                i < streakData.shield_remaining ? "" : "opacity-30"
              )}>
                🛡️
              </span>
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              ({streakData.shield_remaining}/3 este mês)
            </span>
          </div>

          {/* Shield restore */}
          {canUseShield && (
            <Button size="sm" variant="outline" className="w-full border-amber-500/30 text-amber-600" onClick={useShield}>
              <Shield className="w-4 h-4 mr-1" /> Restaurar Streak com LoveShield
            </Button>
          )}
        </div>
      )}

      {/* Daily Challenge */}
      {challenge && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" /> Desafio do Dia
            </h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              +{challenge.points} pts
            </span>
          </div>
          <p className="text-base font-medium">
            {challenge.emoji} {challenge.challenge_text}
          </p>
          {!completed ? (
            <Button size="sm" className="w-full" onClick={completeChallenge}>
              <Check className="w-4 h-4 mr-1" /> Marcar como Concluído
            </Button>
          ) : (
            <div className="text-center text-sm font-bold text-green-600 bg-green-500/10 py-2 rounded-xl">
              ✅ Desafio concluído hoje!
            </div>
          )}
        </div>
      )}

      {/* Ranking List */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
          🏆 Top Casais
        </h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">A carregar...</div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum casal com streak ainda. Sejam os primeiros! 🔥
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, i) => {
              const isMe = entry.couple_space_id === spaceId;
              const isTop3 = i < 3;
              return (
                <div
                  key={entry.couple_space_id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-4 transition-all",
                    isMe ? "glass-card ring-2 ring-primary/30" : "bg-card/50 border",
                    isTop3 && i === 0 && "bg-gradient-to-r from-amber-500/10 to-yellow-500/5",
                    isTop3 && i === 1 && "bg-gradient-to-r from-gray-400/10 to-gray-300/5",
                    isTop3 && i === 2 && "bg-gradient-to-r from-orange-700/10 to-orange-600/5",
                  )}
                >
                  {/* Position */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0">
                    {isTop3 ? (
                      <span className="text-2xl">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-lg font-black text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold truncate",
                        isMe && "text-primary"
                      )}>
                        {entry.house_name || "LoveNest"}
                      </span>
                      {isMe && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                          Vocês
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.level_title} • Melhor: {entry.best_streak}
                    </p>
                  </div>

                  {/* Streak */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Flame className={cn(
                      "w-4 h-4",
                      entry.current_streak > 0 ? "text-orange-500" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-lg font-black",
                      entry.current_streak > 0 ? "text-orange-500" : "text-muted-foreground"
                    )}>
                      {entry.current_streak}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

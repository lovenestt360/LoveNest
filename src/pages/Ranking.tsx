import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { Flame, Shield, Trophy, Medal, Crown, Star, Sparkles, Check, TrendingUp, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RankEntry {
  couple_space_id: string;
  current_streak: number;
  best_streak: number;
  total_points: number;
  level_title: string;
  house_name: string | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Ranking() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { data: streakData, canUseShield, useShield, buyShield } = useLoveStreak();
  const { challenge, completed, completeChallenge } = useDailyChallenge();
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankType, setRankType] = useState<"streak" | "points">("streak");

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      // Get all streaks with couple space names
      const { data: streaks } = await supabase
        .from("love_streaks")
        .select("couple_space_id, current_streak, best_streak, total_points, level_title")
        .order(rankType === "streak" ? "current_streak" : "total_points", { ascending: false })
        .limit(50) as any;

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
        total_points: s.total_points || 0,
        house_name: nameMap.get(s.couple_space_id) || "LoveNest",
      }));

      setRanking(ranked);
      setLoading(false);
    };

    fetchRanking();
  }, [rankType]);

  const myRank = ranking.findIndex(r => r.couple_space_id === spaceId) + 1;
  const level = streakData ? getStreakLevel(streakData.current_streak) : null;
  const nextLevel = streakData ? getNextLevel(streakData.current_streak) : null;
  const nextLevelProgress = nextLevel && streakData
    ? Math.min(100, Math.round((streakData.current_streak / nextLevel.min) * 100))
    : 100;

  const handleBuyShield = async () => {
    if (!streakData || streakData.total_points < 50) {
      toast.error("Pontos insuficientes (Mínimo 50 pts)");
      return;
    }
    const ok = await buyShield();
    if (ok) {
      toast.success("LoveShield adquirido com sucesso! 🛡️");
    } else {
      toast.error("Erro ao adquirir escudo");
    }
  };

  return (
    <section className="space-y-6 pb-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Ranking Global
          </h1>
          <p className="text-sm text-muted-foreground">Os casais mais dedicados do LoveNest</p>
        </div>
        {streakData && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">{streakData.total_points || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Meus Pontos</p>
          </div>
        )}
      </header>

      {/* Stats Summary */}
      {streakData && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
            <Flame className="w-5 h-5 text-orange-500" />
            <p className="text-xl font-black">{streakData.current_streak}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Dias de Streak</p>
          </div>
          <div className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
            <Shield className="w-5 h-5 text-blue-500" />
            <p className="text-xl font-black">{streakData.shield_remaining}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">LoveShields</p>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-muted rounded-xl gap-1">
        <button
          onClick={() => setRankType("streak")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
            rankType === "streak" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Flame className="w-4 h-4" /> Sequência
        </button>
        <button
          onClick={() => setRankType("points")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
            rankType === "points" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="w-4 h-4" /> Pontuação
        </button>
      </div>

      {/* Daily Challenge Card */}
      {challenge && (
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <div className="glass-card rounded-2xl p-5 space-y-3 relative border-primary/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Desafio do Dia
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Check className={cn("w-3 h-3", completed ? "text-green-500" : "text-primary")} />
                +{challenge.points} pts
              </div>
            </div>
            <p className="text-base font-medium leading-relaxed">
              {challenge.emoji} {challenge.challenge_text}
            </p>
            {!completed ? (
              <Button size="sm" className="w-full font-bold h-10 shadow-lg shadow-primary/20" onClick={completeChallenge}>
                Concluir Desafio
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-green-600 bg-green-500/10 rounded-xl">
                <Sparkles className="w-4 h-4" /> Recompensa resgatada!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shop - Utility for points */}
      {streakData && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold">Loja de Escudos</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Pontos: {streakData.total_points}</span>
          </div>
          <div className="flex items-center justify-between bg-background/50 p-3 rounded-xl border border-border/50">
            <div className="space-y-0.5">
              <p className="text-xs font-bold">Comprar LoveShield</p>
              <p className="text-[10px] text-muted-foreground">Custa 50 pontos</p>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-8 text-xs font-bold px-4"
              onClick={handleBuyShield}
              disabled={streakData.total_points < 50}
            >
              Adquirir
            </Button>
          </div>
        </div>
      )}

      {/* Ranking List */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest pl-1">
          {rankType === "streak" ? "🔥 Melhores Chamas" : "🏆 Maiores Conquistas"}
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs font-medium">A atualizar o ranking...</p>
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ranking.map((entry, i) => {
              const isMe = entry.couple_space_id === spaceId;
              const value = rankType === "streak" ? entry.current_streak : entry.total_points;
              const isTop3 = i < 3;
              
              return (
                <div
                  key={entry.couple_space_id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-4 transition-all duration-300",
                    isMe ? "glass-card ring-2 ring-primary/40 scale-[1.02] z-10" : "bg-card/40 border border-border/50",
                    isTop3 && i === 0 && "bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/20",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center shrink-0 font-black italic text-lg">
                    {isTop3 ? MEDALS[i] : i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-bold truncate text-sm", isMe && "text-primary")}>
                      {entry.house_name || "LoveNest"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                      {entry.level_title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/40 border">
                    {rankType === "streak" ? (
                      <Flame className={cn("w-4 h-4", value > 0 ? "text-orange-500" : "text-muted-foreground")} />
                    ) : (
                      <Coins className={cn("w-4 h-4", value > 0 ? "text-primary" : "text-muted-foreground")} />
                    )}
                    <span className="text-base font-black tabular-nums">
                      {value}
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

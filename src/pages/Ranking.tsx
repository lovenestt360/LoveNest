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
    <section className="space-y-6 pb-24 animate-fade-in max-w-md mx-auto px-4 pt-4">
      <header className="flex items-center justify-between bg-card/30 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Centro de Amor</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Progresso & Conquistas</p>
          </div>
        </div>
        {streakData && (
          <div className="text-right">
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-black text-primary">{streakData.total_points || 0}</span>
            </div>
          </div>
        )}
      </header>

      {/* 🚀 ESTADO DA STREAK (Barra de Progresso) */}
      {streakData && (
        <div className="glass-card rounded-3xl p-6 space-y-4 border-primary/20 shadow-xl shadow-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
              <span className="text-lg font-black">{streakData.current_streak} Dias de Fogo</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg uppercase">
              Melhor: {streakData.best_streak}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
              <span className="text-muted-foreground">Progresso do Dia</span>
              <span className={cn(
                (streakData.partner1_interacted_today && streakData.partner2_interacted_today) ? "text-green-500" : "text-primary"
              )}>
                {(streakData.partner1_interacted_today && streakData.partner2_interacted_today) ? "Chama Validada! ✨" : "A manter a chama..."}
              </span>
            </div>
            <Progress 
              value={(Number(streakData.partner1_interacted_today) + Number(streakData.partner2_interacted_today)) * 50} 
              className="h-3 bg-primary/10" 
            />
            <div className="flex justify-between items-center gap-2 pt-1">
              <div className={cn("flex-1 h-1.5 rounded-full transition-all", streakData.partner1_interacted_today ? "bg-green-500" : "bg-muted")} />
              <div className={cn("flex-1 h-1.5 rounded-full transition-all", streakData.partner2_interacted_today ? "bg-green-500" : "bg-muted")} />
            </div>
          </div>
        </div>
      )}

      {/* 📝 ÁREA DE TAREFAS */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
          <Check className="w-3 h-3" /> Tarefas & Missões
        </h3>
        
        <div className="grid gap-3">
          {/* Tarefas de Streak (Validação) */}
          <div className="glass-card rounded-2xl p-4 border-orange-500/20 bg-orange-500/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-tighter text-orange-600 flex items-center gap-1">
                <Flame className="w-3 h-3" /> Tarefas de Streak
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between bg-background/50 p-2.5 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center border-2", streakData?.partner1_interacted_today ? "bg-green-500 border-green-500 text-white" : "border-muted")}>
                    {streakData?.partner1_interacted_today && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-bold">Interação do Parceiro 1</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-background/50 p-2.5 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center border-2", streakData?.partner2_interacted_today ? "bg-green-500 border-green-500 text-white" : "border-muted")}>
                    {streakData?.partner2_interacted_today && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-bold">Interação do Parceiro 2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarefas de Pontos (Desafio Diário) */}
          {challenge && (
            <div className="glass-card rounded-2xl p-4 border-primary/20 bg-primary/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-tighter text-primary flex items-center gap-1">
                  <Star className="w-3 h-3" /> Tarefas de Pontos
                </span>
                <span className="text-[10px] font-black text-primary">+{challenge.points} PTS</span>
              </div>
              <div className="bg-background/50 p-3 rounded-xl border border-border/50 space-y-3">
                <p className="text-xs font-bold leading-tight">
                  {challenge.emoji} {challenge.challenge_text}
                </p>
                {!completed ? (
                  <Button size="sm" className="w-full h-8 text-xs font-black rounded-lg" onClick={completeChallenge}>
                    Concluir Desafio
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-[10px] font-black text-green-600 bg-green-500/10 rounded-lg">
                    <Sparkles className="w-3 h-3" /> Recompensa resgatada!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🛡️ LOJA DE ESCUDOS */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
          <Shield className="w-3 h-3 text-blue-500" /> Loja de Itens
        </h3>
        <div className="glass-card rounded-2xl p-4 border-blue-500/20 bg-blue-500/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shadow-inner">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black">LoveShield</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < (streakData?.shield_remaining || 0) ? "bg-blue-500" : "bg-muted")} />
                  ))}
                  <span className="text-[9px] text-muted-foreground ml-1">Disponíveis: {streakData?.shield_remaining || 0}/3</span>
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              className="h-8 text-[10px] font-black px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleBuyShield}
              disabled={!streakData || streakData.total_points < 50 || streakData.shield_remaining >= 3}
            >
              50 PTS
            </Button>
          </div>
        </div>
      </div>

      {/* 🏆 RANKING GLOBAL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Medal className="w-3 h-3" /> Ranking Global
          </h3>
          <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
            <button 
              onClick={() => setRankType("streak")}
              className={cn("p-1.5 rounded-md transition-all", rankType === "streak" ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setRankType("points")}
              className={cn("p-1.5 rounded-md transition-all", rankType === "points" ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A carregar...</p>
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Sem dados ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking.map((entry, i) => {
                const isMe = entry.couple_space_id === spaceId;
                const value = rankType === "streak" ? entry.current_streak : entry.total_points;
                const isTop3 = i < 3;
                
                return (
                  <div
                    key={entry.couple_space_id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-300",
                      isMe ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card/40 border border-border/50",
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center shrink-0 font-black italic text-base">
                      {isTop3 ? MEDALS[i] : i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold truncate text-xs", isMe && "text-primary")}>
                        {entry.house_name || "LoveNest"}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight">
                        {entry.level_title}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/50 border shadow-sm">
                      {rankType === "streak" ? (
                        <Flame className={cn("w-3.5 h-3.5", value > 0 ? "text-orange-500" : "text-muted-foreground")} />
                      ) : (
                        <Coins className={cn("w-3.5 h-3.5", value > 0 ? "text-primary" : "text-muted-foreground")} />
                      )}
                      <span className="text-sm font-black tabular-nums">
                        {value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

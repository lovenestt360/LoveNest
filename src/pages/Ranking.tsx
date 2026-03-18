import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { Flame, Shield, Trophy, Medal, Crown, Star, Sparkles, Check, TrendingUp, Coins, LayoutList, Target, ShoppingBag, Copy, Share2 } from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "streak";
  
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { data: streakData, buyShield } = useLoveStreak();
  const { challenge, completed, completeChallenge } = useDailyChallenge();
  
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      const rankType = activeTab === "points" ? "points" : "streak";
      
      const { data: streaks } = await supabase
        .from("love_streaks")
        .select("couple_space_id, current_streak, best_streak, total_points, level_title")
        .order(rankType === "streak" ? "current_streak" : "total_points", { ascending: false })
        .limit(50) as any;

      if (!streaks) {
        setLoading(false);
        return;
      }

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

    if (activeTab !== "tasks") {
      fetchRanking();
    }
  }, [activeTab]);

  useEffect(() => {
    if (spaceId) {
      supabase
        .from("micro_challenge_completions")
        .select("id", { count: "exact", head: true })
        .eq("couple_space_id", spaceId)
        .then(({ count }) => setTasksCompleted(count || 0));
    }
  }, [spaceId]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("referral_code").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (data?.referral_code) setReferralCode(data.referral_code);
        });
    }
  }, [user]);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success("Código copiado! 🚀");
    }
  };

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
    <section className="min-h-screen bg-transparent pb-24 animate-fade-in max-w-md mx-auto px-4 pt-4 space-y-6">
      {/* Tab Navigation */}
      <div className="flex p-1 bg-muted/50 backdrop-blur-sm rounded-2xl border border-border/50 sticky top-4 z-50">
        <button
          onClick={() => setSearchParams({ tab: "tasks" })}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300",
            activeTab === "tasks" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
          )}
        >
          <LayoutList className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Tarefas</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: "streak" })}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300",
            activeTab === "streak" ? "bg-background text-orange-500 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
          )}
        >
          <Flame className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Love Streak</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: "points" })}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300",
            activeTab === "points" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
          )}
        >
          <Trophy className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Pontos</span>
        </button>
      </div>

      {/* Content Areas */}
      <div className="space-y-6">
        
        {/* TAB: TAREFAS */}
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            <header className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">Suas Missões</h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Complete para crescerem juntos</p>
            </header>

            <div className="space-y-6">
              {/* Tarefas Love Streak */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
                  <Flame className="w-4 h-4" /> Tarefas Love Streak
                </div>
                <div className="grid gap-3">
                  <div className="glass-card rounded-2xl p-4 border-orange-500/10 bg-orange-500/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors", streakData?.partner1_interacted_today ? "bg-green-500 border-green-500 text-white" : "border-muted bg-muted/20")}>
                        {streakData?.partner1_interacted_today ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                      </div>
                      <span className="text-sm font-bold">Validar Parceiro 1</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-tighter" disabled>
                      {streakData?.partner1_interacted_today ? "Feito" : "Pendente"}
                    </Button>
                  </div>
                  <div className="glass-card rounded-2xl p-4 border-orange-500/10 bg-orange-500/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors", streakData?.partner2_interacted_today ? "bg-green-500 border-green-500 text-white" : "border-muted bg-muted/20")}>
                        {streakData?.partner2_interacted_today ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                      </div>
                      <span className="text-sm font-bold">Validar Parceiro 2</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-tighter" disabled>
                      {streakData?.partner2_interacted_today ? "Feito" : "Pendente"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tarefas de Pontos */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                  <Star className="w-4 h-4" /> Tarefas de Pontos
                </div>
                {challenge && (
                  <div className="glass-card rounded-2xl p-5 border-primary/20 bg-primary/[0.03] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{challenge.emoji} {challenge.challenge_text}</span>
                      <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">+{challenge.points} PTS</span>
                    </div>
                    <Button 
                      className="w-full h-11 font-black shadow-lg shadow-primary/20" 
                      onClick={completeChallenge}
                      disabled={completed}
                    >
                      {completed ? "Tarefa Concluída!" : "Ir para o Desafio"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: LOVE STREAK */}
        {activeTab === "streak" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/10 rounded-bl-full transform translate-x-2 -translate-y-2 group-hover:scale-150 transition-transform duration-500" />
                <Flame className="w-8 h-8 text-orange-500 mb-1" />
                <p className="text-3xl font-black tracking-tighter">{streakData?.current_streak || 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Dias Streak</p>
              </div>
              <div className="glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 rounded-bl-full transform translate-x-2 -translate-y-2 group-hover:scale-150 transition-transform duration-500" />
                <Shield className="w-8 h-8 text-blue-500 mb-1" />
                <p className="text-3xl font-black tracking-tighter">{streakData?.shield_remaining || 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">LoveShields</p>
              </div>
            </div>

            {/* Shop Section Integrated */}
            <div className="glass-card rounded-3xl p-5 border-blue-500/10 bg-blue-500/[0.01] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Loja de Itens
                </h3>
                <span className="text-[10px] font-black bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-full">Disponíveis: {streakData?.shield_remaining}/3</span>
              </div>
              <div className="flex items-center justify-between bg-background/40 p-3 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Shield className="w-5 h-5 shadow-sm" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black">Comprar LoveShield</p>
                    <p className="text-[10px] text-muted-foreground">Recupera a Streak perdida</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className={cn("h-9 text-[11px] font-black px-4 rounded-xl shadow-lg transition-all", streakData?.total_points && streakData.total_points >= 50 ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" : "bg-muted text-muted-foreground")}
                  onClick={handleBuyShield}
                  disabled={!streakData || streakData.total_points < 50 || streakData.shield_remaining >= 3}
                >
                  50 PTS
                </Button>
              </div>
            </div>

            {/* Streak Ranking */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                <Medal className="w-4 h-4" /> Ranking de Chamas
              </h3>
              <div className="space-y-2.5">
                {ranking.map((entry, i) => (
                  <div
                    key={entry.couple_space_id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-4 transition-all duration-300",
                      entry.couple_space_id === spaceId ? "bg-orange-500/5 ring-1 ring-orange-500/20 shadow-md shadow-orange-500/5" : "bg-card/40 border border-border/50",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center shrink-0 font-black italic text-lg text-orange-500">
                      {i < 3 ? MEDALS[i] : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold truncate text-sm", entry.couple_space_id === spaceId && "text-orange-600")}>
                        {entry.house_name}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                        {entry.level_title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border shadow-inner">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-base font-black tabular-nums">{entry.current_streak}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PONTOS */}
        {activeTab === "points" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="glass-card rounded-2xl p-6 border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Convida e Ganha! 💰</h3>
                      <p className="text-sm text-muted-foreground leading-snug">Cada amigo que entrar ganha 100 pontos e tu ganhas 50!</p>
                    </div>
                  </div>
                  
                  {referralCode && (
                    <div className="flex items-center gap-2 bg-background/50 p-2 rounded-xl border self-start md:self-auto">
                      <span className="font-mono font-bold px-3 text-primary">{referralCode}</span>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCopyCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
              <div className="glass-card rounded-3xl p-6 bg-primary/5 border-primary/10">
                <p className="text-3xl font-black text-primary tracking-tighter">{streakData?.total_points || 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Meus Pontos</p>
              </div>
              <div className="glass-card rounded-3xl p-6">
                <p className="text-3xl font-black tracking-tighter">{tasksCompleted}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Micro-Desafios</p>
              </div>
            </div>

            {/* Points Ranking */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                <TrendingUp className="w-4 h-4" /> Maiores Conquistas
              </h3>
              <div className="space-y-2.5">
                {ranking.map((entry, i) => (
                  <div
                    key={entry.couple_space_id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-4 transition-all duration-300",
                      entry.couple_space_id === spaceId ? "bg-primary/5 ring-1 ring-primary/20 shadow-md shadow-primary/5" : "bg-card/40 border border-border/50",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center shrink-0 font-black italic text-lg text-primary">
                      {i < 3 ? MEDALS[i] : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold truncate text-sm", entry.couple_space_id === spaceId && "text-primary")}>
                        {entry.house_name}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                        {entry.level_title}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border shadow-inner">
                      <Coins className="w-4 h-4 text-primary" />
                      <span className="text-base font-black tabular-nums">{entry.total_points}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

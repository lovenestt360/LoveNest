import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { Flame, Shield, Trophy, Medal, Crown, Star, Sparkles, Check, ShieldCheck, TrendingUp, Coins, LayoutList, Target, ShoppingBag, Copy, Share2 } from "lucide-react";
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
  house_image: string | null;
  is_verified?: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Ranking() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { data: streakData, buyShield, isPartner1 } = useLoveStreak();
  const { 
    challenges, 
    completions, 
    partnerCompletions, 
    loading: challengesLoading,
    reload: reloadChallenges
  } = useDailyChallenge();
  
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "streak" | "points">("tasks");
  const avatars = useCoupleAvatars();
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [attemptedChallenges, setAttemptedChallenges] = useState<Record<string, boolean>>({});

  const getChallengeUrl = (type: string) => {
    switch (type) {
      case "message": return "/chat";
      case "mood": return "/humor";
      case "memory": return "/memorias";
      case "prayer": return "/oracao";
      case "fasting": return "/jejum";
      default: return null;
    }
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && (tabFromUrl === "tasks" || tabFromUrl === "streak" || tabFromUrl === "points")) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

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
        .select("id, house_name, house_image, is_verified")
        .in("id", spaceIds) as any;

      const spaceMap = new Map((spaces || []).map(s => [s.id, s]));

      const ranked: RankEntry[] = streaks.map(s => {
        const space = spaceMap.get(s.couple_space_id) as any;
        return {
          ...s,
          total_points: s.total_points || 0,
          house_name: space?.house_name || "LoveNest",
          house_image: space?.house_image || null,
          is_verified: space?.is_verified || false,
        };
      });

      setRanking(ranked);
      setLoading(false);
    };

    if (activeTab !== "tasks") {
      fetchRanking();
    }
  }, [activeTab]);

  const meInteracted = isPartner1 ? streakData?.partner1_interacted_today : streakData?.partner2_interacted_today;
  const partnerInteracted = isPartner1 ? streakData?.partner2_interacted_today : streakData?.partner1_interacted_today;

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

  const handleShareReferral = () => {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;
    const message = `Estamos a usar o LoveNest 💛\num espaço só nosso…\ncria o teu também ✨\n\nCódigo: ${referralCode}`;

    if (navigator.share) {
      navigator.share({ 
        title: 'Convite LoveNest', 
        text: message, 
        url: shareUrl 
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${message}\n${shareUrl}`);
      toast.success("Convite copiado! 🚀");
    }
  };

  const handleBuyShield = async () => {
    if (!streakData || streakData.total_points < 200) {
      toast.error("Pontos insuficientes (Mínimo 200 pts)");
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
      <div className="flex p-1.5 bg-white/20 backdrop-blur-xl rounded-[2rem] border border-white/30 sticky top-4 z-[100] shadow-2xl">
        <button
          onClick={() => setSearchParams({ tab: "tasks" })}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-[1.5rem] transition-all duration-300",
            activeTab === "tasks" ? "bg-primary text-white shadow-xl scale-105" : "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          <LayoutList className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tight">Missões</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: "streak" })}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-[1.5rem] transition-all duration-300",
            activeTab === "streak" ? "bg-orange-500 text-white shadow-xl scale-105" : "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          <Flame className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tight">Streak</span>
        </button>
        <button
          onClick={() => setSearchParams({ tab: "points" })}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-[1.5rem] transition-all duration-300",
            activeTab === "points" ? "bg-yellow-500 text-white shadow-xl scale-105" : "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          <Trophy className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-black uppercase tracking-tight">Ranking</span>
        </button>
      </div>

      {/* Content Areas */}
      <div className="space-y-6">
        
        {/* TAB: TAREFAS */}
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            <header className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">Suas Missões</h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest text-[#EAB308]">Pequenas ações criam grandes relações 💛</p>
            </header>

            <div className="space-y-6">
              {/* Tarefas Love Streak */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
                  <Flame className="w-4 h-4" /> Tarefas Love Streak
                </div>
                <div className="grid gap-3">
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2rem] p-5 text-white shadow-lg border-none">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                        meInteracted 
                          ? "bg-white/20 border-white text-white" 
                          : "bg-black/20 border-white/30 text-white/50"
                      )}>
                        {meInteracted ? <Check className="w-6 h-6" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-lg tracking-tight">
                          {avatars.me?.displayName || "Tu"}
                        </p>
                        <p className="text-[10px] text-white/80 uppercase tracking-widest font-black">
                          {meInteracted ? "Já Interagiu ✨" : "Pendente hoje ⏳"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-[2rem] p-5 text-white shadow-lg border-none">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                        partnerInteracted 
                          ? "bg-white/20 border-white text-white" 
                          : "bg-black/20 border-white/30 text-white/50"
                      )}>
                        {partnerInteracted ? <Check className="w-6 h-6" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-lg tracking-tight">
                          {avatars.partner?.displayName || "Parceiro"}
                        </p>
                        <p className="text-[10px] text-white/80 uppercase tracking-widest font-black">
                          {partnerInteracted ? "Já Interagiu ✨" : "Pendente hoje ⏳"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarefas de Pontos */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#EAB308]">
                  <Star className="w-4 h-4" /> Missões Diárias (+ Pontos)
                </div>
                <div className="grid gap-4">
                  {challenges.map((ch, i) => (
                    <div key={ch.id} className={cn(
                      "rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden border-none",
                      i % 3 === 0 ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" : 
                      i % 3 === 1 ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20" : 
                      "bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-purple-500/20"
                    )}>
                      {completions[ch.id] && (
                        <div className="absolute top-0 right-0 p-4 text-white animate-in fade-in zoom-in duration-300">
                          <Check className="w-6 h-6" />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                            {ch.emoji}
                          </div>
                          <div>
                            <span className="text-lg font-black tracking-tight leading-tight block">{ch.challenge_text}</span>
                            <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-widest mt-1 inline-block">+{ch.points} PTS</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          {completions[ch.id] ? (
                            <div className="flex-1 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xs gap-2">
                               Missão Cumprida! ✨
                            </div>
                          ) : (
                            <>
                              {getChallengeUrl(ch.challenge_type) && (
                                <Button 
                                  variant="outline"
                                  className="flex-1 h-12 font-black rounded-2xl bg-white text-emerald-600 border-none hover:bg-white/90"
                                  onClick={() => navigate(getChallengeUrl(ch.challenge_type)!)}
                                >
                                  Ir para a Missão 🚀
                                </Button>
                              )}
                              <div className="flex-1 h-12 bg-black/10 border border-white/20 rounded-2xl flex flex-col items-center justify-center">
                                 <p className="text-[8px] font-black uppercase tracking-tighter opacity-70">Sistema Inteligente</p>
                                 <p className="text-[10px] font-bold">Auto-conclusão ⚡</p>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {partnerCompletions[ch.id] && (
                          <div className="bg-white/10 p-2 rounded-xl text-center">
                            <p className="text-[10px] text-white/80 font-bold italic">
                              Seu par já completou esta tarefa! 🙌
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                  className={cn("h-9 text-[11px] font-black px-4 rounded-xl shadow-lg transition-all", streakData?.total_points && streakData.total_points >= 200 ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" : "bg-muted text-muted-foreground")}
                  onClick={handleBuyShield}
                  disabled={!streakData || streakData.total_points < 200 || streakData.shield_remaining >= 3}
                >
                  200 PTS
                </Button>
              </div>
            </div>

            {/* Streak Ranking */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                <Medal className="w-4 h-4" /> Casais que não desistem 💛
              </h3>
              <div className="space-y-2.5">
                {ranking.map((entry, i) => (
                  <div
                    key={entry.couple_space_id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 relative",
                      entry.couple_space_id === spaceId ? "bg-orange-500/5 ring-1 ring-orange-500/20 shadow-md shadow-orange-500/5" : "bg-card/40 border border-border/50",
                      i === 0 && "ring-2 ring-orange-500 bg-orange-500/5 shadow-xl shadow-orange-500/5 scale-[1.02]"
                    )}
                  >
                    <div className="relative group shrink-0">
                      <div className={cn("h-12 w-12 rounded-2xl overflow-hidden border-2 shadow-sm transition-transform group-hover:scale-105", i === 0 ? "border-orange-500" : "border-background")}>
                        {entry.house_image ? (
                          <img src={entry.house_image} alt="Casa" className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center font-bold", i === 0 ? "bg-orange-100 text-orange-600" : "bg-orange-500/10 text-orange-500")}>
                            {entry.house_name?.charAt(0) || "L"}
                          </div>
                        )}
                      </div>
                      {i === 0 && (
                        <div className="absolute -top-2 -left-2 bg-orange-500 text-white rounded-lg p-1 shadow-lg animate-bounce duration-[2000ms]">
                          <Crown className="w-4 h-4" />
                        </div>
                      )}
                      {i > 0 && i < 3 && (
                        <div className="absolute -top-1.5 -left-1.5 bg-background border rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                          {MEDALS[i]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-bold truncate text-sm flex items-center gap-1", entry.couple_space_id === spaceId && "text-orange-600")}>
                          {entry.house_name}
                          {entry.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />}
                        </p>
                        {i === 0 && <Sparkles className="w-3 h-3 text-orange-500" />}
                      </div>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                        {entry.level_title}
                      </p>
                      {i === 0 && entry.couple_space_id === spaceId && (
                        <p className="text-[9px] text-orange-600 font-bold animate-pulse mt-0.5">
                          Vocês estão a inspirar outros casais ✨
                        </p>
                      )}
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
                    <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border self-start md:self-auto">
                      <span className="font-mono font-bold px-3 text-primary text-sm">{referralCode}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          toast.success("Código copiado! 🚀");
                        }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={handleShareReferral}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
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
                      "flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 relative",
                      entry.couple_space_id === spaceId ? "bg-primary/5 ring-1 ring-primary/20 shadow-md shadow-primary/5" : "bg-card/40 border border-border/50",
                      i === 0 && "ring-2 ring-yellow-500 bg-yellow-500/5 shadow-xl shadow-yellow-500/5 scale-[1.02]"
                    )}
                  >
                    <div className="relative group shrink-0">
                      <div className={cn("h-12 w-12 rounded-2xl overflow-hidden border-2 shadow-sm transition-transform group-hover:scale-105", i === 0 ? "border-yellow-500" : "border-background")}>
                        {entry.house_image ? (
                          <img src={entry.house_image} alt="Casa" className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center font-bold", i === 0 ? "bg-yellow-100 text-yellow-600" : "bg-primary/10 text-primary")}>
                            {entry.house_name?.charAt(0) || "L"}
                          </div>
                        )}
                      </div>
                      {i === 0 && (
                        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white rounded-lg p-1 shadow-lg animate-bounce duration-[2000ms]">
                          <Trophy className="w-4 h-4" />
                        </div>
                      )}
                      {i > 0 && i < 3 && (
                        <div className="absolute -top-1.5 -left-1.5 bg-background border rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                          {MEDALS[i]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-bold truncate text-sm flex items-center gap-1", entry.couple_space_id === spaceId && "text-primary")}>
                          {entry.house_name}
                          {entry.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />}
                        </p>
                        {i === 0 && <Sparkles className="w-3 h-3 text-yellow-500" />}
                      </div>
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

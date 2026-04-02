import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useLoveStreak, getStreakLevel, getNextLevel } from "@/hooks/useLoveStreak";
import { useCoupleAvatars } from "@/hooks/useCoupleAvatars";
import { Flame, Shield, Trophy, Medal, Crown, Star, Sparkles, Check, ShieldCheck, TrendingUp, Coins, LayoutList, Target, ShoppingBag, Copy, Share2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
  const { data: streakData, buyShield, confirmAction, useShield, dailyStatus, loading: streakLoading, reload: reloadStreak } = useLoveStreak();
  
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "streak" | "points">("tasks");
  const avatars = useCoupleAvatars();
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [attemptedChallenges, setAttemptedChallenges] = useState<Record<string, boolean>>({});

  // Mapear mission_type para ação, label e URL específicos
  const getMissionAction = (missionType: string) => {
    switch (missionType) {
      case "message_sent":
        return { label: "💬 Ir para o Chat", url: "/chat", instruction: "Abra o chat e envie mensagens carinhosas para o seu par." };
      case "mood_logged":
        return { label: "😊 Registar Humor", url: "/humor", instruction: "Vá ao Humor e diga como se está a sentir hoje." };
      case "plan_completed":
        return { label: "📅 Abrir Agenda", url: "/plano", instruction: "Abra a Agenda e marque um item como concluído." };
      case "task_completed":
        return { label: "📋 Ver Rotina", url: "/rotina", instruction: "Abra a Rotina e marque os seus hábitos de hoje." };
      case "prayer_completed":
        return { label: "🙏 Momento de Oração", url: "/", instruction: "Dedique tempo a uma oração ou reflexão." };
      case "gratitude_logged":
        return { label: "🙌 Expressar Gratidão", url: "/chat", instruction: "Partilhe uma mensagem de gratidão no chat." };
      default:
        return { label: "🎯 Ir para a App", url: "/", instruction: "Interaja com o seu par em qualquer secção da App." };
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
      const rankType = activeTab === "points" ? "total_points" : "current_streak";
      
      const { data: rankedData, error } = await supabase.rpc('fn_get_global_ranking', {
        p_rank_type: rankType
      });

      if (error || !rankedData) {
        console.error("Erro no fetch do ranking:", error);
        setLoading(false);
        return;
      }

      const ranked: RankEntry[] = (rankedData as any[]).map(s => {
        return {
          couple_space_id: s.couple_space_id,
          current_streak: s.current_streak,
          best_streak: s.current_streak,
          total_points: s.total_points || 0,
          house_name: s.house_name || "LoveNest",
          house_image: s.house_image || null,
          is_verified: s.is_verified || false,
          level_title: getStreakLevel(s.current_streak).title
        };
      });

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
        .from("daily_activity")
        .select("id", { count: "exact", head: true })
        .eq("couple_id", spaceId)
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
    if (!streakData || streakData.total_points < 100) {
      toast.error("Pontos insuficientes (Mínimo 100 pts)");
      return;
    }
    const res = await (buyShield as any)();
    if (res?.success) {
      // Sucesso já disparado pelo toast no hook
    }
  };

  // Legacy confirmAction handle removed for Missions as they are now automatic

  const handleUseShield = async () => {
    if (streakData && streakData.loveshield_count < 1) {
      toast.error("Você não tem LoveShields");
      return;
    }
    const ok = await useShield();
    if (ok) {
      toast.success("LoveShield ativado! Streak restaurado ✨");
    }
  };

  return (
    <ErrorBoundary>
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
          <span className="text-[10px] font-black uppercase tracking-tighter">Missões</span>
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
        
        {/* TAB: MISSÕES */}
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            <header className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-primary">Love Streak</h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Atividade do Casal & Missões Diárias 💛</p>
            </header>

            <div className="space-y-6">
              {/* Nota Esclarecedora */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-3">
                <Flame className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-orange-700 uppercase tracking-tight">O Fogo vs Missões</p>
                  <p className="text-[10px] text-orange-600 font-medium leading-relaxed">
                    Mantenham a vossa chama acesa (Streak) através de qualquer interação diária. As missões em baixo são <b>desafios bónus</b> que dão pontos extra para a vossa jornada!
                  </p>
                </div>
              </div>

              {/* Missões Love Streak */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600">
                  <Flame className="w-4 h-4" /> Status de Atividade
                </div>
                <div className="grid gap-3">
                  <div className="glass-card rounded-2xl p-4 border-orange-500/10 bg-orange-500/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                        dailyStatus?.me_active 
                          ? "bg-green-500/20 border-green-500 text-green-600" 
                          : "bg-muted border-muted-foreground/20 text-muted-foreground opacity-50"
                      )}>
                        {dailyStatus?.me_active ? <Check className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-bold text-sm", dailyStatus?.me_active ? "text-foreground" : "text-muted-foreground")}>
                          {avatars.me?.displayName || "Tu"}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                          {dailyStatus?.me_active ? "Ativo ✨" : "Pendente ⏳"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-4 border-orange-500/10 bg-orange-500/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                        dailyStatus?.partner_active 
                          ? "bg-green-500/20 border-green-500 text-green-600" 
                          : "bg-muted border-muted-foreground/20 text-muted-foreground opacity-50"
                      )}>
                        {dailyStatus?.partner_active ? <Check className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-bold text-sm", dailyStatus?.partner_active ? "text-foreground" : "text-muted-foreground")}>
                          {avatars.partner?.displayName || "Parceiro"}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                          {dailyStatus?.partner_active ? "Ativo ✨" : "Pendente ⏳"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missão Diária (v3) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                  <Star className="w-4 h-4" /> Missão do Dia (+ Pontos)
                </div>
                
                {streakLoading ? (
                  <div className="glass-card rounded-2xl p-8 text-center border-dashed border-2 animate-pulse">
                    <p className="text-sm text-primary font-bold uppercase tracking-widest">A carregar missões... ✨</p>
                  </div>
                ) : dailyStatus && dailyStatus.missions && dailyStatus.missions.length > 0 ? (
                  <div className="grid gap-3">
                    {dailyStatus.missions.map((m) => (
                      <div key={m.id} className="glass-card rounded-2xl p-4 border-primary/20 bg-primary/[0.03] space-y-3 relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">{m.emoji}</span>
                            <div className="min-w-0">
                              <h4 className={cn(
                                "text-sm font-bold truncate",
                                m.completed && "text-green-600 line-through opacity-50"
                              )}>
                                {m.title}
                              </h4>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{m.description}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">+{m.reward} PTS</span>
                        </div>

                        {!m.completed && (
                          <div className="space-y-2 pt-1">
                            <div className="bg-white/50 p-2 rounded-xl border border-dashed border-primary/20 flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-primary/40 shrink-0" />
                              <p className="text-[9px] font-bold text-muted-foreground leading-snug">
                                {getMissionAction(m.mission_type).instruction}
                              </p>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full h-9 text-[11px] font-black tracking-wide hover:bg-primary/10 border border-primary/20 shadow-sm rounded-xl"
                              onClick={() => {
                                const action = getMissionAction(m.mission_type);
                                if (action.url) navigate(action.url);
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              {getMissionAction(m.mission_type).label}
                            </Button>
                          </div>
                        )}
                        
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-1000", m.completed ? "bg-green-500" : "bg-primary")}
                              style={{ width: `${m.completed ? 100 : Math.min(100, (m.current / m.target) * 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className={cn(m.completed ? "text-green-600" : "text-primary/60")}>
                              {m.completed ? "Concluído ✨" : "Em progresso..."}
                            </span>
                            <span className="tabular-nums">{m.current} / {m.target}</span>
                          </div>
                        </div>

                        </div>
                     ))}
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-8 text-center border-dashed border-2">
                    <p className="text-sm text-muted-foreground italic">Sem missões disponíveis para hoje... ✨</p>
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
                <p className="text-3xl font-black tracking-tighter">{streakData?.loveshield_count || 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">LoveShields</p>
              </div>
            </div>

            {/* Shield Protection Area */}
            {streakData?.current_streak === 0 && streakData?.last_streak_date && streakData?.loveshield_count > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <Shield size={24} className="text-amber-600" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Sua Streak quebrou!</h4>
                    <p className="text-xs text-amber-800">Use um LoveShield para restaurar seus dias.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleUseShield}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl"
                >
                  Usar LoveShield Agora
                </Button>
              </div>
            )}

            {/* Shop Section Integrated */}
            <div className="glass-card rounded-3xl p-5 border-blue-500/10 bg-blue-500/[0.01] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Loja de Itens
                </h3>
                <span className="text-[10px] font-black bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-full">Meus Shields: {streakData?.loveshield_count}</span>
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
                  className={cn("h-9 text-[11px] font-black px-4 rounded-xl shadow-lg transition-all", streakData?.total_points && streakData.total_points >= 100 ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" : "bg-muted text-muted-foreground")}
                  onClick={handleBuyShield}
                  disabled={!streakData || streakData.total_points < 100}
                >
                  100 PTS
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
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Ações Realizadas</p>
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
    </ErrorBoundary>
  );
}

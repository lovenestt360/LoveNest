import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/features/streak/useStreak";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { RankingCard } from "@/components/RankingCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Flame, ArrowLeft, Heart, AlertCircle, Sparkles, Loader2,
  Coins, Target, CheckCircle2, Circle, Trophy, Shield, ShoppingBag, Star
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Tab = "streaks" | "pontos" | "missoes";

interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  activityType: string;
  points: number;
  completed: boolean;
  completedCount: number;
}

const MISSION_DEFS: Omit<Mission, "completed" | "completedCount">[] = [
  { id: "message",  title: "Conversar",   description: "Ambos enviam uma mensagem no chat",   emoji: "💬", activityType: "message",  points: 10 },
  { id: "checkin",  title: "Check-in",    description: "Ambos fazem o check-in diário",        emoji: "✅", activityType: "checkin",  points: 10 },
  { id: "mood",     title: "Humor",       description: "Ambos registam o humor de hoje",        emoji: "😊", activityType: "mood",     points: 5  },
  { id: "prayer",   title: "Oração",      description: "Ambos partilham uma oração",            emoji: "🙏", activityType: "prayer",   points: 5  },
];

// ─────────────────────────────────────────────
// TAB BAR
// ─────────────────────────────────────────────
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "streaks", label: "Streak",  emoji: "🔥" },
  { id: "pontos",  label: "Pontos",  emoji: "💰" },
  { id: "missoes", label: "Missões", emoji: "🎯" },
];

function TabBar({ activeTab, onChange }: { activeTab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex bg-muted/50 rounded-2xl p-1 gap-0.5">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200",
            activeTab === tab.id
              ? "bg-background text-primary shadow-md shadow-primary/10"
              : "text-muted-foreground/50 hover:text-foreground/70 active:scale-95"
          )}
        >
          <span className="text-sm">{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-2">
      <span className="text-primary/70">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function LoveStreak() {
  const navigate   = useNavigate();
  const spaceId    = useCoupleSpaceId();
  const { streak, loading, checkIn, checkingIn } = useStreak();
  const [activeTab, setActiveTab] = useState<Tab>("streaks");

  // — Points state —
  const [totalPoints, setTotalPoints]   = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // — Shields state —
  const [shields, setShields]         = useState(0);
  const [loadingShield, setLoadingShield] = useState(false);
  const [buyingShield, setBuyingShield] = useState(false);

  // — Missions state —
  const [missions, setMissions]         = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // Sincronização
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Helpers ───────────────────────────────
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const currentStreak    = streak?.currentStreak  ?? 0;
  const longestStreak    = streak?.longestStreak  ?? 0;
  const bothActive       = streak?.bothActiveToday ?? false;
  const streakAtRisk     = streak?.streakAtRisk   ?? false;
  const activeCount      = streak?.activeCount    ?? 0;
  const totalMembers     = streak?.totalMembers   ?? 2;
  const progress         = streak?.progressPercentage ?? 0;
  const isZero           = currentStreak === 0;
  const pointsToday      = bothActive ? 10 : 0;
  const shieldUsedToday  = streak?.shieldUsedToday   ?? false;
  const shieldsRemaining = streak?.shieldsRemaining  ?? 0;
  const missionsDone   = missions.filter(m => m.completed).length;
  const missionsPts    = missions.filter(m => m.completed).reduce((a, m) => a + m.points, 0);
  const canBuyShield   = totalPoints >= 200;

  // ── Fetch pontos ──────────────────────────

  const fetchPoints = useCallback(async () => {
    if (!spaceId) return;
    setLoadingPoints(true);
    try {
      const { data, error } = await supabase
        .from("points" as any)
        .select("total_points")
        .eq("couple_space_id", spaceId)
        .maybeSingle();
      console.log("[LoveStreak] Fetched points:", data, error);
      setTotalPoints((data as any)?.total_points ?? 0);
    } finally {
      setLoadingPoints(false);
    }
  }, [spaceId]);

  // ── Fetch shields ─────────────────────────

  const fetchShields = useCallback(async () => {
    if (!spaceId) return;
    setLoadingShield(true);
    try {
      const { data, error } = await supabase.rpc("fn_get_shields", { p_couple_id: spaceId });
      console.log("[LoveStreak] Fetched shields:", data, error);
      setShields((data as any) ?? 0);
    } catch {
      setShields(0);
    } finally {
      setLoadingShield(false);
    }
  }, [spaceId]);

  // ── Fetch missions ────────────────────────

  const fetchMissions = useCallback(async () => {
    if (!spaceId) return;
    setLoadingMissions(true);
    try {
      const today = getTodayStr();
      const { data, error } = await supabase
        .from("daily_activity" as any)
        .select("type, user_id")
        .eq("couple_id", spaceId)
        .eq("activity_date", today);

      console.log("[LoveStreak] Fetched missions (daily_activity):", data, error);

      // Count distinct users per type
      const typeUsers: Record<string, Set<string>> = {};
      for (const row of (data as any[]) || []) {
        if (!typeUsers[row.type]) typeUsers[row.type] = new Set();
        typeUsers[row.type].add(row.user_id);
      }

      setMissions(MISSION_DEFS.map(m => {
        const count = typeUsers[m.activityType]?.size ?? 0;
        return { ...m, completedCount: count, completed: count >= totalMembers };
      }));
    } finally {
      setLoadingMissions(false);
    }
  }, [spaceId, totalMembers]);

  // Novas funções exigidas pela sincronização robusta
  const fetchTodayActivity = useCallback(async () => {
    console.log("[LoveStreak] fetchTodayActivity - ja coberto por fetchMissions");
    return fetchMissions();
  }, [fetchMissions]);

  const fetchRanking = useCallback(async () => {
    console.log("[LoveStreak] fetchRanking - sinalizando RankingCard via refreshKey");
    // O RankingCard ja tem useEffect que dispara quando montado ou quando props mudam.
    // O handleCheckIn ja faz setRefreshKey.
  }, []);

  const fetchAllData = useCallback(async () => {
    console.log("[LoveStreak] fetchAllData em curso (Promise.all)...");
    await Promise.all([
      streak.refresh(),
      fetchPoints(),
      fetchShields(),
      fetchMissions(),
      fetchTodayActivity(),
      fetchRanking()
    ]);
    console.log("[LoveStreak] fetchAllData concluido ✓");
  }, [streak, fetchPoints, fetchShields, fetchMissions, fetchTodayActivity, fetchRanking]);

  // ── Buy shield ────────────────────────────

  const buyShield = async () => {
    if (!spaceId || buyingShield || !canBuyShield) return;
    setBuyingShield(true);
    try {
      const { data, error } = await supabase.rpc("fn_buy_loveshield", {
        p_couple_id: spaceId,
        p_cost: 200,
      });
      if (error) { toast.error("Erro ao comprar LoveShield."); return; }
      const status = (data as any)?.status;
      if (status === "insufficient_points") {
        toast.error("Pontos insuficientes para comprar LoveShield.");
      } else {
        toast.success("LoveShield comprado! 🛡️ A vossa chama está protegida por 1 dia.");
        await Promise.all([fetchPoints(), fetchShields()]);
      }
    } finally {
      setBuyingShield(false);
    }
  };

  // ── Check-in ─────────────────────────────

  const handleCheckIn = async () => {
    console.log("[LoveStreak] Iniciando handleCheckIn...");
    const ok = await checkIn(); // useStreak ja faz refresh interno
    if (ok) {
      toast.success("Boa! Estás a cuidar do vosso streak 💖");
      await fetchAllData();
      setRefreshKey(prev => prev + 1);
    } else {
      toast.error("Não foi possível registar o check-in.");
    }
  };

  // ── Load by tab ───────────────────────────
  useEffect(() => {
    fetchAllData();
  }, []); // Initial load obrigatório

  useEffect(() => {
    if (activeTab === "pontos")  { fetchPoints(); fetchShields(); }
    if (activeTab === "missoes") fetchMissions();
  }, [activeTab, fetchPoints, fetchShields, fetchMissions]);

  // ── Loading guard ─────────────────────────
  if (loading && !streak) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 frosted-glass shadow-sm px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-2xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Flame className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-black tracking-tight text-foreground">LoveStreak</h1>
          </div>
          {/* Mini streak badge */}
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <Flame className="w-3 h-3 fill-primary" />
            <span className="text-xs font-black tabular-nums">{currentStreak}</span>
          </div>
        </div>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* ABA: STREAKS                                   */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "streaks" && (
        <div className="max-w-md mx-auto px-4 py-6 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* HERO */}
          <section className="text-center pt-2 pb-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center justify-center gap-1.5">
              {isZero ? "Comecem hoje" : "Chama acesa"} <Sparkles className="w-3 h-3" />
            </p>
            <div className="relative inline-block">
              {/* Glow detrás do número */}
              <div className="absolute inset-0 m-auto w-32 h-32 bg-primary/15 blur-[50px] rounded-full" />
              <div className="flex items-end justify-center gap-2 relative z-10">
                <span className="text-[7rem] font-black tabular-nums tracking-tighter text-foreground leading-none">
                  {currentStreak}
                </span>
                <span className="text-2xl font-bold text-muted-foreground/40 uppercase tracking-widest mb-5">d</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground/60 max-w-[220px] mx-auto leading-tight">
              {isZero ? "O vosso streak começa hoje 🌱" : `${currentStreak} dias a cuidar um do outro 💕`}
            </p>
          </section>

          {/* Risk warning */}
          {streakAtRisk && !shieldUsedToday && (
            <div className="glass-card rounded-3xl p-4 border-amber-500/30 bg-amber-50/40 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-0.5">Streak em risco</p>
                <p className="text-sm font-bold text-amber-900/70 leading-snug">Hoje é decisivo. Não deixem o streak cair!</p>
                {shieldsRemaining > 0 && (
                  <p className="text-xs text-amber-700/60 font-bold mt-1">🛡️ Tens {shieldsRemaining} shield{shieldsRemaining > 1 ? 's' : ''} — serão usados automaticamente se falharem hoje.</p>
                )}
              </div>
            </div>
          )}

          {/* Shield used banner */}
          {shieldUsedToday && (
            <div className="glass-card rounded-3xl p-4 border-blue-500/30 bg-blue-50/40 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">🛡️ LoveShield Activado!</p>
                <p className="text-sm font-bold text-blue-900/70 leading-snug">O shield protegeu a vossa chama ontem. Resta{shieldsRemaining === 1 ? " 1 shield" : `m ${shieldsRemaining} shields`}.</p>
              </div>
            </div>
          )}

          {/* Status card */}
          <section className="glass-card rounded-[2.5rem] p-5 space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-foreground/90">
                    {bothActive ? "Hoje completo 💕" : isZero ? "À espera do primeiro gesto" : "Ainda falta alguém"}
                  </h2>
                  <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">
                    {activeCount}/{totalMembers} {activeCount === 1 ? "pessoa activa" : "pessoas activas"} hoje
                  </p>
                </div>
                <Heart className={cn("w-5 h-5 shrink-0 transition-all duration-700", bothActive ? "fill-primary text-primary scale-110" : "text-muted-foreground/20")} />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  <span>Progresso mensal (28d)</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-muted" />
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Recorde", value: longestStreak, unit: "dias" },
              { label: "Atividade", value: totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0, unit: "% hoje" },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-[1.5rem] p-4 flex flex-col items-center text-center shadow-sm">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">{s.label}</span>
                <span className="text-3xl font-black tabular-nums">{s.value}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-0.5">{s.unit}</span>
              </div>
            ))}
          </div>

          {/* Ranking streak */}
          <SectionHeader icon={<Trophy className="w-4 h-4" />} title="Ranking Global — Streak" />
          <RankingCard 
            key={`streak-${refreshKey}`} 
            compact={false} 
            initialRankType="streak" 
            hideToggle 
            myCoupleId={spaceId ?? undefined} 
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ABA: PONTOS                                    */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "pontos" && (
        <div className="max-w-md mx-auto px-4 py-6 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* HERO pontos */}
          <section className="text-center pt-2 pb-2 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center justify-center gap-1.5">
              Total acumulado <Star className="w-3 h-3" />
            </p>
            <div className="relative inline-block">
              <div className="absolute inset-0 m-auto w-32 h-32 bg-amber-400/10 blur-[50px] rounded-full" />
              {loadingPoints ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              ) : (
                <div className="flex items-end justify-center gap-2 relative z-10">
                  <span className="text-[5.5rem] font-black tabular-nums tracking-tighter text-foreground leading-none">
                    {totalPoints.toLocaleString("pt-PT")}
                  </span>
                  <span className="text-xl font-bold text-muted-foreground/40 uppercase mb-4">pts</span>
                </div>
              )}
            </div>
          </section>

          {/* Stats pontos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-[1.5rem] p-4 flex flex-col items-center text-center shadow-sm">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Hoje</span>
              <span className="text-3xl font-black tabular-nums text-primary">+{pointsToday}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-0.5">Pontos</span>
            </div>
            <div className="glass-card rounded-[1.5rem] p-4 flex flex-col items-center text-center shadow-sm">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Por dia</span>
              <span className="text-3xl font-black tabular-nums">10</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-0.5">Se ambos ativos</span>
            </div>
          </div>

          {/* Info*/}
          <div className="glass-card rounded-2xl p-4 flex items-start gap-3 bg-primary/5 border-primary/15">
            <Coins className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-foreground/60 leading-snug">
              Ganham <span className="text-primary font-black">+10 pontos</span> por cada dia em que ambos fazem atividade. Acumulem para comprar itens na loja!
            </p>
          </div>

          {/* ── LOJA: LOVE SHIELD ─────────────────────── */}
          <SectionHeader icon={<ShoppingBag className="w-4 h-4" />} title="Loja de Itens" />

          <div className="glass-card rounded-3xl p-5 border-primary/10 space-y-4">
            <div className="flex items-start gap-4">
              {/* Shield icon */}
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl",
                "bg-gradient-to-br from-blue-500/20 to-indigo-500/10"
              )}>
                🛡️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-foreground">LoveShield</h3>
                  <span className="text-[9px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Tens {loadingShield ? "…" : shields} 🛡️
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/70 font-medium leading-snug">
                  Protege a vossa chama por 1 dia mesmo se falharem
                </p>
                <p className="text-[10px] font-black text-amber-600 mt-1">Máximo: 5 shields</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm font-black tabular-nums">200 pts</span>
              </div>
              <Button
                size="sm"
                variant={canBuyShield ? "default" : "outline"}
                className="h-9 px-4 rounded-xl text-xs font-black"
                onClick={buyShield}
                disabled={buyingShield || !canBuyShield || shields >= 5}
              >
                {buyingShield ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                 shields >= 5 ? "Máximo atingido" :
                 canBuyShield ? "Comprar 🛡️" : `Faltam ${200 - totalPoints} pts`}
              </Button>
            </div>
          </div>

          {/* Ranking pontos */}
          <SectionHeader icon={<Trophy className="w-4 h-4" />} title="Ranking Global — Pontos" />
          <RankingCard 
            key={`points-${refreshKey}`} 
            compact={false} 
            initialRankType="points" 
            hideToggle 
            myCoupleId={spaceId ?? undefined} 
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ABA: MISSÕES                                   */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "missoes" && (
        <div className="max-w-md mx-auto px-4 py-6 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* Progress hero */}
          <section className="glass-card rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-foreground/90">Missões de Hoje</h2>
                  <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">
                    {missionsDone}/{MISSION_DEFS.length} completas · {missionsPts} pts ganhos
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
              <Progress
                value={MISSION_DEFS.length > 0 ? (missionsDone / MISSION_DEFS.length) * 100 : 0}
                className="h-3 bg-muted rounded-full"
              />
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                As missões contam quando AMBOS as completam 💑
              </p>
            </div>
          </section>

          {/* Missions list */}
          <SectionHeader icon={<Star className="w-4 h-4" />} title="Lista de Missões" />

          {loadingMissions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {missions.map(m => (
                <div
                  key={m.id}
                  className={cn(
                    "glass-card rounded-2xl p-4 flex items-center gap-4 border transition-all duration-300",
                    m.completed
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/20 hover:border-primary/15"
                  )}
                >
                  <span className="text-2xl shrink-0">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-black tracking-tight",
                      m.completed ? "line-through text-foreground/40" : "text-foreground"
                    )}>
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-medium truncate">{m.description}</p>
                    {/* Mini progress (1/2 ou 2/2) */}
                    {!m.completed && m.completedCount > 0 && (
                      <p className="text-[10px] font-black text-amber-600 mt-0.5">
                        {m.completedCount}/{totalMembers} já completou ⏳
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-black text-primary/60">+{m.points} pts</span>
                    {m.completed
                      ? <CheckCircle2 className="w-5 h-5 text-primary" />
                      : <Circle className="w-5 h-5 text-muted-foreground/25" />
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dica */}
          <div className="glass-card rounded-2xl p-4 flex items-start gap-3 bg-muted/30">
            <Sparkles className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-foreground/50 leading-snug">
              Usa o chat, regista o humor, faz orações e check-in para completar todas as missões com o teu par!
            </p>
          </div>
        </div>
      )}

      {/* ── CTA FIXO ─────────────────────────────────── */}
      {!bothActive && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent z-40">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full h-14 rounded-2xl text-[15px] font-bold shadow-xl shadow-primary/20 active:scale-[0.98] transition-transform relative overflow-hidden group"
              onClick={handleCheckIn}
              disabled={checkingIn}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              {checkingIn
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <span className="relative z-10 flex items-center gap-2">
                    👉 {isZero ? "Começar agora" : "Fazer check-in agora"}
                  </span>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

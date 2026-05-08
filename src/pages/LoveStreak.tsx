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
  Coins, Target, CheckCircle2, Circle, Trophy, Shield, ShoppingBag, Star,
  MessageCircle, CheckSquare, Smile, BookOpen,
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
  { id: "message",  title: "Conversar",   description: "Ambos enviam uma mensagem no chat",   emoji: "message",  activityType: "message",  points: 10 },
  { id: "checkin",  title: "Check-in",    description: "Ambos fazem o check-in diário",        emoji: "checkin",  activityType: "checkin",  points: 10 },
  { id: "mood",     title: "Humor",       description: "Ambos registam o humor de hoje",        emoji: "mood",     activityType: "mood",     points: 5  },
  { id: "prayer",   title: "Oração",      description: "Ambos partilham uma oração",            emoji: "prayer",   activityType: "prayer",   points: 5  },
];

const MISSION_ICONS: Record<string, React.ReactNode> = {
  message: <MessageCircle className="w-4 h-4" strokeWidth={1.5} />,
  checkin: <CheckSquare className="w-4 h-4" strokeWidth={1.5} />,
  mood:    <Smile className="w-4 h-4" strokeWidth={1.5} />,
  prayer:  <BookOpen className="w-4 h-4" strokeWidth={1.5} />,
};

// ─────────────────────────────────────────────
// TAB BAR
// ─────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "streaks", label: "Streak",  icon: <Flame   className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { id: "pontos",  label: "Pontos",  icon: <Coins   className="w-3.5 h-3.5" strokeWidth={1.5} /> },
  { id: "missoes", label: "Missões", icon: <Target  className="w-3.5 h-3.5" strokeWidth={1.5} /> },
];

function TabBar({ activeTab, onChange }: { activeTab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex bg-white/50 backdrop-blur-sm border border-white/70 rounded-2xl p-1 gap-1 shadow-sm">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200",
            activeTab === tab.id
              ? "bg-white text-foreground/80 shadow-sm"
              : "text-foreground/30 hover:text-foreground/60 active:scale-95"
          )}
        >
          {tab.icon}
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
  const { streak, loading, error: streakError, checkIn, checkingIn, refresh } = useStreak();
  const [activeTab, setActiveTab] = useState<Tab>("streaks");

  // — Points state —
  const [totalPoints, setTotalPoints]   = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // — Shields state (reduzido, dados no hook) —
  const [buyingShield, setBuyingShield] = useState(false);

  // — Missions state —
  const [missions, setMissions]         = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // Sincronização
  const [refreshKey, setRefreshKey] = useState(0);

  // Show streak error non-silently
  useEffect(() => {
    if (streakError) toast.error(`Streak: ${streakError}`);
  }, [streakError]);

  // ── Helpers ───────────────────────────────

  const currentStreak    = streak?.currentStreak  ?? 0;
  const longestStreak    = streak?.longestStreak  ?? 0;
  const bothActive       = streak?.bothActiveToday ?? false;
  const myCheckedIn      = streak?.myCheckedIn     ?? false;
  const streakAtRisk     = streak?.streakAtRisk   ?? false;
  const activeCount      = streak?.activeCount    ?? 0;
  const totalMembers     = streak?.totalMembers   ?? 0;
  const progress         = streak?.progressPercentage ?? 0;
  const isZero           = currentStreak === 0;
  const pointsToday      = bothActive ? 10 : 0;
  const shieldUsedToday  = streak?.shieldUsedToday   ?? false;
  const shieldsRemaining = streak?.shieldsRemaining  ?? 0;
  const shieldsPurchased = streak?.shieldsPurchasedThisMonth ?? 0;
  const missionsDone   = missions.filter(m => m.completed).length;
  const missionsPts    = missions.filter(m => m.completed).reduce((a, m) => a + m.points, 0);
  const canBuyShield   = totalPoints >= 200;

  // ── Fetch pontos ──────────────────────────

  const fetchPoints = useCallback(async () => {
    if (!spaceId) return;
    setLoadingPoints(true);
    try {
      const { data, error } = await supabase.rpc("get_total_points", { p_couple_space_id: spaceId });
      if (error) {
        console.error("[LoveStreak] get_total_points error:", error.message);
        return;
      }
      setTotalPoints((data as number) ?? 0);
    } catch (err: any) {
      console.error("[LoveStreak] fetchPoints exception:", err?.message);
    } finally {
      setLoadingPoints(false);
    }
  }, [spaceId]);

  // ── Fetch shields ─────────────────────────

  // Fetch shields removido (usamos o estado do streak)

  const fetchMissions = useCallback(async () => {
    if (!spaceId) return;
    setLoadingMissions(true);
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Fetch activity + spiritual logs in parallel
      const [activityRes, spiritualRes] = await Promise.all([
        supabase
          .from("daily_activity" as any)
          .select("type, user_id")
          .eq("couple_space_id", spaceId)
          .eq("activity_date", today),
        supabase
          .from("daily_spiritual_logs")
          .select("user_id, prayed_today")
          .eq("couple_space_id", spaceId)
          .eq("day_key", today),
      ]);

      if (activityRes.error) {
        console.error("[LoveStreak] fetchMissions error:", activityRes.error.message);
      }

      const typeUsers: Record<string, Set<string>> = {};
      for (const row of (activityRes.data as any[]) || []) {
        if (!typeUsers[row.type]) typeUsers[row.type] = new Set();
        typeUsers[row.type].add(row.user_id);
      }

      // Prayer mission: also count users with prayed_today=true in spiritual logs
      // (covers users who marked "Orei hoje" before the activity log fix)
      if (!typeUsers["prayer"]) typeUsers["prayer"] = new Set();
      for (const log of (spiritualRes.data as any[]) || []) {
        if (log.prayed_today) typeUsers["prayer"].add(log.user_id);
      }

      const threshold = Math.max(totalMembers, 2);

      setMissions(MISSION_DEFS.map(m => {
        const count = typeUsers[m.activityType]?.size ?? 0;
        return { ...m, completedCount: count, completed: count >= threshold };
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
    try {
      console.log("[LoveStreak] fetchAllData em curso (Promise.all)...");
      await Promise.all([
        refresh(),
        fetchPoints(),
        fetchMissions(),
        fetchTodayActivity(),
        fetchRanking()
      ]);
      console.log("[LoveStreak] fetchAllData concluido ✓");
    } catch (err) {
      console.error("[fetchAllData ERROR]:", err);
    }
  }, [refresh, fetchPoints, fetchMissions, fetchTodayActivity, fetchRanking]);

  // ── Buy shield ────────────────────────────

  const buyShield = async () => {
    if (!spaceId || buyingShield || !canBuyShield) return;
    setBuyingShield(true);
    try {
      const { data, error } = await supabase.rpc("fn_buy_loveshield", {
        p_couple_space_id: spaceId
      });
      if (error) { toast.error("Erro ao comprar LoveShield."); return; }
      
      const status = (data as any)?.status;
      if (status === "insufficient_points" || status === "error_insufficient_points") {
        toast.error("Pontos insuficientes para comprar LoveShield.");
      } else if (status === "limit_reached" || status === "error_limit_reached") {
        toast.error("Já atingiste o limite de escudos (máx. 5).");
      } else if (status === "ok" || !status) {
        toast.success("LoveShield comprado! 💎 A vossa chama ganhou proteção extra.");
        await Promise.all([fetchPoints(), refresh()]);
        window.dispatchEvent(new CustomEvent("streak-updated"));
      }
    } finally {
      setBuyingShield(false);
    }
  };

  // ── Check-in ─────────────────────────────

  const handleCheckIn = async () => {
    const { ok, message } = await checkIn();
    if (ok) {
      toast.success("Check-in registado! 🔥");
    } else {
      toast.error(message || "Não foi possível registar o check-in.");
    }
  };

  // ── Load by tab ───────────────────────────
  useEffect(() => {
    fetchAllData();
  }, []); // Initial load obrigatório

  useEffect(() => {
    if (activeTab === "pontos")  { fetchPoints(); }
    if (activeTab === "missoes") fetchMissions();
  }, [activeTab, fetchPoints, fetchMissions]);

  // Sincronização Global via Evento
  useEffect(() => {
    const handleUpdate = () => {
      console.log("🔄 [LoveStreak] streak-updated recebido");
      fetchAllData();
    };

    window.addEventListener("streak-updated", handleUpdate);

    return () => {
      window.removeEventListener("streak-updated", handleUpdate);
    };
  }, [fetchAllData]);

  // ── Loading guard ─────────────────────────
  if (loading && !streak) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#e5e5e5] px-4 pt-3 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex-1">LoveStreak</h1>
          <div className="flex items-center gap-1 text-rose-500">
            <Flame className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-semibold tabular-nums">{currentStreak}</span>
          </div>
        </div>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* ABA: STREAKS                                   */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "streaks" && (
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">

          {/* Hero — número grande */}
          <section className="text-center py-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-3">
              {isZero ? "Comecem hoje" : "Chama acesa"}
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className={cn(
                "text-8xl font-bold tabular-nums leading-none",
                bothActive ? "text-rose-500" : shieldUsedToday ? "text-blue-500" : "text-foreground"
              )}>
                {currentStreak}
              </span>
              <span className="text-3xl font-light text-[#c4c4c4]">d</span>
            </div>
            <p className="text-sm text-[#717171] mt-3">
              {isZero ? "O vosso streak começa hoje" : `${currentStreak} dias a cuidar um do outro`}
            </p>
          </section>

          {/* Alertas */}
          {streakAtRisk && !shieldUsedToday && (
            <div className="glass-card p-4 flex items-start gap-3 border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-amber-600">Streak em risco</p>
                <p className="text-sm text-[#717171] mt-0.5">Hoje é decisivo. Não deixem o streak cair.</p>
                {shieldsRemaining > 0 && (
                  <p className="text-[11px] text-[#717171] mt-1">
                    Tens {shieldsRemaining} shield{shieldsRemaining > 1 ? "s" : ""} disponíveis.
                  </p>
                )}
              </div>
            </div>
          )}

          {shieldUsedToday && (
            <div className="glass-card p-4 flex items-start gap-3 border-blue-200">
              <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-blue-600">LoveShield activado</p>
                <p className="text-sm text-[#717171] mt-0.5">
                  O shield protegeu a vossa chama.{" "}
                  {shieldsRemaining > 0 ? `Restam ${shieldsRemaining}.` : "Sem shields restantes."}
                </p>
              </div>
            </div>
          )}

          {/* Status card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {bothActive ? "Hoje completo"
                    : myCheckedIn ? "Check-in feito"
                    : isZero ? "À espera do primeiro gesto"
                    : "Falta alguém"}
                </h2>
                <p className="text-sm text-[#717171] mt-0.5">
                  {totalMembers > 0
                    ? `${activeCount}/${totalMembers} pessoas activas hoje`
                    : "A carregar..."}
                </p>
                {myCheckedIn && !bothActive && totalMembers >= 2 && (
                  <p className="text-[11px] text-amber-500 mt-1">
                    Aguarda que o teu parceiro faça check-in
                  </p>
                )}
              </div>
              <Heart
                className={cn("w-5 h-5 shrink-0 transition-all duration-500",
                  bothActive ? "fill-rose-500 text-rose-500" : "text-[#e5e5e5]"
                )}
                strokeWidth={1.5}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-[#717171]">
                <span>Progresso mensal (28d)</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-[#f5f5f5]" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Recorde", value: longestStreak, unit: "dias" },
              { label: "Atividade", value: totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0, unit: "% hoje" },
            ].map(s => (
              <div key={s.label} className="glass-card p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-[11px] text-[#717171] mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>

          {/* Ranking */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] px-1">Ranking Global — Streak</p>
          <RankingCard compact={false} initialRankType="streak" hideToggle myCoupleId={spaceId ?? undefined} refreshTrigger={refreshKey} />
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ABA: PONTOS                                    */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "pontos" && (
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">

          {/* Hero pontos */}
          <section className="text-center py-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-3">Total acumulado</p>
            {loadingPoints ? (
              <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
            ) : (
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-7xl font-bold tabular-nums text-foreground leading-none">
                  {totalPoints.toLocaleString("pt-PT")}
                </span>
                <span className="text-2xl font-light text-[#c4c4c4]">pts</span>
              </div>
            )}
          </section>

          {/* Stats pontos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-1">Hoje</p>
              <p className="text-3xl font-bold tabular-nums text-rose-500">+{pointsToday}</p>
              <p className="text-[11px] text-[#717171] mt-0.5">Pontos</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-1">Por dia</p>
              <p className="text-3xl font-bold tabular-nums text-foreground">10</p>
              <p className="text-[11px] text-[#717171] mt-0.5">Se ambos ativos</p>
            </div>
          </div>

          {/* Info */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Coins className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-[#717171] leading-relaxed">
              Ganham <span className="font-semibold text-foreground">+10 pontos</span> por cada dia em que ambos fazem atividade. Acumulem para comprar itens na loja!
            </p>
          </div>

          {/* ── LOJA: LOVE SHIELD ─────────────────────── */}
          <SectionHeader icon={<ShoppingBag className="w-4 h-4" />} title="Loja de Itens" />

          <div className="glass-card rounded-[20px] p-4 border-primary/10 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                shieldsPurchased > 0 
                  ? "bg-gradient-to-br from-amber-400/20 to-yellow-500/10 text-amber-500" 
                  : "bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-500"
              )}>
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-black text-foreground leading-none">LoveShield</h3>
                  {shieldsPurchased > 0 && (
                     <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                       EXTRA 💎
                     </span>
                  )}
                </div>
                
                <p className="text-[11px] font-medium text-muted-foreground/80 leading-snug">
                  {shieldsRemaining > 1 && shieldsPurchased === 0 ? (
                    `Tens ${shieldsRemaining} proteções este mês 🛡️`
                  ) : shieldsRemaining === 1 && shieldsPurchased === 0 ? (
                    `Última proteção este mês 🛡️⚠️`
                  ) : shieldsRemaining === 1 && shieldsPurchased > 0 ? (
                    `Proteção extra ativa`
                  ) : shieldsRemaining === 0 && shieldsPurchased === 0 ? (
                    `Podes comprar 1 proteção extra.`
                  ) : (
                    `Sem proteções restantes este mês`
                  )}
                </p>
              </div>
            </div>

            {/* Botão de compra — aparece sempre que shields < 5 */}
            {shieldsRemaining < 5 ? (
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-black tabular-nums">200 pts</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({shieldsRemaining}/5 escudos)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={canBuyShield ? "default" : "outline"}
                  className="h-8 px-4 rounded-[10px] text-xs font-black shadow-sm"
                  onClick={buyShield}
                  disabled={buyingShield || !canBuyShield}
                >
                  {buyingShield ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                   canBuyShield ? "+1 Escudo" : "Saldo Insuficiente"}
                </Button>
              </div>
            ) : (
              <div className="flex justify-end pt-2 border-t border-border/30">
                <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-border/50">
                  Máximo de escudos atingido
                </span>
              </div>
            )}
          </div>

          {/* Ranking pontos */}
          <SectionHeader icon={<Trophy className="w-4 h-4" />} title="Ranking Global — Pontos" />
          <RankingCard 
            compact={false} 
            initialRankType="points" 
            hideToggle 
            myCoupleId={spaceId ?? undefined}
            refreshTrigger={refreshKey}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ABA: MISSÕES                                   */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "missoes" && (
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">

          {/* Progress header */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Missões de Hoje</h2>
                <p className="text-sm text-[#717171] mt-0.5">
                  {missionsDone}/{MISSION_DEFS.length} completas · {missionsPts} pts ganhos
                </p>
              </div>
              <Target className="w-5 h-5 text-rose-400 shrink-0" strokeWidth={1.5} />
            </div>
            <Progress
              value={MISSION_DEFS.length > 0 ? (missionsDone / MISSION_DEFS.length) * 100 : 0}
              className="h-1.5 bg-[#f5f5f5]"
            />
            <p className="text-[11px] text-[#717171] mt-3">
              As missões contam quando ambos as completam
            </p>
          </div>

          {/* Missions list */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] px-1">Lista de Missões</p>

          {loadingMissions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
            </div>
          ) : (
            <div className="glass-card divide-y divide-[#f5f5f5] overflow-hidden">
              {missions.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                    m.completed ? "bg-rose-50 text-rose-500" : "bg-[#f5f5f5] text-[#717171]"
                  )}>
                    {MISSION_ICONS[m.emoji] ?? <Target className="w-4 h-4" strokeWidth={1.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      m.completed ? "line-through text-[#c4c4c4]" : "text-foreground"
                    )}>
                      {m.title}
                    </p>
                    <p className="text-[11px] text-[#717171] truncate">{m.description}</p>
                    {!m.completed && m.completedCount > 0 && (
                      <p className="text-[11px] text-amber-500 mt-0.5">
                        {m.completedCount}/{totalMembers} já completou
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[11px] font-medium text-rose-400">+{m.points}</span>
                    {m.completed
                      ? <CheckCircle2 className="w-5 h-5 text-rose-500" strokeWidth={1.5} />
                      : <Circle className="w-5 h-5 text-[#e5e5e5]" strokeWidth={1.5} />
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dica */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-[#717171] leading-relaxed">
              Usa o chat, regista o humor, faz orações e check-in para completar todas as missões.
            </p>
          </div>
        </div>
      )}

      {/* ── CTA fixo ── */}
      {!bothActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] px-4 py-4 z-40">
          <div className="max-w-md mx-auto">
            {!myCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full py-3.5 rounded-2xl bg-rose-500 text-white font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {checkingIn ? "A registar..." : "Fazer check-in agora"}
              </button>
            ) : (
              <div className="w-full py-3.5 rounded-2xl bg-[#f5f5f5] text-[#717171] font-medium text-sm text-center border border-[#e5e5e5]">
                Check-in feito · A aguardar o teu parceiro
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

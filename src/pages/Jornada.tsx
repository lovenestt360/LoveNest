import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/features/streak/useStreak";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCountUp } from "@/hooks/useCountUp";
import { CelebrationBurst } from "@/components/CelebrationBurst";
import { hapticSuccess, hapticCelebrate, hapticLight } from "@/lib/haptic";
import { getDailyMissions, type MissionDef } from "@/features/streak/missions";
import { getJourneyLevel } from "@/features/streak/journeyLevels";
import { Guardian } from "@/features/journey/Guardian";
import { useGuardianState } from "@/features/journey/useGuardianState";
import { Shop } from "@/features/journey/Shop";
import {
  Flame, ArrowLeft, Heart, Sparkles, Loader2,
  Coins, Target, CheckCircle2, Circle, Shield, ShoppingBag,
} from "lucide-react";

// ─────────────────────────────────────────────
// Hooks & helpers
// ─────────────────────────────────────────────

function useHoursLeft() {
  const calc = () => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 3600000));
  };
  const [h, setH] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setH(calc()), 60_000);
    return () => clearInterval(t);
  }, []);
  return h;
}

type UrgencyLevel = "safe" | "notice" | "warning" | "critical";
function getUrgency(hoursLeft: number): UrgencyLevel {
  if (hoursLeft > 8) return "safe";
  if (hoursLeft > 4) return "notice";
  if (hoursLeft > 1) return "warning";
  return "critical";
}

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

function getCoupleStatus(
  bothActive: boolean, myCheckedIn: boolean,
  shieldUsedToday: boolean, isPerfectDay: boolean,
  hoursLeft: number, isZero: boolean, isSolo: boolean
): StatusConfig {
  if (isPerfectDay)
    return { label: "Ligados ✨",             bg: "bg-rose-50 dark:bg-rose-950/30",   text: "text-rose-600 dark:text-rose-300",  dot: "bg-rose-500"  };
  if (bothActive)
    return { label: "Chama acesa ❤️",          bg: "bg-rose-50 dark:bg-rose-950/30",   text: "text-rose-500 dark:text-rose-300",  dot: "bg-rose-400"  };
  if (shieldUsedToday)
    return { label: "Chama protegida 🛡️",     bg: "bg-blue-50 dark:bg-blue-950/30",   text: "text-blue-600 dark:text-blue-300",  dot: "bg-blue-400"  };
  if (myCheckedIn && !isSolo)
    return { label: "A aguardar o par 💛",     bg: "bg-amber-50 dark:bg-amber-950/30",  text: "text-amber-600 dark:text-amber-300", dot: "bg-amber-400" };
  if (!isZero && hoursLeft <= 3)
    return { label: "Última chance 🕯️",        bg: "bg-red-50 dark:bg-red-950/30",    text: "text-red-600 dark:text-red-300",   dot: "bg-red-500"   };
  if (isZero)
    return { label: isSolo ? "Começa hoje 🌱" : "Comecem hoje 🌱", bg: "bg-slate-50 dark:bg-slate-900/40",  text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" };
  return   { label: "Aguardando conexão",      bg: "bg-slate-50 dark:bg-slate-900/40",  text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-300" };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function CoupleStatusBadge({ status }: { status: StatusConfig }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full animate-status-badge-in",
      status.bg
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dot)} />
      <span className={cn("text-[11px] font-semibold", status.text)}>{status.label}</span>
    </div>
  );
}

function FlameAlertBar({
  bothActive, myCheckedIn, shieldUsedToday, missionsDone, totalMissions,
  hoursLeft, currentStreak, isSolo,
}: {
  bothActive: boolean; myCheckedIn: boolean; shieldUsedToday: boolean;
  missionsDone: number; totalMissions: number; hoursLeft: number; currentStreak: number;
  isSolo: boolean;
}) {
  if (bothActive) return null;
  const urgency = getUrgency(hoursLeft);
  const fillPct = totalMissions > 0 ? Math.round((missionsDone / totalMissions) * 100) : 0;

  const barColor =
    shieldUsedToday   ? "bg-blue-400" :
    urgency === "critical" ? "bg-red-400" :
    urgency === "warning"  ? "bg-orange-400" :
    urgency === "notice"   ? "bg-amber-400" :
    "bg-emerald-400";

  const message = shieldUsedToday
    ? "O escudo guardou a sequência hoje — boa proteção 🛡️"
    : urgency === "critical"
    ? `Menos de 1h — ${myCheckedIn && !isSolo ? "o teu par ainda não apareceu ❤️" : isSolo ? "a chama precisa de ti agora" : "a chama precisa de vocês agora"}`
    : urgency === "warning"
    ? `Faltam ${hoursLeft}h — ainda dá tempo de proteger a chama`
    : myCheckedIn && !isSolo
    ? `O teu gesto está guardado · ${hoursLeft}h para o par aparecer ❤️`
    : currentStreak > 0
    ? `Faltam ${hoursLeft}h para proteger ${currentStreak} dias de amor`
    : "Hoje é um bom dia para começar ❤️";

  return (
    <div className={cn(
      "glass-card p-4 space-y-2.5",
      urgency === "critical" && !shieldUsedToday && "border-red-200 dark:border-red-800/50 animate-flame-pulse-alert",
      urgency === "warning"  && !shieldUsedToday && "border-orange-200 dark:border-orange-800/50",
      urgency === "notice"   && !shieldUsedToday && "border-amber-100 dark:border-amber-900/40",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame
            className={cn(
              "w-3.5 h-3.5",
              shieldUsedToday ? "text-blue-500" :
              urgency === "critical" ? "text-red-500 animate-flame-breathe" :
              urgency === "warning"  ? "text-orange-500" :
              "text-amber-500"
            )}
            strokeWidth={1.5}
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Chama de hoje
          </span>
        </div>
        <span className={cn(
          "text-[11px] font-semibold tabular-nums",
          shieldUsedToday ? "text-blue-500" :
          urgency === "critical" ? "text-red-500" :
          urgency === "warning"  ? "text-orange-500" :
          "text-muted-foreground/65"
        )}>
          {shieldUsedToday ? "Protegida" : `${hoursLeft}h restantes`}
        </span>
      </div>

      {/* Emotional progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full animate-flame-bar-fill", barColor)}
          style={{ width: `${shieldUsedToday ? 100 : Math.max(fillPct, 4)}%` }}
        />
      </div>

      <p className={cn(
        "text-[11px] leading-snug",
        urgency === "critical" && !shieldUsedToday ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
      )}>
        {message}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// Definições das missões vêm de src/features/streak/missions.ts —
// fonte única partilhada com o widget "Faísca" da Home, para os dois
// ecrãs mostrarem sempre exatamente os mesmos 4 gestos.
interface Mission extends MissionDef {
  completed: boolean;
  completedCount: number;
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
// MAIN PAGE — Jornada
// Antes era "LoveStreak" com 3 separadores (Chama/Amor/Gestos). Agora é
// uma única página de scroll contínuo: A Nossa Chama → LovePoints →
// Gestos de hoje. Ver docs/LOVENEST_PROGRESS_SYSTEM.md, Fase 1.
// ─────────────────────────────────────────────
export default function Jornada() {
  const navigate   = useNavigate();
  const spaceId    = useCoupleSpaceId();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { streak, loading, error: streakError, checkIn, checkingIn, refresh } = useStreak();
  const hoursLeft = useHoursLeft();
  const guardianState = useGuardianState(spaceId);

  const isSolo = profile?.usage_mode === "solo";
  const hasSpiritual = profile?.religion !== "none";
  const missionDefs = useMemo(
    () => getDailyMissions({ isSolo, hasSpiritual }),
    [isSolo, hasSpiritual]
  );

  // — LovePoints state —
  // totalPoints = saldo gastável (desce ao comprar); lifetimePoints =
  // total alguma vez ganho (nunca desce) — é este que define o Nível
  // da Jornada, para a regra "o nível nunca desce" se manter verdadeira
  // mesmo depois de compras na loja.
  const [totalPoints, setTotalPoints]   = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // — Shields state (reduzido, dados no hook) —
  const [buyingShield, setBuyingShield] = useState(false);

  // — Missions state —
  const [missions, setMissions]         = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // — Animation state —
  const [streakPopKey, setStreakPopKey]         = useState(0);
  const [celebrating, setCelebrating]           = useState(false);
  const [recentlyCompletedMissions, setRecentlyCompletedMissions] = useState<Set<string>>(new Set());
  const prevStreakRef  = useRef(0);
  const prevBothRef   = useRef(false);

  // Show streak error non-silently
  useEffect(() => {
    if (streakError) toast.error(`Streak: ${streakError}`);
  }, [streakError]);

  // ── Helpers ───────────────────────────────

  const currentStreak    = streak?.currentStreak  ?? 0;
  const longestStreak    = streak?.longestStreak  ?? 0;
  const bothActive       = streak?.bothActiveToday ?? false;
  const myCheckedIn      = streak?.myCheckedIn     ?? false;
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
  const isPerfectDay   = bothActive && missionsDone === missionDefs.length;
  const coupleStatus   = getCoupleStatus(bothActive, myCheckedIn, shieldUsedToday, isPerfectDay, hoursLeft, isZero, isSolo);
  const journey        = useMemo(() => getJourneyLevel(lifetimePoints), [lifetimePoints]);

  // Animated points counter
  const { display: pointsDisplay, popped: pointsPopped } = useCountUp(totalPoints);

  // Detect streak increment → pop animation
  useEffect(() => {
    if (currentStreak > 0 && currentStreak !== prevStreakRef.current) {
      setStreakPopKey(k => k + 1);
      hapticLight();
      prevStreakRef.current = currentStreak;
    }
  }, [currentStreak]);

  // Detect bothActive → celebrate + haptic
  useEffect(() => {
    if (bothActive && !prevBothRef.current) {
      setCelebrating(true);
      hapticCelebrate();
      const t = setTimeout(() => setCelebrating(false), 1400);
      prevBothRef.current = true;
      return () => clearTimeout(t);
    }
    if (!bothActive) prevBothRef.current = false;
  }, [bothActive]);

  // Detect perfect day (both active + all missions) → extra celebration
  const prevPerfectRef = useRef(false);
  useEffect(() => {
    const perfect = bothActive && missionsDone === missionDefs.length;
    if (perfect && !prevPerfectRef.current) {
      prevPerfectRef.current = true;
      hapticCelebrate();
      setTimeout(() => {
        toast.success(isSolo ? "Dia perfeito! 🔥 A tua chama nunca esteve tão viva" : "Dia perfeito! 🔥 A vossa chama nunca esteve tão viva", { duration: 4000 });
      }, 800);
    }
    if (!perfect) prevPerfectRef.current = false;
  }, [bothActive, missionsDone, missionDefs.length]);

  // Detect newly completed missions → shimmer + haptic
  useEffect(() => {
    const completedNow = new Set(missions.filter(m => m.completed).map(m => m.id));
    completedNow.forEach(id => {
      if (!recentlyCompletedMissions.has(id)) {
        hapticLight();
      }
    });
    setRecentlyCompletedMissions(completedNow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions]);

  // ── Fetch LovePoints ──────────────────────

  const fetchPoints = useCallback(async () => {
    if (!spaceId) return;
    setLoadingPoints(true);
    try {
      const [{ data, error }, { data: lifetimeData, error: lifetimeError }] = await Promise.all([
        supabase.rpc("get_total_points", { p_couple_space_id: spaceId }),
        supabase.rpc("get_lifetime_points" as any, { p_couple_space_id: spaceId }),
      ]);
      if (error) {
        console.error("[Jornada] get_total_points error:", error.message);
        return;
      }
      if (lifetimeError) {
        console.error("[Jornada] get_lifetime_points error:", lifetimeError.message);
      } else {
        setLifetimePoints((lifetimeData as number) ?? 0);
      }
      setTotalPoints((data as number) ?? 0);
    } catch (err: any) {
      console.error("[Jornada] fetchPoints exception:", err?.message);
    } finally {
      setLoadingPoints(false);
    }
  }, [spaceId]);

  const fetchMissions = useCallback(async () => {
    if (!spaceId) return;
    setLoadingMissions(true);
    try {
      // Use UTC date to match server CURRENT_DATE (same fix already applied in useStreak)
      const today = new Date().toISOString().slice(0, 10);

      const activityRes = await supabase
        .from("daily_activity" as any)
        .select("type, user_id")
        .eq("couple_space_id", spaceId)
        .eq("activity_date", today);

      if (activityRes.error) {
        console.error("[Jornada] fetchMissions error:", activityRes.error.message);
      }

      const typeUsers: Record<string, Set<string>> = {};
      for (const row of (activityRes.data as any[]) || []) {
        if (!typeUsers[row.type]) typeUsers[row.type] = new Set();
        typeUsers[row.type].add(row.user_id);
      }

      const threshold = Math.max(totalMembers, 1);

      setMissions(missionDefs.map(m => {
        const count = typeUsers[m.id]?.size ?? 0;
        return { ...m, completedCount: count, completed: count >= threshold };
      }));
    } finally {
      setLoadingMissions(false);
    }
  }, [spaceId, totalMembers, missionDefs]);

  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([
        refresh(),
        fetchPoints(),
        fetchMissions(),
      ]);
    } catch (err) {
      console.error("[fetchAllData ERROR]:", err);
    }
  }, [refresh, fetchPoints, fetchMissions]);

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
        toast.error("LovePoints insuficientes para comprar LoveShield.");
      } else if (status === "already_purchased_this_month") {
        toast.error(isSolo ? "Já compraste 1 escudo este mês 🛡️ — volta no próximo mês." : "Já compraram 1 escudo este mês 🛡️ — volta no próximo mês.");
      } else if (status === "limit_reached" || status === "error_limit_reached") {
        toast.error(isSolo ? "Já tens 3 escudos — o máximo mensal 🛡️" : "Já têm 3 escudos — o máximo mensal 🛡️");
      } else if (status === "ok" || !status) {
        toast.success(isSolo ? "LoveShield comprado! 💎 A tua chama ganhou proteção extra." : "LoveShield comprado! 💎 A vossa chama ganhou proteção extra.");
        await Promise.all([fetchPoints(), refresh()]);
        window.dispatchEvent(new CustomEvent("streak-updated"));
      }
    } finally {
      setBuyingShield(false);
    }
  };

  // ── Check-in ─────────────────────────────

  const handleCheckIn = async () => {
    hapticLight();
    const { ok, message } = await checkIn();
    if (ok) {
      hapticSuccess();
      toast.success(isSolo ? "Protegeste a chama hoje 🔥" : "Vocês protegeram a chama hoje 🔥");
    } else {
      toast.error(message || (isSolo ? "Não foi possível registar a tua presença." : "Não foi possível registar a vossa presença."));
    }
  };

  // ── Initial load — waits for spaceId (async RPC in useCoupleSpaceId) ──────
  // Empty-deps effect runs before spaceId is ready; this re-runs once it resolves.
  // fetchAllData is fresh at this point because it's recreated when spaceId changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (spaceId) fetchAllData(); }, [spaceId]);

  // Refresh quando outra página regista actividade (Chat, Humor, Oração, check-in)
  useEffect(() => {
    const handleUpdate = () => fetchAllData();
    window.addEventListener("streak-updated", handleUpdate);
    return () => window.removeEventListener("streak-updated", handleUpdate);
  }, [fetchAllData]);

  // Refresh quando o utilizador volta à página (vem do Chat, Humor, etc.)
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") fetchAllData();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
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
    <div className="min-h-screen bg-background pb-32">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex-1">Jornada</h1>
          <div className="flex items-center gap-1 text-rose-500">
            <Flame className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-semibold tabular-nums">{currentStreak}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-10">

        {/* ══════════════════════════════════════════════ */}
        {/* NÍVEL DA JORNADA                                */}
        {/* ══════════════════════════════════════════════ */}
        <div className="glass-card p-5 text-center">
          <div className="flex justify-center mb-2">
            <Guardian level={journey.level} glowColor={guardianState.glowColor} ringUnlocked={guardianState.ringUnlocked} ringEnabled={guardianState.ringEnabled} size={88} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Nível {journey.level} — {journey.name}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {lifetimePoints.toLocaleString("pt-PT")} <span className="text-sm font-medium text-muted-foreground">LovePoints conquistados</span>
          </p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-rose-400 transition-all duration-700"
              style={{ width: `${journey.progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {journey.nextLevelName
              ? `${journey.pointsToNextLevel} pts até ${journey.nextLevelName}`
              : "Nível máximo da Jornada — Eternidade"}
          </p>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* A NOSSA CHAMA                                   */}
        {/* ══════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Hero — número grande */}
          <section className={cn(
            "text-center py-8 relative rounded-3xl transition-all duration-700",
            isPerfectDay && "animate-perfect-day-glow"
          )}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Flame
                className={cn(
                  "w-4 h-4 transition-colors",
                  bothActive ? "text-rose-500 animate-flame-breathe" : "text-muted-foreground"
                )}
                strokeWidth={1.5}
              />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isZero ? "O amor começa aqui" : (isSolo ? "A tua chama" : "A vossa chama")}
              </p>
            </div>

            {/* Big streak number with pop on change + celebration burst */}
            <div className="relative inline-flex items-baseline gap-2">
              <CelebrationBurst active={celebrating} />
              <span
                key={streakPopKey}
                className={cn(
                  "text-8xl font-bold tabular-nums leading-none transition-colors",
                  bothActive ? "text-rose-500 animate-streak-pop"
                    : shieldUsedToday ? "text-blue-500"
                    : "text-foreground",
                  streakPopKey > 0 && !bothActive && "animate-streak-pop"
                )}
              >
                {currentStreak}
              </span>
              <span className="text-3xl font-light text-muted-foreground/50">d</span>
            </div>

            <p className="text-sm text-muted-foreground mt-3 mb-4">
              {isZero ? "Cada gesto conta — comecem hoje 💛" : `${currentStreak} dias a cuidar um do outro`}
            </p>

            {/* Couple status badge */}
            <CoupleStatusBadge key={coupleStatus.label} status={coupleStatus} />
          </section>

          {/* Flame Alert Bar — urgency + day progress */}
          <FlameAlertBar
            bothActive={bothActive}
            myCheckedIn={myCheckedIn}
            shieldUsedToday={shieldUsedToday}
            missionsDone={missionsDone}
            totalMissions={missionDefs.length}
            hoursLeft={hoursLeft}
            currentStreak={currentStreak}
            isSolo={isSolo}
          />

          {/* Status card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {bothActive ? (isSolo ? "A tua chama está acesa 🔥" : "A vossa chama está acesa 🔥")
                    : myCheckedIn ? "O teu gesto foi registado 💛"
                    : isZero ? (isSolo ? "Faz o primeiro gesto hoje 🌱" : "Façam o primeiro gesto hoje 🌱")
                    : (isSolo ? "A chama ainda espera pelo teu momento" : "A chama ainda espera pelo vosso momento")}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalMembers > 0
                    ? `${activeCount} de ${totalMembers} presentes hoje`
                    : "A preparar..."}
                </p>
                {myCheckedIn && !bothActive && totalMembers >= 2 && (
                  <p className="text-[11px] text-amber-500 mt-1">
                    O teu par ainda não apareceu hoje ❤️
                  </p>
                )}
              </div>
              <Heart
                className={cn("w-5 h-5 shrink-0 transition-all duration-500",
                  bothActive ? "fill-rose-500 text-rose-500" : "text-muted-foreground/30"
                )}
                strokeWidth={1.5}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>Jornada deste mês</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-muted" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Melhor Sequência", value: longestStreak, unit: "dias juntos" },
              { label: "Presença", value: totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0, unit: "% hoje" },
            ].map(s => (
              <div key={s.label} className="glass-card p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* ══════════════════════════════════════════════ */}
        {/* LOVEPOINTS                                      */}
        {/* ══════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Hero LovePoints */}
          <section className="text-center py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">LovePoints disponíveis ✨</p>
            {loadingPoints ? (
              <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
            ) : (
              <div className="flex items-baseline justify-center gap-2">
                <span
                  className={cn(
                    "text-7xl font-bold tabular-nums text-foreground leading-none transition-all",
                    pointsPopped && "animate-count-pop"
                  )}
                >
                  {pointsDisplay.toLocaleString("pt-PT")}
                </span>
                <span className="text-2xl font-light text-muted-foreground/50">pts</span>
              </div>
            )}
          </section>

          {/* Stats LovePoints */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Hoje ganhámos</p>
              <p className="text-3xl font-bold tabular-nums text-rose-500">+{pointsToday}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">LovePoints</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{isSolo ? "Por dia ativo" : "Por dia juntos"}</p>
              <p className="text-3xl font-bold tabular-nums text-foreground">10</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{isSolo ? "quando estás presente" : "quando ambos presentes"}</p>
            </div>
          </div>

          {/* Info */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Coins className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isSolo ? (
                <>Ganhas <span className="font-semibold text-foreground">+10 LovePoints</span> por cada dia que cuidas de ti. Troca por proteção ou personalizações — gastar LovePoints nunca faz descer o teu Nível da Jornada.</>
              ) : (
                <>Ganham <span className="font-semibold text-foreground">+10 LovePoints</span> por cada dia que cuidam um do outro. Troquem por proteção ou personalizações — gastar LovePoints nunca faz descer o vosso Nível da Jornada.</>
              )}
            </p>
          </div>

          {/* ── LOJA: LOVE SHIELD ─────────────────────── */}
          <SectionHeader icon={<ShoppingBag className="w-4 h-4" />} title={isSolo ? "Protege a Chama" : "Protejam a Chama"} />

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
                     <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-widest">
                       EXTRA 💎
                     </span>
                  )}
                </div>

                <p className="text-[11px] font-medium text-muted-foreground/80 leading-snug">
                  {shieldsRemaining > 1 && shieldsPurchased === 0 ? (
                    `${shieldsRemaining} dias protegidos este mês 🛡️`
                  ) : shieldsRemaining === 1 && shieldsPurchased === 0 ? (
                    `Última proteção do mês 🛡️ — renova em breve`
                  ) : shieldsRemaining === 1 && shieldsPurchased > 0 ? (
                    isSolo ? `Proteção extra ativa — a tua chama está segura` : `Proteção extra ativa — a vossa chama está segura`
                  ) : shieldsRemaining === 0 && shieldsPurchased === 0 ? (
                    isSolo ? `A tua chama precisa de proteção` : `A vossa chama precisa de proteção`
                  ) : (
                    `Chama totalmente protegida este mês 💙`
                  )}
                </p>
              </div>
            </div>

            {/* Botão de compra: 3 estados */}
            {shieldsRemaining >= 3 ? (
              /* Estado 1: shields completos — não pode comprar */
              <div className="flex justify-end pt-2 border-t border-border/30">
                <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-border/50">
                  Máximo de escudos atingido
                </span>
              </div>
            ) : shieldsPurchased > 0 ? (
              /* Estado 2: já compraram 1 escudo este mês — não pode comprar outra vez */
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-muted-foreground leading-snug">
                    {isSolo ? "Já compraste 1 escudo este mês" : "Já compraram 1 escudo este mês"}
                  </span>
                </div>
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest px-2 py-1 bg-black/5 dark:bg-white/5 rounded-lg border border-border/50">
                  Renova em {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                </span>
              </div>
            ) : (
              /* Estado 3: perderam escudos e ainda não compraram este mês */
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-black tabular-nums">200 pts</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({shieldsRemaining}/3 escudos)
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
            )}
          </div>

          {/* ── LOJA: GUARDIÃO ─────────────────────────── */}
          <SectionHeader icon={<Sparkles className="w-4 h-4" />} title="Personaliza o Guardião" />
          <Shop
            coupleSpaceId={spaceId}
            totalPoints={totalPoints}
            userId={user?.id}
            isSolo={isSolo}
            onPurchased={fetchPoints}
          />
        </div>

        <div className="h-px bg-border" />

        {/* ══════════════════════════════════════════════ */}
        {/* GESTOS DE HOJE                                  */}
        {/* ══════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Progress header */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {missionsDone === 0 ? "Pequenos gestos fortalecem o amor ✨"
                    : missionsDone === missionDefs.length ? "Hoje foram extraordinários 🔥"
                    : (isSolo ? "Continua — a chama agradece 💛" : "Continuem — a chama agradece 💛")}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {missionsDone === 0
                    ? "Nenhum gesto ainda hoje"
                    : `${missionsDone} de ${missionDefs.length} gestos dados · +${missionsPts} pts`}
                </p>
              </div>
              <Target className="w-5 h-5 text-rose-400 shrink-0" strokeWidth={1.5} />
            </div>
            <Progress
              value={missionDefs.length > 0 ? (missionsDone / missionDefs.length) * 100 : 0}
              className="h-1.5 bg-muted"
            />
            <p className="text-[11px] text-muted-foreground mt-3">
              {isSolo ? "O amor conta quando apareces todos os dias" : "O amor conta quando ambos participam"}
            </p>
          </div>

          {/* Missions list */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">{isSolo ? "Os teus gestos de hoje" : "Os vossos gestos de hoje"}</p>

          {loadingMissions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
            </div>
          ) : (
            <div className="glass-card divide-y divide-border overflow-hidden">
              {missions.map(m => (
                <div
                  key={m.id}
                  className={cn(
                    "relative flex items-center gap-4 p-4 overflow-hidden transition-colors duration-500",
                    m.completed && "bg-rose-50/40 animate-mission-ripple"
                  )}
                >
                  {/* Shimmer sweep on completion */}
                  {m.completed && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(244,63,94,0.08) 50%, transparent 100%)",
                        animation: "shimmer-sweep 1s ease-out forwards",
                      }}
                    />
                  )}

                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
                    m.completed
                      ? "bg-rose-100 dark:bg-rose-950/40 text-rose-500 shadow-sm shadow-rose-100 dark:shadow-none"
                      : "bg-muted text-muted-foreground"
                  )}>
                    <m.Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium transition-all duration-300",
                      m.completed ? "text-rose-400 line-through" : "text-foreground"
                    )}>
                      {m.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.description}</p>
                    {!m.completed && m.completedCount > 0 && (
                      <p className="text-[11px] text-amber-500 mt-0.5">
                        {m.completedCount} de {totalMembers} já deu este gesto ❤️
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={cn(
                      "text-[11px] font-medium transition-colors",
                      m.completed ? "text-rose-400" : "text-muted-foreground/50"
                    )}>+{m.points}</span>
                    {m.completed
                      ? <CheckCircle2 className="w-5 h-5 text-rose-500 animate-celebration-in" strokeWidth={1.5} />
                      : <Circle className="w-5 h-5 text-muted-foreground/30" strokeWidth={1.5} />
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dica */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pequenos gestos diários são o segredo de um amor que dura para sempre 💛
            </p>
          </div>
        </div>
      </div>

      {/* ── CTA fixo ── */}
      {!bothActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 z-40">
          <div className="max-w-md mx-auto">
            {!myCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-semibold text-base transition-all duration-200",
                  "bg-rose-500 text-white shadow-lg shadow-rose-200",
                  "active:scale-[0.97] active:shadow-none",
                  "disabled:opacity-60 disabled:scale-100",
                  !checkingIn && "hover:bg-rose-600"
                )}
              >
                {checkingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isSolo ? "A guardar o teu momento..." : "A guardar o vosso momento..."}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Flame className="w-4 h-4 animate-flame-breathe" strokeWidth={1.5} />
                    Estou presente hoje
                  </span>
                )}
              </button>
            ) : (
              <div className="w-full py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-400 font-medium text-sm text-center border border-rose-100 dark:border-rose-900/40 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                O teu gesto foi guardado · A esperar pelo teu par ❤️
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

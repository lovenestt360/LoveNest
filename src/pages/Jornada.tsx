import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { todayLocal } from "@/lib/timezone";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";
import { getJourneyLevel, getStreakLevel, STREAK_LEVELS } from "@/features/streak/journeyLevels";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/features/streak/useStreak";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useProfile } from "@/hooks/useProfile";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCountUp } from "@/hooks/useCountUp";
import { CelebrationBurst } from "@/components/CelebrationBurst";
import { hapticSuccess, hapticCelebrate, hapticLight } from "@/lib/haptic";
import { getDailyMissions, type MissionDef } from "@/features/streak/missions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Guardian, type GuardianHandle } from "@/features/entry/Guardian";
import { prefersReducedMotion } from "@/features/entry/entryUtils";
import { Check, Flame, Loader2, Shield } from "lucide-react";
import faiscaFull from "@/features/landing/stages/faisca.webp";
import brasaFull from "@/features/landing/stages/brasa.webp";
import chamaFull from "@/features/landing/stages/chama.webp";
import guardiaoFull from "@/features/landing/stages/guardiao.webp";
import sentinelaFull from "@/features/landing/stages/sentinela.webp";
import eternoFull from "@/features/landing/stages/eterno.webp";
import soberanoFull from "@/features/landing/stages/soberano.webp";
import faiscaThumb from "@/assets/flame/flame_01_faisca_thumb.png";
import brasaThumb from "@/assets/flame/flame_02_brasa_thumb.png";
import chamaThumb from "@/assets/flame/flame_03_chama_thumb.png";
import guardiaoThumb from "@/assets/flame/flame_04_guardiao_thumb.png";
import sentinelaThumb from "@/assets/flame/flame_05_sentinela_thumb.png";
import eternoThumb from "@/assets/flame/flame_06_eterno_thumb.png";
import soberanoThumb from "@/assets/flame/flame_07_soberano_thumb.png";

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

// Imagem, miniatura e cor do brilho de cada estágio (mesma ordem de STREAK_LEVELS).
const STAGE_ART = [
  { full: faiscaFull, thumb: faiscaThumb, glow: "rgba(251,113,133,.30)" },
  { full: brasaFull, thumb: brasaThumb, glow: "rgba(251,146,60,.30)" },
  { full: chamaFull, thumb: chamaThumb, glow: "rgba(45,212,191,.30)" },
  { full: guardiaoFull, thumb: guardiaoThumb, glow: "rgba(77,124,254,.28)" },
  { full: sentinelaFull, thumb: sentinelaThumb, glow: "rgba(139,92,246,.28)" },
  { full: eternoFull, thumb: eternoThumb, glow: "rgba(250,204,21,.32)" },
  { full: soberanoFull, thumb: soberanoThumb, glow: "rgba(236,72,153,.28)" },
];

const CARD = "rounded-[22px] border border-[#ECE8E3] bg-white p-4 shadow-[0_1px_2px_rgba(11,19,36,0.03),0_14px_30px_-26px_rgba(11,19,36,0.35)] dark:border-border dark:bg-card";

// Definições das missões vêm de src/features/streak/missions.ts —
// fonte única partilhada com o widget "Faísca" da Home, para os dois
// ecrãs mostrarem sempre exatamente os mesmos 4 gestos.
interface Mission extends MissionDef {
  completed: boolean;
  completedCount: number;
}

/** Avatar de quem está (ou não) presente hoje: anel contínuo quando já apareceu. */
function Presence({ name, initial, here, tone, solo }: { name: string; initial: string; here: boolean; tone: "rose" | "blue"; solo?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-2xl bg-[#F7F5F2] p-2.5 dark:bg-muted", solo && "col-span-2")}>
      <span className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className={cn(
            "absolute -inset-[4px] rounded-full border-2 transition-all duration-500",
            tone === "rose" ? "border-[#E5466D]" : "border-[#4D7CFE]",
            here ? "border-solid" : "border-dashed opacity-45",
          )}
        />
        <span className={cn("flex h-full w-full items-center justify-center rounded-full text-[13px] font-semibold text-white", tone === "rose" ? "bg-[#E5466D]" : "bg-[#4D7CFE]")}>
          {initial}
        </span>
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
        <p className={cn("text-[11.5px]", here ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
          {here ? "presente ✓" : "ainda não"}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Jornada: o vosso Guardião, o dia de hoje, os gestos, os LovePoints.
// ─────────────────────────────────────────────

export default function Jornada() {
  const navigate   = useNavigate();
  const spaceId    = useCoupleSpaceId();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { streak, loading, error: streakError, checkIn, checkingIn, refresh, initialized: streakInitialized } = useStreak();
  const { partner } = usePartnerProfile();
  const pet = useRef<GuardianHandle>(null);
  const hoursLeft = useHoursLeft();

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
  const missionsDone         = missions.filter(m => m.completed).length;
  const missionsPts          = missions.filter(m => m.completed).reduce((a, m) => a + m.points, 0);
  const missionsInProgress   = missions.filter(m => !m.completed && m.completedCount > 0).length;
  const canBuyShield   = totalPoints >= 200;
  const isPerfectDay   = bothActive && missionsDone === missionDefs.length;
  const journey        = useMemo(() => getJourneyLevel(lifetimePoints), [lifetimePoints]);
  // Fase do Guardião — streak puro. Pontos são moeda gastável, não contam.
  const streakPhase    = useMemo(() => getStreakLevel(currentStreak), [currentStreak]);

  // ── Deteção de level-up entre sessões ──────────────────────────────────
  // Chave por user.id — cada membro tem a sua própria celebração.
  // Guard (currentStreak === 0) evita falsos positivos no loading inicial.
  // stored = 0 → primeira visita ao Jornada: mostrar animação se level > 1
  //              (o guard já garante que não é o estado vazio do loading).
  // stored > 0 → visita de retorno: mostrar só quando o level subiu.
  const [levelUpData, setLevelUpData] = useState<{ prevName: string } | null>(null);
  useEffect(() => {
    if (!user?.id || currentStreak === 0) return;
    const key = `lovenest_last_streak_level_${user.id}`;
    const stored = parseInt(localStorage.getItem(key) ?? "0");
    const neverStored = stored === 0;
    const shouldShow = neverStored
      ? streakPhase.level > 1              // Primeira visita: mostrar se acima de Faísca
      : streakPhase.level > stored;        // Visita de retorno: mostrar só se subiu
    if (shouldShow) {
      const prev = STREAK_LEVELS.find(l => l.level === stored);
      setLevelUpData({ prevName: prev?.name ?? "Faísca" });
      hapticCelebrate();
    }
    localStorage.setItem(key, String(streakPhase.level));
  }, [user?.id, streakPhase.level]);

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
      pet.current?.react("spin");
      pet.current?.hearts(14);
      pet.current?.say(isSolo ? "Chama acesa 🔥" : "Os dois! Chama acesa 🔥", 2800);
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
        toast.success(isSolo ? "Dia perfeito! A tua chama nunca esteve tão viva" : "Dia perfeito! A vossa chama nunca esteve tão viva", { duration: 4000 });
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
      const today = todayLocal();

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
        pet.current?.react("shake");
        toast.error("LovePoints insuficientes para comprar LoveShield.");
      } else if (status === "already_purchased_this_month") {
        toast.error(isSolo ? "Já compraste 1 escudo este mês — volta no próximo mês." : "Já compraram 1 escudo este mês — volta no próximo mês.");
      } else if (status === "limit_reached" || status === "error_limit_reached") {
        toast.error(isSolo ? "Já tens 3 escudos — o máximo mensal" : "Já têm 3 escudos — o máximo mensal");
      } else if (status === "ok" || !status) {
        toast.success(isSolo ? "LoveShield comprado! A tua chama ganhou proteção extra." : "LoveShield comprado! A vossa chama ganhou proteção extra.");
        pet.current?.react("happy");
        pet.current?.say("Chama protegida 🛡️", 2400);
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
      pet.current?.react("happy");
      pet.current?.hearts(6);
      toast.success("O teu gesto foi guardado");
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

  // Re-executa fetchMissions quando totalMembers passa de 0 para positivo.
  // fetchMissions e fetchAllData correm em paralelo no carregamento inicial;
  // se não houver cache o totalMembers é 0 quando fetchMissions é criada
  // e o threshold fica errado. Quando refresh() termina e actualiza
  // totalMembers, esta guarda re-executa fetchMissions com o valor correcto.
  const prevTotalMembersRef = useRef(totalMembers);
  useEffect(() => {
    if (prevTotalMembersRef.current === 0 && totalMembers > 0 && spaceId) {
      fetchMissions();
    }
    prevTotalMembersRef.current = totalMembers;
  // fetchMissions muda quando totalMembers muda — não criar loop infinito,
  // pois fetchMissions só actualiza `missions`, não `totalMembers`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalMembers, spaceId, fetchMissions]);

  // O Guardião comenta o estado do dia quando a página abre.
  const spokeRef = useRef(false);
  useEffect(() => {
    if (!streakInitialized || spokeRef.current) return;
    spokeRef.current = true;
    const partnerHere = activeCount - (myCheckedIn ? 1 : 0) > 0;
    const line = bothActive ? (isSolo ? "Chama acesa hoje 🔥" : "Chama acesa hoje 🔥")
      : myCheckedIn ? (isSolo ? "Obrigado por apareceres 💕" : "Agora falta o teu par 💙")
      : partnerHere ? "Falta só tu hoje 🥺"
      : isSolo ? "Vamos aparecer hoje? 🔥" : "Vamos aparecer hoje? 🔥";
    const t = window.setTimeout(() => { pet.current?.react("wiggle"); pet.current?.say(line, 2800); }, prefersReducedMotion() ? 0 : 1200);
    return () => window.clearTimeout(t);
  }, [streakInitialized, bothActive, myCheckedIn, activeCount, isSolo]);

  // ── Loading guard ─────────────────────────
  if (loading && !streak) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0B1324]/40" />
      </div>
    );
  }

  const art = STAGE_ART[streakPhase.level - 1] ?? STAGE_ART[0];
  const nextArt = STAGE_ART[streakPhase.level] ?? null;
  const partnerHere = !isSolo && activeCount - (myCheckedIn ? 1 : 0) > 0;
  const myName = profile?.display_name?.split(" ")[0] || "Tu";
  const partnerName = partner?.display_name?.split(" ")[0] || "O teu par";
  const urgent = !bothActive && !shieldUsedToday && hoursLeft <= 3 && !isZero;

  const todayNote = shieldUsedToday
    ? "O escudo guardou a sequência hoje."
    : bothActive
    ? (isSolo ? "Apareceste hoje. A chama está acesa 🔥" : "Os dois apareceram. A chama de hoje está acesa 🔥")
    : myCheckedIn
    ? `O teu gesto está guardado. Faltam ${hoursLeft}h para ${partnerName} aparecer.`
    : partnerHere
    ? `${partnerName} já apareceu. Falta só tu para a chama contar hoje.`
    : isZero
    ? (isSolo ? "Hoje é um bom dia para começar." : "Hoje é um bom dia para começarem.")
    : `Faltam ${hoursLeft}h para proteger ${currentStreak} ${currentStreak === 1 ? "dia" : "dias"} de amor.`;

  const renewDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });

  return (
    <div className="space-y-3.5 pb-6">
      <ScreenHeader
        title="Jornada"
        subtitle={`${isSolo ? "A tua chama" : "A vossa chama"} · nível ${streakPhase.level}`}
        action={
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#ECE8E3] px-3 text-[13px] font-semibold tabular-nums text-foreground dark:border-border">
            <Flame className="h-3.5 w-3.5 text-[#E5466D]" strokeWidth={2} />
            {currentStreak}
          </span>
        }
      />

      {/* ── O vosso Guardião ── */}
      <section className="relative pt-6 text-center">
        {!streakInitialized ? (
          <div className="mx-auto h-[190px] w-[190px] animate-pulse rounded-full bg-[#F7F5F2] dark:bg-muted" />
        ) : (
          <Guardian
            ref={pet}
            kind="guardiao"
            src={art.full}
            glow={art.glow}
            width={190}
            sayAt="right"
            delay={1}
            tapLines={["Olá! 💕", "Hehe 😊", streakPhase.nextLevelName ? `Quase ${streakPhase.nextLevelName} 💪` : "Somos eternos ♾️"]}
            style={{ margin: "0 auto" }}
          />
        )}
        <CelebrationBurst active={celebrating} />
        <p className="mt-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{streakPhase.name}</p>
        <p key={streakPopKey} className={cn("mt-1 text-[44px] font-bold leading-none tracking-[-0.045em] tabular-nums text-foreground", streakPopKey > 0 && "animate-streak-pop")}>
          {currentStreak}
          <span className="ml-1.5 text-[15px] font-medium tracking-normal text-muted-foreground">{currentStreak === 1 ? "dia juntos" : "dias juntos"}</span>
        </p>

        <div className="mx-1.5 mt-[18px] flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEEBE6] dark:bg-muted">
            <div className="h-full rounded-full bg-[#0B1324] transition-[width] duration-1000 ease-out dark:bg-foreground" style={{ width: `${streakPhase.nextLevelName ? streakPhase.progressPct : 100}%` }} />
          </div>
          {nextArt && <img src={nextArt.thumb} alt="" className="h-[30px] w-[30px] opacity-70 grayscale-[60%]" />}
        </div>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          {streakPhase.nextLevelName
            ? <>{streakPhase.daysToNext === 1 ? "Falta" : "Faltam"} <b className="font-semibold text-foreground">{streakPhase.daysToNext} {streakPhase.daysToNext === 1 ? "dia" : "dias"}</b> para {streakPhase.nextLevelName === "Guardião" ? "o Guardião" : streakPhase.nextLevelName}</>
            : "Forma suprema atingida"}
        </p>

        <ol className="mt-[18px] grid grid-cols-7 gap-0.5">
          {STREAK_LEVELS.map((lvl, i) => {
            const state = i < streakPhase.level - 1 ? "done" : i === streakPhase.level - 1 ? "now" : i === streakPhase.level ? "next" : "lock";
            return (
              <li key={lvl.stage} className="flex flex-col items-center gap-0.5">
                <img
                  src={STAGE_ART[i].thumb}
                  alt=""
                  className={cn(
                    "h-[34px] w-[34px] transition-transform",
                    state === "now" && "scale-[1.18]",
                    state === "next" && "opacity-60 grayscale-[70%]",
                    state === "lock" && "opacity-30 grayscale",
                  )}
                />
                <span className={cn("text-[9.5px]", state === "lock" ? "font-medium text-muted-foreground" : "font-semibold text-foreground")}>{lvl.name}</span>
                <span className="text-[8.5px] text-muted-foreground">{lvl.minDays === 365 ? "1 ano" : `${lvl.minDays} ${lvl.minDays === 1 ? "dia" : "dias"}`}</span>
                {state === "now" && <span className="h-1 w-1 rounded-full bg-[#0B1324] dark:bg-foreground" />}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Hoje ── */}
      <section className={CARD}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">Hoje</h2>
          <span className={cn("text-[12.5px] tabular-nums", shieldUsedToday ? "text-[#4D7CFE]" : urgent ? "font-semibold text-red-600" : "text-muted-foreground")}>
            {shieldUsedToday ? "Protegida" : `${hoursLeft}h restantes`}
          </span>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <Presence name={myName} initial={myName.charAt(0).toUpperCase()} here={myCheckedIn} tone="rose" solo={isSolo} />
          {!isSolo && <Presence name={partnerName} initial={partnerName.charAt(0).toUpperCase()} here={partnerHere} tone="blue" />}
        </div>
        <p className={cn("mt-3 text-[13px] leading-snug", urgent ? "font-medium text-red-600" : "text-[#3A4150] dark:text-muted-foreground")}>{todayNote}</p>
        {!myCheckedIn ? (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#0B1324] text-[15px] font-semibold text-white shadow-[0_14px_28px_-16px_rgba(11,19,36,0.65)] transition active:scale-[0.98] disabled:opacity-60 dark:bg-foreground dark:text-background"
          >
            {checkingIn
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {isSolo ? "A guardar o teu momento…" : "A guardar…"}</>
              : <><Flame className="h-4 w-4" strokeWidth={2} /> Estou presente hoje</>}
          </button>
        ) : (
          <div className="mt-3.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] border border-[#ECE8E3] text-[15px] font-semibold text-foreground dark:border-border">
            <Check className="h-4 w-4" strokeWidth={2.4} /> Presente hoje
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
          <span>Jornada deste mês</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
      </section>

      {/* ── Gestos de hoje ── */}
      <section className={CARD}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">Gestos de hoje</h2>
          <span className="text-[12.5px] tabular-nums text-muted-foreground">{missionsDone} de {missionDefs.length} · +{missionsPts} pts</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEEBE6] dark:bg-muted">
          <div className="h-full rounded-full bg-[#0B1324] transition-[width] duration-700 dark:bg-foreground" style={{ width: `${missionDefs.length ? (missionsDone / missionDefs.length) * 100 : 0}%` }} />
        </div>
        {loadingMissions && missions.length === 0 ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#0B1324]/40" /></div>
        ) : (
          <ul className="mt-2">
            {missions.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-[#ECE8E3] py-[11px] [&+&]:border-t dark:border-border">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F2] text-foreground dark:bg-muted">
                  <m.Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-foreground">{m.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {!m.completed && m.completedCount > 0 ? `${m.completedCount} de ${totalMembers} já deu este gesto` : m.description}
                  </p>
                </div>
                <span className={cn("text-[12px] tabular-nums", m.completed ? "font-semibold text-foreground" : "text-muted-foreground")}>+{m.points}</span>
                <span className={cn(
                  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300",
                  m.completed ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#D5D1CB] text-transparent",
                )}>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── LovePoints e LoveShield ── */}
      <section className={CARD}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">LovePoints</h2>
          <span className="text-[12.5px] text-muted-foreground">trocam por proteção</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          {loadingPoints && totalPoints === 0
            ? <Loader2 className="h-6 w-6 animate-spin text-[#0B1324]/40" />
            : <b className={cn("text-[34px] font-bold tracking-[-0.04em] tabular-nums text-foreground", pointsPopped && "animate-count-pop")}>{pointsDisplay.toLocaleString("pt-PT")}</b>}
          <span className="text-[13px] text-muted-foreground">pts</span>
          {missionsPts + pointsToday > 0 && <span className="ml-auto text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400">+{missionsPts + pointsToday} hoje</span>}
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
          {isSolo ? "+10 por cada dia que apareces." : "+10 por cada dia em que os dois aparecem."} Gastar pontos nunca faz descer o vosso nível.
        </p>
        <div className="mt-3.5 flex items-center gap-3 border-t border-[#ECE8E3] pt-3.5 dark:border-border">
          <div className="flex gap-1.5" aria-label={`${shieldsRemaining} de 3 escudos`}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "flex h-[30px] w-[26px] items-center justify-center rounded-[8px_8px_13px_13px] transition-all duration-500",
                  i < shieldsRemaining ? "bg-[#4D7CFE] text-white" : "border-[1.5px] border-dashed border-[#D5D1CB]",
                )}
              >
                {i < shieldsRemaining && <Shield className="h-3.5 w-3.5" strokeWidth={2} />}
              </span>
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground">LoveShield</p>
            <p className="text-[12px] text-muted-foreground">
              {shieldUsedToday ? "Usado hoje para proteger a chama" : "Protege a chama num dia em falta"}
            </p>
          </div>
        </div>
        {shieldsRemaining >= 3 ? (
          <p className="mt-3 text-center text-[12.5px] text-muted-foreground">Máximo de escudos atingido</p>
        ) : shieldsPurchased > 0 ? (
          <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
            {isSolo ? "Já compraste 1 escudo este mês" : "Já compraram 1 escudo este mês"} · renova a {renewDate}
          </p>
        ) : (
          <button
            type="button"
            onClick={buyShield}
            disabled={buyingShield || !canBuyShield}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[15px] border border-[#ECE8E3] bg-white text-[14px] font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-45 dark:border-border dark:bg-card"
          >
            {buyingShield ? <Loader2 className="h-4 w-4 animate-spin" /> : canBuyShield ? "Comprar escudo · 200 pts" : `Faltam ${200 - totalPoints} pts para um escudo`}
          </button>
        )}
      </section>

      {/* ── Dois números ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[20px] border border-[#ECE8E3] p-3.5 dark:border-border">
          <p className="text-[11.5px] text-muted-foreground">Melhor sequência</p>
          <p className="mt-0.5 text-[26px] font-bold tracking-[-0.03em] tabular-nums text-foreground">
            {longestStreak}<span className="ml-1 text-[13px] font-medium tracking-normal text-muted-foreground">{longestStreak === 1 ? "dia" : "dias"}</span>
          </p>
        </div>
        <div className="rounded-[20px] border border-[#ECE8E3] p-3.5 dark:border-border">
          <p className="text-[11.5px] text-muted-foreground">Este mês</p>
          <p className="mt-0.5 text-[26px] font-bold tracking-[-0.03em] tabular-nums text-foreground">
            {progress}<span className="ml-0.5 text-[13px] font-medium tracking-normal text-muted-foreground">%</span>
          </p>
        </div>
      </div>

      {/* ── Celebração de level-up ── */}
      <LevelUpCelebration
        show={!!levelUpData}
        newLevel={streakPhase.level}
        newName={streakPhase.name}
        prevName={levelUpData?.prevName ?? ""}
        onClose={() => setLevelUpData(null)}
      />
    </div>
  );
}

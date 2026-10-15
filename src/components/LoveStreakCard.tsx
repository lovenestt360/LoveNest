import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { WIDGET, MonoLabel, BigNumber, SegmentBar, WidgetFoot, FootStat, Unit, LevelBars } from "@/components/Widget";
import { todayLocal } from "@/lib/timezone";
import { type StreakState } from "@/features/streak/useStreak";
import { getDailyMissions, type MissionId } from "@/features/streak/missions";
import { getJourneyLevel, getStreakLevel } from "@/features/streak/journeyLevels";
import { FlamePet } from "@/components/FlamePet";
import {
  Flame, ChevronRight, Heart, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useProfile } from "@/hooks/useProfile";

// ── Phrases ──────────────────────────────────────────────────────────────────

const PHRASES = [
  { min: 0,  max: 0,        msg: "O amor de vocês começa aqui" },
  { min: 1,  max: 2,        msg: "Uma faísca que vai tornar-se chama" },
  { min: 3,  max: 6,        msg: "A vossa chama está a crescer" },
  { min: 7,  max: 13,       msg: "Sete dias a aparecer um pelo outro" },
  { min: 14, max: 29,       msg: "Em sintonia, em amor" },
  { min: 30, max: 89,       msg: "Um mês a mostrar-se um ao outro" },
  { min: 90, max: Infinity, msg: "O vosso amor tornou-se uma força viva" },
];

const PHRASES_SOLO = [
  { min: 0,  max: 0,        msg: "O teu cuidado contigo começa aqui" },
  { min: 1,  max: 2,        msg: "Uma faísca que vai tornar-se chama" },
  { min: 3,  max: 6,        msg: "A tua chama está a crescer" },
  { min: 7,  max: 13,       msg: "Sete dias a aparecer por ti" },
  { min: 14, max: 29,       msg: "Em sintonia contigo" },
  { min: 30, max: 89,       msg: "Um mês a cuidar de ti" },
  { min: 90, max: Infinity, msg: "O teu cuidado tornou-se uma força viva" },
];

const PERFECT_DAY_PHRASES = [
  "Hoje escolheram um ao outro",
  "O vosso ninho esteve completo hoje",
  "Cuidaram de todos os pequenos momentos",
  "Hoje apareceram um para o outro",
  "A chama ficou completa hoje",
];

const PERFECT_DAY_PHRASES_SOLO = [
  "Hoje escolheste cuidar de ti",
  "O teu espaço esteve completo hoje",
  "Cuidaste de todos os pequenos momentos",
  "Hoje apareceste por ti",
  "A chama ficou completa hoje",
];

function getCountPhrase(s: number, isSolo: boolean) {
  return (isSolo ? PHRASES_SOLO : PHRASES).find(p => s >= p.min && s <= p.max)?.msg ?? "";
}

function getContextualPhrase(
  streak: number, bothActive: boolean, myIn: boolean,
  partnerIn: boolean, atRisk: boolean, perfectDay: boolean, isSolo: boolean,
): string {
  const day = Math.floor(Date.now() / 86400000);
  if (perfectDay) {
    const pool = isSolo ? PERFECT_DAY_PHRASES_SOLO : PERFECT_DAY_PHRASES;
    return pool[day % pool.length];
  }
  if (bothActive) {
    const msgs = isSolo
      ? ["Hoje cuidaste de ti", "A chama esteve protegida hoje", "Apareceste por ti hoje"]
      : ["Hoje cuidaram um do outro", "A chama esteve protegida hoje", "Vocês encontraram-se aqui hoje"];
    return msgs[day % msgs.length];
  }
  if (atRisk) {
    return isSolo
      ? ["A chama sente a tua falta", "Hoje ainda podes proteger o teu momento"][day % 2]
      : ["A chama sente saudades", "Hoje ainda podem proteger o vosso momento"][day % 2];
  }
  if (isSolo) return getCountPhrase(streak, true);
  if (myIn && !partnerIn) return "O teu par ainda não chegou hoje";
  if (partnerIn && !myIn) return "A chama continua à espera do teu gesto";
  return getCountPhrase(streak, false);
}

// ── Journey — Faísca → Eternidade ────────────────────────────────────────────

const JOURNEY_LEVELS = [
  { name: "Faísca",     min: 1  },
  { name: "Brasa",      min: 3  },
  { name: "Chama",      min: 7  },
  { name: "Chama Viva", min: 14 },
  { name: "Farol",      min: 30 },
  { name: "Eternidade", min: 90 },
] as const;

type JourneyLevel = typeof JOURNEY_LEVELS[number];

function getCurrentJourneyLevel(streak: number): JourneyLevel | null {
  return Array.from(JOURNEY_LEVELS).reverse().find(l => streak >= l.min) ?? null;
}

function getJourneyNext(streak: number): string | null {
  const current = getCurrentJourneyLevel(streak);
  const idx = current ? JOURNEY_LEVELS.findIndex(l => l.name === current.name) : -1;
  return idx >= 0 && idx < JOURNEY_LEVELS.length - 1 ? JOURNEY_LEVELS[idx + 1].name : null;
}

function getJourneyDaysLeft(streak: number): number {
  const current = getCurrentJourneyLevel(streak);
  const idx = current ? JOURNEY_LEVELS.findIndex(l => l.name === current.name) : -1;
  if (idx < 0 || idx >= JOURNEY_LEVELS.length - 1) return 0;
  return JOURNEY_LEVELS[idx + 1].min - streak;
}

// ── Guardian stage colors — espelham STAGE_COLORS do FlamePet ────────────────
const GUARDIAN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  faisca:    { bg: "rgba(255,107,157,0.13)", border: "rgba(255,107,157,0.35)", text: "#FF6B9D" },
  brasa:     { bg: "rgba(255,139,61,0.13)",  border: "rgba(255,139,61,0.35)",  text: "#FF8B3D" },
  chama:     { bg: "rgba(45,217,196,0.13)",  border: "rgba(45,217,196,0.35)",  text: "#1BBFAD" },
  guardiao:  { bg: "rgba(59,130,229,0.13)",  border: "rgba(59,130,229,0.35)",  text: "#3B82E5" },
  sentinela: { bg: "rgba(155,93,229,0.13)",  border: "rgba(155,93,229,0.35)",  text: "#9B5DE5" },
  eterno:    { bg: "rgba(255,200,61,0.13)",  border: "rgba(255,200,61,0.35)",  text: "#D4A017" },
  soberano:  { bg: "rgba(155,93,229,0.13)",  border: "rgba(155,93,229,0.35)",  text: "#9B5DE5" },
};

// ── Card temperature — subtle warmth, never saturated ────────────────────────

function getCardTemperature(streak: number, bothActive: boolean, perfectDay: boolean): string {
  let o = 0;
  if (streak >= 90)      o = 0.07;
  else if (streak >= 30) o = 0.05;
  else if (streak >= 14) o = 0.04;
  else if (streak >= 7)  o = 0.03;
  else if (streak >= 3)  o = 0.02;
  else if (streak >= 1)  o = 0.015;
  if (bothActive)  o = Math.min(o + 0.04, 0.10);
  if (perfectDay)  o = Math.min(o + 0.02, 0.11);
  if (o === 0) return "hsl(var(--card))";
  return `radial-gradient(ellipse at 50% 105%, rgba(255,107,143,${o.toFixed(3)}) 0%, transparent 62%), hsl(var(--card))`;
}

function getStreakNumberSize(streak: number): string {
  if (streak >= 30) return "text-7xl";
  if (streak >= 7)  return "text-6xl";
  return "text-5xl";
}

// ── Relationship state (footer) ───────────────────────────────────────────────

function getRelationshipState(s: number): { name: string; color: string } {
  if (s >= 90) return { name: "Eternidade",  color: "text-muted-foreground"  };
  if (s >= 30) return { name: "Farol",       color: "text-muted-foreground"  };
  if (s >= 14) return { name: "Chama Viva",  color: "text-muted-foreground"  };
  if (s >= 7)  return { name: "Chama",       color: "text-muted-foreground"  };
  if (s >= 3)  return { name: "Brasa",       color: "text-muted-foreground"  };
  if (s >= 1)  return { name: "Faísca",      color: "text-muted-foreground"  };
  return             { name: "Início",       color: "text-muted-foreground/65"     };
}

function getRelationshipIcon(name: string) {
  if (name === "Eternidade" || name === "Farol") return Sparkles;
  if (name === "Chama Viva" || name === "Chama" || name === "Brasa") return Flame;
  return Heart;
}

// ── Missions ──────────────────────────────────────────────────────────────────
// Definições partilhadas com a secção "Gestos" de /jornada — ver
// src/features/streak/missions.ts (fonte única, evita as duas listas
// divergirem como antes).

type MissionStatus = Record<MissionId, boolean>;

// ── Card status ───────────────────────────────────────────────────────────────

function getCardStatus(bothActive: boolean, myCheckedIn: boolean, shieldUsedToday: boolean, isSolo: boolean) {
  if (bothActive)      return { label: isSolo ? "Presente hoje" : "Juntos hoje", color: "text-muted-foreground", dot: "bg-rose-400" };
  if (shieldUsedToday) return { label: "Chama protegida",   color: "text-muted-foreground/65",    dot: "bg-sky-300"  };
  if (myCheckedIn && !isSolo) return { label: "A aguardar o par",  color: "text-muted-foreground/65",    dot: "bg-muted-foreground/30"   };
  return               { label: "Aguardando presença",      color: "text-muted-foreground/65",    dot: "bg-muted-foreground/20"   };
}

// ── Data hook ─────────────────────────────────────────────────────────────────

type CardCache = { points: number; lifetimePoints: number; missions: MissionStatus; cacheDate?: string };

function readCardCache(spaceId: string | null): CardCache | null {
  if (!spaceId) return null;
  try {
    const raw = sessionStorage.getItem(`ln_card_${spaceId}`);
    if (!raw) return null;
    const cached: CardCache = JSON.parse(raw);
    // Missões são diárias — cache de outro dia deve ser descartada
    if (cached.cacheDate !== todayLocal()) return null;
    return cached;
  } catch { return null; }
}

function writeCardCache(spaceId: string, c: CardCache) {
  try { sessionStorage.setItem(`ln_card_${spaceId}`, JSON.stringify({ ...c, cacheDate: todayLocal() })); } catch {}
}

const EMPTY_MISSIONS: MissionStatus = {
  message: false, plano: false, checkin: false, mood: false, prayer: false, leitura: false,
};

function useCardData(threshold: number) {
  const spaceId = useCoupleSpaceId();
  const cached = readCardCache(spaceId);
  const [points, setPoints] = useState<number | null>(cached?.points ?? null);
  const [lifetimePoints, setLifetimePoints] = useState<number | null>(cached?.lifetimePoints ?? null);
  const [missions, setMissions] = useState<MissionStatus>(cached?.missions ?? EMPTY_MISSIONS);

  // Refs para evitar stale closure no writeCardCache — o callback captura
  // sempre o valor mais recente sem precisar de entrar nas dependências.
  const pointsRef        = useRef(points);
  const lifetimePointsRef = useRef(lifetimePoints);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { lifetimePointsRef.current = lifetimePoints; }, [lifetimePoints]);

  const fetchData = useCallback(async () => {
    if (!spaceId) return;
    const today = todayLocal();

    // Busca pontos, pontos lifetime e missões em paralelo.
    // Cache só é escrita uma vez, na resolução do Promise.all de missões,
    // quando já temos todos os valores frescos via refs.
    (supabase.rpc("get_total_points" as any, { p_couple_space_id: spaceId }) as any)
      .then(({ data }: any) => {
        if (typeof data === "number") {
          setPoints(data);
          pointsRef.current = data;
        }
      });
    (supabase.rpc("get_lifetime_points" as any, { p_couple_space_id: spaceId }) as any)
      .then(({ data }: any) => {
        if (typeof data === "number") {
          setLifetimePoints(data);
          lifetimePointsRef.current = data;
        }
      });
    Promise.all([
      (supabase.from("daily_activity" as any).select("type,user_id").eq("couple_space_id", spaceId).eq("activity_date", today) as any),
      (supabase.from("daily_spiritual_logs" as any).select("prayed_today,user_id").eq("couple_space_id", spaceId).eq("day_key", today) as any),
    ]).then(([{ data: acts }, { data: logs }]) => {
      const activities: any[] = acts ?? [];
      const spiritual: any[]  = logs ?? [];
      const uniqueUsers = (t: string) => new Set(activities.filter(a => a.type === t).map(a => a.user_id)).size;
      const newMissions: MissionStatus = {
        message: uniqueUsers("message") >= threshold,
        plano:   uniqueUsers("plano")   >= threshold,
        checkin: uniqueUsers("checkin") >= threshold,
        mood:    uniqueUsers("mood")    >= threshold,
        prayer:  new Set(spiritual.filter(l => l.prayed_today).map((l: any) => l.user_id)).size >= threshold,
        leitura: uniqueUsers("leitura") >= threshold,
      };
      setMissions(newMissions);
      if (spaceId) writeCardCache(spaceId, {
        points:        pointsRef.current ?? 0,
        lifetimePoints: lifetimePointsRef.current ?? 0,
        missions:      newMissions,
      });
    });
  }, [spaceId, threshold]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const h = () => {
      fetchData();
      // Segundo fetch com delay cobre race conditions onde o primeiro corre
      // antes do INSERT ser visível numa query concorrente (PgBouncer).
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchData, 600);
    };
    window.addEventListener("streak-updated", h);
    window.addEventListener("home-visible", h);
    window.addEventListener("mission-complete", h);
    return () => {
      window.removeEventListener("streak-updated", h);
      window.removeEventListener("home-visible", h);
      window.removeEventListener("mission-complete", h);
      if (timer) clearTimeout(timer);
    };
  }, [fetchData]);
  useEffect(() => {
    const t = setInterval(fetchData, 20_000);
    return () => clearInterval(t);
  }, [fetchData]);
  // Quando a PWA volta ao primeiro plano (ex: utilizador regressa de outra app),
  // o WebSocket do Realtime pode ter sido suspenso pelo OS — atualizar imediatamente.
  useEffect(() => {
    const h = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [fetchData]);
  // Realtime — reage imediatamente quando qualquer membro insere/atualiza
  // uma atividade ou registo espiritual neste couple_space.
  // Dispara streak-updated em vez de fetchData() directamente para que
  // tanto useCardData (missões) como useStreak (contagem) actualizem.
  useEffect(() => {
    if (!spaceId) return;
    const notify = () => window.dispatchEvent(new CustomEvent("streak-updated"));
    const channel = supabase
      .channel(`card-rt-${spaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_activity",       filter: `couple_space_id=eq.${spaceId}` }, notify)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_spiritual_logs", filter: `couple_space_id=eq.${spaceId}` }, notify)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "daily_spiritual_logs", filter: `couple_space_id=eq.${spaceId}` }, notify)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "points",               filter: `couple_space_id=eq.${spaceId}` }, notify)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  return { points, lifetimePoints, missions };
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function LoveStreakCard({ streak, loading }: { streak: StreakState; loading: boolean }) {
  const { profile }         = useProfile();

  const isSolo          = profile?.usage_mode === "solo";
  const hasSpiritual    = profile?.religion !== "none";
  const threshold        = isSolo ? 1 : Math.max(streak.totalMembers, 2);
  const { points, lifetimePoints, missions } = useCardData(threshold);
  const spaceId             = useCoupleSpaceId();
  const navigate            = useNavigate();
  // streakPhase calculado depois do early-return de loading,
  // pois currentStreak só fica disponível após o streak?.currentStreak destructure

  const activeMissions  = getDailyMissions({ isSolo, hasSpiritual });

  const celebratedRef   = useRef(false);
  const perfectDayRef   = useRef(false);
  const bothActiveToday = streak?.bothActiveToday ?? false;

  const gesturesDone    = activeMissions.filter((m) => missions[m.id]).length;
  const allMissionsDone = gesturesDone === activeMissions.length;
  const perfectDay      = bothActiveToday && allMissionsDone;

  useEffect(() => {
    if (bothActiveToday && !celebratedRef.current) {
      celebratedRef.current = true;
      try { navigator.vibrate?.(perfectDay ? [20, 60, 20, 60, 20] : [10, 30, 10]); } catch {}
    }
    if (!bothActiveToday) celebratedRef.current = false;
  }, [bothActiveToday, perfectDay]);

  useEffect(() => {
    if (perfectDay && spaceId && !perfectDayRef.current) {
      perfectDayRef.current = true;
      supabase.rpc("record_perfect_day" as any, { p_couple_space_id: spaceId }).then(null, () => {});
    }
    if (!perfectDay) perfectDayRef.current = false;
  }, [perfectDay, spaceId]);

  if (loading) {
    return (
      <div className={cn(WIDGET, "animate-pulse space-y-3 px-5 py-4")}>
        <div className="h-3 w-28 rounded-full bg-[#F1EEEA] dark:bg-muted" />
        <div className="h-12 w-20 rounded-lg bg-[#F1EEEA] dark:bg-muted" />
        <div className="h-2.5 w-full rounded-full bg-[#F1EEEA] dark:bg-muted" />
      </div>
    );
  }

  const {
    currentStreak, longestStreak: _ls, shieldsRemaining,
    shieldUsedToday, myCheckedIn, activeCount, streakAtRisk,
  } = streak;

  const streakPhase = getStreakLevel(currentStreak);

  const partnerCheckedIn = !isSolo && activeCount >= (myCheckedIn ? 2 : 1);
  const displayPoints    = points ?? 0;
  const currentLevel     = getCurrentJourneyLevel(currentStreak);

  // Jornada como barra segmentada: níveis alcançados a tinta, o atual em destaque.
  const journey = Array.from(JOURNEY_LEVELS).map((level, idx) => {
    const reached = currentStreak >= level.min;
    const isCurrent =
      reached && (idx === JOURNEY_LEVELS.length - 1 || currentStreak < JOURNEY_LEVELS[idx + 1].min);
    return {
      key: level.name,
      weight: isCurrent ? 1.6 : 1,
      tone: (isCurrent ? "accent" : reached ? "ink" : "idle") as "accent" | "ink" | "idle",
    };
  });

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => navigate("/jornada")}
        className={cn(WIDGET, "w-full text-left transition-transform active:scale-[0.99]")}
      >
        <div className="px-5 pb-4 pt-4">
          {/* ── Cabeçalho: chama, nível e Guardião ── */}
          <div className="flex items-start justify-between">
            <div>
              <MonoLabel className="flex items-center gap-1.5">
                <Flame
                  className={cn("h-3.5 w-3.5 text-[#E5484D]", bothActiveToday && "animate-flame-breathe")}
                  strokeWidth={2}
                />
                {isSolo ? "A tua chama" : "A vossa chama"}
              </MonoLabel>
              <p className="mt-1.5 text-[13px] font-medium text-[#3A4150] dark:text-foreground/80">
                {streakPhase.name} · nível {streakPhase.level}
                <span className="text-muted-foreground"> · {displayPoints} pts</span>
              </p>
            </div>
            <div className="h-11 w-11 shrink-0">
              <FlamePet stage={streakPhase.stage} mood="alegre" environment="suave" compact />
            </div>
          </div>

          {/* ── Dias de presença ── */}
          <BigNumber
            className="mt-2"
            value={currentStreak}
            unit={streakAtRisk ? "dias · a chama espera" : isSolo ? "dias de cuidado" : "dias de presença"}
          />

          {/* ── Jornada: Faísca → Brasa → Chama → Chama Viva → Farol → Eternidade ── */}
          <SegmentBar className="mt-4" segments={journey} />
          <div className="mt-2 flex items-center justify-between gap-2" aria-label={`Jornada: ${currentLevel?.name ?? "Início"}`}>
            <MonoLabel className={cn(currentStreak >= 1 && "text-[#E5484D] dark:text-[#F87171]")}>
              {currentLevel?.name ?? "Início"}
            </MonoLabel>
            <MonoLabel className="truncate">
              {streakPhase.nextLevelName
                ? `Próximo ${streakPhase.nextLevelName} · ${streakPhase.daysToNext} ${streakPhase.daysToNext === 1 ? "dia" : "dias"}`
                : isSolo ? "Chegaste ao fim" : "Chegaram ao fim"}
            </MonoLabel>
          </div>
        </div>

        {/* ── Rodapé: presença de hoje · proteção · gestos ── */}
        <WidgetFoot cols={3}>
          <FootStat label="Hoje" className="px-4">
            <span className="flex items-center gap-2.5">
              <PresenceHeart on={myCheckedIn} warm={bothActiveToday} label="Tu" />
              {!isSolo && <PresenceHeart on={partnerCheckedIn} warm={bothActiveToday} label="Par" />}
            </span>
          </FootStat>
          <FootStat
            className="px-4"
            label={<>Proteção <LevelBars value={shieldsRemaining} max={3} tone="blue" /></>}
          >
            {shieldsRemaining}
            <Unit>{shieldUsedToday ? "· usada hoje" : "/3"}</Unit>
          </FootStat>
          <div className="min-w-0 border-l border-black/[0.06] px-4 py-3.5 dark:border-border">
            <MonoLabel>Gestos</MonoLabel>
            <div className="mt-2 flex items-baseline gap-1 text-[22px] font-light leading-none tracking-[-0.03em] tabular-nums text-[#0B1324] dark:text-foreground">
              {gesturesDone}
              <Unit>/{activeMissions.length}</Unit>
            </div>
            <span className="mt-2 flex items-center gap-[6px]" aria-label="Gestos de hoje">
              {activeMissions.map(({ id, Icon, doneColor, title }) => (
                <Icon
                  key={id}
                  aria-label={`${title}${missions[id] ? " feito" : ""}`}
                  className={cn("h-[13px] w-[13px] transition-colors", missions[id] ? doneColor : "text-[#C9C6C0] dark:text-muted-foreground/30")}
                  strokeWidth={1.8}
                />
              ))}
            </span>
          </div>
        </WidgetFoot>
      </button>

      {perfectDay && (
        <p className="animate-in fade-in px-2 text-center text-[10px] font-medium text-muted-foreground/65 duration-500">
          {isSolo ? "Hoje o teu espaço esteve completo." : "Hoje o vosso espaço esteve completo."}
        </p>
      )}
    </div>
  );
}

function PresenceHeart({ on, warm, label }: { on: boolean; warm: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.04em] text-[#7E838C]">
      <Heart
        className={cn(
          "h-4 w-4 transition-all duration-500",
          on
            ? cn("fill-[#E5484D] text-[#E5484D]", warm ? "animate-hearts-warm-pulse" : "animate-heart-throb")
            : "text-[#C9C6C0] dark:text-muted-foreground/30",
        )}
        strokeWidth={on ? 0 : 1.6}
      />
      {label}
    </span>
  );
}

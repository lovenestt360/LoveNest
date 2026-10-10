import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { todayLocal } from "@/lib/timezone";
import { type StreakState } from "@/features/streak/useStreak";
import { getDailyMissions, type MissionId } from "@/features/streak/missions";
import { STREAK_LEVELS, getStreakLevel } from "@/features/streak/journeyLevels";
import { FlamePet } from "@/components/FlamePet";
import { Shield, ChevronRight, Heart, Sparkles } from "lucide-react";
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
      <div className="rounded-[1.75rem] border border-border/70 bg-card p-5 animate-pulse space-y-4">
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="h-14 w-24 rounded-xl bg-muted" />
        <div className="h-1.5 w-full rounded-full bg-muted" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  const { currentStreak, shieldsRemaining, shieldUsedToday, myCheckedIn, activeCount, streakAtRisk } = streak;

  const phase            = getStreakLevel(currentStreak);
  const partnerCheckedIn = !isSolo && activeCount >= (myCheckedIn ? 2 : 1);
  const cardStatus       = getCardStatus(bothActiveToday, myCheckedIn, shieldUsedToday, isSolo);
  const displayPoints    = points ?? 0;
  const phrase           = getContextualPhrase(currentStreak, bothActiveToday, myCheckedIn, partnerCheckedIn, streakAtRisk, perfectDay, isSolo);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border bg-card transition-shadow duration-500",
        bothActiveToday
          ? "border-rose-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-14px_rgba(244,63,94,0.28)] dark:border-rose-900/40"
          : "border-border/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.10)]",
      )}
    >
      {/* ── Topo: chama, número e guardião — toca para abrir a Jornada ── */}
      <button
        type="button"
        onClick={() => navigate("/jornada")}
        className="block w-full px-5 pt-5 pb-4 text-left active:bg-muted/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {isSolo ? "A tua chama" : "A vossa chama"}
              </p>
              {perfectDay && (
                <span className="flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-background animate-in fade-in duration-300">
                  <Sparkles className="h-2.5 w-2.5" strokeWidth={1.8} />
                  Dia completo
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cardStatus.dot)} />
              <span className="text-[11px] font-medium text-muted-foreground">{cardStatus.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-muted/70">
              <FlamePet stage={phase.stage} mood="alegre" environment="suave" compact />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={cn(
              "text-[72px] font-light leading-[0.9] tracking-[-0.045em] tabular-nums transition-colors duration-700",
              bothActiveToday ? "text-rose-500" : "text-foreground",
            )}
          >
            {currentStreak}
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
            {currentStreak === 1 ? "dia" : "dias"}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{phrase}</p>

        {/* Fases do Guardião — um segmento por fase */}
        <div className="mt-4 flex items-center gap-1" aria-hidden="true">
          {STREAK_LEVELS.map((lvl) => {
            const reached = lvl.level < phase.level;
            const current = lvl.level === phase.level;
            return (
              <span
                key={lvl.stage}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-700",
                  current ? "flex-[2.2] bg-rose-500" : "flex-1",
                  reached ? "bg-foreground" : !current && "bg-muted",
                )}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em]">
          <span className="text-foreground">{phase.name}</span>
          <span className="text-muted-foreground/70">
            {phase.nextLevelName && phase.daysToNext !== null
              ? `${phase.daysToNext} ${phase.daysToNext === 1 ? "dia" : "dias"} → ${phase.nextLevelName}`
              : "Fase máxima"}
          </span>
        </div>
      </button>

      {/* ── Métricas: presença · proteção · pontos ── */}
      <div className={cn("grid divide-x divide-border/70 border-t border-border/70", "grid-cols-3")}>
        <div className="px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">Presença</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <PresenceHeart label="Tu" on={myCheckedIn} warm={bothActiveToday} />
            {!isSolo && <PresenceHeart label="Par" on={partnerCheckedIn} warm={bothActiveToday} />}
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">Proteção</p>
          <div className="mt-1.5 flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <Shield
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < shieldsRemaining ? "fill-foreground text-foreground" : "text-muted-foreground/30",
                )}
                strokeWidth={1.5}
              />
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">Pontos</p>
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="text-[20px] font-light leading-none tabular-nums text-foreground">
              {displayPoints.toLocaleString("pt-PT")}
            </span>
            <span className="font-mono text-[9px] uppercase text-muted-foreground">pts</span>
          </p>
        </div>
      </div>

      {/* ── Gestos de hoje — cumprido fica escuro, como um interruptor ligado ── */}
      <div className="border-t border-border/70 px-4 pt-3 pb-4">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">Gestos de hoje</p>
          <p className="font-mono text-[10px] tabular-nums text-foreground">
            {gesturesDone}/{activeMissions.length}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {activeMissions.map(({ id, title, Icon, points: pts }) => {
            const done = missions[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(MISSION_ROUTES[id])}
                aria-label={`${title}${done ? " — feito" : ` — +${pts} pts`}`}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition-all active:scale-95",
                  done ? "bg-foreground text-background" : "bg-muted/70 text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                <span className="text-[10px] font-semibold leading-none">{title}</span>
                <span className={cn("font-mono text-[8px] leading-none", done ? "text-background/60" : "text-muted-foreground")}>
                  {done ? "feito" : `+${pts}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const MISSION_ROUTES: Record<MissionId, string> = {
  message: "/chat",
  plano: "/plano",
  checkin: "/jornada",
  mood: "/humor",
  prayer: "/jornada-espiritual",
  leitura: "/biblioteca",
};

function PresenceHeart({ label, on, warm }: { label: string; on: boolean; warm: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <Heart
        className={cn(
          "h-4 w-4 transition-all duration-500",
          on
            ? cn("fill-rose-500 text-rose-500", warm ? "animate-hearts-warm-pulse" : "animate-heart-throb")
            : "text-muted-foreground/30",
        )}
        strokeWidth={on ? 0 : 1.5}
      />
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </span>
  );
}

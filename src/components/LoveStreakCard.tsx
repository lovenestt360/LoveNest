import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { todayLocal } from "@/lib/timezone";
import { type StreakState } from "@/features/streak/useStreak";
import { getDailyMissions, type MissionId } from "@/features/streak/missions";
import { getStreakLevel } from "@/features/streak/journeyLevels";
import { FlamePet } from "@/components/FlamePet";
import { Check, Flame, Shield, Sparkles } from "lucide-react";
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

export function LoveStreakCard({
  streak, loading, partnerName,
}: { streak: StreakState; loading: boolean; partnerName?: string | null }) {
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
      <div className="rounded-[1.6rem] bg-card p-4 animate-pulse space-y-3 shadow-[0_1px_2px_rgba(11,19,36,0.04)]">
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="h-10 w-20 rounded-xl bg-muted" />
        <div className="h-12 w-full rounded-2xl bg-muted" />
        <div className="h-9 w-2/3 rounded-full bg-muted" />
      </div>
    );
  }

  const { currentStreak, shieldsRemaining, myCheckedIn, activeCount, streakAtRisk } = streak;

  const phase            = getStreakLevel(currentStreak);
  const partnerCheckedIn = !isSolo && activeCount >= (myCheckedIn ? 2 : 1);
  const displayPoints    = points ?? 0;
  const phrase           = getContextualPhrase(currentStreak, bothActiveToday, myCheckedIn, partnerCheckedIn, streakAtRisk, perfectDay, isSolo);
  const partnerLabel     = partnerName?.split(" ")[0] || "Par";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.6rem] bg-card px-4 pt-3.5 pb-3.5 transition-shadow duration-500 dark:border dark:border-border/60",
        bothActiveToday
          ? "shadow-[0_1px_2px_rgba(11,19,36,0.04),0_16px_36px_-14px_rgba(229,70,109,0.35)]"
          : "shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)]",
      )}
    >
      {/* Brilho quente quando os dois já apareceram */}
      {bothActiveToday && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 70% at 85% 0%, rgba(244,63,94,0.08), transparent 60%)" }}
          aria-hidden="true"
        />
      )}

      <button type="button" onClick={() => navigate("/jornada")} className="relative block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-0.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/80">
              <Flame className={cn("h-[15px] w-[15px] text-rose-500", bothActiveToday && "animate-flame-breathe")} strokeWidth={2.2} />
              {isSolo ? "A tua chama" : "A vossa chama"}
              {perfectDay && (
                <span className="ml-1 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9.5px] font-semibold text-white animate-in fade-in duration-300">
                  <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
                  Dia completo
                </span>
              )}
            </p>

            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[38px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">
                {currentStreak}
              </span>
              <span className="text-[12.5px] leading-tight text-muted-foreground">
                {currentStreak === 1 ? "dia" : "dias"} de presença
              </span>
            </div>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{phrase}</p>
          </div>

          <div className="relative -mr-1 -mt-1 h-[68px] w-[68px] shrink-0 rounded-full bg-[radial-gradient(circle_at_50%_60%,rgba(253,206,220,0.9)_0%,rgba(255,240,244,0.7)_55%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_60%,rgba(244,63,94,0.22)_0%,rgba(244,63,94,0.06)_55%,transparent_72%)]">
            <FlamePet stage={phase.stage} mood="alegre" environment="suave" compact />
          </div>
        </div>

        {/* Presença de hoje — tu em rosa, o par em azul */}
        <div className={cn("mt-3 grid overflow-hidden rounded-2xl bg-muted/70", isSolo ? "grid-cols-1" : "grid-cols-2")}>
          <PresenceCell name="Tu" present={myCheckedIn} tone="me" doneText="já apareceste" />
          {!isSolo && (
            <PresenceCell name={partnerLabel} present={partnerCheckedIn} tone="partner" doneText="já apareceu" divider />
          )}
        </div>

        {/* Próxima fase do Guardião + escudos */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>
              {phase.nextLevelName ? (
                <>Próximo: <b className="font-semibold text-foreground/80">{phase.nextLevelName}</b>{phase.daysToNext !== null && ` · faltam ${phase.daysToNext} ${phase.daysToNext === 1 ? "dia" : "dias"}`}</>
              ) : (
                <b className="font-semibold text-foreground/80">{phase.name} · fase máxima</b>
              )}
            </span>
            <span className="flex items-center gap-0.5" aria-label={`${shieldsRemaining} de 3 escudos`}>
              {[0, 1, 2].map((i) => (
                <Shield
                  key={i}
                  className={cn("h-3.5 w-3.5", i < shieldsRemaining ? "fill-foreground text-foreground" : "fill-muted text-muted-foreground/30")}
                  strokeWidth={1.5}
                />
              ))}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 transition-[width] duration-700"
              style={{ width: `${Math.max(phase.progressPct, 4)}%` }}
            />
          </div>
        </div>
      </button>

      {/* Gestos de hoje — feito fica escuro, com um visto verde */}
      <div className="relative mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-2">
          {activeMissions.map(({ id, title, Icon, points: pts }) => {
            const done = missions[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(MISSION_ROUTES[id])}
                title={title}
                aria-label={`${title}${done ? " — feito" : ` — +${pts} pts`}`}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90",
                  done ? "bg-foreground text-background" : "bg-muted/80 text-muted-foreground",
                )}
              >
                <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                {done && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-emerald-500">
                    <Check className="h-2 w-2 text-white" strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
          <span className="ml-1 text-[11.5px] text-muted-foreground">
            {gesturesDone}/{activeMissions.length} gestos
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[17px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground">
            {displayPoints.toLocaleString("pt-PT")}
          </span>
          <span className="text-[10.5px] text-muted-foreground">pontos</span>
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

function PresenceCell({
  name, present, tone, doneText, divider,
}: { name: string; present: boolean; tone: "me" | "partner"; doneText: string; divider?: boolean }) {
  const color = tone === "me" ? "text-rose-500" : "text-[#4D7CFE]";
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5 px-3 py-2", divider && "border-l border-border/70")}>
      <span className={cn("relative flex h-2.5 w-2.5 shrink-0", color)}>
        {present && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />}
        <span className={cn("relative h-2.5 w-2.5 rounded-full border-2 border-current", present && "bg-current")} />
      </span>
      <span className="min-w-0">
        <b className="block truncate text-[13px] font-semibold leading-tight text-foreground">{name}</b>
        <span className="block truncate text-[11.5px] leading-tight text-muted-foreground">
          {present ? doneText : "ainda não hoje"}
        </span>
      </span>
    </div>
  );
}

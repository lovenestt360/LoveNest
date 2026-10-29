import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { todayLocal } from "@/lib/timezone";
import { type StreakState } from "@/features/streak/useStreak";
import { getDailyMissions, type MissionId } from "@/features/streak/missions";
import { getStreakLevel } from "@/features/streak/journeyLevels";
import { FlamePet } from "@/components/FlamePet";
import { JourneyBar } from "@/features/streak/JourneyBar";
import { FeatureGlyph, PresenceHeartIcon, ShieldIcon, type GlyphKind } from "@/features/home/FeatureIcon";
import { MoodFace } from "@/features/mood/MoodArt";
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

// Cada gesto do dia com o desenho da sua funcionalidade (o humor é a Faísca).
const MISSION_GLYPH: Partial<Record<MissionId, GlyphKind>> = {
  plano: "calendario",
  message: "chat",
  prayer: "espiritual",
  leitura: "historia",
  checkin: "presenca",
};

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
      <div className="animate-pulse space-y-3 rounded-[24px] border border-[#ECE8E3] bg-white p-4 dark:border-border dark:bg-card">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-8 w-14 rounded-lg bg-muted" />
        <div className="h-3 w-32 rounded-full bg-muted" />
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

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => navigate("/jornada")}
        className="w-full rounded-[24px] border border-[#ECE8E3] bg-white px-4 pb-3 pt-3 text-left shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] transition-transform active:scale-[0.99] dark:border-border dark:bg-card"
      >
        {/* ── Cabeçalho: chama, nível e Guardião ── */}
        <div className="flex items-center justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3A4150] dark:text-foreground/80">
              <FeatureGlyph kind="chama" size={17} className={cn(bothActiveToday && "animate-flame-breathe")} />
              {isSolo ? "A tua chama" : "A vossa chama"}
            </span>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {streakPhase.name} · nível {streakPhase.level}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0">
            <FlamePet stage={streakPhase.stage} mood="alegre" environment="suave" compact />
          </div>
        </div>

        {/* ── Dias de presença · corações · escudos ── */}
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span
              className={cn(
                "text-[34px] font-extrabold leading-[0.95] tracking-[-0.035em] tabular-nums",
                "text-foreground",
              )}
            >
              {currentStreak}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {streakAtRisk ? "dias · a chama espera" : isSolo ? "dias de cuidado" : "dias de presença"}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2 pb-0.5">
            <div className="flex items-center gap-3">
              <PresenceHeart on={myCheckedIn} warm={bothActiveToday} label="Tu" />
              {!isSolo && <PresenceHeart on={partnerCheckedIn} warm={bothActiveToday} label="Par" />}
            </div>
            <div className="flex items-center gap-0.5" aria-label={`${shieldsRemaining} de 3 escudos`}>
              {[0, 1, 2].map((i) => (
                <ShieldIcon key={i} on={i < shieldsRemaining} size={15} />
              ))}
              <span className="ml-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Proteção
              </span>
            </div>
          </div>
        </div>

        {/* ── Barra da jornada: acende na cor do Guardião atual, com raios ── */}
        <JourneyBar days={currentStreak} />
        <div className="mt-1 flex items-center justify-between text-[12px] text-muted-foreground">
          <span className={cn("font-semibold", currentStreak >= 1 ? "text-foreground" : "text-muted-foreground/50")}>
            {currentStreak >= 1 ? streakPhase.name : "Início"}
          </span>
          {streakPhase.nextLevelName ? (
            <span>
              Próximo: <b className="font-semibold text-[#2F6BFF]">{streakPhase.nextLevelName}</b>
              {" · "}{streakPhase.daysToNext === 1 ? "falta 1 dia" : `faltam ${streakPhase.daysToNext} dias`}
            </span>
          ) : (
            <span>{isSolo ? "Chegaste ao fim da jornada" : "Chegaram ao fim da jornada"}</span>
          )}
        </div>

        {/* ── Gestos de hoje: pontos · gestos e as missões ── */}
        <div className="-mx-4 mb-2 mt-2.5 h-px bg-[#ECE8E3] dark:bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] text-muted-foreground/80">
            <b className={cn("font-bold tabular-nums", displayPoints > 0 ? "text-foreground" : "text-muted-foreground/60")}>
              {displayPoints}
            </b>{" "}
            pts ·{" "}
            <b className={cn("font-bold tabular-nums", gesturesDone > 0 ? "text-foreground" : "text-muted-foreground/60")}>
              {gesturesDone}
            </b>{" "}
            {gesturesDone === 1 ? "gesto" : "gestos"}
            {shieldUsedToday && <span className="ml-1.5 text-sky-500">· chama protegida</span>}
          </span>
          <span className="flex items-center gap-[9px]" aria-label="Gestos de hoje">
            {activeMissions.map(({ id, title }) => {
              const done = !!missions[id];
              const label = `${title}${done ? " feito" : ""}`;
              const glyph = MISSION_GLYPH[id];
              return glyph ? (
                <FeatureGlyph key={id} kind={glyph} size={17} dim={!done} label={label} />
              ) : (
                <span key={id} role="img" aria-label={label} className={cn("transition-opacity", !done && "opacity-30 grayscale")}>
                  <MoodFace mood="tranquilo" size={18} />
                </span>
              );
            })}
          </span>
        </div>
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
    <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
      <PresenceHeartIcon on={on} size={16} className={cn(on && (warm ? "animate-hearts-warm-pulse" : "animate-heart-throb"))} />
      {label}
    </span>
  );
}

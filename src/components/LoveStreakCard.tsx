import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import { getDailyMissions, type MissionId } from "@/features/streak/missions";
import {
  Flame, Shield, ChevronRight, Heart, Sparkles
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

const PERFECT_DAY_PHRASES = [
  "Hoje escolheram um ao outro",
  "O vosso ninho esteve completo hoje",
  "Cuidaram de todos os pequenos momentos",
  "Hoje apareceram um para o outro",
  "A chama ficou completa hoje",
];

function getCountPhrase(s: number) {
  return PHRASES.find(p => s >= p.min && s <= p.max)?.msg ?? "";
}

function getContextualPhrase(
  streak: number, bothActive: boolean, myIn: boolean,
  partnerIn: boolean, atRisk: boolean, perfectDay: boolean,
): string {
  const day = Math.floor(Date.now() / 86400000);
  if (perfectDay) return PERFECT_DAY_PHRASES[day % PERFECT_DAY_PHRASES.length];
  if (bothActive) {
    const msgs = ["Hoje cuidaram um do outro", "A chama esteve protegida hoje", "Vocês encontraram-se aqui hoje"];
    return msgs[day % msgs.length];
  }
  if (atRisk) return ["A chama sente saudades", "Hoje ainda podem proteger o vosso momento"][day % 2];
  if (myIn && !partnerIn) return "O teu par ainda não chegou hoje";
  if (partnerIn && !myIn) return "A chama continua à espera do teu gesto";
  return getCountPhrase(streak);
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

function getCardStatus(bothActive: boolean, myCheckedIn: boolean, shieldUsedToday: boolean) {
  if (bothActive)      return { label: "Juntos hoje",       color: "text-muted-foreground", dot: "bg-rose-400" };
  if (shieldUsedToday) return { label: "Chama protegida",   color: "text-muted-foreground/65",    dot: "bg-sky-300"  };
  if (myCheckedIn)     return { label: "A aguardar o par",  color: "text-muted-foreground/65",    dot: "bg-muted-foreground/30"   };
  return               { label: "Aguardando presença",      color: "text-muted-foreground/65",    dot: "bg-muted-foreground/20"   };
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useCardData(threshold: number) {
  const spaceId = useCoupleSpaceId();
  const [points, setPoints] = useState<number | null>(null);
  const [missions, setMissions] = useState<MissionStatus>({
    message: false, plano: false, checkin: false, mood: false, prayer: false, leitura: false,
  });

  const fetchData = useCallback(async () => {
    if (!spaceId) return;
    const today = new Date().toISOString().slice(0, 10);
    (supabase.rpc("get_total_points" as any, { p_couple_space_id: spaceId }) as any)
      .then(({ data }: any) => { if (typeof data === "number") setPoints(data); });
    Promise.all([
      (supabase.from("daily_activity" as any).select("type,user_id").eq("couple_space_id", spaceId).eq("activity_date", today) as any),
      (supabase.from("daily_spiritual_logs" as any).select("prayed_today,user_id").eq("couple_space_id", spaceId).eq("day_key", today) as any),
    ]).then(([{ data: acts }, { data: logs }]) => {
      const activities: any[] = acts ?? [];
      const spiritual: any[]  = logs ?? [];
      const uniqueUsers = (t: string) => new Set(activities.filter(a => a.type === t).map(a => a.user_id)).size;
      setMissions({
        message: uniqueUsers("message") >= threshold,
        plano:   uniqueUsers("plano")   >= threshold,
        checkin: uniqueUsers("checkin") >= threshold,
        mood:    uniqueUsers("mood")    >= threshold,
        prayer:  spiritual.filter(l => l.prayed_today).length >= threshold,
        leitura: uniqueUsers("leitura") >= threshold,
      });
    });
  }, [spaceId, threshold]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const h = () => fetchData();
    window.addEventListener("streak-updated", h);
    return () => window.removeEventListener("streak-updated", h);
  }, [fetchData]);
  useEffect(() => {
    const t = setInterval(fetchData, 3 * 60_000);
    return () => clearInterval(t);
  }, [fetchData]);

  return { points, missions };
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const { profile }         = useProfile();

  const isSolo          = profile?.usage_mode === "solo";
  const hasSpiritual    = profile?.religion !== "none";
  const threshold        = isSolo ? 1 : (streak?.totalMembers ?? 2);
  const { points, missions } = useCardData(threshold);
  const spaceId             = useCoupleSpaceId();
  const navigate            = useNavigate();

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
      <div className="glass-card p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-muted rounded-full" />
        <div className="h-10 w-16 bg-muted rounded-lg" />
        <div className="h-3 w-32 bg-muted rounded-full" />
      </div>
    );
  }

  const {
    currentStreak, longestStreak: _ls, shieldsRemaining,
    shieldUsedToday, myCheckedIn, activeCount, streakAtRisk,
  } = streak;

  const partnerCheckedIn = activeCount >= (myCheckedIn ? 2 : 1);
  const cardStatus       = getCardStatus(bothActiveToday, myCheckedIn, shieldUsedToday);
  const relState         = getRelationshipState(currentStreak);
  const RelIcon          = getRelationshipIcon(relState.name);
  const displayPoints    = points ?? 0;

  const daysLabel = bothActiveToday
    ? "dias a aparecer um pelo outro"
    : streakAtRisk ? "dias · a chama espera por vocês"
    : currentStreak === 0 ? "dias" : "dias juntos";

  // Visual system
  const cardBg    = getCardTemperature(currentStreak, bothActiveToday, perfectDay);
  const dotColor  = bothActiveToday ? "#F87171" : "hsl(var(--border))";
  const lineColor = bothActiveToday ? "rgba(248,113,113,0.18)" : "hsl(var(--border) / 0.8)";
  const daysLeft  = getJourneyDaysLeft(currentStreak);
  const nextName  = getJourneyNext(currentStreak);
  const borderColor = "hsl(var(--border))";

  return (
    <div className="relative">
      {/* ── Halo — soft atmospheric glow, half intensity ── */}
      <div
        className="absolute -inset-4 pointer-events-none"
        style={{
          opacity: bothActiveToday ? 1 : 0,
          transition: "opacity 1800ms ease-in-out",
          zIndex: 0,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 55%, rgba(255,107,143,0.13) 0%, transparent 100%)",
            filter: "blur(52px)",
            borderRadius: "2.5rem",
            animation: "chama-breathe 7s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-3"
          style={{
            background: "radial-gradient(ellipse at 50% 60%, rgba(255,107,143,0.20) 0%, transparent 66%)",
            filter: "blur(26px)",
            borderRadius: "2rem",
            animation: "chama-breathe-inner 4.5s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative space-y-1.5" style={{ zIndex: 1 }}>
      <button
        onClick={() => navigate("/jornada")}
        className={cn(
          "glass-card glass-card-hover w-full p-5 text-left",
          "transition-[box-shadow,border-color,transform] duration-[400ms] ease-in-out"
        )}
        style={{
          background:  cardBg,
          borderColor,
          boxShadow: bothActiveToday
            ? "0 2px 4px rgba(0,0,0,0.04),0 12px 32px -4px rgba(0,0,0,0.09),inset 0 1px 0 hsl(var(--foreground) / 0.05),inset 0 -1px 20px rgba(255,107,143,0.05)"
            : "0 2px 4px rgba(0,0,0,0.04),0 8px 24px -2px rgba(0,0,0,0.07),inset 0 1px 0 hsl(var(--foreground) / 0.04)",
        }}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Flame
              className={cn("w-4 h-4 transition-colors",
                bothActiveToday ? "text-rose-500 animate-flame-breathe" : "text-muted-foreground/50")}
              strokeWidth={1.5}
            />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              A vossa Chama
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {perfectDay && (
              <span className="flex items-center gap-1 bg-muted border border-border text-muted-foreground text-[9px] font-semibold rounded-full px-2 py-0.5 animate-in fade-in duration-300">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} />
                Dia Completo
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
        </div>

        {/* ── Contextual phrase ── */}
        <p className="text-[11px] text-muted-foreground/65 mb-1.5 leading-snug">
          {getContextualPhrase(currentStreak, bothActiveToday, myCheckedIn, partnerCheckedIn, streakAtRisk, perfectDay)}
        </p>

        {/* ── Status badge ── */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cardStatus.dot)} />
          <span className={cn("text-[10px] font-semibold", cardStatus.color)}>
            {cardStatus.label}
          </span>
        </div>

        {/* ── Streak number + presence ── */}
        <div className="flex items-start justify-between">

          {/* Number */}
          <div className="flex flex-col items-start gap-0.5">
            <div className="relative flex items-baseline gap-1.5">
              <span className={cn(
                "font-extrabold tabular-nums tracking-tight relative transition-all duration-700",
                getStreakNumberSize(currentStreak),
                bothActiveToday ? "text-rose-500" : "text-foreground"
              )}>
                {currentStreak}
              </span>
            </div>
            <span className={cn("text-[10px] leading-snug max-w-[130px]",
              bothActiveToday ? "text-rose-400 font-medium" : "text-muted-foreground/65")}>
              {daysLabel}
            </span>
          </div>

          {/* Presence — Tu + Par */}
          <div className="flex flex-col items-end gap-2 pt-0.5">
            <div className="relative flex items-center gap-3">
              <div className="relative flex items-center gap-1">
                <Heart
                  className={cn("w-4 h-4 transition-all duration-500",
                    myCheckedIn
                      ? bothActiveToday
                        ? "fill-rose-500 text-rose-500 animate-hearts-warm-pulse"
                        : "fill-rose-500 text-rose-500 animate-heart-throb"
                      : "text-muted-foreground/30"
                  )}
                  strokeWidth={myCheckedIn ? 0 : 1.5}
                />
                <span className="text-[9px] text-muted-foreground/65 font-semibold">Tu</span>
              </div>
              <div className="relative flex items-center gap-1">
                <Heart
                  className={cn("w-4 h-4 transition-all duration-500",
                    partnerCheckedIn
                      ? bothActiveToday
                        ? "fill-rose-500 text-rose-500 animate-hearts-warm-pulse"
                        : "fill-rose-500 text-rose-500 animate-heart-throb"
                      : "text-muted-foreground/30"
                  )}
                  strokeWidth={partnerCheckedIn ? 0 : 1.5}
                />
                <span className="text-[9px] text-muted-foreground/65 font-semibold">Par</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map(i => (
                <Shield key={i}
                  className={cn("w-3.5 h-3.5", i < shieldsRemaining ? "text-blue-400" : "text-muted-foreground/30")}
                  strokeWidth={1.5}
                />
              ))}
              <span className="text-[9px] text-muted-foreground/65 font-semibold uppercase tracking-wide ml-1">
                Proteção
              </span>
            </div>
          </div>
        </div>

        {/* ── Journey level track: Faísca → Brasa → Chama → Chama Viva → Farol → Eternidade ── */}
        <div className="mt-4 mb-1">
          <div className="flex items-center">
            {Array.from(JOURNEY_LEVELS).map((level, idx) => {
              const reached   = currentStreak >= level.min;
              const isCurrent = reached && (
                idx === JOURNEY_LEVELS.length - 1 ||
                currentStreak < JOURNEY_LEVELS[idx + 1].min
              );
              return (
                <Fragment key={level.name}>
                  {idx > 0 && (
                    <div
                      className="flex-1 h-px transition-all duration-700"
                      style={{ background: reached ? lineColor : "hsl(var(--border))" }}
                    />
                  )}
                  <div
                    className={cn(
                      "shrink-0 rounded-full transition-all duration-700",
                      isCurrent && "animate-journey-dot-pulse"
                    )}
                    style={{
                      width:  isCurrent ? 14 : 7,
                      height: isCurrent ? 14 : 7,
                      background: reached ? dotColor : "hsl(var(--border))",
                      boxShadow: isCurrent
                        ? `0 0 ${bothActiveToday ? 12 : 8}px rgba(244,63,94,${bothActiveToday ? 0.30 : 0.20})`
                        : "none",
                    }}
                  />
                </Fragment>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] font-semibold tracking-wide"
              style={{ color: currentStreak >= 1 ? (bothActiveToday ? "#F87171" : "hsl(var(--muted-foreground))") : "hsl(var(--muted-foreground) / 0.4)" }}>
              {getCurrentJourneyLevel(currentStreak)?.name ?? "Início"}
            </span>
            {nextName ? (
              <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                {daysLeft} {daysLeft === 1 ? "dia" : "dias"} para {nextName}
              </span>
            ) : currentStreak >= 90 ? (
              <span className="text-[9px] font-medium text-muted-foreground/65">
                Chegaram à Eternidade
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <RelIcon
                className={cn("w-3 h-3 shrink-0", relState.color)}
                strokeWidth={1.5}
              />
              <span className={cn("text-[11px] font-semibold", relState.color)}>
                {relState.name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className={cn("font-semibold tabular-nums",
                displayPoints > 0 ? "text-rose-400" : "text-muted-foreground/50")}>
                {displayPoints}
              </span>
              <span className="text-muted-foreground/50">pts</span>
              <span className="text-[#ddd]">·</span>
              <span className={cn("font-semibold tabular-nums",
                gesturesDone > 0 ? "text-sky-400" : "text-muted-foreground/50")}>
                {gesturesDone}
              </span>
              <span className="text-muted-foreground/50">gestos</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              {activeMissions.map(({ id, Icon, doneColor }) => (
                <Icon key={id}
                  className={cn("w-3.5 h-3.5 transition-colors",
                    missions[id] ? doneColor : "text-muted-foreground/30")}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            {allMissionsDone && (
              <span className="text-[9px] font-semibold text-muted-foreground/65 tracking-wide">
                Missão cumprida
              </span>
            )}
          </div>
        </div>

      </button>

      {perfectDay && (
        <p className="text-center text-[10px] text-muted-foreground/65 font-medium px-2 animate-in fade-in duration-500">
          Hoje o vosso espaço esteve completo.
        </p>
      )}
      </div>
    </div>
  );
}

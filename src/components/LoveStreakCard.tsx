import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import {
  Flame, Shield, ChevronRight, Heart,
  MessageCircle, Zap, Smile, BookHeart, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

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
  streak: number,
  bothActive: boolean,
  myIn: boolean,
  partnerIn: boolean,
  atRisk: boolean,
  perfectDay: boolean,
): string {
  const day = Math.floor(Date.now() / 86400000);

  if (perfectDay) return PERFECT_DAY_PHRASES[day % PERFECT_DAY_PHRASES.length];

  if (bothActive) {
    const msgs = [
      "Hoje cuidaram um do outro",
      "A chama esteve protegida hoje",
      "Vocês encontraram-se aqui hoje",
    ];
    return msgs[day % msgs.length];
  }
  if (atRisk) {
    const msgs = [
      "A chama sente saudades",
      "Hoje ainda podem proteger o vosso momento",
    ];
    return msgs[day % msgs.length];
  }
  if (myIn && !partnerIn) return "O teu par ainda não chegou hoje";
  if (partnerIn && !myIn) return "A chama continua à espera do teu gesto";
  return getCountPhrase(streak);
}

// Emotional relationship state — the identity of the couple's journey
function getRelationshipState(s: number): { name: string; color: string } {
  if (s >= 90) return { name: "Almas Gémeas", color: "text-rose-500"    };
  if (s >= 30) return { name: "Inseparáveis", color: "text-rose-500"    };
  if (s >= 7)  return { name: "Chama Viva",   color: "text-rose-400"   };
  if (s >= 1)  return { name: "Em Conexão",   color: "text-[#717171]"  };
  return             { name: "Início",        color: "text-[#aaa]"     };
}

function getRelationshipIcon(name: string) {
  if (name === "Almas Gémeas" || name === "Inseparáveis") return Sparkles;
  if (name === "Chama Viva") return Flame;
  return Heart;
}

// ── Mission definitions ───────────────────────────────────────────────────────

const MISSIONS = [
  { id: "message", Icon: MessageCircle, doneColor: "text-sky-500"    },
  { id: "checkin", Icon: Zap,           doneColor: "text-rose-500"   },
  { id: "mood",    Icon: Smile,         doneColor: "text-pink-400"   },
  { id: "prayer",  Icon: BookHeart,     doneColor: "text-purple-500" },
] as const;

type MissionId = typeof MISSIONS[number]["id"];
type MissionStatus = Record<MissionId, boolean>;

// ── Couple status (compact, for card) ────────────────────────────────────────

function getCardStatus(bothActive: boolean, myCheckedIn: boolean, shieldUsedToday: boolean) {
  if (bothActive)       return { label: "Juntos hoje",        color: "text-rose-500", dot: "bg-rose-400" };
  if (shieldUsedToday)  return { label: "Chama protegida",    color: "text-sky-500",  dot: "bg-sky-400"  };
  if (myCheckedIn)      return { label: "A aguardar o par",   color: "text-[#aaa]",   dot: "bg-[#ccc]"   };
  return                { label: "Aguardando presença",       color: "text-[#bbb]",   dot: "bg-[#ddd]"   };
}

// ── Extra data hook ───────────────────────────────────────────────────────────

function useCardData() {
  const spaceId = useCoupleSpaceId();
  const [points, setPoints] = useState<number | null>(null);
  const [missions, setMissions] = useState<MissionStatus>({
    message: false, checkin: false, mood: false, prayer: false,
  });

  const fetchData = useCallback(async () => {
    if (!spaceId) return;
    const today = new Date().toISOString().slice(0, 10);

    (supabase.rpc("get_total_points" as any, { p_couple_space_id: spaceId }) as any)
      .then(({ data }: any) => {
        if (typeof data === "number") setPoints(data);
      });

    Promise.all([
      (supabase.from("daily_activity" as any)
        .select("type,user_id")
        .eq("couple_space_id", spaceId)
        .eq("activity_date", today) as any),
      (supabase.from("daily_spiritual_logs" as any)
        .select("prayed_today,user_id")
        .eq("couple_space_id", spaceId)
        .eq("day_key", today) as any),
    ]).then(([{ data: acts }, { data: logs }]) => {
      const activities: any[] = acts ?? [];
      const spiritual: any[]  = logs ?? [];

      const uniqueUsers = (actType: string) =>
        new Set(activities.filter(a => a.type === actType).map(a => a.user_id)).size;

      setMissions({
        message: uniqueUsers("message") >= 2,
        checkin: uniqueUsers("checkin") >= 2,
        mood:    uniqueUsers("mood")    >= 2,
        prayer:  spiritual.filter(l => l.prayed_today).length >= 2,
      });
    });
  }, [spaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener("streak-updated", handler);
    return () => window.removeEventListener("streak-updated", handler);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 3 * 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { points, missions };
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const { points, missions } = useCardData();
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();

  const celebratedRef     = useRef(false);
  const perfectDayRef     = useRef(false);
  const bothActiveToday   = streak?.bothActiveToday ?? false;

  const gesturesDone    = Object.values(missions).filter(Boolean).length;
  const allMissionsDone = gesturesDone === MISSIONS.length;
  const perfectDay      = bothActiveToday && allMissionsDone;

  // Haptic hierarchy:
  //   perfect day  → warm triple pulse  [20, 60, 20, 60, 20]
  //   both active  → soft single pulse  [10, 30, 10]
  useEffect(() => {
    if (bothActiveToday && !celebratedRef.current) {
      celebratedRef.current = true;
      try {
        navigator.vibrate?.(perfectDay ? [20, 60, 20, 60, 20] : [10, 30, 10]);
      } catch {}
    }
    if (!bothActiveToday) celebratedRef.current = false;
  }, [bothActiveToday, perfectDay]);

  // Record perfect day in DB (idempotent RPC — safe to call multiple times)
  useEffect(() => {
    if (perfectDay && spaceId && !perfectDayRef.current) {
      perfectDayRef.current = true;
      (supabase.rpc("record_perfect_day" as any, { p_couple_space_id: spaceId }) as any)
        .catch(() => {});
    }
    if (!perfectDay) perfectDayRef.current = false;
  }, [perfectDay, spaceId]);

  if (loading) {
    return (
      <div className="glass-card p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-[#f5f5f5] rounded-full" />
        <div className="h-10 w-16 bg-[#f5f5f5] rounded-lg" />
        <div className="h-3 w-32 bg-[#f5f5f5] rounded-full" />
      </div>
    );
  }

  const {
    currentStreak, longestStreak, shieldsRemaining,
    shieldUsedToday, myCheckedIn, activeCount, streakAtRisk,
  } = streak;

  const partnerCheckedIn = activeCount >= (myCheckedIn ? 2 : 1);
  const cardStatus = getCardStatus(bothActiveToday, myCheckedIn, shieldUsedToday);
  const relState   = getRelationshipState(currentStreak);

  const numberColor = bothActiveToday ? "text-rose-500" : "text-foreground";

  const daysLabel = bothActiveToday
    ? "dias a aparecer um pelo outro"
    : streakAtRisk ? "dias · a chama espera por vocês"
    : currentStreak === 0 ? "dias" : "dias juntos";

  const displayPoints = points ?? 0;
  const RelIcon = getRelationshipIcon(relState.name);

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => navigate("/lovestreak")}
        className={cn(
          "glass-card glass-card-hover w-full p-5 text-left active:scale-[0.98]",
          "transition-[background-color,box-shadow,border-color] duration-[400ms] ease-in-out",
          perfectDay
            ? "animate-warm-glow-border bg-rose-50/30 shadow-[0_4px_28px_rgba(244,63,94,0.07)]"
            : bothActiveToday
              ? "animate-warm-glow-border"
              : streakAtRisk
                ? "border-rose-100"
                : ""
        )}
      >
        {/* Row 1 — header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Flame
              className={cn(
                "w-4 h-4 transition-colors",
                bothActiveToday ? "text-rose-500 animate-flame-breathe" : "text-[#c4c4c4]"
              )}
              strokeWidth={1.5}
            />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
              A vossa Chama
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {perfectDay && (
              <span className="flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-400 text-[9px] font-semibold rounded-full px-2 py-0.5 animate-in fade-in duration-300">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} />
                Dia Completo
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-[#c4c4c4]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Row 2 — contextual emotional phrase */}
        <p className="text-[11px] text-[#aaa] mb-1.5 leading-snug">
          {getContextualPhrase(currentStreak, bothActiveToday, myCheckedIn, partnerCheckedIn, streakAtRisk, perfectDay)}
        </p>

        {/* Row 2.5 — couple status badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cardStatus.dot)} />
          <span className={cn("text-[10px] font-semibold", cardStatus.color)}>
            {cardStatus.label}
          </span>
        </div>

        {/* Row 3 — streak number + hearts & shields */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col items-start gap-0.5">
            <div className="relative flex items-baseline gap-1.5">
              {/* Ultra-subtle ambient glow — subconscious emotional warmth */}
              {bothActiveToday && (
                <div className="absolute -inset-4 bg-rose-400/[0.06] rounded-2xl blur-2xl pointer-events-none" />
              )}
              <span className={cn("text-5xl font-bold tabular-nums tracking-tight relative", numberColor)}>
                {currentStreak}
              </span>
            </div>
            <span className={cn(
              "text-[10px] leading-snug max-w-[130px]",
              bothActiveToday ? "text-rose-400 font-medium" : "text-[#aaa]"
            )}>
              {daysLabel}
            </span>
          </div>

          {/* Hearts + Shields */}
          <div className="flex flex-col items-end gap-2 pt-0.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Heart
                  className={cn(
                    "w-4 h-4 transition-all duration-500",
                    myCheckedIn
                      ? "fill-rose-500 text-rose-500 animate-heart-throb"
                      : "text-[#e0e0e0]"
                  )}
                  strokeWidth={myCheckedIn ? 0 : 1.5}
                />
                <span className="text-[9px] text-[#bbb] font-semibold">Tu</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart
                  className={cn(
                    "w-4 h-4 transition-all duration-500",
                    partnerCheckedIn
                      ? "fill-rose-500 text-rose-500 animate-heart-throb"
                      : "text-[#e0e0e0]"
                  )}
                  strokeWidth={partnerCheckedIn ? 0 : 1.5}
                />
                <span className="text-[9px] text-[#bbb] font-semibold">Par</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map(i => (
                <Shield
                  key={i}
                  className={cn("w-3.5 h-3.5",
                    i < shieldsRemaining ? "text-blue-400" : "text-[#e0e0e0]")}
                  strokeWidth={1.5}
                />
              ))}
              <span className="text-[9px] text-[#bbb] font-semibold uppercase tracking-wide ml-1">
                Proteção
              </span>
            </div>
          </div>
        </div>

        {/* Row 4 — footer: relationship state + pts · gestos | mission icons */}
        <div className={cn(
          "flex items-center justify-between pt-2.5 border-t transition-colors duration-300",
          allMissionsDone ? "border-rose-100" : "border-[#f0f0f0]"
        )}>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <RelIcon
                className={cn("w-3 h-3 shrink-0", relState.color,
                  allMissionsDone && "animate-flame-breathe")}
                strokeWidth={1.5}
              />
              <span className={cn("text-[11px] font-semibold", relState.color)}>
                {relState.name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className={cn(
                "font-semibold tabular-nums",
                displayPoints > 0 ? "text-rose-400" : "text-[#ccc]"
              )}>
                {displayPoints}
              </span>
              <span className="text-[#ccc]">pts</span>
              <span className="text-[#ddd]">·</span>
              <span className={cn(
                "font-semibold tabular-nums",
                gesturesDone > 0 ? "text-sky-400" : "text-[#ccc]"
              )}>
                {gesturesDone}
              </span>
              <span className="text-[#ccc]">gestos</span>
            </div>
          </div>

          {/* Mission icons + all-done celebration */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              {MISSIONS.map(({ id, Icon, doneColor }) => (
                <Icon
                  key={id}
                  className={cn("w-3.5 h-3.5 transition-colors",
                    missions[id] ? doneColor : "text-[#e0e0e0]")}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            {allMissionsDone && (
              <span className="text-[9px] font-semibold text-rose-400 tracking-wide">
                Missão cumprida
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Subtle home micro-feedback — only visible on perfect day */}
      {perfectDay && (
        <p className="text-center text-[10px] text-[#bbb] font-medium px-2 animate-in fade-in duration-500">
          Hoje o vosso espaço esteve completo.
        </p>
      )}
    </div>
  );
}

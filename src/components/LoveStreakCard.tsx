import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import {
  Flame, Shield, ChevronRight, Heart,
  MessageCircle, Zap, Smile, BookHeart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

// ── Phrases ──────────────────────────────────────────────────────────────────

const PHRASES = [
  { min: 0,  max: 0,        msg: "O amor de vocês começa aqui 🌱" },
  { min: 1,  max: 2,        msg: "Uma faísca que vai virar chama 🔥" },
  { min: 3,  max: 6,        msg: "A vossa chama está a crescer 🌿" },
  { min: 7,  max: 13,       msg: "Sete dias a aparecer um pelo outro 💛" },
  { min: 14, max: 29,       msg: "Em sintonia, em amor ✨" },
  { min: 30, max: 89,       msg: "Um mês a mostrar-se um ao outro. Extraordinários 🌟" },
  { min: 90, max: Infinity, msg: "O vosso amor tornou-se uma força viva 🏆" },
];

function getPhrase(s: number) {
  return PHRASES.find(p => s >= p.min && s <= p.max)?.msg ?? "";
}

// Emotional relationship state — the identity of the couple's journey
function getRelationshipState(s: number): { name: string; emoji: string; color: string } {
  if (s >= 90) return { name: "Almas Gémeas",  emoji: "💫", color: "text-violet-500" };
  if (s >= 30) return { name: "Inseparáveis",  emoji: "🫂", color: "text-rose-500"   };
  if (s >= 7)  return { name: "Chama Viva",    emoji: "🔥", color: "text-orange-500" };
  if (s >= 1)  return { name: "Em Conexão",    emoji: "✨", color: "text-amber-500"  };
  return             { name: "Semente",        emoji: "🌱", color: "text-emerald-500" };
}

// ── Mission definitions ───────────────────────────────────────────────────────

const MISSIONS = [
  { id: "message", Icon: MessageCircle, doneColor: "text-sky-500"    },
  { id: "checkin", Icon: Zap,           doneColor: "text-rose-500"   },
  { id: "mood",    Icon: Smile,         doneColor: "text-amber-500"  },
  { id: "prayer",  Icon: BookHeart,     doneColor: "text-purple-500" },
] as const;

type MissionId = typeof MISSIONS[number]["id"];
type MissionStatus = Record<MissionId, boolean>;

// ── Couple status (compact, for card) ────────────────────────────────────────

function getCardStatus(bothActive: boolean, myCheckedIn: boolean, shieldUsedToday: boolean) {
  if (bothActive)       return { label: "Ligados",           color: "text-rose-500",  dot: "bg-rose-400"  };
  if (shieldUsedToday)  return { label: "Chama protegida",   color: "text-blue-500",  dot: "bg-blue-400"  };
  if (myCheckedIn)      return { label: "A aguardar o par",  color: "text-amber-500", dot: "bg-amber-400" };
  return                { label: "Aguardando conexão",       color: "text-[#bbb]",    dot: "bg-[#ddd]"    };
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
    // UTC date to match server CURRENT_DATE (avoids timezone mismatch)
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

  // Refresh when streak updates (partner check-in, own check-in, etc.)
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener("streak-updated", handler);
    return () => window.removeEventListener("streak-updated", handler);
  }, [fetchData]);

  // Polling every 3 minutes to catch partner activity
  useEffect(() => {
    const interval = setInterval(fetchData, 3 * 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { points, missions };
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const { points, missions }  = useCardData();
  const navigate = useNavigate();

  // ALL hooks must be called before any conditional return
  const celebratedRef = useRef(false);
  const bothActiveToday = streak?.bothActiveToday ?? false;

  useEffect(() => {
    if (bothActiveToday && !celebratedRef.current) {
      celebratedRef.current = true;
      try { navigator.vibrate?.([15, 50, 20]); } catch {}
    }
    if (!bothActiveToday) celebratedRef.current = false;
  }, [bothActiveToday]);

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

  // "Par" heart: partner checked in if there's activity from someone other than me
  const partnerCheckedIn = activeCount >= (myCheckedIn ? 2 : 1);
  const cardStatus = getCardStatus(bothActiveToday, myCheckedIn, shieldUsedToday);
  const relState = getRelationshipState(currentStreak);

  const numberColor = bothActiveToday
    ? "text-rose-500"
    : streakAtRisk ? "text-amber-500"
    : shieldUsedToday ? "text-blue-500" : "text-foreground";

  const daysLabel = bothActiveToday
    ? "dias a aparecer um pelo outro"
    : streakAtRisk
    ? "dias · a chama espera por vocês"
    : currentStreak === 0 ? "dias" : "dias juntos";

  const displayPoints = points ?? 0;

  return (
    <button
      onClick={() => navigate("/lovestreak")}
      className={cn(
        "glass-card glass-card-hover w-full p-5 text-left active:scale-[0.98] transition-all",
        bothActiveToday && "animate-warm-glow-border",
        !bothActiveToday && streakAtRisk && "border-amber-200/60"
      )}
    >
      {/* Row 1 — header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Flame
            className={cn(
              "w-4 h-4 transition-colors",
              bothActiveToday ? "text-rose-500 animate-flame-breathe" : "text-orange-400"
            )}
            strokeWidth={1.5}
          />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
            A vossa Chama
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-[#c4c4c4]" strokeWidth={1.5} />
      </div>

      {/* Row 2 — phrase */}
      <p className="text-[11px] text-[#aaa] mb-1.5 leading-snug">
        {getPhrase(currentStreak)}
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
        {/* Big number */}
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-5xl font-bold tabular-nums tracking-tight", numberColor)}>
              {currentStreak}
            </span>
          </div>
          <span className={cn(
            "text-[10px] font-semibold leading-snug max-w-[130px]",
            bothActiveToday ? "text-rose-400" : streakAtRisk ? "text-amber-500" : "text-[#aaa]"
          )}>
            {daysLabel}
          </span>
        </div>

        {/* Hearts + Shields */}
        <div className="flex flex-col items-end gap-2 pt-0.5">
          {/* Hearts — filled when checked in */}
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

          {/* Shields — filled when remaining */}
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

      {/* Row 4 — footer: relationship state/record/pts + missions */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#f0f0f0]">
        <div className="flex items-center gap-1 text-[11px] text-[#717171]">
          <span className={cn("font-semibold", relState.color)}>{relState.emoji} {relState.name}</span>
          <span className="text-[#d8d8d8]">·</span>
          <span>Rec: <span className="font-semibold text-foreground">{longestStreak}d</span></span>
          <span className="text-[#d8d8d8]">·</span>
          <span className="font-semibold text-amber-500">{displayPoints}pts</span>
        </div>

        {/* Missions — 4 icons, fill when done */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#bbb] font-semibold uppercase tracking-wide mr-0.5">
            Gestos
          </span>
          {MISSIONS.map(({ id, Icon, doneColor }) => (
            <Icon
              key={id}
              className={cn("w-3.5 h-3.5 transition-colors",
                missions[id] ? doneColor : "text-[#e0e0e0]")}
              strokeWidth={1.5}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

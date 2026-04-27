import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Trophy, Flame, Coins, BadgeCheck,
  Loader2, ChevronRight, Crown, Medal,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RankEntry {
  rank: number;
  couple_space_id: string;
  house_name: string;
  house_image: string | null;
  is_verified: boolean;
  current_streak: number;
  total_points: number;
}
type RankType = "streak" | "points";

// ─── Medal config (Lucide icons only, no emojis) ─────────────────────────────

const MEDALS = [
  {
    icon: Crown,
    iconColor: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200/60",
    glow: "shadow-amber-100",
    badgeBg: "bg-amber-500",
    ring: "ring-amber-400/30",
  },
  {
    icon: Medal,
    iconColor: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200/60",
    glow: "",
    badgeBg: "bg-slate-400",
    ring: "",
  },
  {
    icon: Medal,
    iconColor: "text-orange-400",
    bg: "bg-orange-50/60",
    border: "border-orange-200/60",
    glow: "",
    badgeBg: "bg-orange-400",
    ring: "",
  },
] as const;

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  name, image, size = "md", isMe = false, color = "bg-rose-400",
}: {
  name: string; image: string | null;
  size?: "sm" | "md" | "lg"; isMe?: boolean; color?: string;
}) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "??";
  const sizeClass = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" }[size];

  return (
    <div className={cn(
      "relative shrink-0 rounded-2xl overflow-hidden",
      sizeClass,
      isMe && "ring-2 ring-rose-400/50 ring-offset-1",
    )}>
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={cn("w-full h-full flex items-center justify-center font-black text-white", color)}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── "You" pill ──────────────────────────────────────────────────────────────

function YouPill() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-rose-400 text-white">
      Tu
    </span>
  );
}

// ─── Rank badge (number) ─────────────────────────────────────────────────────

function RankBadge({ rank, bg = "bg-slate-100" }: { rank: number; bg?: string }) {
  return (
    <span className={cn(
      "h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black text-foreground/60 shrink-0",
      bg,
    )}>
      {rank}
    </span>
  );
}

// ─── Podium row (top 3) ───────────────────────────────────────────────────────

function PodiumRow({
  entry, rankType, isMe, index,
}: {
  entry: RankEntry; rankType: RankType; isMe: boolean; index: number;
}) {
  const cfg = MEDALS[index];
  const Icon = cfg.icon;
  const value = rankType === "streak" ? entry.current_streak : entry.total_points;
  const avatarColors = ["bg-amber-400", "bg-slate-400", "bg-orange-400"];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200",
        cfg.bg, cfg.border,
        cfg.glow && `shadow-md ${cfg.glow}`,
        isMe && "ring-2 ring-rose-400/25",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Medal icon */}
      <div className="w-7 h-7 flex items-center justify-center shrink-0">
        <Icon className={cn("w-5 h-5", cfg.iconColor)} strokeWidth={1.5} />
      </div>

      {/* Avatar */}
      <Avatar
        name={entry.house_name}
        image={entry.house_image}
        size="md"
        isMe={isMe}
        color={avatarColors[index]}
      />

      {/* Name + badge */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm text-foreground truncate max-w-[110px]">
            {entry.house_name}
          </span>
          {entry.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={2} />}
          {isMe && <YouPill />}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground/40">
          {rankType === "streak"
            ? <><Flame className="w-3 h-3 text-orange-400" strokeWidth={1.5} /> {value} dias</>
            : <><Coins className="w-3 h-3 text-amber-400" strokeWidth={1.5} /> {value} pts</>
          }
        </div>
      </div>

      {/* Rank number */}
      <span className={cn("text-xl font-black tabular-nums shrink-0", cfg.iconColor)}>
        #{index + 1}
      </span>
    </div>
  );
}

// ─── List row (4+) ────────────────────────────────────────────────────────────

function ListRow({
  entry, rankType, isMe,
}: {
  entry: RankEntry; rankType: RankType; isMe: boolean;
}) {
  const value = rankType === "streak" ? entry.current_streak : entry.total_points;

  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-3 rounded-2xl transition-all duration-200",
      isMe
        ? "bg-rose-50/80 border border-rose-200/40"
        : "border-b border-slate-100 last:border-0",
    )}>
      <RankBadge rank={entry.rank} bg={isMe ? "bg-rose-100" : "bg-slate-100"} />
      <Avatar name={entry.house_name} image={entry.house_image} size="sm" isMe={isMe} />

      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm font-semibold text-foreground/80 truncate">{entry.house_name}</span>
        {entry.is_verified && <BadgeCheck className="w-3 h-3 text-rose-400 shrink-0" strokeWidth={2} />}
        {isMe && <YouPill />}
      </div>

      <div className={cn(
        "flex items-center gap-1 text-sm font-bold tabular-nums shrink-0",
        isMe ? "text-rose-400" : "text-foreground/50"
      )}>
        {rankType === "streak"
          ? <><Flame className="w-3.5 h-3.5 text-orange-400" strokeWidth={1.5} /> {value}</>
          : <>{value} <Coins className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} /></>
        }
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center">
        <Trophy className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground/60">Ainda sem casais no ranking</p>
        <p className="text-xs text-foreground/30">Façam check-in e sejam os primeiros</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RankingCardProps {
  compact?: boolean;
  initialRankType?: RankType;
  hideToggle?: boolean;
  myCoupleId?: string;
  refreshTrigger?: number;
}

export function RankingCard({
  compact = false,
  initialRankType = "streak",
  hideToggle = false,
  myCoupleId,
  refreshTrigger,
}: RankingCardProps) {
  const navigate = useNavigate();
  const [rankType, setRankType] = useState<RankType>(initialRankType);
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async (type: RankType) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("fn_get_global_ranking", { p_rank_type: type });
      if (error) { console.error("[RankingCard]", error.message); return; }
      if (!data) return;
      setEntries((data as any[]).map(d => ({
        rank:            d.rank ?? 0,
        couple_space_id: d.couple_space_id ?? "",
        house_name:      d.house_name ?? "Casal",
        house_image:     d.house_image ?? null,
        is_verified:     d.is_verified ?? false,
        current_streak:  d.current_streak ?? 0,
        total_points:    d.total_points ?? 0,
      })));
    } catch (err) {
      console.error("[RankingCard]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent).detail?.ranking;
      if (!payload) return;
      const list = rankType === "streak" ? payload.streak : payload.points;
      if (list?.length) setEntries(list);
    };
    window.addEventListener("streak-updated", handler);
    return () => window.removeEventListener("streak-updated", handler);
  }, [rankType]);

  useEffect(() => { fetchRanking(rankType); }, [rankType, fetchRanking, refreshTrigger]);

  const top3 = entries.filter(e => e.rank <= 3);
  const rest = compact ? [] : entries.filter(e => e.rank > 3);
  const myEntry = myCoupleId ? entries.find(e => e.couple_space_id === myCoupleId) : null;
  const myInTop3 = myEntry ? myEntry.rank <= 3 : false;

  return (
    <GlassCard padding="none" elevated className="overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/40">
            Ranking Global
          </span>
        </div>

        {!hideToggle && (
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {(["streak", "points"] as RankType[]).map(type => (
              <button
                key={type}
                onClick={() => setRankType(type)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                  rankType === type
                    ? "bg-white text-foreground/80 shadow-sm"
                    : "text-foreground/30 hover:text-foreground/60"
                )}
              >
                {type === "streak"
                  ? <Flame className="w-3 h-3 text-orange-400" strokeWidth={1.5} />
                  : <Coins className="w-3 h-3 text-amber-400" strokeWidth={1.5} />
                }
                {type === "streak" ? "Streak" : "Pontos"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-5 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-rose-300 animate-spin" />
            <p className="text-xs text-foreground/30 font-medium">A carregar...</p>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Top 3 */}
            <div className="space-y-2">
              {top3.map((entry, idx) => (
                <PodiumRow
                  key={entry.couple_space_id}
                  entry={entry}
                  rankType={rankType}
                  isMe={entry.couple_space_id === myCoupleId}
                  index={idx}
                />
              ))}
            </div>

            {/* 4+ */}
            {rest.length > 0 && (
              <div className="mt-2 rounded-2xl bg-slate-50/60 border border-slate-100 px-3 py-1.5">
                {rest.map(entry => (
                  <ListRow
                    key={entry.couple_space_id}
                    entry={entry}
                    rankType={rankType}
                    isMe={entry.couple_space_id === myCoupleId}
                  />
                ))}
              </div>
            )}

            {/* My position (if outside top 3 in compact mode) */}
            {myEntry && !myInTop3 && compact && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[9px] uppercase tracking-widest text-foreground/30 font-bold px-1 mb-1.5">
                  A tua posição
                </p>
                <ListRow entry={myEntry} rankType={rankType} isMe />
              </div>
            )}

            {/* See full ranking */}
            {compact && entries.length > 3 && (
              <button
                onClick={() => navigate("/ranking")}
                className="w-full flex items-center justify-center gap-1.5 pt-3 text-[11px] font-semibold text-foreground/30 hover:text-rose-400 transition-colors"
              >
                Ver ranking completo
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}

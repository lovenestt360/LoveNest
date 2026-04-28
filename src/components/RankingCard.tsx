import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Trophy, Flame, Coins, BadgeCheck, Loader2, ChevronRight, Crown, Medal } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Medal badge on avatar corner (only top 3) ───────────────────────────────

const MEDAL_CFG = [
  { bg: "bg-amber-400",  icon: Crown,  color: "text-amber-500" },
  { bg: "bg-slate-400",  icon: Medal,  color: "text-slate-400" },
  { bg: "bg-orange-400", icon: Medal,  color: "text-orange-400" },
] as const;

const RANK_COLOR: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-orange-400",
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name, image, size = "md", isMe = false,
}: {
  name: string; image: string | null;
  size?: "sm" | "md"; isMe?: boolean;
}) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "??";
  const sz = size === "md" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-semibold bg-[#f5f5f5] text-foreground",
      sz,
      isMe && "ring-2 ring-rose-400/50 ring-offset-1"
    )}>
      {image
        ? <img src={image} alt={name} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
    </div>
  );
}

// ─── "Tu" pill ────────────────────────────────────────────────────────────────

function YouPill() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-widest bg-rose-400 text-white">
      Tu
    </span>
  );
}

// ─── Universal row (same for rank 1 and rank 99) ─────────────────────────────

function RankRow({
  entry, rankType, isMe,
}: {
  entry: RankEntry; rankType: RankType; isMe: boolean;
}) {
  const rank  = entry.rank;
  const medal = rank >= 1 && rank <= 3 ? MEDAL_CFG[rank - 1] : null;
  const MedalIcon = medal?.icon;
  const value = rankType === "streak" ? entry.current_streak : entry.total_points;
  const rankColor = RANK_COLOR[rank] ?? "text-[#717171]";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-150",
      isMe
        ? "border-rose-200/60 bg-rose-50/30"
        : "border-[#e5e5e5] bg-white",
    )}>

      {/* Avatar + optional medal badge */}
      <div className="relative shrink-0">
        <Avatar name={entry.house_name} image={entry.house_image} isMe={isMe} />
        {medal && MedalIcon && (
          <div className={cn(
            "absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm",
            medal.bg
          )}>
            <MedalIcon className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Name + value */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate max-w-[130px]">
            {entry.house_name}
          </span>
          {entry.is_verified && (
            <BadgeCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={2} />
          )}
          {isMe && <YouPill />}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#717171]">
          {rankType === "streak"
            ? <><Flame className="w-3 h-3 text-orange-400" strokeWidth={1.5} /> {value} dias</>
            : <><Coins className="w-3 h-3 text-amber-400" strokeWidth={1.5} /> {value} pts</>
          }
        </div>
      </div>

      {/* Rank number — right side for all */}
      <span className={cn("text-base font-bold tabular-nums shrink-0", rankColor)}>
        #{rank}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-14 h-14 rounded-3xl bg-[#f5f5f5] flex items-center justify-center">
        <Trophy className="w-6 h-6 text-[#c4c4c4]" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/60">Ainda sem casais no ranking</p>
        <p className="text-[11px] text-[#717171] mt-0.5">Façam check-in e sejam os primeiros</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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
  const navigate  = useNavigate();
  const [rankType, setRankType] = useState<RankType>(initialRankType);
  const [entries,  setEntries]  = useState<RankEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchRanking = useCallback(async (type: RankType) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("fn_get_global_ranking", { p_rank_type: type });
      if (error || !data) return;
      setEntries((data as any[]).map(d => ({
        rank:            d.rank ?? 0,
        couple_space_id: d.couple_space_id ?? "",
        house_name:      d.house_name ?? "Casal",
        house_image:     d.house_image ?? null,
        is_verified:     d.is_verified ?? false,
        current_streak:  d.current_streak ?? 0,
        total_points:    d.total_points ?? 0,
      })));
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

  const visible  = compact ? entries.slice(0, 3) : entries;
  const myEntry  = myCoupleId ? entries.find(e => e.couple_space_id === myCoupleId) : null;
  const myInList = myEntry ? visible.some(e => e.couple_space_id === myCoupleId) : true;

  return (
    <GlassCard padding="none" elevated className="overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-[#f5f5f5] flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
            Ranking Global
          </span>
        </div>

        {!hideToggle && (
          <div className="flex items-center bg-[#f5f5f5] rounded-xl p-0.5 gap-0.5">
            {(["streak", "points"] as RankType[]).map(type => (
              <button
                key={type}
                onClick={() => setRankType(type)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-150",
                  rankType === type
                    ? "bg-white text-foreground shadow-sm"
                    : "text-[#717171] hover:text-foreground"
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
          <div className="flex flex-col items-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-rose-300 animate-spin" />
            <p className="text-[11px] text-[#717171]">A carregar...</p>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {visible.map(entry => (
              <RankRow
                key={entry.couple_space_id}
                entry={entry}
                rankType={rankType}
                isMe={entry.couple_space_id === myCoupleId}
              />
            ))}

            {/* Minha posição se não estiver na lista */}
            {myEntry && !myInList && (
              <div className="pt-2 border-t border-[#f0f0f0]">
                <p className="text-[9px] uppercase tracking-widest text-[#717171] font-medium mb-1.5 px-1">
                  A tua posição
                </p>
                <RankRow entry={myEntry} rankType={rankType} isMe />
              </div>
            )}

            {compact && entries.length > 3 && (
              <button
                onClick={() => navigate("/ranking")}
                className="w-full flex items-center justify-center gap-1.5 pt-3 text-[11px] font-medium text-[#717171] hover:text-rose-500 transition-colors"
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

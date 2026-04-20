import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Trophy, Flame, Coins, BadgeCheck, Loader2, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Medal configs
// ─────────────────────────────────────────────

const PODIUM = [
  {
    emoji: "🥇",
    rankText: "#1",
    rankColor: "text-amber-500",
    bg: "from-amber-400/18 via-yellow-300/8 to-transparent",
    border: "border-amber-400/40",
    glow: "shadow-amber-300/20 shadow-lg",
    avatarBg: "from-amber-400 to-yellow-500",
    badgeColor: "bg-amber-500",
  },
  {
    emoji: "🥈",
    rankText: "#2",
    rankColor: "text-slate-400",
    bg: "from-slate-300/15 via-slate-200/6 to-transparent",
    border: "border-slate-300/35",
    glow: "",
    avatarBg: "from-slate-400 to-slate-500",
    badgeColor: "bg-slate-400",
  },
  {
    emoji: "🥉",
    rankText: "#3",
    rankColor: "text-orange-400",
    bg: "from-orange-300/15 via-amber-200/6 to-transparent",
    border: "border-orange-300/35",
    glow: "",
    avatarBg: "from-orange-400 to-amber-500",
    badgeColor: "bg-orange-400",
  },
];

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────

function Avatar({
  name,
  image,
  size = "md",
  isMe = false,
  gradientFrom = "from-primary",
  gradientTo = "to-rose-400",
}: {
  name: string;
  image: string | null;
  size?: "sm" | "md" | "lg";
  isMe?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??";

  const sizeClass = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" }[size];

  return (
    <div className={cn("relative shrink-0 rounded-2xl overflow-hidden", sizeClass, isMe && "ring-2 ring-primary/60")}>
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={cn("w-full h-full flex items-center justify-center font-black bg-gradient-to-br text-white", gradientFrom, gradientTo)}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tu Badge
// ─────────────────────────────────────────────

function TuBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-primary text-white shadow-sm shadow-primary/30">
      TU
    </span>
  );
}

// ─────────────────────────────────────────────
// Podium Card (Top 3)
// ─────────────────────────────────────────────

function PodiumCard({
  entry,
  rankType,
  isMe,
  index,
}: {
  entry: RankEntry;
  rankType: RankType;
  isMe: boolean;
  index: number;
}) {
  const cfg = PODIUM[index];
  const value = rankType === "streak" ? entry.current_streak : entry.total_points;
  const suffix = rankType === "streak" ? "dias 🔥" : "pts";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3.5 rounded-[20px] border bg-gradient-to-br transition-all duration-300",
        cfg.bg,
        cfg.border,
        cfg.glow,
        isMe && "ring-2 ring-primary/50 border-primary/50",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Medal */}
      <span className="text-2xl shrink-0 leading-none">{cfg.emoji}</span>

      {/* Avatar */}
      <Avatar
        name={entry.house_name}
        image={entry.house_image}
        size="md"
        isMe={isMe}
        gradientFrom={cfg.avatarBg.split(" ")[0]}
        gradientTo={cfg.avatarBg.split(" ")[1]}
      />

      {/* Name + Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-black text-sm text-foreground truncate max-w-[120px]">{entry.house_name}</span>
          {entry.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
          {isMe && <TuBadge />}
        </div>
        <p className={cn("text-[11px] font-bold", cfg.rankColor)}>
          {value} {suffix}
        </p>
      </div>

      {/* Rank */}
      <span className={cn("text-2xl font-black tabular-nums shrink-0", cfg.rankColor)}>
        {cfg.rankText}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// List Row (4+)
// ─────────────────────────────────────────────

function ListRow({
  entry,
  rankType,
  isMe,
  index,
}: {
  entry: RankEntry;
  rankType: RankType;
  isMe: boolean;
  index: number;
}) {
  const value = rankType === "streak" ? entry.current_streak : entry.total_points;
  const suffix = rankType === "streak" ? "🔥" : "pts";

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 px-3 rounded-2xl transition-all duration-200",
        isMe
          ? "bg-primary/8 border border-primary/25 shadow-sm shadow-primary/10 scale-[1.01]"
          : "border-b border-border/20 last:border-0 hover:bg-muted/30",
        "animate-in fade-in slide-in-from-bottom-1 duration-300",
      )}
      style={{ animationDelay: `${(index + 3) * 50}ms` }}
    >
      {/* Rank number */}
      <span className="text-[11px] font-black text-muted-foreground/40 w-6 text-right shrink-0">
        #{entry.rank}
      </span>

      {/* Avatar */}
      <Avatar name={entry.house_name} image={entry.house_image} size="sm" isMe={isMe} />

      {/* Name */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm font-bold text-foreground/80 truncate">{entry.house_name}</span>
        {entry.is_verified && <BadgeCheck className="w-3 h-3 text-primary shrink-0" />}
        {isMe && <TuBadge />}
      </div>

      {/* Value */}
      <span className="text-sm font-black tabular-nums text-primary/80 shrink-0">
        {value} {suffix}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

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
      const { data, error } = await supabase.rpc("get_ranking", { p_type: type });
      if (error) { console.error("[RankingCard]", error.message); return; }
      if (!data) return;

      const mapped = (data as any[]).map((d) => ({
        rank:            d.rank ?? d.rank_position ?? 0,
        couple_space_id: d.couple_space_id ?? d.couple_id ?? "",
        house_name:      d.house_name ?? "Casal Mistério",
        house_image:     d.house_image ?? null,
        is_verified:     d.is_verified ?? false,
        current_streak:  d.current_streak ?? 0,
        total_points:    d.total_points ?? 0,
      }));
      setEntries(mapped as RankEntry[]);
    } catch (err) {
      console.error("[RankingCard]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Injeção CQRS via CustomEvent (sem fetch extra após check-in) ──────
  const applySnapshotEntries = useCallback((raw: any[]) => {
    if (!raw?.length) return;
    const mapped = raw.map((d: any) => ({
      rank:            d.rank ?? 0,
      couple_space_id: d.couple_space_id ?? "",
      house_name:      d.house_name ?? "Casal Mistério",
      house_image:     d.house_image ?? null,
      is_verified:     d.is_verified ?? false,
      current_streak:  d.current_streak ?? 0,
      total_points:    d.total_points ?? 0,
    }));
    setEntries(mapped as RankEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent).detail?.ranking;
      if (!payload) return;
      const list = rankType === "streak" ? payload.streak : payload.points;
      applySnapshotEntries(list);
    };
    window.addEventListener("streak-updated", handler);
    return () => window.removeEventListener("streak-updated", handler);
  }, [rankType, applySnapshotEntries]);

  useEffect(() => {
    fetchRanking(rankType);
  }, [rankType, fetchRanking, refreshTrigger]);

  const top3 = entries.filter((e) => e.rank <= 3);
  const rest = compact ? [] : entries.filter((e) => e.rank > 3);
  const myEntry = myCoupleId ? entries.find((e) => e.couple_space_id === myCoupleId) : null;
  const myInTop3 = myEntry ? myEntry.rank <= 3 : false;

  return (
    <div className="rounded-[28px] overflow-hidden bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm shadow-black/5">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            Ranking Global
          </span>
        </div>

        {!hideToggle && (
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-0.5 gap-0.5">
            {(["streak", "points"] as RankType[]).map((type) => (
              <button
                key={type}
                onClick={() => setRankType(type)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                  rankType === type
                    ? "bg-white dark:bg-white/15 text-primary shadow-sm"
                    : "text-muted-foreground/50 hover:text-foreground"
                )}
              >
                {type === "streak" ? <Flame className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
                {type === "streak" ? "Streak" : "Pontos"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="px-4 pb-5 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground/40 font-medium">A carregar ranking...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-3xl">🏆</p>
            <p className="text-sm font-bold text-muted-foreground/60">Ainda sem casais no ranking.</p>
            <p className="text-xs text-muted-foreground/40">Façam check-in e sejam os primeiros!</p>
          </div>
        ) : (
          <>
            {/* Top 3 — Podium cards */}
            <div className="space-y-2">
              {top3.map((entry, idx) => (
                <PodiumCard
                  key={entry.couple_space_id}
                  entry={entry}
                  rankType={rankType}
                  isMe={entry.couple_space_id === myCoupleId}
                  index={idx}
                />
              ))}
            </div>

            {/* Rest (4+) — List rows */}
            {rest.length > 0 && (
              <div className="mt-1 rounded-[18px] bg-black/[0.02] dark:bg-white/3 border border-border/15 px-3 py-1.5">
                {rest.map((entry, idx) => (
                  <ListRow
                    key={entry.couple_space_id}
                    entry={entry}
                    rankType={rankType}
                    isMe={entry.couple_space_id === myCoupleId}
                    index={idx}
                  />
                ))}
              </div>
            )}

            {/* Minha posição extra — se estiver fora do top 3 e não esteja na lista visível */}
            {myEntry && !myInTop3 && compact && (
              <div className="mt-2 pt-2 border-t border-border/20">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-bold px-1 mb-1.5">
                  A tua posição
                </p>
                <ListRow entry={myEntry} rankType={rankType} isMe={true} index={0} />
              </div>
            )}

            {/* Ver mais */}
            {compact && entries.length > 3 && (
              <button
                onClick={() => navigate("/ranking")}
                className="w-full flex items-center justify-center gap-1.5 pt-3 text-[11px] font-black uppercase tracking-widest text-primary/50 hover:text-primary transition-colors"
              >
                Ver ranking completo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

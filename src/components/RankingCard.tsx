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
  longest_streak: number;
  total_points: number;
}

type RankType = "streak" | "points";

// ─────────────────────────────────────────────
// Medal colors for top 3
// ─────────────────────────────────────────────

const MEDALS = [
  { bg: "from-amber-400/20 to-amber-300/10",  border: "border-amber-400/40",  text: "text-amber-500",   label: "🥇" },
  { bg: "from-slate-300/20 to-slate-200/10",  border: "border-slate-300/40",  text: "text-slate-400",   label: "🥈" },
  { bg: "from-orange-400/20 to-orange-300/5", border: "border-orange-400/30", text: "text-orange-500",  label: "🥉" },
];

// ─────────────────────────────────────────────
// Initials avatar (fallback when no house_image)
// ─────────────────────────────────────────────

function HouseAvatar({ name, image, size = "sm" }: { name: string; image: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??";

  const cls = size === "lg" ? "h-12 w-12 text-base" : size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn("rounded-2xl object-cover shrink-0", cls)}
      />
    );
  }
  return (
    <div className={cn("rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary shrink-0", cls)}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// Podium row (top 3) — destaque especial
// ─────────────────────────────────────────────

function PodiumRow({ entry, rankType }: { entry: RankEntry; rankType: RankType }) {
  const medal = MEDALS[(entry.rank - 1) as 0 | 1 | 2];
  const value  = rankType === "points" ? entry.total_points : entry.current_streak;
  const suffix = rankType === "points" ? "pts" : "dias 🔥";

  return (
    <div className={cn(
      "glass-card rounded-3xl p-4 flex items-center gap-3 border bg-gradient-to-br shadow-sm transition-all duration-200",
      medal.bg, medal.border
    )}>
      {/* Medal */}
      <span className="text-2xl w-8 text-center shrink-0">{medal.label}</span>

      {/* Avatar */}
      <HouseAvatar name={entry.house_name} image={entry.house_image} size="md" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm tracking-tight truncate text-foreground">
            {entry.house_name}
          </span>
          {entry.is_verified && (
            <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
        </div>
        <span className={cn("text-[11px] font-bold", medal.text)}>
          {value} {suffix}
        </span>
      </div>

      {/* Rank number */}
      <span className={cn("text-2xl font-black tabular-nums tracking-tighter", medal.text)}>
        #{entry.rank}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Simple list row (rank 4+)
// ─────────────────────────────────────────────

function ListRow({ entry, rankType }: { entry: RankEntry; rankType: RankType }) {
  const value  = rankType === "points" ? entry.total_points : entry.current_streak;
  const suffix = rankType === "points" ? "pts" : "🔥";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-black text-muted-foreground/50 w-6 text-right shrink-0">
        #{entry.rank}
      </span>

      <HouseAvatar name={entry.house_name} image={entry.house_image} size="sm" />

      <span className="flex-1 text-sm font-bold truncate text-foreground/80 flex items-center gap-1.5">
        {entry.house_name}
        {entry.is_verified && <BadgeCheck className="w-3 h-3 text-primary shrink-0" />}
      </span>

      <span className="text-sm font-black tabular-nums text-primary shrink-0">
        {value} {suffix}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

interface RankingCardProps {
  /** Se true, mostra versão compacta (apenas top 3 + link "ver mais") para o Home */
  compact?: boolean;
}

export function RankingCard({ compact = false }: RankingCardProps) {
  const navigate = useNavigate();
  const [rankType, setRankType] = useState<RankType>("streak");
  const [entries, setEntries]   = useState<RankEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchRanking = useCallback(async (type: RankType) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("fn_get_global_ranking", {
        p_rank_type: type,
      });
      if (error) {
        console.error("[RankingCard] Erro RPC:", error.message);
        return;
      }
      setEntries((data as RankEntry[]) || []);
    } catch (err) {
      console.error("[RankingCard] Excepção:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking(rankType);
  }, [rankType, fetchRanking]);

  const top3 = entries.slice(0, 3);
  const rest  = compact ? [] : entries.slice(3);

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden shadow-sm border-primary/10">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/70">
            Ranking Global
          </span>
        </div>

        {/* Toggle streak / pontos */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-0.5">
          <button
            onClick={() => setRankType("streak")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              rankType === "streak"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
          >
            <Flame className="w-3 h-3" /> Streak
          </button>
          <button
            onClick={() => setRankType("points")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              rankType === "points"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
          >
            <Coins className="w-3 h-3" /> Pontos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-5">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-2xl">🏆</p>
            <p className="text-sm font-bold text-muted-foreground/60">
              Ainda sem casais no ranking.
            </p>
            <p className="text-xs text-muted-foreground/40">Façam check-in e sejam os primeiros!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 — pódio com destaque */}
            {top3.map((entry) => (
              <PodiumRow key={entry.couple_space_id} entry={entry} rankType={rankType} />
            ))}

            {/* Restante (apenas na página completa) */}
            {rest.length > 0 && (
              <div className="glass-card rounded-2xl p-4 mt-1">
                {rest.map((entry) => (
                  <ListRow key={entry.couple_space_id} entry={entry} rankType={rankType} />
                ))}
              </div>
            )}

            {/* No modo compact, mostrar link para ver mais */}
            {compact && entries.length > 3 && (
              <button
                onClick={() => navigate("/ranking")}
                className="w-full flex items-center justify-center gap-1.5 pt-3 text-[11px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
              >
                Ver ranking completo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

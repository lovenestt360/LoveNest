import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Trophy, Flame, Coins, BadgeCheck, Loader2, ChevronRight, Star } from "lucide-react";

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
// Medal config for top 3
// ─────────────────────────────────────────────

const MEDALS = [
  { bg: "from-amber-400/20 to-amber-300/5",  border: "border-amber-400/50", text: "text-amber-500",  ring: "ring-2 ring-amber-400/40", label: "🥇", size: "h-11 w-11" },
  { bg: "from-slate-300/20 to-slate-200/5",  border: "border-slate-300/40", text: "text-slate-400",  ring: "", label: "🥈", size: "h-9 w-9" },
  { bg: "from-orange-400/15 to-orange-300/5",border: "border-orange-400/30",text: "text-orange-400", ring: "", label: "🥉", size: "h-9 w-9" },
];

// ─────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────

function HouseAvatar({
  name, image, size = "sm", isMe = false,
}: { name: string; image: string | null; size?: "sm" | "md"; isMe?: boolean }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "??";
  const cls = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  return (
    <div className={cn("relative shrink-0", cls)}>
      {image ? (
        <img src={image} alt={name} className={cn("rounded-xl object-cover w-full h-full", isMe && "ring-2 ring-primary")} />
      ) : (
        <div className={cn(
          "rounded-xl flex items-center justify-center font-black w-full h-full",
          isMe ? "bg-primary text-white" : "bg-primary/10 text-primary"
        )}>
          {initials}
        </div>
      )}
      {isMe && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <Star className="w-2.5 h-2.5 fill-white text-white" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Podium row (top 3)
// ─────────────────────────────────────────────

function PodiumRow({
  entry, rankType, isMe,
}: { entry: RankEntry; rankType: RankType; isMe: boolean }) {
  const idx    = (entry.rank - 1) as 0 | 1 | 2;
  const medal  = MEDALS[idx];
  const value  = rankType === "points" ? entry.total_points : entry.current_streak;
  const suffix = rankType === "points" ? "pts" : "dias 🔥";

  return (
    <div className={cn(
      "rounded-3xl p-4 flex items-center gap-3 border bg-gradient-to-br transition-all duration-300",
      medal.bg, medal.border,
      isMe && "bg-primary/10 border-primary shadow-md shadow-primary/20 ring-2 ring-primary/40 scale-[1.02]"
    )}>
      <span className={cn("text-xl shrink-0", medal.size === "h-11 w-11" ? "text-2xl" : "text-lg")}>{medal.label}</span>
      <HouseAvatar name={entry.house_name} image={entry.house_image} size="md" isMe={isMe} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm tracking-tight truncate text-foreground">
            {entry.house_name}
            {isMe && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded border border-primary/20 text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-sm">
                Tu
              </span>
            )}
          </span>
          {entry.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
        </div>
        <span className={cn("text-[11px] font-black", medal.text)}>{value} {suffix}</span>
      </div>
      <span className={cn("text-xl font-black tabular-nums", medal.text)}>#{entry.rank}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// List row (rank 4+)
// ─────────────────────────────────────────────

function ListRow({
  entry, rankType, isMe,
}: { entry: RankEntry; rankType: RankType; isMe: boolean }) {
  const value  = rankType === "points" ? entry.total_points : entry.current_streak;
  const suffix = rankType === "points" ? "pts" : "🔥";

  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 border-b border-border/25 transition-all",
      isMe ? "bg-primary/10 -mx-4 px-4 rounded-xl border border-primary/30 shadow-sm ring-1 ring-primary/20 scale-[1.01]" : "last:border-0"
    )}>
      <span className="text-[11px] font-black text-muted-foreground/40 w-6 text-right shrink-0">
        #{entry.rank}
      </span>
      <HouseAvatar name={entry.house_name} image={entry.house_image} size="sm" isMe={isMe} />
      <span className="flex-1 text-sm font-bold truncate text-foreground/80 flex items-center gap-1.5">
        {entry.house_name}
        {entry.is_verified && <BadgeCheck className="w-3 h-3 text-primary shrink-0" />}
        {isMe && (
          <span className="ml-1 flex items-center px-1.5 py-0.5 rounded border border-primary/20 text-[8px] font-black uppercase tracking-wider bg-primary text-primary-foreground">
            Tu
          </span>
        )}
      </span>
      <span className="text-sm font-black tabular-nums text-primary shrink-0">{value} {suffix}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

interface RankingCardProps {
  compact?        : boolean;
  initialRankType?: RankType;
  hideToggle?     : boolean;
  /** couple_space_id do utilizador actual — destaca no ranking */
  myCoupleId?     : string;
  refreshTrigger?  : number;
}

export function RankingCard({
  compact         = false,
  initialRankType = "streak",
  hideToggle      = false,
  myCoupleId,
  refreshTrigger,
}: RankingCardProps) {
  const navigate = useNavigate();
  const [rankType, setRankType] = useState<RankType>(initialRankType);
  const [entries, setEntries]   = useState<RankEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchRanking = useCallback(async (type: RankType) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_ranking", { p_type: type });
      console.log(`[RankingCard - ${type}] Dados recebidos:`, data);
      
      if (error) { console.error("[RankingCard]", error.message); return; }
      if (!data) return;

      // Adaptacao caso o backend retorne chaves diferentes (ex: rank_position em vez de rank)
      const mappedEntries = data.map((d: any) => ({
        ...d,
        rank: d.rank_position ?? d.rank,
        couple_space_id: d.couple_id ?? d.couple_space_id,
        house_name: d.house_name ?? "Casal Mistério",
        house_image: d.house_image ?? null,
        is_verified: d.is_verified ?? false
      }));

      setEntries(mappedEntries as RankEntry[]);
    } catch (err) {
      console.error("[RankingCard] Excepção:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchRanking(rankType); 
  }, [rankType, fetchRanking, refreshTrigger]);

  const top3 = entries.filter(e => e.rank <= 3);
  const rest  = compact ? [] : entries.filter(e => e.rank > 3);

  return (
    <div className="glass-card rounded-[1.75rem] overflow-hidden shadow-sm border-primary/10">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/60">
            Ranking Global
          </span>
        </div>
        {!hideToggle && (
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-xl p-0.5">
            {(["streak", "points"] as RankType[]).map(type => (
              <button
                key={type}
                onClick={() => setRankType(type)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  rankType === type ? "bg-background text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"
                )}
              >
                {type === "streak" ? <Flame className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
                {type === "streak" ? "Streak" : "Pontos"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-2xl">🏆</p>
            <p className="text-sm font-bold text-muted-foreground/60">Ainda sem casais no ranking.</p>
            <p className="text-xs text-muted-foreground/40">Façam check-in e sejam os primeiros!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {top3.map(e => (
              <PodiumRow key={e.couple_space_id} entry={e} rankType={rankType} isMe={e.couple_space_id === myCoupleId} />
            ))}

            {rest.length > 0 && (
              <div className="glass-card rounded-2xl p-4 mt-1">
                {rest.map(e => (
                  <ListRow key={e.couple_space_id} entry={e} rankType={rankType} isMe={e.couple_space_id === myCoupleId} />
                ))}
              </div>
            )}

            {compact && entries.length > 3 && (
              <button
                onClick={() => navigate("/ranking")}
                className="w-full flex items-center justify-center gap-1.5 pt-3 text-[11px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
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

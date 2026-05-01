import { cn } from "@/lib/utils";
import { useStreak } from "@/features/streak/useStreak";
import { Flame, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PHRASES = [
  { min: 0,  max: 0,        msg: "Comecem hoje, cada dia conta! 💫" },
  { min: 1,  max: 2,        msg: "O primeiro passo é sempre o mais bonito 🌱" },
  { min: 3,  max: 6,        msg: "Estão a construir algo especial juntos ✨" },
  { min: 7,  max: 13,       msg: "Uma semana de amor! A vossa chama brilha 🔥" },
  { min: 14, max: 29,       msg: "Dois amantes em sintonia perfeita 💕" },
  { min: 30, max: 89,       msg: "Um mês de dedicação. Que casal incrível! 🏆" },
  { min: 90, max: Infinity, msg: "Lendários! O amor de vocês é inspirador 👑" },
];

function getPhrase(streak: number) {
  return PHRASES.find(p => streak >= p.min && streak <= p.max)?.msg ?? "";
}

function getRank(streak: number) {
  if (streak >= 90) return "Lendário";
  if (streak >= 30) return "Apaixonado";
  if (streak >= 7)  return "Flamejante";
  return "Iniciante";
}

export function LoveStreakCard() {
  const { streak, loading } = useStreak();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="glass-card p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-[#f5f5f5] rounded-full" />
        <div className="h-10 w-16 bg-[#f5f5f5] rounded-lg" />
        <div className="h-3 w-32 bg-[#f5f5f5] rounded-full" />
      </div>
    );
  }

  const { currentStreak, longestStreak, bothActiveToday, streakAtRisk,
          shieldsRemaining, shieldUsedToday } = streak;
  const isZero = currentStreak === 0;

  const phrase  = getPhrase(currentStreak);
  const rank    = getRank(currentStreak);
  const points  = currentStreak * 5 + Math.floor(longestStreak * 2);

  const numberColor = bothActiveToday
    ? "text-rose-500"
    : shieldUsedToday
      ? "text-blue-500"
      : "text-foreground";

  // Hearts: user is considered active unless streak is zero and not at risk
  const myHeart      = !isZero || streakAtRisk ? "💗" : "🤍";
  const partnerHeart = bothActiveToday ? "💗" : "🤍";

  return (
    <button
      onClick={() => navigate("/lovestreak")}
      className="glass-card glass-card-hover w-full p-5 text-left active:scale-[0.98]"
    >
      {/* Row 1 — header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">
            LoveStreak
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-[#c4c4c4]" strokeWidth={1.5} />
      </div>

      {/* Row 2 — emotional phrase */}
      <p className="text-[11px] text-[#aaa] mb-2.5 leading-snug">{phrase}</p>

      {/* Row 3 — streak number + hearts & shields */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-5xl font-bold tabular-nums tracking-tight", numberColor)}>
            {currentStreak}
          </span>
          <span className="text-base font-medium text-[#717171]">dias</span>
        </div>

        <div className="flex flex-col items-end gap-2 pt-0.5">
          {/* Hearts */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              <span className="text-sm leading-none">{myHeart}</span>
              <span className="text-[9px] text-[#bbb] font-semibold ml-0.5">Tu</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-sm leading-none">{partnerHeart}</span>
              <span className="text-[9px] text-[#bbb] font-semibold ml-0.5">Par</span>
            </div>
          </div>

          {/* Shields */}
          <div className="flex items-center gap-0.5">
            {[0, 1, 2].map(i => (
              <Shield
                key={i}
                className={cn("w-3.5 h-3.5", i < shieldsRemaining ? "text-blue-400" : "text-[#e0e0e0]")}
                strokeWidth={1.5}
              />
            ))}
            <span className="text-[9px] text-[#bbb] font-semibold uppercase tracking-wide ml-1">
              Shields
            </span>
          </div>
        </div>
      </div>

      {/* Row 4 — footer: rank/record/points + missions */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#f0f0f0]">
        <div className="flex items-center gap-1 text-[11px] text-[#717171]">
          <span className="font-semibold text-foreground">{rank}</span>
          <span className="text-[#d8d8d8]">·</span>
          <span>Rec: <span className="font-semibold text-foreground">{longestStreak}d</span></span>
          <span className="text-[#d8d8d8]">·</span>
          <span className="font-semibold text-amber-500">{points}pts</span>
        </div>

        {/* Missions — compact */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[10px] text-[#bbb] font-semibold uppercase tracking-wide">Missões</span>
          <span className="text-xs">💝📖✅</span>
          <span className="text-[10px] font-bold text-[#bbb]">0/3</span>
        </div>
      </div>
    </button>
  );
}

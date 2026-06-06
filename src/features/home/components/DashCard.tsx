import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashCardProps {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  to: string;
  badge?: number | string;
  accent?: string;
  className?: string;
}

// Derive a tinted bg class from the accent text class: "text-blue-500" → "bg-blue-50"
function iconBgFromAccent(accent?: string): string {
  if (!accent) return "bg-rose-50";
  return accent.replace("text-", "bg-").replace(/-\d+$/, "-50");
}

function glowClassFromAccent(accent?: string): string {
  if (!accent) return "";
  if (accent.includes("blue"))    return "card-glow-blue";
  if (accent.includes("sky"))     return "card-glow-sky";
  if (accent.includes("pink"))    return "card-glow-pink";
  if (accent.includes("purple"))  return "card-glow-purple";
  if (accent.includes("orange"))  return "card-glow-orange";
  if (accent.includes("violet"))  return "card-glow-violet";
  if (accent.includes("emerald")) return "card-glow-emerald";
  if (accent.includes("rose"))    return "card-glow-rose";
  return "";
}

export function DashCard({ icon, title, lines, to, badge = 0, accent, className }: DashCardProps) {
  const navigate  = useNavigate();
  const hasBadge  = typeof badge === "number" ? badge > 0 : !!badge;
  const iconBg    = iconBgFromAccent(accent);
  const glowClass = glowClassFromAccent(accent);

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "glass-card glass-card-hover group relative flex flex-col gap-3 p-4 text-left w-full",
        glowClass,
        className
      )}
    >
      {/* Top: icon + badge */}
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center",
          iconBg,
          accent ?? "text-rose-500"
        )}>
          {icon}
        </div>
        {hasBadge && (
          <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
            {typeof badge === "number" && badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div>
        <p className="text-[13px] font-semibold text-foreground leading-tight">{title}</p>
        {lines[0] && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{lines[0]}</p>
        )}
        {lines[1] && (
          <p className="text-[11px] text-muted-foreground/70 leading-tight line-clamp-1">{lines[1]}</p>
        )}
      </div>
    </button>
  );
}

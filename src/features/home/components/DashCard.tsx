import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DashCardProps {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  to: string;
  badge?: number | string;
  accent?: string;
  className?: string;
}

export function DashCard({ icon, title, lines, to, badge = 0, accent, className }: DashCardProps) {
  const navigate = useNavigate();
  const hasBadge = typeof badge === "number" ? badge > 0 : !!badge;

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "glass-card glass-card-hover group relative flex flex-col gap-3 p-4 text-left w-full active:scale-[0.97] transition-all duration-300",
        className
      )}
    >
      {/* Icon + badge */}
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-sm shadow-black/8 border border-white/80 transition-transform duration-200 group-active:scale-95",
        )}>
          <span className={cn("flex items-center justify-center", accent ?? "text-rose-400")}>
            {icon}
          </span>
        </div>

        {hasBadge && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-400 px-1.5 text-[9px] font-black text-white shadow-sm animate-in zoom-in duration-200">
            {typeof badge === "number" && badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="space-y-0.5">
        <p className="text-[12px] font-black text-foreground/80 tracking-tight">{title}</p>
        {lines.map((line, i) => (
          <p key={i} className={cn(
            "text-[11px] leading-tight line-clamp-1",
            i === 0
              ? "text-foreground/50 font-semibold"
              : "text-foreground/35 font-medium"
          )}>
            {line}
          </p>
        ))}
      </div>
    </button>
  );
}

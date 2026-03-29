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

export function DashCard({ icon, title, lines, to, badge = 0, accent, className }: DashCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "glass-card glass-card-hover group relative flex flex-col gap-2 rounded-3xl p-4 text-left w-full active:scale-[0.96] transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm",
          accent ?? "bg-primary/20 text-primary"
        )}>
          {icon}
        </div>
        {(typeof badge === 'number' ? badge > 0 : !!badge) && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground shadow-lg animate-in zoom-in duration-300">
            {typeof badge === 'number' && badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      <div className="space-y-0.5 mt-0.5">
        <span className="text-[13px] font-black text-foreground block tracking-tight uppercase">{title}</span>
        <div className="space-y-0.5 opacity-70">
          {lines.map((line, i) => (
            <p key={i} className="text-[10px] text-muted-foreground leading-tight font-bold line-clamp-1">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Subtle border shine effect */}
      <div className="absolute inset-0 rounded-[2rem] border border-white/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </button>
  );
}

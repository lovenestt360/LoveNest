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
        "glass-card glass-card-hover group relative flex flex-col gap-3 rounded-[2.5rem] p-6 text-left w-full active:scale-[0.96] transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between min-h-[44px]">
        <div className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105",
          accent ? "bg-white/5" : "bg-primary/5 text-primary"
        )}>
          <div className={cn("opacity-60 grayscale-[40%] group-hover:grayscale-0 transition-all", accent)}>
            {icon}
          </div>
        </div>
        {(typeof badge === 'number' ? badge > 0 : !!badge) && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-black text-primary shadow-sm">
            {typeof badge === 'number' && badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      <div className="space-y-1 mt-1">
        <span className="text-sm font-black text-foreground block tracking-tight">{title}</span>
        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <p key={i} className="text-[10px] text-muted-foreground/40 leading-none font-black uppercase tracking-wider line-clamp-1">
              {line}
            </p>
          ))}
        </div>
      </div>
    </button>
  );
}

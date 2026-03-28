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
        "group relative flex flex-col gap-2 rounded-2xl p-4 text-left w-full bg-white shadow-apple-soft hover:shadow-lg transition-all duration-300 active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm",
          accent ?? "bg-slate-50 text-slate-400"
        )}>
          {icon}
        </div>
        {(typeof badge === 'number' ? badge > 0 : !!badge) && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-white shadow-lg animate-in zoom-in duration-300">
            {typeof badge === 'number' && badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      <div className="space-y-0.5 mt-1">
        <span className="text-[17px] font-black text-slate-900 block tracking-tight">{title}</span>
        <div className="space-y-0.5">
          {lines.map((line, i) => (
            <p key={i} className="text-[11px] text-slate-400 leading-tight font-bold uppercase tracking-wider line-clamp-1">
              {line}
            </p>
          ))}
        </div>
      </div>
    </button>
  );
}

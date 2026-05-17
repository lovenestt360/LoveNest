import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, HeartHandshake, Flame, MessageCircle, SmilePlus, MoonStar, Sparkles, Star, Image, Clock } from "lucide-react";
import { FeedItem } from "@/hooks/useEmotionalFeed";

// ── Icon registry ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  heart_handshake: HeartHandshake,
  flame:           Flame,
  message_circle:  MessageCircle,
  smile_plus:      SmilePlus,
  moon_star:       MoonStar,
  sparkles:        Sparkles,
  star:            Star,
  image:           Image,
  clock:           Clock,
};

// ── Individual feed item ──────────────────────────────────────────────────────

function FeedRow({ item, isLast }: { item: FeedItem; isLast: boolean }) {
  const Icon = ICON_MAP[item.iconType] ?? Sparkles;
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3.5",
      !isLast && "border-b border-[#f8f8f8]"
    )}>
      <div className={cn("w-6 h-6 shrink-0 flex items-center justify-center mt-0.5", item.iconColor)}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground leading-snug">
          {item.message}
        </p>
        {item.detail && (
          <p className="text-[11px] text-[#bbb] mt-0.5">{item.detail}</p>
        )}
      </div>
      <span className="text-[10px] text-[#ccc] shrink-0 font-medium mt-0.5 min-w-[32px] text-right">
        {item.timeAgo}
      </span>
    </div>
  );
}

// ── Day group header ──────────────────────────────────────────────────────────

function DayHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ccc]">
        {label}
      </span>
      <span className="flex-1 h-px bg-[#f0f0f0]" />
    </div>
  );
}

// ── Main component (used by Momentos page — full history view) ────────────────

interface Props {
  items: FeedItem[];
  loading: boolean;
  limit?: number;
  onRefresh?: () => void;
}

export function EmotionalFeed({ items, loading, limit, onRefresh }: Props) {
  const displayItems = limit ? items.slice(0, limit) : items;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-rose-300 animate-spin" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="glass-card p-8 text-center space-y-1.5">
        <p className="text-sm font-medium text-foreground/60">
          O vosso espaço ainda está silencioso.
        </p>
        <p className="text-[11px] text-[#bbb]">
          Pequenos gestos vão criar história aqui.
        </p>
      </div>
    );
  }

  // Group by dayLabel preserving order
  const groups: { label: string; items: FeedItem[] }[] = [];
  for (const item of displayItems) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.dayLabel) {
      last.items.push(item);
    } else {
      groups.push({ label: item.dayLabel, items: [item] });
    }
  }

  return (
    <div className="space-y-3">
      {onRefresh && (
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-[11px] text-[#bbb] hover:text-[#aaa] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </button>
        </div>
      )}
      {groups.map(group => (
        <div key={group.label} className="space-y-1">
          <DayHeader label={group.label} />
          <div className="glass-card overflow-hidden">
            {group.items.map((item, idx) => (
              <FeedRow key={item.id} item={item} isLast={idx === group.items.length - 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

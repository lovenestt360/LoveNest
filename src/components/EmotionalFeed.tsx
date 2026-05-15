import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import { FeedItem } from "@/hooks/useEmotionalFeed";

// ── Type → dot color ──────────────────────────────────────────────────────────
const TYPE_DOT: Record<string, string> = {
  all_missions:    "bg-rose-400",
  streak:          "bg-orange-400",
  partner_checkin: "bg-rose-300",
  message:         "bg-sky-400",
  mood:            "bg-amber-400",
  prayer:          "bg-purple-400",
  memory:          "bg-violet-400",
  capsule:         "bg-teal-400",
  milestone:       "bg-yellow-400",
};

// ── Individual feed item ───────────────────────────────────────────────────────
function FeedRow({ item, isLast }: { item: FeedItem; isLast: boolean }) {
  const dot = TYPE_DOT[item.type] || "bg-[#ddd]";
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3.5 transition-colors",
      !isLast && "border-b border-[#f5f5f5]"
    )}>
      {/* Emoji */}
      <span className="text-[17px] w-7 text-center shrink-0 mt-0.5 leading-none">
        {item.emoji}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground leading-snug">
          {item.message}
        </p>
        {item.detail && (
          <p className="text-[11px] text-[#aaa] mt-0.5 leading-snug">{item.detail}</p>
        )}
      </div>

      {/* Time */}
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
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ccc]">
        {label}
      </span>
      <span className="flex-1 h-px bg-[#f0f0f0]" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 text-rose-300 animate-spin" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-2xl mb-2">🌱</p>
        <p className="text-sm font-medium text-foreground/60">Os vossos momentos vão aparecer aqui</p>
        <p className="text-[11px] text-[#bbb] mt-1">
          Façam um check-in, partilhem o humor ou enviem uma oração
        </p>
      </div>
    );
  }

  // Group by dayLabel, preserving order
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
              <FeedRow
                key={item.id}
                item={item}
                isLast={idx === group.items.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

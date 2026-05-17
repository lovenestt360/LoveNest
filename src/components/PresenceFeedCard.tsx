import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Activity, HeartHandshake, Flame, MessageCircle, SmilePlus,
  MoonStar, Sparkles, Star, Image, Clock, ArrowRight
} from "lucide-react";
import { useEmotionalFeed, FeedItem } from "@/hooks/useEmotionalFeed";

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

// ── Single feed row ───────────────────────────────────────────────────────────

function PresenceRow({ item, isLast, index = 0 }: { item: FeedItem; isLast: boolean; index?: number }) {
  const Icon = ICON_MAP[item.iconType] ?? Activity;
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 animate-in fade-in slide-in-from-bottom-1 duration-500",
        !isLast && "border-b border-[#f5f5f5]"
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Tiny icon */}
      <div className={cn(
        "w-5 h-5 shrink-0 flex items-center justify-center mt-0.5",
        item.iconColor
      )}>
        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-foreground leading-snug">
          {item.message}
        </p>
        {item.detail && (
          <p className="text-[10.5px] text-[#bbb] mt-0.5 leading-snug">{item.detail}</p>
        )}
        <p className="text-[10px] text-[#bdbdbd] mt-0.5">{item.timeAgo}</p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-5 text-center space-y-1">
      <p className="text-[12.5px] font-medium text-[#bbb]">
        O vosso espaço ainda está silencioso.
      </p>
      <p className="text-[11px] text-[#d0d0d0]">
        Pequenos gestos vão criar história aqui.
      </p>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse py-1">
      {[0, 1, 2].map(i => (
        <div key={i} className={cn("flex items-start gap-3 py-2", i < 2 && "border-b border-[#f5f5f5]")}>
          <div className="w-4 h-4 rounded-full bg-[#f0f0f0] shrink-0 mt-1" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-[#f0f0f0] rounded-full w-4/5" />
            <div className="h-2 bg-[#f5f5f5] rounded-full w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function PresenceFeedCard() {
  const { items, loading } = useEmotionalFeed();
  const navigate = useNavigate();

  const displayItems = items.slice(0, 3);

  return (
    <div className="bg-white border border-[#f3f3f3] rounded-3xl shadow-sm px-5 pt-4 pb-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-rose-400/70" strokeWidth={1.5} />
          <div>
            <p className="text-[12px] font-semibold text-foreground leading-none">
              Presença recente
            </p>
            <p className="text-[10px] text-[#bbb] mt-0.5">
              O vosso espaço continua vivo.
            </p>
          </div>
        </div>
        {items.length > 3 && (
          <button
            onClick={() => navigate("/momentos")}
            className="flex items-center gap-0.5 text-[10px] font-medium text-rose-400 hover:text-rose-500 transition-colors active:opacity-70"
          >
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <Skeleton />
      ) : displayItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {displayItems.map((item, idx) => (
            <PresenceRow
              key={item.id}
              item={item}
              isLast={idx === displayItems.length - 1}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Sparkles, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_EVENT_ICON,
  EVENT_TYPE_CONFIG,
  EVENT_COLORS,
  TOGETHER_MILESTONES,
  type MilestoneWeight,
  type RelationshipEvent,
  type TimelineEntry,
} from "./types";

function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function buildTimelineEntries(
  events: RelationshipEvent[],
  relationshipStartDate: string | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = events.map((event) => ({
    kind: "event",
    event,
    date: parseDateOnly(event.event_date),
  }));

  if (relationshipStartDate) {
    const start = parseDateOnly(relationshipStartDate);
    const today = new Date();
    for (const milestone of TOGETHER_MILESTONES) {
      const date = milestone.add(start);
      if (date <= today) {
        entries.push({ kind: "milestone", label: milestone.label, weight: milestone.weight, date });
      }
    }
  }

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ── Imagem assinada ───────────────────────────────────────────────────────────
function EventImage({ imagePath, className }: { imagePath: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [imagePath]);
  if (!url) return null;
  return <img src={url} alt="" className={cn("w-full object-cover", className)} />;
}

// ── Milestones com hierarquia ─────────────────────────────────────────────────

/** XS — 1 semana: quase um sussurro */
function MilestoneXS({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1">
      <div className="w-1 h-1 rounded-full bg-rose-200 dark:bg-rose-800 shrink-0" />
      <span className="text-[11px] text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-[10px] text-gray-300 dark:text-gray-600 ml-auto">
        {format(date, "d 'de' MMM", { locale: pt })}
      </span>
    </div>
  );
}

/** SM — 1 mês: discreto mas presente */
function MilestoneSM({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <Sparkles className="w-3 h-3 text-rose-300 shrink-0" strokeWidth={1.5} />
      <span className="text-[12px] text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-auto">
        {format(date, "d 'de' MMMM", { locale: pt })}
      </span>
    </div>
  );
}

/** MD — 3-6 meses: cartão compacto e quente */
function MilestoneMD({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center gap-3 bg-rose-50/60 dark:bg-rose-950/15 rounded-xl px-4 py-3.5">
      <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1A1A1A] dark:text-zinc-100">{label}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
    </div>
  );
}

/** XL — 1 ano+: capítulo em destaque, sem caixa, com presença */
function MilestoneXL({ label, date }: { label: string; date: Date }) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-rose-50 to-rose-50/20 dark:from-rose-950/25 dark:to-rose-950/5 px-5 py-6 animate-in fade-in duration-500">
      {/* Accent left border */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-rose-400 to-rose-200 dark:from-rose-600 dark:to-rose-800" />
      <p className="text-[9px] font-bold text-rose-400 uppercase tracking-[0.25em] mb-2">
        Marco da relação
      </p>
      <p className="font-serif text-[28px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-tight">
        {label}
      </p>
      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-2">
        {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
      </p>
      <div className="flex gap-1.5 mt-4">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
        <div className="w-1.5 h-1.5 rounded-full bg-rose-200" />
      </div>
    </div>
  );
}

function MilestoneEntry({ label, weight, date }: { label: string; weight: MilestoneWeight; date: Date }) {
  if (weight === "xl") return <MilestoneXL label={label} date={date} />;
  if (weight === "md") return <MilestoneMD label={label} date={date} />;
  if (weight === "sm") return <MilestoneSM label={label} date={date} />;
  return <MilestoneXS label={label} date={date} />;
}

// Tailwind precisa de ver estas strings completas para não as purgar
const EVENT_LEFT_BORDER: Record<string, string> = {
  first_meeting: "border-l-rose-300 dark:border-l-rose-700",
  dating:        "border-l-pink-300 dark:border-l-pink-700",
  engagement:    "border-l-violet-300 dark:border-l-violet-700",
  marriage:      "border-l-purple-300 dark:border-l-purple-700",
  trip:          "border-l-sky-300 dark:border-l-sky-700",
  custom:        "border-l-gray-200 dark:border-l-gray-700",
};

// ── Carta de evento — estilo diário/álbum ─────────────────────────────────────
function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: RelationshipEvent;
  onEdit: (event: RelationshipEvent) => void;
  onDelete: (event: RelationshipEvent) => void;
}) {
  const config = EVENT_TYPE_CONFIG[event.event_type];
  const colors = EVENT_COLORS[event.event_type] ?? EVENT_COLORS.custom;
  const Icon   = config?.icon ?? DEFAULT_EVENT_ICON;
  const dateStr = format(parseDateOnly(event.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt });

  if (event.image_path) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] animate-in fade-in duration-400">
        <div className="relative">
          <EventImage imagePath={event.image_path} className="h-56" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button
              onClick={() => onEdit(event)}
              className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <Pencil className="w-3 h-3" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => onDelete(event)}
              className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-[9px] font-bold text-white/55 uppercase tracking-wider mb-1.5">
              {config?.label}
            </p>
            <p className="font-serif text-[21px] font-bold text-white leading-tight">{event.title}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{dateStr}</p>
          </div>
        </div>
        {event.description && (
          <div className="px-5 py-3.5 bg-background border-t border-border/30">
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{event.description}</p>
          </div>
        )}
      </div>
    );
  }

  // Sem foto — entrada de diário com borda colorida à esquerda
  const leftBorder = EVENT_LEFT_BORDER[event.event_type] ?? "border-l-gray-200 dark:border-l-gray-700";
  return (
    <div className={cn("relative pl-4 py-1 animate-in fade-in duration-400 border-l-2", leftBorder)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn("w-3.5 h-3.5 shrink-0", colors.iconText)} strokeWidth={1.5} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", colors.dateText)}>
              {config?.label}
            </span>
          </div>
          <p className="font-serif text-[17px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-snug">
            {event.title}
          </p>
          <p className={cn("text-[11px] font-medium mt-0.5", colors.dateText)}>{dateStr}</p>
          {event.description && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{event.description}</p>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0 mt-0.5">
          <button
            onClick={() => onEdit(event)}
            className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 active:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => onDelete(event)}
            className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 active:bg-muted transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
export function Timeline({
  entries,
  onEdit,
  onDelete,
}: {
  entries: TimelineEntry[];
  onEdit: (event: RelationshipEvent) => void;
  onDelete: (event: RelationshipEvent) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-4 h-4 text-rose-300" strokeWidth={1.5} />
        </div>
        <p className="font-serif text-[16px] font-semibold text-[#1A1A1A] dark:text-zinc-100">
          A vossa história começa aqui
        </p>
        <p className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">
          Toquem no + para adicionar a primeira data importante.
        </p>
      </div>
    );
  }

  const groups = new Map<number, TimelineEntry[]>();
  for (const entry of entries) {
    const year = entry.date.getFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(entry);
  }

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([year, yearEntries]) => (
        <div key={year}>
          {/* Divisor de ano — elegante, discreto */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-rose-100/70 dark:bg-rose-900/20" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{year}</span>
            <div className="h-px flex-1 bg-rose-100/70 dark:bg-rose-900/20" />
          </div>

          {/* Entradas com espaçamento variável por peso */}
          <div className="space-y-0">
            {yearEntries.map((entry, i) => {
              const isXL  = entry.kind === "milestone" && entry.weight === "xl";
              const isXXS = entry.kind === "milestone" && entry.weight === "xs";
              return (
                <div
                  key={entry.kind === "event" ? entry.event.id : `m-${year}-${i}`}
                  className={cn(isXL ? "py-1.5" : isXXS ? "py-0" : "py-1")}
                >
                  {entry.kind === "milestone" ? (
                    <MilestoneEntry label={entry.label} weight={entry.weight} date={entry.date} />
                  ) : (
                    <EventCard event={entry.event} onEdit={onEdit} onDelete={onDelete} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

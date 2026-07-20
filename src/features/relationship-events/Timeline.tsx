import { useEffect, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Sparkles, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_EVENT_ICON,
  EVENT_TYPE_CONFIG,
  TOGETHER_MILESTONES,
  MILESTONE_PHRASES,
  type MilestoneWeight,
  type RelationshipEvent,
  type TimelineEntry,
} from "./types";

function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

/** Constrói as entradas ordenadas cronologicamente (mais antiga = Capítulo 1). */
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

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Imagem de evento ──────────────────────────────────────────────────────────
function EventImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [imagePath]);
  if (!url) return null;
  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.13)]">
      <img src={url} alt="" className="w-full h-80 object-cover" />
      {/* Véu inferior para fundir com o fundo */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

// ── Divisor entre capítulos ───────────────────────────────────────────────────
function ChapterDivider() {
  return (
    <div className="flex items-center gap-3 my-1 px-5">
      <div className="h-px flex-1 bg-rose-100/50 dark:bg-rose-900/12" />
      <div className="flex gap-1.5">
        <div className="w-1 h-1 rounded-full bg-rose-300/70 dark:bg-rose-700/60" />
        <div className="w-1 h-1 rounded-full bg-rose-200/50 dark:bg-rose-800/50" />
        <div className="w-1 h-1 rounded-full bg-rose-100/30 dark:bg-rose-900/40" />
      </div>
      <div className="h-px flex-1 bg-rose-100/50 dark:bg-rose-900/12" />
    </div>
  );
}

// ── XS milestone — marcador quase invisível ────────────────────────────────────
function XSSeparator({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-4">
      <div className="h-px w-5 bg-rose-100/40 dark:bg-rose-900/15" />
      <span className="text-[10px] text-gray-300/70 dark:text-gray-600/60 italic">
        {label} · {format(date, "d 'de' MMM 'de' yyyy", { locale: pt })}
      </span>
      <div className="h-px w-5 bg-rose-100/40 dark:bg-rose-900/15" />
    </div>
  );
}

// ── Cabeçalho de capítulo ─────────────────────────────────────────────────────
function ChapterHeader({
  chapterNumber,
  title,
  date,
  titleSize = "md",
  isFirst = false,
  eyebrow,
}: {
  chapterNumber: number;
  title: string;
  date: Date;
  titleSize?: "sm" | "md" | "xl";
  isFirst?: boolean;
  eyebrow?: string;
}) {
  const sizeClass = isFirst
    ? "text-[32px]"
    : { sm: "text-[20px]", md: "text-[24px]", xl: "text-[28px]" }[titleSize];

  return (
    <div className="text-center px-6 mb-5">
      {isFirst && (
        <p className="text-[9px] font-bold text-rose-400/60 uppercase tracking-[0.4em] mb-3">
          Onde tudo começou
        </p>
      )}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className={cn("h-px bg-rose-200/50 dark:bg-rose-800/25", isFirst ? "w-14" : "w-10")} />
        <p className={cn("font-bold text-rose-400 uppercase tracking-[0.35em]", isFirst ? "text-[9px]" : "text-[8px]")}>
          {eyebrow ? eyebrow + " · " : ""}Capítulo {chapterNumber}
        </p>
        <div className={cn("h-px bg-rose-200/50 dark:bg-rose-800/25", isFirst ? "w-14" : "w-10")} />
      </div>
      <p className={cn("font-serif font-bold text-[#1A1A1A] dark:text-zinc-100 leading-tight", sizeClass)}>
        {title}
      </p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
      </p>
    </div>
  );
}

// ── Capítulo de milestone ─────────────────────────────────────────────────────
function MilestoneChapter({
  label,
  date,
  weight,
  phrase,
  chapterNumber,
  isFirst,
}: {
  label: string;
  date: Date;
  weight: MilestoneWeight;
  phrase?: string;
  chapterNumber: number;
  isFirst: boolean;
}) {
  const titleSize = weight === "xl" ? "xl" : weight === "md" ? "md" : "sm";
  const vPadding  = isFirst ? "py-12" : weight === "xl" ? "py-10" : weight === "md" ? "py-8" : "py-6";

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-500", vPadding)}>
      <ChapterHeader
        chapterNumber={chapterNumber}
        title={label}
        date={date}
        titleSize={titleSize}
        isFirst={isFirst}
      />

      {phrase && (
        <p
          className={cn(
            "text-center italic text-gray-400 dark:text-gray-500 leading-relaxed px-8 max-w-[300px] mx-auto",
            weight === "xl" || isFirst ? "text-[13px]" : "text-[11px]",
          )}
        >
          "{phrase}"
        </p>
      )}

      {(weight === "xl" || isFirst) && (
        <div className="flex justify-center mt-5">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-300/70" />
            <div className="w-1.5 h-1.5 rounded-full bg-rose-200/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-rose-100/30" />
          </div>
        </div>
      )}

      <ChapterDivider />
    </div>
  );
}

// ── Capítulo de evento ────────────────────────────────────────────────────────
function EventChapter({
  event,
  chapterNumber,
  isFirst,
  onEdit,
  onDelete,
}: {
  event: RelationshipEvent;
  chapterNumber: number;
  isFirst: boolean;
  onEdit: (event: RelationshipEvent) => void;
  onDelete: (event: RelationshipEvent) => void;
}) {
  const config = EVENT_TYPE_CONFIG[event.event_type];
  const Icon   = config?.icon ?? DEFAULT_EVENT_ICON;
  const vPad   = isFirst ? "py-12" : "py-8";

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-500", vPad)}>

      {/* Ícone do tipo */}
      <div className="flex justify-center mb-4">
        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/25 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
        </div>
      </div>

      <ChapterHeader
        chapterNumber={chapterNumber}
        title={event.title}
        date={parseDateOnly(event.event_date)}
        titleSize="md"
        isFirst={isFirst}
        eyebrow={config?.label}
      />

      {/* Fotografia — protagonista */}
      {event.image_path && (
        <div className="mb-7 px-4">
          <EventImage imagePath={event.image_path} />
        </div>
      )}

      {/* Descrição em itálico */}
      {event.description && (
        <div className="text-center px-7 mb-5">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 italic leading-relaxed">
            "{event.description}"
          </p>
        </div>
      )}

      {/* Editar / Remover */}
      <div className="flex items-center justify-center gap-6 mb-2">
        <button
          onClick={() => onEdit(event)}
          className="flex items-center gap-1.5 text-[11px] text-gray-300/80 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
        >
          <Pencil className="w-3 h-3" strokeWidth={1.5} />
          Editar
        </button>
        <div className="w-px h-3 bg-border/40" />
        <button
          onClick={() => onDelete(event)}
          className="flex items-center gap-1.5 text-[11px] text-gray-300/80 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          Remover
        </button>
      </div>

      <ChapterDivider />
    </div>
  );
}

// ── BookChapters — componente principal ───────────────────────────────────────
export function BookChapters({
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
      <div className="py-16 text-center px-6">
        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/25 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-4 h-4 text-rose-300" strokeWidth={1.5} />
        </div>
        <p className="font-serif text-[17px] font-semibold text-[#1A1A1A] dark:text-zinc-100">
          O primeiro capítulo ainda não foi escrito
        </p>
        <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
          Toquem no + para começar a contar a vossa história.
        </p>
      </div>
    );
  }

  let chapterCount = 0;
  const processedEntries = entries.map((entry) => {
    const isXS = entry.kind === "milestone" && entry.weight === "xs";
    const num  = isXS ? null : ++chapterCount;
    return { entry, chapterNumber: num, isFirst: num === 1 };
  });

  return (
    <div>
      {processedEntries.map(({ entry, chapterNumber, isFirst }, i) => {
        if (entry.kind === "milestone") {
          if (entry.weight === "xs") {
            return <XSSeparator key={`xs-${i}`} label={entry.label} date={entry.date} />;
          }
          return (
            <MilestoneChapter
              key={`m-${i}`}
              label={entry.label}
              date={entry.date}
              weight={entry.weight}
              phrase={MILESTONE_PHRASES[entry.label]}
              chapterNumber={chapterNumber!}
              isFirst={isFirst}
            />
          );
        }
        return (
          <EventChapter
            key={entry.event.id}
            event={entry.event}
            chapterNumber={chapterNumber!}
            isFirst={isFirst}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

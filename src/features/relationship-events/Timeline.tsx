import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/** Constrói entradas ordenadas cronologicamente (mais antiga = Capítulo 1). */
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

// ── Long press hook ────────────────────────────────────────────────────────────
function useLongPress(onTrigger: () => void, ms = 900) {
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onTrigger);
  callbackRef.current = onTrigger;

  const [pressing, setPressing] = useState(false);

  const start = () => {
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      callbackRef.current();
    }, ms);
  };

  const cancel = () => {
    setPressing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return {
    pressing,
    handlers: {
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
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

// ── XS milestone ──────────────────────────────────────────────────────────────
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

// ── Cabeçalho de capítulo (usado quando não há foto) ─────────────────────────
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
          {eyebrow ? `${eyebrow} · ` : ""}Capítulo {chapterNumber}
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

// ── Foto com título e descrição sobrepostos ────────────────────────────────────
function EventPhotoWithOverlay({
  imagePath,
  title,
  description,
  date,
  chapterNumber,
  isFirst,
  eventLabel,
}: {
  imagePath: string;
  title: string;
  description: string | null;
  date: Date;
  chapterNumber: number;
  isFirst: boolean;
  eventLabel?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [imagePath]);

  if (!url) {
    return (
      <div className="mx-4">
        <div className="px-1 mb-3 animate-pulse">
          <div className="h-2.5 w-28 bg-muted/40 rounded mb-2" />
          <div className="h-5 w-40 bg-muted/30 rounded" />
        </div>
        <div
          className="w-full rounded-2xl bg-muted/20 animate-pulse"
          style={{ height: isFirst ? "360px" : "300px" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-4">
      {/* ── Cabeçalho editorial ACIMA da foto ── */}
      <div className="px-1 mb-3">
        {isFirst && (
          <p className="text-[8px] font-bold text-rose-400/70 uppercase tracking-[0.40em] mb-1.5">
            Onde tudo começou
          </p>
        )}
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-6 bg-rose-300/40" />
          <p className="text-[8px] font-bold text-rose-400/80 uppercase tracking-[0.38em]">
            {eventLabel ? `${eventLabel} · ` : ""}Capítulo {chapterNumber}
          </p>
          <div className="h-px flex-1 bg-rose-100/40 dark:bg-rose-900/20" />
        </div>
        <p className="text-[13px] text-muted-foreground/70 font-medium">
          {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>

      {/* ── Foto ── */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-[0_8px_36px_rgba(0,0,0,0.16)]"
        style={{ height: isFirst ? "360px" : "300px" }}
      >
        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        {/* Título + descrição sobrepostos na zona inferior */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
          <p
            className="font-serif font-bold text-white leading-tight"
            style={{
              fontSize: isFirst ? "28px" : "24px",
              textShadow: "0 2px 16px rgba(0,0,0,0.5)",
            }}
          >
            {title}
          </p>
          {description && (
            <p className="text-[12px] text-white/65 italic mt-2 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Capítulo de milestone ─────────────────────────────────────────────────────
function MilestoneChapter({
  label, date, weight, phrase, chapterNumber, isFirst,
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
      <ChapterHeader chapterNumber={chapterNumber} title={label} date={date} titleSize={titleSize} isFirst={isFirst} />

      {phrase && (
        <p className={cn(
          "text-center italic text-gray-400 dark:text-gray-500 leading-relaxed px-8 max-w-[300px] mx-auto",
          weight === "xl" || isFirst ? "text-[13px]" : "text-[11px]",
        )}>
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

// ── Capítulo de evento (com long press) ───────────────────────────────────────
function EventChapter({
  event,
  chapterNumber,
  isFirst,
  onLongPress,
}: {
  event: RelationshipEvent;
  chapterNumber: number;
  isFirst: boolean;
  onLongPress: (event: RelationshipEvent) => void;
}) {
  const config   = EVENT_TYPE_CONFIG[event.event_type];
  const Icon     = config?.icon ?? DEFAULT_EVENT_ICON;
  const hasPhoto = !!event.image_path;
  const vPad     = isFirst ? "pt-10 pb-2" : "pt-7 pb-2";

  const { pressing, handlers } = useLongPress(() => onLongPress(event));

  return (
    <div
      {...handlers}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-500 select-none cursor-pointer",
        vPad,
        pressing && "opacity-70 scale-[0.985] transition-all duration-150",
      )}
    >
      {hasPhoto ? (
        /* Foto com título e descrição sobrepostos */
        <div className="mb-6">
          <EventPhotoWithOverlay
            imagePath={event.image_path!}
            title={event.title}
            description={event.description}
            date={parseDateOnly(event.event_date)}
            chapterNumber={chapterNumber}
            isFirst={isFirst}
            eventLabel={config?.label}
          />
        </div>
      ) : (
        /* Sem foto: cabeçalho centrado + descrição */
        <div className="mb-5">
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
          {event.description && (
            <div className="text-center px-7">
              <p className="text-[13px] text-gray-500 dark:text-gray-400 italic leading-relaxed">
                "{event.description}"
              </p>
            </div>
          )}
        </div>
      )}

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
  const [menuEvent, setMenuEvent] = useState<RelationshipEvent | null>(null);

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
    <>
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
              onLongPress={setMenuEvent}
            />
          );
        })}
      </div>

      {/* ── Menu de contexto via Portal (evita transform ancestor) ── */}
      {menuEvent && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={() => setMenuEvent(null)}
          />
          <div className="relative w-full bg-background rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 pb-8">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-8 h-1 rounded-full bg-border" />
            </div>

            {/* Título do capítulo */}
            <p className="font-serif text-[15px] font-semibold text-[#1A1A1A] dark:text-zinc-100 text-center px-8 mb-5 leading-snug">
              "{menuEvent.title}"
            </p>

            <div className="px-5 space-y-2.5">
              <button
                onClick={() => { onEdit(menuEvent); setMenuEvent(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted/40 active:bg-muted/70 transition-colors"
              >
                <Pencil className="w-4 h-4 text-foreground/60" strokeWidth={1.5} />
                <span className="text-[14px] font-medium text-foreground">Editar este capítulo</span>
              </button>

              <button
                onClick={() => { onDelete(menuEvent); setMenuEvent(null); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 active:bg-red-100 dark:active:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                <span className="text-[14px] font-medium text-red-500">Remover este capítulo</span>
              </button>

              <button
                onClick={() => setMenuEvent(null)}
                className="w-full py-3 text-[13px] text-gray-400 dark:text-gray-500 text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

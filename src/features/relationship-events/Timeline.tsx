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

/** Constrói as entradas ordenadas cronologicamente (mais antiga primeiro = Capítulo 1). */
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

  // Ordem ascendente — para o livro se lê do início para o fim
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
  return <img src={url} alt="" className="w-full h-72 object-cover" />;
}

// ── Divisor entre capítulos ───────────────────────────────────────────────────
function ChapterDivider() {
  return (
    <div className="flex items-center gap-3 my-2 px-5">
      <div className="h-px flex-1 bg-rose-100/60 dark:bg-rose-900/15" />
      <div className="flex gap-1.5">
        <div className="w-1 h-1 rounded-full bg-rose-300 dark:bg-rose-700" />
        <div className="w-1 h-1 rounded-full bg-rose-200 dark:bg-rose-800" />
        <div className="w-1 h-1 rounded-full bg-rose-100 dark:bg-rose-900" />
      </div>
      <div className="h-px flex-1 bg-rose-100/60 dark:bg-rose-900/15" />
    </div>
  );
}

// ── XS milestone: separador invisível, só para registar o momento ─────────────
function XSSeparator({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-5">
      <div className="h-px w-6 bg-rose-100/50 dark:bg-rose-900/20" />
      <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">
        {label} · {format(date, "d 'de' MMM 'de' yyyy", { locale: pt })}
      </span>
      <div className="h-px w-6 bg-rose-100/50 dark:bg-rose-900/20" />
    </div>
  );
}

// ── Cabeçalho partilhado de cada capítulo ─────────────────────────────────────
function ChapterHeader({
  chapterNumber,
  title,
  date,
  titleSize = "md",
}: {
  chapterNumber: number;
  title: string;
  date: Date;
  titleSize?: "sm" | "md" | "xl";
}) {
  const sizeClass = {
    sm: "text-[20px]",
    md: "text-[24px]",
    xl: "text-[30px]",
  }[titleSize];

  return (
    <div className="text-center px-6 mb-6">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px w-10 bg-rose-200/60 dark:bg-rose-800/30" />
        <p className="text-[8px] font-bold text-rose-400 uppercase tracking-[0.35em]">
          Capítulo {chapterNumber}
        </p>
        <div className="h-px w-10 bg-rose-200/60 dark:bg-rose-800/30" />
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

// ── Capítulo de milestone — pesos sm/md/xl ─────────────────────────────────────
function MilestoneChapter({
  label,
  date,
  weight,
  phrase,
  chapterNumber,
}: {
  label: string;
  date: Date;
  weight: MilestoneWeight;
  phrase?: string;
  chapterNumber: number;
}) {
  const titleSize = weight === "xl" ? "xl" : weight === "md" ? "md" : "sm";
  const vPadding  = weight === "xl" ? "py-14" : weight === "md" ? "py-10" : "py-8";

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-500", vPadding)}>
      <ChapterHeader
        chapterNumber={chapterNumber}
        title={label}
        date={date}
        titleSize={titleSize}
      />

      {phrase && (
        <p
          className={cn(
            "text-center italic text-gray-500 dark:text-gray-400 leading-relaxed px-8 max-w-[300px] mx-auto",
            weight === "xl" ? "text-[14px]" : "text-[12px]",
          )}
        >
          "{phrase}"
        </p>
      )}

      <div
        className={cn(
          "flex items-center justify-center gap-2 mt-6",
          weight === "xl" && "mt-8",
        )}
      >
        {weight === "xl" && (
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-rose-200" />
          </div>
        )}
      </div>

      <ChapterDivider />
    </div>
  );
}

// ── Capítulo de evento criado pelo casal ──────────────────────────────────────
function EventChapter({
  event,
  chapterNumber,
  onEdit,
  onDelete,
}: {
  event: RelationshipEvent;
  chapterNumber: number;
  onEdit: (event: RelationshipEvent) => void;
  onDelete: (event: RelationshipEvent) => void;
}) {
  const config = EVENT_TYPE_CONFIG[event.event_type];
  const Icon   = config?.icon ?? DEFAULT_EVENT_ICON;

  return (
    <div className="py-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Ícone do tipo de evento */}
      <div className="flex justify-center mb-5">
        <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
        </div>
      </div>

      <ChapterHeader
        chapterNumber={chapterNumber}
        title={event.title}
        date={parseDateOnly(event.event_date)}
        titleSize="md"
      />

      {/* Fotografia — protagonista da página */}
      {event.image_path && (
        <div className="mb-8 shadow-[0_4px_32px_rgba(0,0,0,0.10)]">
          <EventImage imagePath={event.image_path} />
        </div>
      )}

      {/* Descrição em destaque */}
      {event.description && (
        <div className="text-center px-8 mb-6">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 italic leading-relaxed">
            "{event.description}"
          </p>
        </div>
      )}

      {/* Editar / Remover — subtis */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => onEdit(event)}
          className="flex items-center gap-1.5 text-[11px] text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
        >
          <Pencil className="w-3 h-3" strokeWidth={1.5} />
          Editar
        </button>
        <div className="w-px h-3.5 bg-border/50" />
        <button
          onClick={() => onDelete(event)}
          className="flex items-center gap-1.5 text-[11px] text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          Remover
        </button>
      </div>

      <ChapterDivider />
    </div>
  );
}

// ── Livro — componente principal exportado ────────────────────────────────────
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

  // Pré-processa: atribuir número de capítulo a todos excepto xs
  let chapterCount = 0;
  const processedEntries = entries.map((entry) => {
    const isXS = entry.kind === "milestone" && entry.weight === "xs";
    return { entry, chapterNumber: isXS ? null : ++chapterCount };
  });

  return (
    <div>
      {processedEntries.map(({ entry, chapterNumber }, i) => {
        if (entry.kind === "milestone") {
          if (entry.weight === "xs") {
            return (
              <XSSeparator
                key={`xs-${i}`}
                label={entry.label}
                date={entry.date}
              />
            );
          }
          return (
            <MilestoneChapter
              key={`m-${i}`}
              label={entry.label}
              date={entry.date}
              weight={entry.weight}
              phrase={MILESTONE_PHRASES[entry.label]}
              chapterNumber={chapterNumber!}
            />
          );
        }
        return (
          <EventChapter
            key={entry.event.id}
            event={entry.event}
            chapterNumber={chapterNumber!}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

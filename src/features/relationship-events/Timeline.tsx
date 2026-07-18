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

// ── Carregamento de imagem assinada ──────────────────────────────────────────
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

// ── Milestones com hierarquia visual ─────────────────────────────────────────
function MilestoneXS({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center gap-2.5 py-1 px-1">
      <div className="w-1.5 h-1.5 rounded-full bg-rose-200 dark:bg-rose-800 shrink-0" />
      <span className="text-[11px] text-muted-foreground/45 font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground/30 ml-auto shrink-0">
        {format(date, "d 'de' MMM", { locale: pt })}
      </span>
    </div>
  );
}

function MilestoneSM({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <Sparkles className="w-3 h-3 text-rose-300/70 dark:text-rose-700 shrink-0" strokeWidth={1.5} />
      <span className="text-[12px] text-muted-foreground/60 font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground/35 ml-auto shrink-0">
        {format(date, "d 'de' MMMM", { locale: pt })}
      </span>
    </div>
  );
}

function MilestoneMD({ label, date }: { label: string; date: Date }) {
  return (
    <div className="rounded-xl border border-rose-100/70 dark:border-rose-900/25 bg-rose-50/30 dark:bg-rose-950/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <Sparkles className="w-3.5 h-3.5 text-rose-400/70 shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground/75">{label}</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        </div>
      </div>
    </div>
  );
}

function MilestoneXL({ label, date }: { label: string; date: Date }) {
  return (
    <div className="relative rounded-2xl border border-rose-100 dark:border-rose-900/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Soft gradient fill */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50/80 via-rose-50/20 to-transparent dark:from-rose-950/30 dark:via-rose-950/10 dark:to-transparent pointer-events-none" />
      <div className="relative p-5">
        <p className="text-[9px] font-bold text-rose-400/70 uppercase tracking-[0.22em] mb-2.5">
          Marco da relação
        </p>
        <p className="font-serif text-[26px] font-bold text-foreground leading-tight">{label}</p>
        <p className="text-[12px] text-muted-foreground/55 mt-1.5">
          {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
        {/* Decorative dots */}
        <div className="flex gap-1 mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-300/80" />
          <div className="w-1.5 h-1.5 rounded-full bg-rose-200/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-rose-100/80" />
        </div>
      </div>
    </div>
  );
}

function MilestoneEntry({
  label,
  weight,
  date,
}: {
  label: string;
  weight: MilestoneWeight;
  date: Date;
}) {
  if (weight === "xl") return <MilestoneXL label={label} date={date} />;
  if (weight === "md") return <MilestoneMD label={label} date={date} />;
  if (weight === "sm") return <MilestoneSM label={label} date={date} />;
  return <MilestoneXS label={label} date={date} />;
}

// ── Card de evento criado pelo casal — estilo scrapbook ───────────────────────
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

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-400 bg-background">
      {event.image_path ? (
        /* With photo — immersive */
        <div className="relative">
          <EventImage imagePath={event.image_path} className="h-52" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          {/* Edit/delete top-right */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button
              onClick={() => onEdit(event)}
              className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <Pencil className="w-3 h-3" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => onDelete(event)}
              className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
          {/* Caption over photo */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/65 uppercase tracking-wider bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5 mb-2">
              <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
              {config?.label}
            </span>
            <p className="font-serif text-[20px] font-bold text-white leading-tight">{event.title}</p>
            <p className="text-[11px] text-white/55 mt-0.5">{dateStr}</p>
          </div>
        </div>
      ) : (
        /* Without photo — elegant card */
        <>
          <div className={cn("h-0.5", colors.topBar)} />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colors.iconBg)}>
                <Icon className={cn("w-4 h-4", colors.iconText)} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[16px] font-bold text-foreground leading-tight">{event.title}</p>
                <p className={cn("text-[10px] font-semibold mt-0.5", colors.dateText)}>{dateStr}</p>
                {event.description && (
                  <p className="text-[12px] text-muted-foreground/80 mt-2 leading-relaxed">{event.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => onEdit(event)}
                  className="p-1.5 rounded-lg text-muted-foreground/35 hover:text-muted-foreground active:bg-muted transition-colors"
                >
                  <Pencil className="w-3 h-3" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => onDelete(event)}
                  className="p-1.5 rounded-lg text-muted-foreground/35 hover:text-muted-foreground active:bg-muted transition-colors"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Description below photo (if has photo + description) */}
      {event.image_path && event.description && (
        <div className="px-4 py-3 border-t border-border/30">
          <p className="text-[12px] text-muted-foreground/75 leading-relaxed">{event.description}</p>
        </div>
      )}
    </div>
  );
}

// ── Timeline principal ────────────────────────────────────────────────────────
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
      <div className="py-10 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border border-rose-100 dark:border-rose-900/30 flex items-center justify-center mx-auto">
          <Sparkles className="w-4 h-4 text-rose-300" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-serif text-[15px] font-semibold text-foreground/70">A vossa história começa aqui</p>
          <p className="text-[12px] text-muted-foreground/50 mt-1.5 leading-relaxed">
            Toquem no + para adicionar a primeira data importante.
          </p>
        </div>
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
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([year, yearEntries]) => (
        <div key={year}>

          {/* Ano como número de capítulo */}
          <div className="flex items-end gap-4 mb-5">
            <span
              className="font-serif font-bold text-foreground/[0.08] dark:text-foreground/[0.06] leading-none select-none"
              style={{ fontSize: "56px" }}
            >
              {year}
            </span>
            <div className="flex-1 h-px bg-border/30 mb-2.5" />
          </div>

          {/* Entradas do ano */}
          <div className="space-y-3">
            {yearEntries.map((entry, i) =>
              entry.kind === "milestone" ? (
                <MilestoneEntry
                  key={`m-${year}-${i}`}
                  label={entry.label}
                  weight={entry.weight}
                  date={entry.date}
                />
              ) : (
                <EventCard
                  key={entry.event.id}
                  event={entry.event}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              )
            )}
          </div>

        </div>
      ))}
    </div>
  );
}

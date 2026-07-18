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
  type RelationshipEvent,
  type TimelineEntry,
  type RelationshipEventType,
} from "./types";

const EVENT_COLORS: Record<RelationshipEventType, { iconBg: string; iconText: string; topBar: string; dateText: string }> = {
  first_meeting: { iconBg: "bg-rose-50 dark:bg-rose-950/30",     iconText: "text-rose-400",    topBar: "bg-rose-400",    dateText: "text-rose-400" },
  dating:        { iconBg: "bg-pink-50 dark:bg-pink-950/30",     iconText: "text-pink-400",    topBar: "bg-pink-400",    dateText: "text-pink-400" },
  engagement:    { iconBg: "bg-violet-50 dark:bg-violet-950/30", iconText: "text-violet-400",  topBar: "bg-violet-400",  dateText: "text-violet-400" },
  marriage:      { iconBg: "bg-purple-50 dark:bg-purple-950/30", iconText: "text-purple-400",  topBar: "bg-purple-400",  dateText: "text-purple-400" },
  trip:          { iconBg: "bg-sky-50 dark:bg-sky-950/30",       iconText: "text-sky-400",     topBar: "bg-sky-400",     dateText: "text-sky-400" },
  custom:        { iconBg: "bg-muted",                            iconText: "text-muted-foreground", topBar: "bg-muted-foreground/30", dateText: "text-muted-foreground/60" },
};

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
        entries.push({ kind: "milestone", label: milestone.label, date });
      }
    }
  }

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function EventImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [imagePath]);
  if (!url) return null;
  return <img src={url} alt="" className="w-full h-40 object-cover" />;
}

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
      <div className="glass-card p-8 text-center space-y-2">
        <Sparkles className="w-7 h-7 text-rose-300 mx-auto" strokeWidth={1.5} />
        <p className="font-serif text-[15px] text-foreground">A vossa história começa aqui</p>
        <p className="text-[12px] text-muted-foreground">
          Adicionem a primeira data importante para começar a contar.
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
        <div key={year} className="space-y-3">

          {/* Year divider */}
          <div className="flex items-center gap-3 px-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground/50 tracking-[0.15em] uppercase">
              {year}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Entries with vertical timeline line */}
          <div className="relative ml-3.5 border-l border-rose-200/40 dark:border-rose-800/20 space-y-3 pl-5">
            {yearEntries.map((entry, i) =>
              entry.kind === "milestone" ? (
                <div key={`m-${year}-${i}`} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[21px] top-[11px] w-2.5 h-2.5 rounded-full bg-background border-2 border-rose-300 dark:border-rose-700 z-10" />

                  {/* Milestone pill */}
                  <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-rose-400 shrink-0" strokeWidth={1.5} />
                    <span className="text-[12px] font-semibold text-rose-500 dark:text-rose-400 leading-none">
                      {entry.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                      {format(entry.date, "d 'de' MMMM", { locale: pt })}
                    </span>
                  </div>
                </div>
              ) : (
                <EventCard key={entry.event.id} event={entry.event} onEdit={onEdit} onDelete={onDelete} />
              )
            )}
          </div>

        </div>
      ))}
    </div>
  );
}

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

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-background border-2 border-border z-10" />

      {/* Card */}
      <div className="glass-card overflow-hidden">
        {/* Color accent top bar */}
        <div className={cn("h-0.5 w-full", colors.topBar)} />

        {event.image_path && <EventImage imagePath={event.image_path} />}

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colors.iconBg)}>
              <Icon className={cn("w-4 h-4", colors.iconText)} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-[15px] font-semibold text-foreground leading-tight">
                {event.title}
              </p>
              <p className={cn("text-[10px] font-semibold mt-0.5", colors.dateText)}>
                {format(parseDateOnly(event.event_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
              {event.description && (
                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={() => onEdit(event)}
                className="p-1.5 rounded-lg text-muted-foreground/50 active:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => onDelete(event)}
                className="p-1.5 rounded-lg text-muted-foreground/50 active:bg-muted transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

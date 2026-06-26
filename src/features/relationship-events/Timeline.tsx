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
} from "./types";

function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function buildTimelineEntries(events: RelationshipEvent[], relationshipStartDate: string | null): TimelineEntry[] {
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
    supabase.storage.from("memories").createSignedUrl(imagePath, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [imagePath]);
  if (!url) return null;
  return <img src={url} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />;
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
        <p className="text-[12px] text-muted-foreground">Adicionem a primeira data importante para começar a contar.</p>
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
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([year, yearEntries]) => (
        <div key={year} className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-foreground/80 px-1">{year}</h2>
          <div className="space-y-2.5">
            {yearEntries.map((entry, i) =>
              entry.kind === "milestone" ? (
                <div key={`m-${year}-${i}`} className="flex items-center gap-2.5 px-2 py-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-300 shrink-0" strokeWidth={1.5} />
                  <span className="text-[12px] text-muted-foreground/80 font-medium">{entry.label}</span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {format(entry.date, "d 'de' MMMM", { locale: pt })}
                  </span>
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
  const Icon = config?.icon ?? DEFAULT_EVENT_ICON;

  return (
    <div className="glass-card p-4">
      {event.image_path && <EventImage imagePath={event.image_path} />}
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0")}>
          <Icon className="w-4.5 h-4.5 text-rose-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[15px] font-semibold text-foreground leading-tight">{event.title}</p>
          <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">
            {format(parseDateOnly(event.event_date), "d 'de' MMMM yyyy", { locale: pt })}
          </p>
          {event.description && (
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">{event.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => onEdit(event)} className="p-1.5 rounded-lg text-muted-foreground/50 active:bg-muted">
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={() => onDelete(event)} className="p-1.5 rounded-lg text-muted-foreground/50 active:bg-muted">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

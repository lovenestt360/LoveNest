import { useCallback, useEffect, useState } from "react";
import { addYears, differenceInDays, isBefore, setYear } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { RelationshipEvent, RelationshipEventType } from "./types";

function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function nextOccurrence(eventDate: Date, today: Date): Date {
  const thisYear = setYear(eventDate, today.getFullYear());
  return isBefore(thisYear, today) ? addYears(thisYear, 1) : thisYear;
}

export interface NextSpecialDate {
  title: string;
  daysUntil: number;
}

export interface CreateRelationshipEventInput {
  title: string;
  description?: string | null;
  event_type: RelationshipEventType;
  event_date: string;
  image_path?: string | null;
}

export function useRelationshipEvents(coupleSpaceId: string | null) {
  const [events, setEvents] = useState<RelationshipEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!coupleSpaceId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase
      .from("relationship_events" as any)
      .select("*")
      .eq("couple_space_id", coupleSpaceId)
      .order("event_date", { ascending: true }) as any);

    if (!error && data) {
      setEvents(data as RelationshipEvent[]);
    }
    setLoading(false);
  }, [coupleSpaceId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (userId: string, input: CreateRelationshipEventInput) => {
    if (!coupleSpaceId) return { error: new Error("Sem espaço de casal") };
    const { error } = await (supabase.from("relationship_events" as any).insert({
      couple_space_id: coupleSpaceId,
      created_by: userId,
      title: input.title,
      description: input.description ?? null,
      event_type: input.event_type,
      event_date: input.event_date,
      image_path: input.image_path ?? null,
    }) as any);
    if (!error) await fetchEvents();
    return { error };
  }, [coupleSpaceId, fetchEvents]);

  const updateEvent = useCallback(async (id: string, input: Partial<CreateRelationshipEventInput>) => {
    const { error } = await (supabase.from("relationship_events" as any).update(input).eq("id", id) as any);
    if (!error) await fetchEvents();
    return { error };
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await (supabase.from("relationship_events" as any).delete().eq("id", id) as any);
    if (!error) await fetchEvents();
    return { error };
  }, [fetchEvents]);

  // Próxima data especial — recorrência anual a partir dos eventos reais
  // (nunca dos marcos de tempo-juntos, que já têm o seu próprio contador
  // ao vivo no TimeTogetherCard).
  let nextSpecialDate: NextSpecialDate | null = null;
  if (events.length > 0) {
    const today = new Date();
    const upcoming = events
      .map((e) => {
        const next = nextOccurrence(parseDateOnly(e.event_date), today);
        return { title: e.title, daysUntil: differenceInDays(next, today) };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
    nextSpecialDate = upcoming[0] ?? null;
  }

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent, nextSpecialDate };
}

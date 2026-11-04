import { useCallback, useEffect, useState } from "react";
import { addYears, differenceInDays, isBefore, setYear } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { notifyLovePointsChanged } from "@/lib/lovePoints";
import { notifyPartner } from "@/lib/notifyPartner";
import type { RelationshipEvent, RelationshipEventType } from "./types";

function parseDateOnly(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function nextOccurrence(eventDate: Date, today: Date): Date {
  const thisYear = setYear(eventDate, today.getFullYear());
  return isBefore(thisYear, today) ? addYears(thisYear, 1) : thisYear;
}

export interface NextSpecialDate {
  id: string;
  title: string;
  daysUntil: number;
}

export interface CreateRelationshipEventInput {
  title: string;
  description?: string | null;
  event_type: RelationshipEventType;
  event_date: string;
  image_path?: string | null;
  /** Só na criação: o outro recebe o capítulo selado. Precisa da migração 20261104120000. */
  is_surprise?: boolean;
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
      // Só envia a coluna quando é surpresa: sem a migração, o resto continua a funcionar.
      ...(input.is_surprise ? { is_surprise: true } : {}),
    }) as any);
    if (!error) {
      await fetchEvents();
      notifyLovePointsChanged();
      if (input.is_surprise) {
        notifyPartner({
          couple_space_id: coupleSpaceId,
          title: "Tens um capítulo surpresa",
          body: "Escreveram-te um capítulo na Nossa História. Abre-o quando quiseres.",
          url: "/historia",
          type: "memorias",
        });
      }
    }
    return { error };
  }, [coupleSpaceId, fetchEvents]);

  const updateEvent = useCallback(async (id: string, input: Partial<CreateRelationshipEventInput>) => {
    const { is_surprise: _ignored, ...rest } = input;
    const { error } = await (supabase.from("relationship_events" as any).update(rest).eq("id", id) as any);
    if (!error) await fetchEvents();
    return { error };
  }, [fetchEvents]);

  /** Quebra o selo de um capítulo surpresa (fica aberto para sempre). */
  const openSurprise = useCallback(async (id: string) => {
    const openedAt = new Date().toISOString();
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, opened_at: openedAt } : e)));
    const { error } = await (supabase
      .from("relationship_events" as any)
      .update({ opened_at: openedAt })
      .eq("id", id) as any);
    return { error };
  }, []);

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
      // Uma surpresa por abrir não pode aparecer na Home (revelava o título).
      .filter((e) => !(e.is_surprise && !e.opened_at))
      .map((e) => {
        const next = nextOccurrence(parseDateOnly(e.event_date), today);
        return { id: e.id, title: e.title, daysUntil: differenceInDays(next, today) };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
    nextSpecialDate = upcoming[0] ?? null;
  }

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent, openSurprise, nextSpecialDate };
}

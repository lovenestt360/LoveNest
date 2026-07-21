import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

export interface HistoryPoint {
  lat: number;
  lng: number;
  speed_kmh: number | null;
  recorded_at: string;
}

export function useLocationHistory(partnerUserId: string | null) {
  const spaceId = useCoupleSpaceId();
  const [partnerPath, setPartnerPath] = useState<HistoryPoint[]>([]);

  const fetchTodayPath = useCallback(async () => {
    if (!spaceId || !partnerUserId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await (supabase as any)
      .from("location_history")
      .select("lat,lng,speed_kmh,recorded_at")
      .eq("couple_space_id", spaceId)
      .eq("user_id", partnerUserId)
      .gte("recorded_at", today.toISOString())
      .order("recorded_at", { ascending: true });
    if (data) setPartnerPath(data as HistoryPoint[]);
  }, [spaceId, partnerUserId]);

  useEffect(() => { fetchTodayPath(); }, [fetchTodayPath]);

  // Realtime: append new points as they arrive
  useEffect(() => {
    if (!spaceId || !partnerUserId) return;
    const ch = (supabase as any)
      .channel(`loc-history-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_history", filter: `couple_space_id=eq.${spaceId}` },
        (payload: { new: HistoryPoint & { user_id: string } }) => {
          if (payload.new.user_id === partnerUserId) {
            setPartnerPath(prev => [...prev, payload.new]);
          }
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [spaceId, partnerUserId]);

  return { partnerPath };
}

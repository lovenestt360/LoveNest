import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import type { LocationRecord } from "@/hooks/useLocationSharing";

export interface MeetingMoment {
  id: string;
  couple_space_id: string;
  met_at: string;
  place_name: string | null;
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function useMeetingMoments(
  myLocation: LocationRecord | null,
  partnerLocation: LocationRecord | null,
  mySharing: boolean,
  partnerSharing: boolean,
) {
  const spaceId = useCoupleSpaceId();
  const [todayMoments, setTodayMoments] = useState<MeetingMoment[]>([]);
  const lastMeetingRef = useRef<Date | null>(null);

  // Fetch today's meetings on mount
  const fetchToday = useCallback(async () => {
    if (!spaceId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await (supabase as any)
      .from("meeting_moments")
      .select("*")
      .eq("couple_space_id", spaceId)
      .gte("met_at", today.toISOString())
      .order("met_at", { ascending: false });
    if (data) {
      setTodayMoments(data as MeetingMoment[]);
      if ((data as MeetingMoment[]).length > 0) {
        lastMeetingRef.current = new Date((data as MeetingMoment[])[0].met_at);
      }
    }
  }, [spaceId]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // Detect new meeting when both are within 100m
  useEffect(() => {
    if (!spaceId) return;
    if (!mySharing || !partnerSharing) return;
    if (!myLocation || !partnerLocation) return;

    const hasRealPos = (loc: LocationRecord) => loc.lat !== 0 || loc.lng !== 0;
    if (!hasRealPos(myLocation) || !hasRealPos(partnerLocation)) return;

    const dist = haversineMeters(myLocation, partnerLocation);
    if (dist > 100) return;

    // Throttle: only record if last meeting was > 30 min ago
    const now = new Date();
    if (
      lastMeetingRef.current &&
      now.getTime() - lastMeetingRef.current.getTime() < 30 * 60 * 1000
    ) return;

    lastMeetingRef.current = now;

    const placeName =
      myLocation.address?.split(",")[0] ??
      partnerLocation.address?.split(",")[0] ??
      null;

    (supabase as any)
      .from("meeting_moments")
      .insert({ couple_space_id: spaceId, met_at: now.toISOString(), place_name: placeName })
      .select()
      .single()
      .then(({ data }: { data: MeetingMoment | null }) => {
        if (data) setTodayMoments(prev => [data, ...prev]);
      });
  }, [spaceId, mySharing, partnerSharing, myLocation, partnerLocation]);

  return { todayMoments };
}

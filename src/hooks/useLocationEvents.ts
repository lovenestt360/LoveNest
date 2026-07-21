import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAuth } from "@/features/auth/AuthContext";
import type { LocationRecord } from "@/hooks/useLocationSharing";
import type { FavoritePlace } from "@/hooks/useFavoritePlaces";
import type { LocationNotifPrefs } from "@/hooks/useLocationNotifPrefs";
import { notifyPartner } from "@/lib/notifyPartner";

export interface LocationEvent {
  id: string;
  couple_space_id: string;
  user_id: string;
  event_type: "enter" | "exit";
  place_name: string;
  occurred_at: string;
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

function detectNearestPlace(
  lat: number,
  lng: number,
  places: FavoritePlace[],
): string | null {
  for (const p of places) {
    if (haversineMeters({ lat, lng }, { lat: p.lat, lng: p.lng }) <= p.radius_m) {
      return p.name;
    }
  }
  return null;
}

export function useLocationEvents(
  myLocation: LocationRecord | null,
  partnerLocation: LocationRecord | null,
  places: FavoritePlace[],
  myName: string,
  notifPrefs: LocationNotifPrefs,
) {
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const [partnerTodayEvents, setPartnerTodayEvents] = useState<LocationEvent[]>([]);

  const prevPlaceRef = useRef<string | null | undefined>(undefined);
  const hasInitRef = useRef(false);
  const proxNotifiedRef = useRef(false);

  // Fetch partner's events for today on mount
  const fetchPartnerEvents = useCallback(async () => {
    if (!spaceId || !user?.id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await (supabase as any)
      .from("location_events")
      .select("*")
      .eq("couple_space_id", spaceId)
      .neq("user_id", user.id)
      .gte("occurred_at", today.toISOString())
      .order("occurred_at", { ascending: false });
    if (data) setPartnerTodayEvents(data as LocationEvent[]);
  }, [spaceId, user?.id]);

  useEffect(() => { fetchPartnerEvents(); }, [fetchPartnerEvents]);

  // Realtime: new partner events appear instantly in the timeline
  useEffect(() => {
    if (!spaceId || !user?.id) return;
    const ch = (supabase as any)
      .channel(`loc-events-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_events", filter: `couple_space_id=eq.${spaceId}` },
        (payload: { new: LocationEvent }) => {
          if (payload.new.user_id !== user.id) {
            setPartnerTodayEvents(prev => [payload.new, ...prev]);
          }
        },
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [spaceId, user?.id]);

  // Detect MY own place transitions → record event + optionally notify partner
  useEffect(() => {
    if (!spaceId || !user?.id) return;
    if (!myLocation || (myLocation.lat === 0 && myLocation.lng === 0)) return;
    if (places.length === 0) return;

    const currentPlace = detectNearestPlace(myLocation.lat, myLocation.lng, places);

    if (!hasInitRef.current) {
      prevPlaceRef.current = currentPlace;
      hasInitRef.current = true;
      return;
    }

    if (currentPlace === prevPlaceRef.current) return;

    const prevPlace = prevPlaceRef.current;
    prevPlaceRef.current = currentPlace;

    const record = (eventType: "enter" | "exit", placeName: string) =>
      (supabase as any).from("location_events").insert({
        couple_space_id: spaceId,
        user_id: user.id,
        event_type: eventType,
        place_name: placeName,
        occurred_at: new Date().toISOString(),
      });

    if (prevPlace != null) {
      record("exit", prevPlace);
      if (notifPrefs.notify_leaves) {
        notifyPartner({
          couple_space_id: spaceId,
          title: myName,
          body: `Saiu de ${prevPlace}`,
          url: "/localizacao",
          type: "location",
        });
      }
    }

    if (currentPlace != null) {
      record("enter", currentPlace);
      if (notifPrefs.notify_arrives) {
        notifyPartner({
          couple_space_id: spaceId,
          title: myName,
          body: `Chegou a ${currentPlace}`,
          url: "/localizacao",
          type: "location",
        });
      }
    }
  }, [spaceId, user?.id, myLocation, places, myName, notifPrefs]);

  // Detect proximity → notify partner when both < 100 m
  useEffect(() => {
    if (!spaceId || !notifPrefs.notify_proximity) return;
    if (!myLocation || !partnerLocation) return;
    if (myLocation.lat === 0 || partnerLocation.lat === 0) return;

    const dist = haversineMeters(myLocation, partnerLocation);
    if (dist < 100 && !proxNotifiedRef.current) {
      proxNotifiedRef.current = true;
      notifyPartner({
        couple_space_id: spaceId,
        title: myName,
        body: "Estão perto um do outro",
        url: "/localizacao",
        type: "location",
      });
    } else if (dist >= 200) {
      proxNotifiedRef.current = false;
    }
  }, [spaceId, myLocation, partnerLocation, myName, notifPrefs.notify_proximity]);

  return { partnerTodayEvents };
}

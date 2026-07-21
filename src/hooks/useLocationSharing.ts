import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

export interface LocationRecord {
  user_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  address: string | null;
  sharing_enabled: boolean;
  updated_at: string;
}

// ── Haversine distance between two GPS points (metres) ──────────────────────
function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
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

// ── Reverse geocode via Nominatim (OpenStreetMap) ────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt`,
      { headers: { "User-Agent": "LoveNest-App/1.0" } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const parts = [
      d.address?.road,
      d.address?.city ?? d.address?.town ?? d.address?.village,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : (d.display_name?.split(",")[0] ?? null);
  } catch {
    return null;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useLocationSharing() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  const [myLocation,      setMyLocation]      = useState<LocationRecord | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationRecord | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Refs to avoid stale closures nos callbacks de geolocalização
  const intervalIdRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUploadedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const userIdRef          = useRef<string | null>(null);
  const spaceIdRef         = useRef<string | null>(null);
  const mySharingRef       = useRef(false);

  userIdRef.current  = user?.id  ?? null;
  spaceIdRef.current = spaceId;

  // ── Fetch both rows from DB ──────────────────────────────────────────────
  const fetchLocations = useCallback(async () => {
    if (!spaceId || !user?.id) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("member_locations")
      .select("user_id,lat,lng,accuracy,address,sharing_enabled,updated_at")
      .eq("couple_space_id", spaceId);

    if (data) {
      const mine    = (data as LocationRecord[]).find(r => r.user_id === user.id)    ?? null;
      const partner = (data as LocationRecord[]).find(r => r.user_id !== user.id) ?? null;
      setMyLocation(mine);
      setPartnerLocation(partner);
      mySharingRef.current = mine?.sharing_enabled ?? false;
    }
    setLoading(false);
  }, [spaceId, user?.id]);

  // ── Leitura única de posição e upload ───────────────────────────────────
  const getAndUpload = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPermissionDenied(false);
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const uid = userIdRef.current;
        const sid = spaceIdRef.current;
        if (!uid || !sid) return;

        const current = { lat, lng };

        if (
          lastUploadedPosRef.current &&
          haversineMeters(lastUploadedPosRef.current, current) < 50
        ) return;

        let address: string | null = null;
        if (
          !lastGeocodedPosRef.current ||
          haversineMeters(lastGeocodedPosRef.current, current) > 200
        ) {
          address = await reverseGeocode(lat, lng);
          if (address) lastGeocodedPosRef.current = current;
        }

        lastUploadedPosRef.current = current;

        const row = {
          user_id:         uid,
          couple_space_id: sid,
          lat,
          lng,
          accuracy:        accuracy ?? null,
          ...(address !== null ? { address } : {}),
          sharing_enabled: true,
          updated_at:      new Date().toISOString(),
        };

        await (supabase as any)
          .from("member_locations")
          .upsert(row, { onConflict: "user_id,couple_space_id" });

        setMyLocation(prev => ({
          ...(prev ?? { user_id: uid, accuracy: null, address: null, sharing_enabled: true, updated_at: row.updated_at }),
          lat, lng,
          accuracy: accuracy ?? null,
          ...(address !== null ? { address } : {}),
          updated_at: row.updated_at,
        }));
      },
      (err) => {
        if (err.code === 1 /* PERMISSION_DENIED */) {
          setPermissionDenied(true);
          if (intervalIdRef.current !== null) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
          }
        }
        // POSITION_UNAVAILABLE (2) e TIMEOUT (3): transitórios, próximo intervalo tenta de novo
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 }
    );
  }, []);

  // ── Start polling (getCurrentPosition a cada 30s) ────────────────────────
  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    if (intervalIdRef.current !== null) return; // already running
    getAndUpload(); // leitura imediata
    intervalIdRef.current = setInterval(getAndUpload, 30_000);
  }, [getAndUpload]);

  // ── Stop polling ─────────────────────────────────────────────────────────
  const stopWatch = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // ── Toggle sharing on/off ────────────────────────────────────────────────
  const toggleSharing = useCallback(async () => {
    const uid = userIdRef.current;
    const sid = spaceIdRef.current;
    if (!uid || !sid) return;

    const newSharing = !mySharingRef.current;
    mySharingRef.current = newSharing;

    await (supabase as any)
      .from("member_locations")
      .upsert(
        {
          user_id:         uid,
          couple_space_id: sid,
          lat:             myLocation?.lat ?? 0,
          lng:             myLocation?.lng ?? 0,
          sharing_enabled: newSharing,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "user_id,couple_space_id" }
      );

    setMyLocation(prev =>
      prev ? { ...prev, sharing_enabled: newSharing } : null
    );

    if (newSharing) {
      setPermissionDenied(false);
      startWatch();
    } else {
      stopWatch();
    }
  }, [myLocation, startWatch, stopWatch]);

  // ── Initial load + start watch if already enabled ───────────────────────
  useEffect(() => {
    fetchLocations().then(() => {
      if (mySharingRef.current) startWatch();
    });
    return () => stopWatch();
  }, [fetchLocations, startWatch, stopWatch]);

  // ── Realtime: partner location updates ───────────────────────────────────
  useEffect(() => {
    if (!spaceId || !user?.id) return;
    const channel = supabase
      .channel(`location-rt-${spaceId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "member_locations",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as LocationRecord;
          if (!row) return;
          if (row.user_id === user.id) {
            // Own row updated externally (e.g. from Settings toggle on another device)
            setMyLocation(row);
            mySharingRef.current = row.sharing_enabled;
            if (row.sharing_enabled && intervalIdRef.current === null) startWatch();
            if (!row.sharing_enabled && intervalIdRef.current !== null) stopWatch();
          } else {
            setPartnerLocation(row);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, user?.id, startWatch, stopWatch]);

  const mySharing      = myLocation?.sharing_enabled      ?? false;
  const partnerSharing = partnerLocation?.sharing_enabled ?? false;

  const retryWatch = useCallback(() => {
    setPermissionDenied(false);
    stopWatch();
    startWatch();
  }, [startWatch, stopWatch]);

  return {
    myLocation,
    partnerLocation,
    mySharing,
    partnerSharing,
    toggleSharing,
    retryWatch,
    loading,
    permissionDenied,
  };
}

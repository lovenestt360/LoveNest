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
  battery_level: number | null;
  is_charging: boolean | null;
  network_type: string | null;
  speed_kmh: number | null;
}

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

async function getBatteryInfo(): Promise<{ level: number | null; charging: boolean | null }> {
  try {
    if ("getBattery" in navigator) {
      const bat = await (navigator as any).getBattery();
      return { level: Math.round(bat.level * 100), charging: bat.charging };
    }
  } catch { /* not supported */ }
  return { level: null, charging: null };
}

function getNetworkType(): string | null {
  const conn = (navigator as any).connection ?? (navigator as any).mozConnection;
  if (!conn) return null;
  return conn.effectiveType ?? conn.type ?? null;
}

export function useLocationSharing() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  const [myLocation,      setMyLocation]      = useState<LocationRecord | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationRecord | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [geoErrorMsg,      setGeoErrorMsg]      = useState<string | null>(null);

  const intervalIdRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUploadedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastHistoryPosRef  = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const userIdRef          = useRef<string | null>(null);
  const spaceIdRef         = useRef<string | null>(null);
  const mySharingRef       = useRef(false);

  userIdRef.current  = user?.id  ?? null;
  spaceIdRef.current = spaceId;

  const fetchLocations = useCallback(async () => {
    if (!spaceId || !user?.id) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("member_locations")
      .select("user_id,lat,lng,accuracy,address,sharing_enabled,updated_at,battery_level,is_charging,network_type,speed_kmh")
      .eq("couple_space_id", spaceId);

    if (data) {
      const mine    = (data as LocationRecord[]).find(r => r.user_id === user.id)  ?? null;
      const partner = (data as LocationRecord[]).find(r => r.user_id !== user.id)  ?? null;
      setMyLocation(mine);
      setPartnerLocation(partner);
      mySharingRef.current = mine?.sharing_enabled ?? false;
    }
    setLoading(false);
  }, [spaceId, user?.id]);

  const getAndUpload = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPermissionDenied(false);
        const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
        const uid = userIdRef.current;
        const sid = spaceIdRef.current;
        if (!uid || !sid) return;

        const current = { lat, lng };
        const speedKmh = speed !== null && speed !== undefined ? Math.round(speed * 3.6) : null;
        speedRef.current = speedKmh;

        // Only upsert member_locations if moved > 50m
        const shouldUpload =
          !lastUploadedPosRef.current ||
          haversineMeters(lastUploadedPosRef.current, current) >= 50;

        // Geocode if moved > 200m from last geocode
        let address: string | null = null;
        if (
          !lastGeocodedPosRef.current ||
          haversineMeters(lastGeocodedPosRef.current, current) > 200
        ) {
          address = await reverseGeocode(lat, lng);
          if (address) lastGeocodedPosRef.current = current;
        }

        const { level: batteryLevel, charging: isCharging } = await getBatteryInfo();
        const networkType = getNetworkType();

        if (shouldUpload) {
          lastUploadedPosRef.current = current;

          const row: any = {
            user_id:         uid,
            couple_space_id: sid,
            lat,
            lng,
            accuracy:        accuracy ?? null,
            sharing_enabled: true,
            updated_at:      new Date().toISOString(),
            speed_kmh:       speedKmh,
            battery_level:   batteryLevel,
            is_charging:     isCharging,
            network_type:    networkType,
            ...(address !== null ? { address } : {}),
          };

          await (supabase as any)
            .from("member_locations")
            .upsert(row, { onConflict: "user_id,couple_space_id" });

          // Server-side geofence detection — runs even when useLocationEvents is unmounted
          supabase.functions.invoke("geofence-check", {
            body: { user_id: uid, couple_space_id: sid, lat, lng },
          }).catch(() => {});

          setMyLocation(prev => ({
            ...(prev ?? {
              user_id: uid, accuracy: null, address: null,
              sharing_enabled: true, updated_at: row.updated_at,
              battery_level: null, is_charging: null, network_type: null, speed_kmh: null,
            }),
            lat, lng,
            accuracy:      accuracy ?? null,
            speed_kmh:     speedKmh,
            battery_level: batteryLevel,
            is_charging:   isCharging,
            network_type:  networkType,
            updated_at:    row.updated_at,
            ...(address !== null ? { address } : {}),
          }));
        }

        // Route history: log if moved > 30m OR > 5 min since last log
        const now = Date.now();
        const lastH = lastHistoryPosRef.current;
        const historyDist = lastH ? haversineMeters(lastH, current) : Infinity;
        const historyTime = lastH ? now - lastH.time : Infinity;

        if (historyDist >= 30 || historyTime >= 5 * 60 * 1000) {
          lastHistoryPosRef.current = { lat, lng, time: now };
          (supabase as any).from("location_history").insert({
            couple_space_id: sid,
            user_id:         uid,
            lat,
            lng,
            speed_kmh:       speedKmh,
            recorded_at:     new Date().toISOString(),
          });
        }
      },
      (err) => {
        setGeoErrorMsg(`[${err.code}] ${err.message}`);
        if (err.code === 1) {
          setPermissionDenied(true);
          if (intervalIdRef.current !== null) {
            clearTimeout(intervalIdRef.current);
            intervalIdRef.current = null;
          }
        }
      },
      { enableHighAccuracy: false, timeout: 30_000 }
    );
  }, []);

  // Adaptive polling: 15s when moving fast (>20 km/h), 30s otherwise
  const speedRef      = useRef<number | null>(null);
  const scheduleNext  = useRef<(() => void) | null>(null);
  scheduleNext.current = () => {
    const delay = speedRef.current !== null && speedRef.current > 20 ? 15_000 : 30_000;
    intervalIdRef.current = setTimeout(() => {
      getAndUpload();
      scheduleNext.current?.();
    }, delay);
  };

  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    if (intervalIdRef.current !== null) return;
    getAndUpload();
    scheduleNext.current?.();
  }, [getAndUpload]);

  const stopWatch = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearTimeout(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    fetchLocations().then(() => {
      if (mySharingRef.current) startWatch();
    });
    return () => stopWatch();
  }, [fetchLocations, startWatch, stopWatch]);

  useEffect(() => {
    if (!spaceId || !user?.id) return;
    const channel = supabase
      .channel(`location-rt-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_locations", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as LocationRecord;
          if (!row) return;
          if (row.user_id === user.id) {
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

  const retryWatch = useCallback(() => {
    setPermissionDenied(false);
    setGeoErrorMsg(null);
    stopWatch();
    startWatch();
  }, [startWatch, stopWatch]);

  return {
    myLocation,
    partnerLocation,
    mySharing:      myLocation?.sharing_enabled      ?? false,
    partnerSharing: partnerLocation?.sharing_enabled ?? false,
    toggleSharing,
    retryWatch,
    loading,
    permissionDenied,
    geoErrorMsg,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useAuth } from "@/features/auth/AuthContext";

export interface FavoritePlace {
  id: string;
  couple_space_id: string;
  created_by: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  radius_m: number;
  created_at: string;
}

export const PLACE_ICONS = [
  { key: "Home",           label: "Casa" },
  { key: "Briefcase",      label: "Trabalho" },
  { key: "GraduationCap",  label: "Escola / Universidade" },
  { key: "Coffee",         label: "Café" },
  { key: "Heart",          label: "O nosso lugar" },
  { key: "ShoppingBag",    label: "Centro Comercial" },
  { key: "Dumbbell",       label: "Ginásio" },
  { key: "Church",         label: "Igreja" },
  { key: "MapPin",         label: "Outro" },
] as const;

export function useFavoritePlaces() {
  const spaceId = useCoupleSpaceId();
  const { user } = useAuth();
  const [places, setPlaces] = useState<FavoritePlace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaces = useCallback(async () => {
    if (!spaceId) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("favorite_places")
      .select("*")
      .eq("couple_space_id", spaceId)
      .order("created_at", { ascending: true });
    setPlaces((data as FavoritePlace[]) ?? []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

  const addPlace = useCallback(
    async (place: { name: string; icon: string; lat: number; lng: number }) => {
      if (!spaceId || !user?.id) return;
      const { data, error } = await (supabase as any)
        .from("favorite_places")
        .insert({
          couple_space_id: spaceId,
          created_by: user.id,
          name: place.name,
          icon: place.icon,
          lat: place.lat,
          lng: place.lng,
          radius_m: 100,
        })
        .select()
        .single();
      if (!error && data) setPlaces(prev => [...prev, data as FavoritePlace]);
    },
    [spaceId, user?.id],
  );

  const removePlace = useCallback(async (id: string) => {
    await (supabase as any).from("favorite_places").delete().eq("id", id);
    setPlaces(prev => prev.filter(p => p.id !== id));
  }, []);

  // Returns the name of the closest favorite place if within radius, else null
  const detectPlace = useCallback(
    (lat: number, lng: number): string | null => {
      for (const p of places) {
        const R = 6_371_000;
        const dLat = ((p.lat - lat) * Math.PI) / 180;
        const dLng = ((p.lng - lng) * Math.PI) / 180;
        const x =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((p.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        if (dist <= p.radius_m) return p.name;
      }
      return null;
    },
    [places],
  );

  return { places, loading, addPlace, removePlace, detectPlace, refresh: fetchPlaces };
}

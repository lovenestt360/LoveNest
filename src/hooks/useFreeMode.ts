import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedValue: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

export function useFreeMode() {
  const [freeMode, setFreeMode] = useState<boolean>(cachedValue ?? false);
  const [loading, setLoading] = useState(cachedValue === null);

  useEffect(() => {
    const now = Date.now();
    if (cachedValue !== null && now - cacheTimestamp < CACHE_TTL) {
      setFreeMode(cachedValue);
      setLoading(false);
      return;
    }

    (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", "free_mode")
      .maybeSingle()
      .then(({ data }: any) => {
        const val = data?.value === "true";
        cachedValue = val;
        cacheTimestamp = Date.now();
        setFreeMode(val);
        setLoading(false);
      });
  }, []);

  return { freeMode, loading };
}

/** Invalidate the cache so next render re-fetches */
export function invalidateFreeModeCache() {
  cachedValue = null;
  cacheTimestamp = 0;
}

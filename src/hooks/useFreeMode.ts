import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

// Cache por userId — impede que sessões de utilizadores diferentes partilhem o mesmo valor
const cache = new Map<string, { value: boolean; timestamp: number }>();
const CACHE_TTL = 60_000;

export function useFreeMode() {
  const { user } = useAuth();
  const uid = user?.id ?? "anon";
  const cached = cache.get(uid);

  const [freeMode, setFreeMode] = useState<boolean>(cached?.value ?? false);
  const [loading, setLoading] = useState(!cached || Date.now() - cached.timestamp >= CACHE_TTL);

  useEffect(() => {
    const now = Date.now();
    const c = cache.get(uid);
    if (c && now - c.timestamp < CACHE_TTL) {
      setFreeMode(c.value);
      setLoading(false);
      return;
    }

    const fetchStatus = () => {
      (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "free_mode")
        .maybeSingle()
        .then(({ data, error }: any) => {
          if (error) { setLoading(false); return; }
          const val = data?.value === "true";
          cache.set(uid, { value: val, timestamp: Date.now() });
          setFreeMode(val);
          setLoading(false);
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [uid]);

  return { freeMode, loading };
}

/** Invalidar cache — passar userId para limpar só uma sessão, ou sem args para limpar tudo */
export function invalidateFreeModeCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

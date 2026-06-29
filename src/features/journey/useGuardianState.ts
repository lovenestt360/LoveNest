import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GuardianGlowColor } from "./Guardian";

export interface GuardianState {
  glowColor: GuardianGlowColor;
  ringUnlocked: boolean;
  ringEnabled: boolean;
}

const DEFAULT_STATE: GuardianState = { glowColor: "rose", ringUnlocked: false, ringEnabled: true };

export function useGuardianState(coupleSpaceId: string | null) {
  const [state, setState] = useState<GuardianState>(DEFAULT_STATE);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    if (!coupleSpaceId) return;
    setLoading(true);
    try {
      const [{ data: guardian }, { data: purchases }] = await Promise.all([
        supabase.from("guardian_state" as any).select("glow_color, ring_unlocked, ring_enabled").eq("couple_space_id", coupleSpaceId).maybeSingle(),
        supabase.from("shop_purchases" as any).select("item_key").eq("couple_space_id", coupleSpaceId),
      ]);
      setState(guardian ? {
        glowColor: (guardian as any).glow_color ?? "rose",
        ringUnlocked: (guardian as any).ring_unlocked ?? false,
        ringEnabled: (guardian as any).ring_enabled ?? true,
      } : DEFAULT_STATE);
      setPurchasedItems(new Set(((purchases as any[]) ?? []).map((p) => p.item_key)));
    } finally {
      setLoading(false);
    }
  }, [coupleSpaceId]);

  useEffect(() => { fetchState(); }, [fetchState]);
  useEffect(() => {
    const h = () => fetchState();
    window.addEventListener("streak-updated", h);
    return () => window.removeEventListener("streak-updated", h);
  }, [fetchState]);

  return { ...state, purchasedItems, loading, refresh: fetchState };
}

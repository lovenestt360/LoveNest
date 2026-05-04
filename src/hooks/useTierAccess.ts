import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFreeMode } from "@/hooks/useFreeMode";

export function useTierAccess(featureId: string) {
  const { freeMode, loading: freeModeLoading } = useFreeMode();
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (freeModeLoading) return;
    if (freeMode) { setAllowed(true); setLoading(false); return; }

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAllowed(false); setLoading(false); return; }

        const { data: member } = await supabase
          .from("members")
          .select("couple_space_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!member) { setAllowed(false); setLoading(false); return; }

        const { data: house } = await supabase
          .from("couple_spaces")
          .select("subscription_status, trial_used, trial_ends_at, tier_level")
          .eq("id", member.couple_space_id)
          .maybeSingle();
        if (!house) { setAllowed(false); setLoading(false); return; }

        let userTier = 0;
        const trialActive =
          house.trial_used &&
          house.trial_ends_at &&
          new Date(house.trial_ends_at) > new Date();
        if (trialActive) userTier = 999;
        else if (house.subscription_status === "active") userTier = house.tier_level ?? 1;

        const { data: ft } = await (supabase as any)
          .from("feature_tiers")
          .select("min_tier")
          .eq("feature_id", featureId)
          .maybeSingle();

        const minTier: number = ft?.min_tier ?? 0;
        setAllowed(minTier === 0 || userTier >= minTier);
      } catch {
        setAllowed(true);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [freeMode, freeModeLoading, featureId]);

  return { allowed, loading };
}

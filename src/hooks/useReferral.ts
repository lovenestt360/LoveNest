import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Belt-and-suspenders: after signup the server-side trigger (handle_new_user)
 * already records the referral from metadata. This hook is a fallback for
 * cases where the code ends up in storage but the metadata path failed
 * (e.g. OAuth where metadata isn't passed). It is idempotent thanks to the
 * UNIQUE(new_user_id) constraint on the referrals table.
 */
export function useReferralTracking(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const refCode =
      localStorage.getItem("lovenest_ref") ||
      sessionStorage.getItem("lovenest_ref");
    if (!refCode) return;

    localStorage.removeItem("lovenest_ref");
    sessionStorage.removeItem("lovenest_ref");

    (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("referral_code", refCode.toUpperCase())
      .maybeSingle()
      .then(({ data: referrer }: any) => {
        if (!referrer || referrer.user_id === userId) return;

        // ON CONFLICT DO NOTHING via upsert — safe if server-side already inserted
        (supabase as any)
          .from("referrals")
          .upsert(
            { referrer_user_id: referrer.user_id, new_user_id: userId, reward_given: false },
            { onConflict: "new_user_id", ignoreDuplicates: true }
          )
          .then(({ error }: any) => {
            if (error) console.warn("Referral upsert error:", error.message);
          });
      });
  }, [userId]);
}

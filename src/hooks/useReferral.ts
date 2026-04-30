import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * On signup, check URL for ?ref= param and store the referral.
 * Also ensures the current user has a referral_code generated.
 */
export function useReferralTracking(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // localStorage survives OAuth redirects; sessionStorage is fallback for email flow
    const refCode =
      localStorage.getItem("lovenest_ref") ||
      sessionStorage.getItem("lovenest_ref");
    if (!refCode) return;
    localStorage.removeItem("lovenest_ref");
    sessionStorage.removeItem("lovenest_ref");

    // Find referrer by code
    (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("referral_code", refCode)
      .maybeSingle()
      .then(({ data: referrer }: any) => {
        if (!referrer || referrer.user_id === userId) return;

        // Insert referral
        (supabase as any)
          .from("referrals")
          .insert({
            referrer_user_id: referrer.user_id,
            new_user_id: userId,
          })
          .then(({ error }: any) => {
            if (error) console.warn("Referral insert error:", error.message);
          });
      });
  }, [userId]);
}

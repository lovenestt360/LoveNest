import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * On signup, check URL for ?ref= param and store the referral.
 * Also ensures the current user has a referral_code generated.
 */
export function useReferralTracking(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Generate referral code if missing
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !data.referral_code) {
          const code = Math.random().toString(36).substring(2, 9).toUpperCase();
          supabase
            .from("profiles")
            .update({ referral_code: code } as any)
            .eq("user_id", userId)
            .then(() => {});
        }
      });

    // Check referral from URL (stored in sessionStorage during signup)
    const refCode = sessionStorage.getItem("lovenest_ref");
    if (!refCode) return;
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

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

// Returns true only when push notifications are technically possible on this device.
// iOS requires 16.4+ AND the app installed as PWA.
function isPushCapable(): boolean {
  if (typeof Notification === "undefined" || !("PushManager" in window)) return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return true;
  const m = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (!m) return false;
  const major = parseInt(m[1]); const minor = parseInt(m[2]);
  return major > 16 || (major === 16 && minor >= 4);
}

export type OnboardingStep = "profile" | "house" | "notifications" | "complete";

export function useOnboarding() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [step, setStep] = useState<OnboardingStep>("complete");
  const [loading, setLoading] = useState(true);

  const checkOnboarding = useCallback(async () => {
    if (!user) {
      setStep("complete");
      setLoading(false);
      return;
    }

    try {
      // 1. Check Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, gender, birthday")
        .eq("user_id", user.id)
        .maybeSingle();

      const profileComplete = 
        profile?.display_name && 
        !profile.display_name.includes("@") && 
        profile.display_name !== "LoveNest" &&
        profile?.gender && 
        profile?.birthday;

      if (!profileComplete) {
        setStep("profile");
        setLoading(false);
        return;
      }

      // 2. Check House (if paired)
      if (spaceId) {
        const { data: space } = await supabase
          .from("couple_spaces")
          .select("house_name, partner1_name, partner2_name, relationship_start_date")
          .eq("id", spaceId)
          .maybeSingle();

        const houseComplete = 
          space?.house_name && 
          space.house_name !== "LoveNest" &&
          space?.partner1_name && 
          space?.partner2_name && 
          space?.relationship_start_date;

        if (!houseComplete) {
          setStep("house");
          setLoading(false);
          return;
        }
      } else {
        // Not paired yet? The system usually handles house pairing separately.
        // But if the user wants this sequential, and the house is missing, we might need to wait for pairing.
        // For now, let's focus on the case where they ARE in a house but it's empty.
      }

      // 3. Check Notifications
      // Skip if: device can't support push, OR user already dismissed the step
      const pushCapable = isPushCapable();
      const skipped = localStorage.getItem(`notif-skipped-${user.id}`) === "1";

      if (!pushCapable || skipped) {
        // Device physically cannot support push (iOS < 16.4) or user opted out
        setStep("complete");
        setLoading(false);
        return;
      }

      const { data: pushSub } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!pushSub || pushSub.length === 0) {
        setStep("notifications");
        setLoading(false);
        return;
      }

      setStep("complete");
    } catch (err) {
      console.error("Error checking onboarding:", err);
    } finally {
      setLoading(false);
    }
  }, [user, spaceId]);

  useEffect(() => {
    checkOnboarding();
  }, [user, spaceId, checkOnboarding]);

  // Re-check whenever Settings dispatches "onboarding-refresh"
  useEffect(() => {
    window.addEventListener("onboarding-refresh", checkOnboarding);
    return () => window.removeEventListener("onboarding-refresh", checkOnboarding);
  }, [checkOnboarding]);

  return { step, loading, refresh: checkOnboarding, userId: user?.id ?? null };
}

export { isPushCapable };

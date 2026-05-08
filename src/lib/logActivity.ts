import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget activity log — called from Chat, Mood, Prayer, etc.
 * Never throws, never blocks the UI.
 * V5 backend uses auth.uid() internally — no need to pass user_id.
 */
export async function logActivity(
  coupleId: string | null | undefined,
  type: string = "general"
): Promise<void> {
  if (!coupleId) return;

  try {
    const { data, error } = await supabase.rpc("log_daily_activity", {
      p_couple_space_id: coupleId,
      p_type: type,
    });

    if (error) {
      console.error("[logActivity] RPC error:", error.message);
      return;
    }

    const res = data as any;
    if (!res?.success) {
      console.warn("[logActivity] Unexpected response:", res);
    } else {
      // Notify all listeners (LoveStreakCard, LoveStreak) that activity changed
      window.dispatchEvent(new CustomEvent("streak-updated", { detail: { type } }));
      if (res.active_today >= 2) {
        window.dispatchEvent(new CustomEvent("mission-complete", { detail: { type } }));
      }
    }
  } catch (err: any) {
    console.error("[logActivity] Exception:", err?.message);
  }
}

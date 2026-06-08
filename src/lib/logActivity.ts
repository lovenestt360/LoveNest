import { supabase } from "@/integrations/supabase/client";

// Client-side dedup: fire mission-complete at most once per type per calendar day.
// Resets automatically when the date changes.
const _missionFiredDate = new Map<string, string>(); // type → date string

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

    // RPC returns { status: 'invalid' } for non-members — abort silently.
    if (!res || res.status === "invalid") return;

    // Always notify UI listeners that streak state may have changed.
    window.dispatchEvent(new CustomEvent("streak-updated", { detail: { type } }));

    // Fire mission-complete only when both partners are active today,
    // and only ONCE per type per calendar day (prevents spam on repeat calls).
    if (res.both_active_today === true) {
      const today = new Date().toDateString();
      if (_missionFiredDate.get(type) !== today) {
        _missionFiredDate.set(type, today);
        window.dispatchEvent(new CustomEvent("mission-complete", { detail: { type } }));
      }
    }
  } catch (err: any) {
    console.error("[logActivity] Exception:", err?.message);
  }
}

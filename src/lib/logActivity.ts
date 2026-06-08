import { supabase } from "@/integrations/supabase/client";

// Client-side dedup: fire mission-complete at most once per type per calendar day.
// Resets automatically when the date changes.
const _missionFiredDate = new Map<string, string>(); // type → date string

// Fire mission-complete with session-level dedup. Call this directly when you
// know precisely that BOTH users completed the specific action (e.g., both prayed).
export function fireMissionIfNotFired(type: string): void {
  const today = new Date().toDateString();
  if (_missionFiredDate.get(type) !== today) {
    _missionFiredDate.set(type, today);
    window.dispatchEvent(new CustomEvent("mission-complete", { detail: { type } }));
  }
}

export async function logActivity(
  coupleId: string | null | undefined,
  type: string = "general",
  options?: { skipMission?: boolean }
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
    // only ONCE per type per calendar day, and only when not suppressed.
    // Use skipMission: true when the caller handles mission firing directly
    // (e.g., prayer — where both_active_today is too coarse; we need both to have prayed).
    if (!options?.skipMission && res.both_active_today === true) {
      fireMissionIfNotFired(type);
    }
  } catch (err: any) {
    console.error("[logActivity] Exception:", err?.message);
  }
}

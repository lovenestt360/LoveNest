import { supabase } from "@/integrations/supabase/client";

/**
 * ─────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH FOR LOGGING ACTIVITY
 * ─────────────────────────────────────────────────────────────────
 * Safe, non-blocking, fire-and-forget activity logger.
 * Never throws errors. Never blocks UI.
 */
export async function logActivity(coupleId: string | null | undefined, type: string = "general"): Promise<void> {
  if (!coupleId) {
    console.log("[logActivity] Ignored: coupleId is missing", { type });
    return;
  }

  try {
    console.log(`[logActivity] Logging activity: ${type} for couple: ${coupleId}`);
    
    // Call the RPC
    const { error } = await supabase.rpc("log_daily_activity", {
      p_couple_id: coupleId,
      p_type: type,
    });

    if (error) {
      console.error("[logActivity] Supabase RPC error:", error.message);
    }
  } catch (err) {
    console.error("[logActivity] Unexpected exception:", err);
  }
}

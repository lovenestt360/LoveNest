import { supabase } from "@/integrations/supabase/client";

type NotifType = "chat" | "humor" | "tarefas" | "memorias" | "oracao" | "conflitos" | "agenda" | "ciclo_par" | "routine" | "plano";

interface PushPayload {
  couple_space_id: string;
  title: string;
  body: string;
  url: string;
  type: NotifType;
  template_key?: string;
}

/**
 * Fire-and-forget push notification to partner.
 * Preference filtering should be handled server-side (edge function)
 * based on the recipient's settings, not the sender's local prefs.
 */
export async function notifyPartner(payload: PushPayload) {
  try {
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: payload,
    });
    if (error) {
      console.warn("⚠️ Push non-critical failure:", error);
    } else {
      console.log("🚀 Push trigger result:", data);
    }
  } catch (err) {
    console.warn("⚠️ Push invoke crash:", err);
  }
}

import { supabase } from "@/integrations/supabase/client";

type NotifType = "chat" | "humor" | "tarefas" | "memorias" | "oracao" | "conflitos" | "agenda" | "ciclo_par" | "routine";

interface PushPayload {
  couple_space_id: string;
  title: string;
  body: string;
  url: string;
  type: NotifType;
}

/**
 * Fire-and-forget push notification to partner.
 * Preference filtering should be handled server-side (edge function)
 * based on the recipient's settings, not the sender's local prefs.
 */
export function notifyPartner(payload: PushPayload) {
  supabase.functions
    .invoke("send-push", { body: payload })
    .catch(() => { });
}

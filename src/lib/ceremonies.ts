import { supabase } from "@/integrations/supabase/client";

// Cerimónias — momentos de celebração full-screen, partilháveis.
// Ver docs/LOVENEST_PROGRESS_SYSTEM.md, secção 8.
//
// "streak_milestone" tem o seu próprio dedupe, herdado de
// relationship_milestones/useMilestone.ts (também alimenta o feed
// emocional) — por isso não passa por aqui, é despachado direto via
// dispatchCeremony(). Os outros 4 tipos não têm dedupe próprio e usam
// ceremonies_log (ver migration 20260629000003).
export type CeremonyType = "streak_milestone" | "level_up" | "livro_concluido" | "aniversario" | "capsula";

export interface CeremonyContent {
  type: CeremonyType;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export function dispatchCeremony(content: CeremonyContent): void {
  window.dispatchEvent(new CustomEvent("lovenest-ceremony", { detail: content }));
}

// Verifica o dedupe em ceremonies_log e, se for a primeira vez que este
// marco é atingido por este casal, mostra a Cerimónia. O UNIQUE
// constraint na BD é a garantia real (cobre múltiplos dispositivos);
// o insert que falhar com 23505 significa "já mostrado".
export async function triggerCeremony(
  coupleSpaceId: string | null | undefined,
  type: CeremonyType,
  key: string,
  content: CeremonyContent,
): Promise<void> {
  if (!coupleSpaceId) return;

  try {
    const { error } = await supabase.from("ceremonies_log" as any).insert({
      couple_space_id: coupleSpaceId,
      ceremony_type: type,
      ceremony_key: key,
    });
    if (error) {
      if ((error as any).code !== "23505") {
        console.error("[triggerCeremony] insert error:", error.message);
      }
      return;
    }
    dispatchCeremony(content);
  } catch (err: any) {
    console.error("[triggerCeremony] exception:", err?.message);
  }
}

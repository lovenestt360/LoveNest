import { supabase } from "@/integrations/supabase/client";

/**
 * Guarda o token FCM deste telemóvel para o utilizador atual.
 *
 * O token é do telemóvel e pode já estar guardado em nome de outra conta que
 * entrou antes no mesmo aparelho; nesse caso o upsert direto falha por RLS.
 * A função claim_push_token (SECURITY DEFINER) passa o token para quem está
 * autenticado. Enquanto a função não existir na base de dados, usa o upsert
 * antigo para não piorar o comportamento atual.
 */
export async function savePushToken(fcmToken: string, userId: string, spaceId: string): Promise<{ error: string | null }> {
  const { error } = await (supabase as any).rpc("claim_push_token", {
    p_fcm_token: fcmToken,
    p_couple_space_id: spaceId,
    p_user_agent: navigator.userAgent,
  });
  if (!error) return { error: null };

  const missingFunction = error.code === "PGRST202" || error.code === "42883";
  if (!missingFunction) return { error: error.message };

  const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
    {
      couple_space_id: spaceId,
      user_id: userId,
      fcm_token: fcmToken,
      user_agent: navigator.userAgent,
    },
    { onConflict: "fcm_token" },
  );
  return { error: upsertError?.message ?? null };
}

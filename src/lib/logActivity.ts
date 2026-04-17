import { supabase } from "@/integrations/supabase/client";

/**
 * ─────────────────────────────────────────────────────────────────
 * logActivity — Single source of truth para registo de actividade
 *
 * REGRAS:
 *   1. Busca o user_id explicitamente (nunca depende de auth.uid() no SQL)
 *   2. Fire-and-forget seguro (pode ser chamado sem await)
 *   3. Nunca lança erros — nunca bloqueia a UI
 *   4. Logs de debug para diagnóstico em produção
 * ─────────────────────────────────────────────────────────────────
 */
export async function logActivity(
  coupleId: string | null | undefined,
  _type?: string  // mantido por compatibilidade com callers existentes, ignorado pelo novo backend
): Promise<void> {
  if (!coupleId) {
    console.log("[logActivity] Ignorado: coupleId em falta");
    return;
  }

  try {
    // CRÍTICO: buscar user_id explicitamente
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[logActivity] Sem utilizador autenticado:", authError?.message);
      return;
    }

    console.log(`[logActivity] → couple=${coupleId} | user=${user.id}`);

    const { data, error } = await supabase.rpc("log_daily_activity", {
      p_couple_id: coupleId,
      p_user_id:   user.id,     // EXPLÍCITO — resolve "status: invalid_user"
    });

    if (error) {
      console.error("[logActivity] Erro RPC:", error.message);
      return;
    }

    const status = (data as any)?.status;
    if (status === "invalid_user") {
      console.warn("[logActivity] Utilizador não é membro do casal:", coupleId);
    } else {
      console.log("[logActivity] ✓ Registo ok — streak:", (data as any)?.current_streak ?? "?");
    }
  } catch (err) {
    console.error("[logActivity] Excepção inesperada:", err);
  }
}

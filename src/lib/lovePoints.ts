import { supabase } from "@/integrations/supabase/client";

// Porta única para somar LovePoints — espelha o padrão de logActivity.ts.
// Chama a função award_lovepoints() (SECURITY DEFINER), que grava no
// extrato (lovepoints_ledger) e atualiza o saldo (points) no mesmo
// sítio. Fontes novas (Fase 3: reflexões, livros, memórias, datas
// especiais, desafios, cápsula do tempo) devem chamar isto em vez de
// tocar em `points` diretamente.
export async function awardLovePoints(
  coupleSpaceId: string | null | undefined,
  amount: number,
  source: string,
  description?: string,
  userId?: string,
): Promise<void> {
  if (!coupleSpaceId) return;

  try {
    const { error } = await supabase.rpc("award_lovepoints" as any, {
      p_couple_space_id: coupleSpaceId,
      p_amount: amount,
      p_source: source,
      p_description: description ?? null,
      p_user_id: userId ?? null,
    });
    if (error) {
      console.error("[awardLovePoints] RPC error:", error.message);
      return;
    }
    window.dispatchEvent(new CustomEvent("streak-updated"));
  } catch (err: any) {
    console.error("[awardLovePoints] Exception:", err?.message);
  }
}

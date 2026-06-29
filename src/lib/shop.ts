import { supabase } from "@/integrations/supabase/client";

export type ShopItemKey = "glow_graphite" | "guardian_ring";

export interface BuyGuardianItemResult {
  status: "ok" | "insufficient_points" | "already_purchased" | "invalid_item" | "error";
}

// Compra de personalização do Guardião — espelha o padrão de lovePoints.ts.
// Chama buy_guardian_item() (SECURITY DEFINER), que valida saldo/duplicado,
// deduz LovePoints via award_lovepoints() e aplica o item em guardian_state.
export async function buyGuardianItem(
  coupleSpaceId: string | null | undefined,
  itemKey: ShopItemKey,
  userId?: string,
): Promise<BuyGuardianItemResult> {
  if (!coupleSpaceId) return { status: "error" };

  try {
    const { data, error } = await supabase.rpc("buy_guardian_item" as any, {
      p_couple_space_id: coupleSpaceId,
      p_item_key: itemKey,
      p_user_id: userId ?? null,
    });
    if (error) {
      console.error("[buyGuardianItem] RPC error:", error.message);
      return { status: "error" };
    }
    const status = (data as any)?.status ?? "error";
    if (status === "ok") window.dispatchEvent(new CustomEvent("streak-updated"));
    return { status };
  } catch (err: any) {
    console.error("[buyGuardianItem] Exception:", err?.message);
    return { status: "error" };
  }
}

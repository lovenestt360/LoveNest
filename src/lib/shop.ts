import { supabase } from "@/integrations/supabase/client";

export type ShopItemKey = "glow_graphite" | "guardian_ring";

export interface BuyGuardianItemResult {
  status: "ok" | "insufficient_points" | "already_purchased" | "invalid_item" | "error";
}

export interface SetGuardianAppearanceResult {
  status: "ok" | "invalid_color" | "not_owned" | "error";
}

export async function setGuardianAppearance(
  coupleSpaceId: string | null | undefined,
  opts: { glowColor?: "rose" | "graphite"; ringEnabled?: boolean },
): Promise<SetGuardianAppearanceResult> {
  if (!coupleSpaceId) return { status: "error" };
  try {
    const { data, error } = await supabase.rpc("set_guardian_appearance" as any, {
      p_couple_space_id: coupleSpaceId,
      p_glow_color: opts.glowColor ?? null,
      p_ring_enabled: opts.ringEnabled ?? null,
    });
    if (error) {
      console.error("[setGuardianAppearance] RPC error:", error.message);
      return { status: "error" };
    }
    const result = (data as any)?.status ?? "error";
    if (result === "ok") window.dispatchEvent(new CustomEvent("streak-updated"));
    return { status: result };
  } catch (err: any) {
    console.error("[setGuardianAppearance] Exception:", err?.message);
    return { status: "error" };
  }
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

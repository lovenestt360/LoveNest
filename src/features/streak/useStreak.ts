import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

// ─────────────────────────────────────────────
// StreakState — interface completa
// ─────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  status: "active" | "broken" | "frozen" | "invalid";
  bothActiveToday: boolean;
  activeCount: number;
  totalMembers: number;
  progressPercentage: number;
  streakAtRisk: boolean;
  daysSinceLast: number | null;
  // LoveShield
  shieldsRemaining: number;
  shieldUsedToday: boolean;
  shieldsPurchasedThisMonth: number;
}

// Estado seguro por defeito — nunca retorna null ao componente
const EMPTY_STREAK: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  status: "active",
  bothActiveToday: false,
  activeCount: 0,
  totalMembers: 0,
  progressPercentage: 0,
  streakAtRisk: false,
  daysSinceLast: null,
  shieldsRemaining: 0,
  shieldUsedToday: false,
  shieldsPurchasedThisMonth: 0,
};

function mapStreak(data: Record<string, any>): StreakState {
  const current = data.streak ?? data.current ?? data.current_streak ?? 0;
  return {
    currentStreak: current,
    longestStreak: data.longest ?? data.longest_streak ?? current,
    lastActiveDate: data.last_date ?? data.last_active_date ?? null,
    status: data.status ?? "active",
    bothActiveToday: data.both_active_today ?? (data.active_today ?? 0) >= 2,
    activeCount: data.active_today_count ?? data.active_today ?? 0,
    totalMembers: data.total_members ?? 0,
    progressPercentage: data.progress_percentage ?? Math.min(Math.round((current / 28) * 100), 100),
    streakAtRisk: data.streak_at_risk ?? false,
    daysSinceLast: data.days_since_last_activity ?? null,
    shieldsRemaining: data.shields_remaining ?? 0,
    shieldUsedToday: data.shield_used_today ?? false,
    shieldsPurchasedThisMonth: data.shields_purchased_this_month ?? 0,
  };
}

// ─────────────────────────────────────────────
// useStreak — hook principal
// GARANTIA: nunca devolve streak === null
//           em caso de erro, usa EMPTY_STREAK
// ─────────────────────────────────────────────

export function useStreak() {
  const spaceId = useCoupleSpaceId();

  // Inicializa com EMPTY_STREAK — nunca null
  const [streak, setStreak] = useState<StreakState>(EMPTY_STREAK);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const refresh = useCallback(async () => {
    if (!spaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("[useStreak] RPC get_streak a iniciar para:", spaceId);
      const { data, error } = await supabase.rpc("get_streak", {
        p_couple_space_id: spaceId,
      });

      console.log("[useStreak] Resposta get_streak:", data, "Erro:", error);

      if (error) {
        console.error("[useStreak] Erro get_streak:", error.message);
        setStreak(EMPTY_STREAK);
        return;
      }

      const streakData = data ? mapStreak(data as Record<string, any>) : EMPTY_STREAK;
      console.log("[useStreak] Estado mapeado:", streakData);
      setStreak(streakData);
    } catch (err) {
      console.error("[useStreak] Excepção inesperada:", err);
      setStreak(EMPTY_STREAK);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ──────────────────────────────────────────
  // checkIn — ação principal
  // ──────────────────────────────────────────
  const checkIn = useCallback(async (): Promise<{ ok: boolean, message?: string }> => {
    if (!spaceId || checkingIn) return { ok: false, message: "A aguardar processamento..." };

    setCheckingIn(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        console.error("User not authenticated");
        return { ok: false, message: "Sessão expirada. Recarregue a página." };
      }

      const { data, error } = await supabase.rpc("log_daily_activity", {
        p_couple_space_id: spaceId,
        p_type: "checkin"
      });
      console.log("[CHECKIN RESULT]:", data);

      if (error) {
        console.error("[CHECKIN ERROR]:", error.message);
        return { ok: false, message: error.message };
      }

      const result = data as Record<string, any> | null;
      const status = result?.status;
      const success = result?.success === true || status === "success" || status === "already_checked_in";

      if (status === "invalid_user") {
        return { ok: false, message: "Utilizador rejeitado no servidor." };
      }
      if (status === "unauthenticated") {
        return { ok: false, message: "Backend detectou auth nulo (auth.uid=null)." };
      }

      if (success) {
        // V5 devolve {success, streak, active_today} — mapear directamente
        if (result && ("streak" in result || "current_streak" in result)) {
          setStreak(mapStreak(result));
        } else if (result?.streak_data) {
          setStreak(mapStreak(result.streak_data as Record<string, any>));
        } else {
          await refresh();
        }

        // 🔥 Propagar ranking atualizado via CustomEvent (sem fetch extra no RankingCard)
        window.dispatchEvent(
          new CustomEvent("streak-updated", {
            detail: { ranking: (data as any)?.ranking ?? null },
          })
        );
        return { ok: true };
      }

      return { ok: false, message: `Status inesperado: ${status}` };

    } catch (err: any) {
      console.error("[CHECKIN EXCEPTION]:", err);
      return { ok: false, message: err?.message || "Excepção inesperada" };
    } finally {
      setCheckingIn(false);
    }
  }, [spaceId, checkingIn, refresh]);

  return { streak, loading, refresh, checkIn, checkingIn };
}

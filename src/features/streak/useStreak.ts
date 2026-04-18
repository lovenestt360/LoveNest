import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { logActivity } from "@/lib/logActivity";

// ─────────────────────────────────────────────
// StreakState — interface completa
// ─────────────────────────────────────────────

export interface StreakState {
  currentStreak:      number;
  longestStreak:      number;
  lastActiveDate:     string | null;
  status:             "active" | "broken" | "frozen" | "invalid";
  bothActiveToday:    boolean;
  activeCount:        number;
  totalMembers:       number;
  progressPercentage: number;
  streakAtRisk:       boolean;
  daysSinceLast:      number | null;
  // LoveShield
  shieldsRemaining:   number;
  shieldUsedToday:    boolean;
}

// Estado seguro por defeito — nunca retorna null ao componente
const EMPTY_STREAK: StreakState = {
  currentStreak:      0,
  longestStreak:      0,
  lastActiveDate:     null,
  status:             "active",
  bothActiveToday:    false,
  activeCount:        0,
  totalMembers:       0,
  progressPercentage: 0,
  streakAtRisk:       false,
  daysSinceLast:      null,
  shieldsRemaining:   0,
  shieldUsedToday:    false,
};

function mapStreak(data: Record<string, any>): StreakState {
  return {
    currentStreak:      data.current      ?? data.current_streak      ?? 0,
    longestStreak:      data.longest      ?? data.longest_streak      ?? 0,
    lastActiveDate:     data.last_date    ?? data.last_active_date    ?? null,
    status:             data.status       ?? "active",
    bothActiveToday:    data.both_active_today   ?? false,
    activeCount:        data.active_today_count  ?? 0,
    totalMembers:       data.total_members       ?? 0,
    progressPercentage: data.progress_percentage ?? 0,
    streakAtRisk:       data.streak_at_risk      ?? false,
    daysSinceLast:      data.days_since_last_activity ?? null,
    shieldsRemaining:   data.shields_remaining   ?? 0,
    shieldUsedToday:    data.shield_used_today   ?? false,
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
  const [streak, setStreak]     = useState<StreakState>(EMPTY_STREAK);
  const [loading, setLoading]   = useState(true);
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
        p_couple_id: spaceId,
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
  const checkIn = useCallback(async (): Promise<boolean> => {
    if (!spaceId || checkingIn) return false;

    setCheckingIn(true);

    try {
      const { data, error } = await supabase.rpc("log_daily_activity", {
        p_couple_id: spaceId,
        p_type: "checkin"
      });

      if (error) {
        console.error("[CHECKIN ERROR]:", error.message);
        return false;
      }

      const status = (data as any)?.status;

      // ❌ erro real
      if (status === "invalid_user") {
        console.warn("Utilizador inválido");
        return false;
      }

      // ✅ SUCESSO (mesmo se já fez hoje)
      if (status === "success" || status === "already_checked_in") {
        await refresh(); // 🔥 ATUALIZA UI IMEDIATO
        window.dispatchEvent(new Event("streak-updated"));
        return true;
      }

      return false;

    } catch (err) {
      console.error("[CHECKIN EXCEPTION]:", err);
      return false;
    } finally {
      setCheckingIn(false);
    }
  }, [spaceId, checkingIn, refresh]);

  return { streak, loading, refresh, checkIn, checkingIn };
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { logActivity } from "@/lib/logActivity";

// ─────────────────────────────────────────────
// StreakState — interface completa
// Inclui campos novos (V3) e aliases antigos
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
    // LoveShield
    shieldsRemaining:   data.shields_remaining   ?? 0,
    shieldUsedToday:    data.shield_used_today   ?? false,
  };
}

// ─────────────────────────────────────────────
// useStreak — hook principal
// ─────────────────────────────────────────────

export function useStreak() {
  const spaceId = useCoupleSpaceId();
  const [streak, setStreak]   = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const refresh = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_streak", {
        p_couple_id: spaceId,
      });
      if (error) {
        console.error("[useStreak] Erro get_streak:", error.message);
        return;
      }
      if (data) setStreak(mapStreak(data as Record<string, any>));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ──────────────────────────────────────────
  // checkIn — ação principal (botão "Começar agora")
  // Busca user_id → chama RPC → refresh
  // ──────────────────────────────────────────
  const checkIn = useCallback(async (): Promise<boolean> => {
    if (!spaceId || checkingIn) return false;

    // Verificar se já fez check-in hoje
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[useStreak.checkIn] Sem utilizador");
      return false;
    }

    setCheckingIn(true);
    try {
      console.log(`[useStreak.checkIn] → couple=${spaceId} user=${user.id}`);

      const { data, error } = await supabase.rpc("log_daily_activity", {
        p_couple_id: spaceId,
        p_user_id:   user.id,
      });

      if (error) {
        console.error("[useStreak.checkIn] Erro:", error.message);
        return false;
      }

      const status = (data as any)?.status;
      console.log("[useStreak.checkIn] Resposta:", data);

      if (status === "invalid_user") {
        console.warn("[useStreak.checkIn] Utilizador não é membro");
        return false;
      }

      await refresh();
      return true;
    } catch (err) {
      console.error("[useStreak.checkIn] Excepção:", err);
      return false;
    } finally {
      setCheckingIn(false);
    }
  }, [spaceId, checkingIn, refresh]);

  return { streak, loading, refresh, checkIn, checkingIn };
}

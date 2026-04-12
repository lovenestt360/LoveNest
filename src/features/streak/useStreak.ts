import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

// ─────────────────────────────────────────────
// useStreak — Leitura e registo de atividade
//
// REGRA IMUTÁVEL:
//   Frontend NUNCA calcula streak.
//   Frontend NUNCA escreve directamente em streaks.
//   Frontend usa APENAS get_streak() e log_daily_activity().
// ─────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  status: "active" | "broken" | "frozen";
  bothActiveToday: boolean;
  activeCount: number;
  totalMembers: number;
}

export function useStreak() {
  const spaceId = useCoupleSpaceId();
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_streak", {
        p_couple_id: spaceId,
      });
      if (error) {
        console.error("useStreak: error fetching streak", error.message);
        return;
      }
      if (data) {
        setStreak({
          currentStreak:   data.current_streak   ?? 0,
          longestStreak:   data.longest_streak   ?? 0,
          lastActiveDate:  data.last_active_date ?? null,
          status:          data.status           ?? "active",
          bothActiveToday: data.both_active_today ?? false,
          activeCount:     data.active_today_count ?? 0,
          totalMembers:    data.total_members     ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { streak, loading, refresh };
}

// ─────────────────────────────────────────────
// logActivity — Chamar de qualquer módulo
//
// Uso:
//   import { logActivity } from "@/features/streak/useStreak";
//   await logActivity(spaceId, "message");
// ─────────────────────────────────────────────

export async function logActivity(
  coupleId: string,
  type: "message" | "mood" | "checkin" | "cycle" | "fasting" | "prayer" | "general" = "general"
): Promise<void> {
  if (!coupleId) return;
  const { error } = await supabase.rpc("log_daily_activity", {
    p_couple_id: coupleId,
    p_type: type,
  });
  if (error) {
    console.error("logActivity: error", error.message);
  }
}

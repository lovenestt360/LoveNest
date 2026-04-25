import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

// ─────────────────────────────────────────────
// StreakState
// ─────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  status: "active" | "broken" | "frozen" | "invalid";
  bothActiveToday: boolean;
  myCheckedIn: boolean;       // current user checked in today
  activeCount: number;        // how many members checked in today
  totalMembers: number;       // total members in couple_space
  progressPercentage: number;
  streakAtRisk: boolean;
  daysSinceLast: number | null;
  shieldsRemaining: number;
  shieldUsedToday: boolean;
  shieldsPurchasedThisMonth: number;
}

const EMPTY: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  status: "active",
  bothActiveToday: false,
  myCheckedIn: false,
  activeCount: 0,
  totalMembers: 0,
  progressPercentage: 0,
  streakAtRisk: false,
  daysSinceLast: null,
  shieldsRemaining: 0,
  shieldUsedToday: false,
  shieldsPurchasedThisMonth: 0,
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildState(
  raw: Record<string, any>,
  memberCount: number,
  activeUserIds: Set<string>,
  currentUserId: string | undefined
): StreakState {
  const current = raw.streak ?? raw.current ?? raw.current_streak ?? 0;
  const activeCount = activeUserIds.size;
  const bothActive = memberCount >= 2 && activeCount >= memberCount;
  const myCheckedIn = !!currentUserId && activeUserIds.has(currentUserId);
  const lastDate: string | null = raw.last_date ?? raw.last_active_date ?? null;

  const today = todayLocalISO();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const streakAtRisk =
    !bothActive &&
    memberCount >= 2 &&
    current > 0 &&
    lastDate === yesterday;

  const daysSinceLast = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
    : null;

  return {
    currentStreak: current,
    longestStreak: raw.longest ?? raw.longest_streak ?? current,
    lastActiveDate: lastDate,
    status: raw.status ?? (current === 0 ? "active" : "active"),
    bothActiveToday: bothActive,
    myCheckedIn,
    activeCount,
    totalMembers: memberCount,
    progressPercentage: Math.min(Math.round((current / 28) * 100), 100),
    streakAtRisk,
    daysSinceLast,
    shieldsRemaining: raw.shields_remaining ?? 0,
    shieldUsedToday: raw.shield_used_today ?? false,
    shieldsPurchasedThisMonth: raw.shields_purchased_this_month ?? 0,
  };
}

// ─────────────────────────────────────────────
// useStreak
// ─────────────────────────────────────────────

export function useStreak() {
  const spaceId = useCoupleSpaceId();

  const [streak, setStreak] = useState<StreakState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // ── refresh: 3 parallel queries ────────────
  const refresh = useCallback(async () => {
    if (!spaceId) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      const today = todayLocalISO();

      const [streakRes, membersRes, activityRes, userRes] = await Promise.all([
        supabase.rpc("get_streak", { p_couple_space_id: spaceId }),

        supabase
          .from("members")
          .select("user_id", { count: "exact", head: true })
          .eq("couple_space_id", spaceId),

        supabase
          .from("daily_activity" as any)
          .select("user_id")
          .eq("couple_space_id", spaceId)
          .eq("activity_date", today),

        supabase.auth.getUser(),
      ]);

      // Errors that must surface
      if (streakRes.error) {
        setError(`get_streak falhou: ${streakRes.error.message}`);
        setStreak(EMPTY);
        return;
      }
      if (membersRes.error) {
        setError(`members query falhou: ${membersRes.error.message}`);
        setStreak(EMPTY);
        return;
      }

      const memberCount = membersRes.count ?? 0;
      const rows = (activityRes.data as { user_id: string }[] | null) ?? [];
      const activeUserIds = new Set(rows.map((r) => r.user_id));
      const currentUserId = userRes.data?.user?.id;
      const raw = (streakRes.data as Record<string, any> | null) ?? {};

      setStreak(buildState(raw, memberCount, activeUserIds, currentUserId));
    } catch (err: any) {
      const msg = err?.message ?? "Erro inesperado em useStreak.refresh";
      setError(msg);
      setStreak(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── checkIn ────────────────────────────────
  const checkIn = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!spaceId || checkingIn) return { ok: false, message: "A aguardar processamento..." };

    setCheckingIn(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        return { ok: false, message: "Sessão expirada. Recarrega a página." };
      }

      const { data, error: rpcError } = await supabase.rpc("log_daily_activity", {
        p_couple_space_id: spaceId,
        p_type: "checkin",
      });

      // RPC-level error (network, auth, etc.)
      if (rpcError) {
        return { ok: false, message: `Erro do servidor: ${rpcError.message}` };
      }

      const res = data as Record<string, any> | null;

      // Application-level errors returned in payload
      if (!res?.success) {
        if (res?.status === "invalid_user") {
          return { ok: false, message: "Não és membro deste espaço." };
        }
        if (res?.status === "unauthenticated") {
          return { ok: false, message: "Sessão inválida. Recarrega a página." };
        }
        return { ok: false, message: "Resposta inesperada do servidor." };
      }

      // Refresh state from DB (source of truth)
      await refresh();

      window.dispatchEvent(new CustomEvent("streak-updated", { detail: { spaceId } }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Erro inesperado" };
    } finally {
      setCheckingIn(false);
    }
  }, [spaceId, checkingIn, refresh]);

  return { streak, loading, error, refresh, checkIn, checkingIn };
}

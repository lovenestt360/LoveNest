import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  status: "active" | "broken" | "frozen" | "invalid";
  bothActiveToday: boolean;
  myCheckedIn: boolean;
  activeCount: number;
  totalMembers: number;
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

/** progress = (streak / 28) * 100, capped at 100 */
export function calculateMonthlyProgress(streak: number): number {
  if (streak <= 0) return 0;
  return Math.min(Math.round((streak / 28) * 100), 100);
}

function todayLocalISO(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function yesterdayLocalISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildState(
  raw: Record<string, any>,
  memberCount: number,
  activeUserIds: Set<string>,
  currentUserId: string | undefined
): StreakState {
  const current = Number(raw.streak ?? raw.current ?? raw.current_streak ?? 0);
  const activeCount = activeUserIds.size;
  const bothActive = memberCount >= 2 && activeCount >= memberCount;
  const myCheckedIn = !!currentUserId && activeUserIds.has(currentUserId);
  const lastDate: string | null = raw.last_date ?? raw.last_active_date ?? null;

  const streakAtRisk =
    !bothActive &&
    memberCount >= 2 &&
    current > 0 &&
    lastDate === yesterdayLocalISO();

  const daysSinceLast = lastDate
    ? Math.floor((Date.now() - new Date(lastDate + "T00:00:00").getTime()) / 86_400_000)
    : null;

  return {
    currentStreak: current,
    longestStreak: Number(raw.longest ?? raw.longest_streak ?? current),
    lastActiveDate: lastDate,
    status: raw.status ?? "active",
    bothActiveToday: bothActive,
    myCheckedIn,
    activeCount,
    totalMembers: memberCount,
    progressPercentage: calculateMonthlyProgress(current),
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

  // ────────────────────────────────────────────
  // refresh — 3 parallel queries
  //
  // Query order:
  //   1. get_streak        → streak count + last_date
  //   2. members (rows)    → total members (real fetch, not head)
  //   3. daily_activity    → who checked in today
  //   4. auth.getUser      → current user id
  //
  // Failure strategy:
  //   - get_streak error   → surface error, keep previous state
  //   - members error      → warn, fall back to last known or 2
  //   - activity error     → warn, assume 0 active (safe)
  // ────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = todayLocalISO();

      const [streakRes, membersRes, activityRes, userRes] = await Promise.all([
        // 1. Streak from couple_spaces via RPC
        supabase.rpc("get_streak", { p_couple_space_id: spaceId }),

        // 2. Members — real row select, not head (head+count unreliable with RLS)
        supabase
          .from("members")
          .select("user_id")
          .eq("couple_space_id", spaceId),

        // 3. Today's activity — who has logged today
        supabase
          .from("daily_activity" as any)
          .select("user_id")
          .eq("couple_space_id", spaceId)
          .eq("activity_date", today),

        // 4. Current user id
        supabase.auth.getUser(),
      ]);

      // get_streak is critical — surface error but keep previous state
      if (streakRes.error) {
        setError(`get_streak: ${streakRes.error.message}`);
        setLoading(false);
        return;
      }

      // members — if it fails, fall back to 2 (couple = 2 people)
      let memberCount = 0;
      if (membersRes.error) {
        console.warn("[useStreak] members query failed:", membersRes.error.message, "— using fallback 2");
        memberCount = 2;
      } else {
        memberCount = (membersRes.data as { user_id: string }[] | null)?.length ?? 0;
      }

      // activity — if it fails, assume nobody checked in yet (safe)
      let activeUserIds = new Set<string>();
      if (activityRes.error) {
        console.warn("[useStreak] daily_activity query failed:", activityRes.error.message);
      } else {
        const rows = (activityRes.data as { user_id: string }[] | null) ?? [];
        activeUserIds = new Set(rows.map((r) => r.user_id));
      }

      const currentUserId = userRes.data?.user?.id;
      const raw = (streakRes.data as Record<string, any> | null) ?? {};

      setStreak(buildState(raw, memberCount, activeUserIds, currentUserId));
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado em useStreak");
      // Do NOT reset to EMPTY — keep the last known good state
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ────────────────────────────────────────────
  // checkIn
  // ────────────────────────────────────────────
  const checkIn = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!spaceId || checkingIn) {
      return { ok: false, message: "A aguardar processamento..." };
    }

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

      if (rpcError) {
        return { ok: false, message: `Erro do servidor: ${rpcError.message}` };
      }

      const res = data as Record<string, any> | null;

      // Application-level error from V5 backend
      if (!res?.success) {
        if (res?.status === "invalid_user") {
          return { ok: false, message: "Não és membro deste espaço." };
        }
        if (res?.status === "unauthenticated") {
          return { ok: false, message: "Sessão inválida. Recarrega a página." };
        }
        return { ok: false, message: "Resposta inesperada do servidor." };
      }

      // V5 returns { success, streak, active_today }
      // Optimistically update from response before DB refresh
      const newStreak = Number(res.streak ?? 0);
      const newActiveToday = Number(res.active_today ?? 0);

      setStreak((prev) => {
        const activeUserIds = new Set<string>();
        // We know current user is now active
        if (authData.user?.id) activeUserIds.add(authData.user.id);
        // Preserve partner's active status if we knew they were active
        if (prev.activeCount > 1 && prev.totalMembers >= 2) {
          // Partner was already active — fill up to activeCount
          activeUserIds.add("__partner__");
        }
        // If backend says more people are active, trust backend
        const activeCount = Math.max(activeUserIds.size, newActiveToday);
        const memberCount = prev.totalMembers || 2;
        const bothActive = memberCount >= 2 && activeCount >= memberCount;

        return {
          ...prev,
          currentStreak: newStreak,
          longestStreak: Math.max(prev.longestStreak, newStreak),
          progressPercentage: calculateMonthlyProgress(newStreak),
          activeCount,
          bothActiveToday: bothActive,
          myCheckedIn: true,
          streakAtRisk: false,
        };
      });

      // Then do a full refresh from DB to get authoritative state
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

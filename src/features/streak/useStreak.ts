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
  realMembersCount: number;
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
  realMembersCount: 0,
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

export function calculateMonthlyProgress(streak: number): number {
  if (streak <= 0) return 0;
  return Math.min(Math.round((streak / 28) * 100), 100);
}

function yesterdayServerISO(lastDate: string | null): boolean {
  // Compare lastDate against yesterday in UTC (same timezone as server)
  if (!lastDate) return false;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return lastDate === yesterday;
}

// ─────────────────────────────────────────────
// buildState — single source of truth is get_streak response
// All activity data comes from server (CURRENT_DATE, no timezone mismatch)
// ─────────────────────────────────────────────

function buildState(
  raw: Record<string, any>,
  memberListCount: number // from get_couple_member_ids (for UI display)
): StreakState {
  const current      = Number(raw.streak ?? 0);
  const lastDate     = (raw.last_date as string | null) ?? null;
  const activeToday  = Number(raw.active_today ?? 0);
  const myCheckedIn  = Boolean(raw.my_checked_in ?? false);
  const bothActive   = Boolean(raw.both_active ?? false);

  // member_count from get_streak is the authoritative DB count
  // memberListCount from get_couple_member_ids is for member profile display
  const realMembersCount = Number(raw.member_count ?? memberListCount ?? 0);
  const totalMembers     = Math.max(realMembersCount, 2);

  const streakAtRisk =
    !bothActive && totalMembers >= 2 && current > 0 && yesterdayServerISO(lastDate);

  const daysSinceLast = lastDate
    ? Math.floor(
        (Date.now() - new Date(lastDate + "T00:00:00Z").getTime()) / 86_400_000
      )
    : null;

  return {
    currentStreak:            current,
    longestStreak:            Number(raw.longest ?? raw.longest_streak ?? current),
    lastActiveDate:           lastDate,
    status:                   raw.status ?? "active",
    bothActiveToday:          bothActive,
    myCheckedIn,
    activeCount:              activeToday,
    totalMembers,
    realMembersCount,
    progressPercentage:       calculateMonthlyProgress(current),
    streakAtRisk,
    daysSinceLast,
    shieldsRemaining:         raw.shields_remaining ?? 0,
    shieldUsedToday:          raw.shield_used_today ?? false,
    shieldsPurchasedThisMonth: raw.shields_purchased_this_month ?? 0,
  };
}

// ─────────────────────────────────────────────
// useStreak
// ─────────────────────────────────────────────

export function useStreak() {
  const spaceId = useCoupleSpaceId();

  const [streak, setStreak] = useState<StreakState>(EMPTY);
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  // refresh
  //
  // Only 2 queries now (was 4):
  //   1. get_streak  → streak + activity data (server-side CURRENT_DATE)
  //   2. get_couple_member_ids → member list for UI
  //
  // The daily_activity query was REMOVED because it used todayLocalISO()
  // (browser date) which mismatched the server's CURRENT_DATE (UTC),
  // causing active_today to always read as 0 after refresh.
  // ─────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!spaceId) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      const [streakRes, membersRes] = await Promise.all([
        supabase.rpc("get_streak", { p_couple_space_id: spaceId }),
        supabase.rpc("get_couple_member_ids", { p_couple_space_id: spaceId }),
      ]);

      if (streakRes.error) {
        setError(`get_streak: ${streakRes.error.message}`);
        return;
      }

      const raw = (streakRes.data as Record<string, any> | null) ?? {};

      const memberListCount = membersRes.error
        ? 0
        : (membersRes.data as { user_id: string }[] | null)?.length ?? 0;

      if (membersRes.error) {
        console.warn("[useStreak] get_couple_member_ids failed:", membersRes.error.message);
      }

      setStreak(buildState(raw, memberListCount));
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado em useStreak");
      // Keep previous state — do not reset to EMPTY
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ─────────────────────────────────────────────────────────────────────
  // checkIn
  //
  // 1. Call log_daily_activity (server inserts with CURRENT_DATE)
  // 2. Mark myCheckedIn: true immediately (optimistic — always correct)
  // 3. Call refresh() → get_streak returns authoritative state from server
  //
  // No complex optimistic update for bothActive/activeCount —
  // those come from server after refresh() and are always correct.
  // ─────────────────────────────────────────────────────────────────────
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

      if (rpcError) {
        return { ok: false, message: `Erro do servidor: ${rpcError.message}` };
      }

      const res = data as Record<string, any> | null;

      if (!res?.success) {
        if (res?.status === "invalid_user")    return { ok: false, message: "Não és membro deste espaço." };
        if (res?.status === "unauthenticated") return { ok: false, message: "Sessão inválida. Recarrega a página." };
        return { ok: false, message: "Resposta inesperada do servidor." };
      }

      // Minimal optimistic update — only what we know for certain:
      // current user checked in. Everything else comes from refresh().
      setStreak(prev => ({ ...prev, myCheckedIn: true }));

      // Authoritative state from server (uses CURRENT_DATE — no timezone issues)
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

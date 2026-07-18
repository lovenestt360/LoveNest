import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { todayLocal, yesterdayLocal } from "@/lib/timezone";

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

function wasYesterday(lastDate: string | null): boolean {
  // Compare lastDate against yesterday in the user's local timezone.
  // The server now stores dates in local timezone (after timezone-aware migration).
  if (!lastDate) return false;
  return lastDate === yesterdayLocal();
}

// ─────────────────────────────────────────────
// buildState — single source of truth is get_streak response
// All activity data comes from server (CURRENT_DATE, no timezone mismatch)
// ─────────────────────────────────────────────

function buildState(
  raw: Record<string, any>,
  memberListCount: number // from get_couple_member_ids (for UI display)
): StreakState {
  // get_streak returns status='broken' when last_streak_date < yesterday and shields
  // couldn't cover the gap. update_streak (after the DB migration) sets streak_count=0
  // eagerly, but even before that migration runs, we enforce 0 here so the UI
  // never shows a stale streak after a break.
  const rawStatus    = String(raw.status ?? "active");
  const current      = rawStatus === "broken" ? 0 : Number(raw.streak ?? 0);
  const lastDate     = (raw.last_date as string | null) ?? null;
  const activeToday  = Number(raw.active_today ?? 0);
  const myCheckedIn  = Boolean(raw.my_checked_in ?? false);
  const bothActive   = Boolean(raw.both_active ?? false);

  // member_count from get_streak is the authoritative DB count
  // memberListCount from get_couple_member_ids is for member profile display
  const realMembersCount = Number(raw.member_count ?? memberListCount ?? 0);
  const totalMembers     = Math.max(realMembersCount, 1);

  const streakAtRisk =
    !bothActive && totalMembers >= 2 && current > 0 && wasYesterday(lastDate);

  // Compare date strings (both in local timezone after server fix) as UTC midnight
  // to get the correct integer number of days between them.
  const daysSinceLast = lastDate
    ? Math.round(
        (new Date(todayLocal()).getTime() - new Date(lastDate).getTime()) / 86_400_000
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

function readStreakCache(spaceId: string | null): StreakState | null {
  if (!spaceId) return null;
  try {
    const raw = sessionStorage.getItem(`ln_streak_${spaceId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as StreakState & { cacheDate?: string };
    // Se o cache foi escrito noutro dia, os flags de "hoje" ficaram inválidos.
    // Usa cacheDate (data em que o cache foi escrito) em vez de lastActiveDate,
    // porque lastActiveDate é a última data de extensão do streak (ambos ativos)
    // — não a data em que o utilizador fez check-in individualmente.
    if (cached.cacheDate !== todayLocal()) {
      return { ...cached, myCheckedIn: false, bothActiveToday: false, activeCount: 0, streakAtRisk: cached.currentStreak > 0 };
    }
    return cached as StreakState;
  } catch { return null; }
}

function writeStreakCache(spaceId: string, state: StreakState) {
  try { sessionStorage.setItem(`ln_streak_${spaceId}`, JSON.stringify({ ...state, cacheDate: todayLocal() })); } catch {}
}

export function useStreak() {
  const spaceId = useCoupleSpaceId();

  // Se houver cache da sessão, mostra imediatamente sem skeleton
  const [streak, setStreak] = useState<StreakState>(() => readStreakCache(spaceId) ?? EMPTY);
  const [loading, setLoading]     = useState(() => !readStreakCache(spaceId));
  const [error,   setError]       = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  // initialized: true depois do primeiro refresh() bem-sucedido com spaceId não-nulo.
  // Consumers (ex: Jornada) usam este flag para não renderizar com dados EMPTY.
  const [initialized, setInitialized] = useState(false);
  const initializedRef = useRef(false);

  // Local date string at mount — used to detect day rollover in user's timezone
  const todayUTCRef = useRef(todayLocal());

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
  // Track previous state to detect streak breaks and shield usage
  const prevStreakRef  = useRef<number | null>(null);
  const prevShieldsRef = useRef<number | null>(null);

  // silent=true: dados existentes ficam visíveis durante o fetch (sem skeleton).
  // Usado em polling, home-visible e checkIn — o skeleton só aparece no
  // primeiro carregamento (quando não há ainda nenhum dado em memória).
  const refresh = useCallback(async (silent = false) => {
    if (!spaceId) { setLoading(false); return; }

    if (!silent) setLoading(true);
    setError(null);

    try {
      await supabase.rpc("update_streak", { p_couple_space_id: spaceId });

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

      const newState = buildState(raw, memberListCount);

      // Timezone guard: o servidor usa o timezone do perfil para v_today.
      // Se lastActiveDate (= last_streak_date, data em que ambos estiveram ativos)
      // for anterior ao dia local, pode significar duas coisas:
      //   A) Edge-case de timezone: servidor atrás do cliente (1h para UTC+1)
      //   B) Normal: só um parceiro fez check-in hoje → streak ainda não avançou
      //
      // Em ambos os casos reseta bothActiveToday/activeCount (derivados do streak).
      // NÃO reseta myCheckedIn: o servidor responde diretamente se ESTE utilizador
      // fez check-in hoje — não depende de o parceiro também ter feito.
      const localToday = todayLocal();
      const staleServerDate =
        newState.lastActiveDate !== null && newState.lastActiveDate < localToday;
      const finalState: StreakState = staleServerDate
        ? {
            ...newState,
            // myCheckedIn mantido: é um dado per-user que o servidor calcula
            // com base em daily_activity do utilizador, independente do streak.
            bothActiveToday: false,
            activeCount:     0,
            streakAtRisk:    newState.currentStreak > 0,
          }
        : newState;

      const prev        = prevStreakRef.current;
      const prevShields = prevShieldsRef.current;

      if (prev !== null && prevShields !== null) {
        if (prev > 0 && finalState.currentStreak === 0) {
          window.dispatchEvent(new CustomEvent("streak-broke", { detail: { prev } }));
        } else if (
          finalState.currentStreak > 0 &&
          prevShields > finalState.shieldsRemaining &&
          finalState.shieldsRemaining >= 0
        ) {
          window.dispatchEvent(new CustomEvent("shield-protected", {
            detail: { shieldsLeft: finalState.shieldsRemaining }
          }));
        }
      }

      prevStreakRef.current  = finalState.currentStreak;
      prevShieldsRef.current = finalState.shieldsRemaining;

      if (spaceId) writeStreakCache(spaceId, finalState);
      setStreak(finalState);
      if (!initializedRef.current) {
        initializedRef.current = true;
        setInitialized(true);
      }
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado em useStreak");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  // Primeiro carregamento — silencioso se já há dados cacheados para este spaceId
  // (evita skeleton flash ao navegar entre páginas)
  useEffect(() => { refresh(readStreakCache(spaceId) !== null); }, [refresh, spaceId]);

  // Polling silencioso — dados ficam visíveis, atualizam em background
  useEffect(() => {
    const interval = setInterval(() => refresh(true), 5 * 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Regresso à Home (keep-alive) e qualquer actividade registada — silencioso
  useEffect(() => {
    const h = () => refresh(true);
    window.addEventListener("home-visible", h);
    window.addEventListener("streak-updated", h);
    return () => {
      window.removeEventListener("home-visible", h);
      window.removeEventListener("streak-updated", h);
    };
  }, [refresh]);

  // Rollover de meia-noite — silencioso (em hora local do utilizador)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowLocal = todayLocal();
      if (nowLocal !== todayUTCRef.current) {
        todayUTCRef.current = nowLocal;
        // Optimistic reset: at local midnight, mark "today" as fresh even before
        // the server responds (the server may still be on the previous UTC day).
        setStreak(prev => ({
          ...prev,
          myCheckedIn:     false,
          bothActiveToday: false,
          activeCount:     0,
          streakAtRisk:    prev.currentStreak > 0,
        }));
        refresh(true);
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Realtime — escudos actualizam imediatamente quando são comprados ou usados
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel(`shields-rt-${spaceId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "love_shields", filter: `couple_space_id=eq.${spaceId}` }, () => refresh(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, refresh]);

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

      // Optimistic update imediato para resposta visual instantânea
      setStreak(prev => ({ ...prev, myCheckedIn: true }));

      // Refresh silencioso — card actualiza no lugar sem skeleton
      await refresh(true);

      window.dispatchEvent(new CustomEvent("streak-updated", { detail: { spaceId } }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? "Erro inesperado" };
    } finally {
      setCheckingIn(false);
    }
  }, [spaceId, checkingIn, refresh]);

  return { streak, loading, error, refresh, checkIn, checkingIn, initialized };
}

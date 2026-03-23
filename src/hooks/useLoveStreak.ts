import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format, differenceInDays } from "date-fns";

export interface LoveStreakData {
  current_streak: number;
  best_streak: number;
  last_streak_date: string | null;
  shield_remaining: number;
  interaction_date: string | null;
  level_title: string;
  total_points: number;
}

export interface DailyCompletion {
  p1_interacted: boolean;
  p2_interacted: boolean;
  is_completed_p1: boolean;
  is_completed_p2: boolean;
  mission_title: string | null;
  mission_description: string | null;
  mission_emoji: string | null;
  mission_points: number | null;
  day_complete: boolean;
}

const STREAK_LEVELS = [
  { min: 0, title: "Iniciante" },
  { min: 7, title: "Casal Dedicado" },
  { min: 30, title: "Casal Forte" },
  { min: 100, title: "Casal Inspirador" },
  { min: 365, title: "Casal Lendário" },
];

export function getStreakLevel(streak: number) {
  let level = STREAK_LEVELS[0];
  for (const l of STREAK_LEVELS) {
    if (streak >= l.min) level = l;
  }
  return level;
}

export function getNextLevel(streak: number) {
  for (const l of STREAK_LEVELS) {
    if (streak < l.min) return l;
  }
  return null;
}

export function useLoveStreak() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [data, setData] = useState<LoveStreakData | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [streakIncreased, setStreakIncreased] = useState(false);
  const [isPartner1, setIsPartner1] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!spaceId) return;
    
    // 1. Sync streak via RPC (Idempotent)
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_streak_v3', { p_couple_space_id: spaceId });
    
    if (syncError) console.error("Error syncing streak:", syncError);

    // 2. Load streak data
    const { data: streak } = await supabase
      .from("love_streaks")
      .select("*")
      .eq("couple_space_id", spaceId)
      .maybeSingle();

    if (streak) setData(streak as any);

    // 3. Load daily completion (v3 View)
    const { data: completion } = await supabase
      .from("v_daily_completion" as any)
      .select("*")
      .eq("couple_space_id", spaceId)
      .maybeSingle();
    
    if (completion) setDailyStatus(completion as any);

    // 4. Determine if I am partner 1
    const { data: members } = await supabase
      .from("members")
      .select("user_id")
      .eq("couple_space_id", spaceId)
      .order("joined_at");
    
    if (members && members.length > 0) {
      setIsPartner1(members[0].user_id === user.id);
    }

    setLoading(false);
  }, [spaceId, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime updates
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("love-streak-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "love_streaks",
        filter: `couple_space_id=eq.${spaceId}`,
      }, (payload) => {
        const newData = payload.new as any;
        setData((prev) => {
          if (prev && newData.current_streak > prev.current_streak) {
            setStreakIncreased(true);
            setTimeout(() => setStreakIncreased(false), 3000);
          }
          return newData;
        });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "couple_missions",
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "daily_interactions",
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  // Record an interaction for the current user (Now handled by DB Triggers)
  const recordInteraction = useCallback(async (type: string) => {
    console.log("Interaction recorded via trigger:", type);
    // Logic moved to Postgres triggers for stability and atomic updates
  }, []);

  // Use shield to restore broken streak
  const useShield = useCallback(async () => {
    if (!spaceId || !data || data.shield_remaining <= 0) return false;

    const yesterday = format(
      new Date(Date.now() - 86400000),
      "yyyy-MM-dd"
    );

    // Only allow if last_streak_date is before yesterday (they missed a day)
    if (!data.last_streak_date) return false;

    const diff = differenceInDays(
      new Date(todayStr + "T00:00:00"),
      new Date(data.last_streak_date + "T00:00:00")
    );

    if (diff <= 1) return false; // No missed day

    const { error } = await supabase
      .from("love_streaks")
      .update({
        last_streak_date: yesterday,
        shield_remaining: data.shield_remaining - 1,
      })
      .eq("couple_space_id", spaceId);

    if (!error) {
      load();
      return true;
    }
    return false;
  }, [spaceId, data, todayStr, load]);

  // Buy a shield using points (e.g., 200 points per shield)
  const buyShield = useCallback(async () => {
    if (!spaceId || !data || data.total_points < 200) return false;

    const { error } = await supabase
      .from("love_streaks")
      .update({
        shield_remaining: (data.shield_remaining || 0) + 1,
        total_points: data.total_points - 200,
      })
      .eq("couple_space_id", spaceId);

    if (!error) {
      load();
      return true;
    }
    return false;
  }, [spaceId, data, load]);

  // Check if streak is broken and can be restored
  const canUseShield = data && data.shield_remaining > 0 && data.last_streak_date
    ? differenceInDays(new Date(todayStr + "T00:00:00"), new Date(data.last_streak_date + "T00:00:00")) > 1
      && !dailyStatus?.day_complete // If they already completed today, don't show "lost" even if sync is lagging
    : false;

  return {
    data,
    dailyStatus,
    loading,
    isPartner1,
    streakIncreased,
    recordInteraction,
    useShield,
    buyShield, 
    canUseShield,
    reload: load,
  };
}

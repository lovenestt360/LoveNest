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
  partner1_interacted_today: boolean;
  partner2_interacted_today: boolean;
  interaction_date: string | null;
  level_title: string;
  total_points: number;
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
  const [loading, setLoading] = useState(true);
  const [streakIncreased, setStreakIncreased] = useState(false);
  const [isPartner1, setIsPartner1] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!spaceId) return;
    const { data: streak } = await supabase
      .from("love_streaks")
      .select("*")
      .eq("couple_space_id", spaceId)
      .maybeSingle();

    if (streak) {
      setData(streak as any);
    } else {
      // Create initial record
      const { data: created } = await supabase
        .from("love_streaks")
        .insert({ couple_space_id: spaceId })
        .select()
        .maybeSingle();
      if (created) setData(created as any);
    }

    // Determine if I am partner 1
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  // Record an interaction for the current user
  const recordInteraction = useCallback(async (type: string) => {
    if (!spaceId || !user) return;

    try {
      // Step 1: Log the interaction in the legacy table (optional, for compatibility)
      await supabase.from("daily_interactions").upsert({
        couple_space_id: spaceId,
        user_id: user.id,
        day_key: todayStr,
        interaction_type: type,
      }, { onConflict: "couple_space_id,user_id,day_key,interaction_type" });

      // Step 2: Emit the modern Love Event that triggers the Love Engine
      let eventType = 'app_open';
      if (type.includes('chat')) eventType = 'message';
      else if (type.includes('task')) eventType = 'task';
      else if (type.includes('memory')) eventType = 'memory';
      else if (type.includes('mood')) eventType = 'mood';
      else if (type.includes('prayer')) eventType = 'prayer';

      await supabase.from("love_events" as any).insert({
        couple_space_id: spaceId,
        user_id: user.id,
        event_type: eventType,
        metadata: { source: 'useLoveStreak_legacy' },
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error in recordInteraction:', err);
    }
  }, [spaceId, user, todayStr]);

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

  // Show shield alert only when exactly yesterday was missed (gap === 2 from today).
  // If gap > 2, the streak is already too stale — the shield wouldn't help.
  // If gap <= 1, the streak is still valid — no need for a shield.
  const daysSinceLastStreak = data && data.last_streak_date
    ? differenceInDays(new Date(todayStr + "T00:00:00"), new Date(data.last_streak_date + "T00:00:00"))
    : 0;
  const canUseShield = !!(data && data.shield_remaining > 0 && data.current_streak > 0 && daysSinceLastStreak === 2);

  // CRITICAL FIX: Only trust interaction booleans if interaction_date matches today.
  // If the interaction_date is from a previous day, the booleans are stale and mean nothing.
  const interactionIsToday = data?.interaction_date === todayStr;
  const p1Today = interactionIsToday ? !!data?.partner1_interacted_today : false;
  const p2Today = interactionIsToday ? !!data?.partner2_interacted_today : false;

  const meInteractedToday = isPartner1 ? p1Today : p2Today;
  const partnerInteractedToday = isPartner1 ? p2Today : p1Today;
  const bothInteractedToday = p1Today && p2Today;

  return {
    data,
    loading,
    isPartner1,
    streakIncreased,
    recordInteraction,
    useShield,
    buyShield,
    canUseShield,
    reload: load,
    // Computed, date-validated interaction status
    meInteractedToday,
    partnerInteractedToday,
    bothInteractedToday,
  };
}

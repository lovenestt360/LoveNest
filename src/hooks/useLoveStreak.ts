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
    setLoading(false);
  }, [spaceId]);

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

    // Insert interaction (ignore duplicates via unique constraint)
    await supabase.from("daily_interactions").upsert({
      couple_space_id: spaceId,
      user_id: user.id,
      day_key: todayStr,
      interaction_type: type,
    }, { onConflict: "couple_space_id,user_id,day_key,interaction_type" });

    // Get members to determine partner1 vs partner2
    const { data: members } = await supabase
      .from("members")
      .select("user_id")
      .eq("couple_space_id", spaceId)
      .order("joined_at");

    if (!members || members.length < 2) return;

    const isPartner1 = members[0].user_id === user.id;
    const partnerId = isPartner1 ? members[1].user_id : members[0].user_id;

    // Check if partner has interacted today
    const { data: partnerInteractions } = await supabase
      .from("daily_interactions")
      .select("id")
      .eq("couple_space_id", spaceId)
      .eq("user_id", partnerId)
      .eq("day_key", todayStr)
      .limit(1);

    const partnerInteracted = (partnerInteractions?.length ?? 0) > 0;

    // Update streak record
    const { data: current } = await supabase
      .from("love_streaks")
      .select("*")
      .eq("couple_space_id", spaceId)
      .maybeSingle();

    if (!current) return;
    const s = current as any as LoveStreakData;

    // Reset monthly shields
    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
    let shieldRemaining = s.shield_remaining;
    if ((s as any).shield_monthly_reset !== monthStart) {
      shieldRemaining = 3;
    }

    const updates: any = {
      shield_monthly_reset: monthStart,
      shield_remaining: shieldRemaining,
    };

    if (isPartner1) {
      updates.partner1_interacted_today = true;
    } else {
      updates.partner2_interacted_today = true;
    }

    // If interaction_date is not today, reset both flags
    if (s.interaction_date !== todayStr) {
      updates.partner1_interacted_today = isPartner1;
      updates.partner2_interacted_today = !isPartner1;
      updates.interaction_date = todayStr;
    }

    // Check if both interacted now
    const bothInteracted = isPartner1
      ? (updates.partner1_interacted_today && (s.interaction_date === todayStr ? s.partner2_interacted_today : false))
      : ((s.interaction_date === todayStr ? s.partner1_interacted_today : false) && updates.partner2_interacted_today);

    // If both interacted and streak hasn't been counted for today
    if (bothInteracted && s.last_streak_date !== todayStr) {
      const lastDate = s.last_streak_date;
      let newStreak = s.current_streak;

      if (!lastDate) {
        newStreak = 1;
      } else {
        const diff = differenceInDays(
          new Date(todayStr + "T00:00:00"),
          new Date(lastDate + "T00:00:00")
        );
        if (diff === 1) {
          newStreak += 1;
        } else if (diff > 1) {
          // Streak broken (shield would have been used separately)
          newStreak = 1;
        }
      }

      updates.current_streak = newStreak;
      updates.best_streak = Math.max(newStreak, s.best_streak);
      updates.last_streak_date = todayStr;
      updates.level_title = getStreakLevel(newStreak).title;
    }

    await supabase
      .from("love_streaks")
      .update(updates)
      .eq("couple_space_id", spaceId);
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

  // Check if streak is broken and can be restored
  const canUseShield = data && data.shield_remaining > 0 && data.last_streak_date
    ? differenceInDays(new Date(todayStr + "T00:00:00"), new Date(data.last_streak_date + "T00:00:00")) > 1
    : false;

  return {
    data,
    loading,
    streakIncreased,
    recordInteraction,
    useShield,
    buyShield, // Added
    canUseShield,
    reload: load,
  };
}

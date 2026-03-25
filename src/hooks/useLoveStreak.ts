import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format } from "date-fns";

export interface LoveStreakData {
  current_streak: number;
  best_streak: number;
  last_streak_date: string | null;
  loveshield_count: number;
  total_points: number;
  level_title: string;
}

export interface DailyCompletion {
  me_active: boolean;
  partner_active: boolean;
  mission_completed: boolean;
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
    if (!spaceId || !user) return;
    
    // 1. Load streak data
    const { data: streak } = await supabase
      .from("love_streaks")
      .select("*")
      .eq("couple_space_id", spaceId)
      .maybeSingle();

    // 2. Load user items (shields)
    const { data: items } = await supabase
      .from("user_items")
      .select("loveshield_count")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streak) {
      setData({
        ...streak,
        loveshield_count: items?.loveshield_count || 0,
        level_title: getStreakLevel(streak.current_streak).title
      });
    }

    // 3. Load daily activity
    const { data: activities } = await supabase
      .from("daily_activity")
      .select("user_id, did_action")
      .eq("couple_id", spaceId)
      .eq("date", todayStr);

    const meActive = activities?.some(a => a.user_id === user.id && a.did_action) || false;
    const partnerActive = activities?.some(a => a.user_id !== user.id && a.did_action) || false;

    // 4. Load latest mission
    const { data: mission } = await supabase
      .from("love_missions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 5. Check if mission completed today
    const { data: completion } = await supabase
      .from("mission_completions")
      .select("*")
      .eq("user_id", user.id)
      .eq("date" as any, todayStr) // Assuming date field names might vary slightly, but following SQL plan
      .maybeSingle();

    setDailyStatus({
      me_active: meActive,
      partner_active: partnerActive,
      mission_completed: !!completion,
      mission_title: mission?.title || null,
      mission_description: mission?.description || null,
      mission_emoji: "✨", // Default or from table
      mission_points: mission?.reward_points || null,
      day_complete: meActive && partnerActive
    });

    // 6. Determine if I am partner 1
    const { data: members } = await supabase
      .from("members")
      .select("user_id")
      .eq("couple_space_id", spaceId)
      .order("joined_at");
    
    if (members && members.length > 0) {
      setIsPartner1(members[0].user_id === user.id);
    }

    setLoading(false);
  }, [spaceId, user, todayStr]);

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
          return { ...prev, ...newData } as any;
        });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "daily_activity",
        filter: `couple_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  const confirmAction = useCallback(async () => {
    if (!spaceId) return false;
    const { error } = await supabase.rpc('fn_confirm_daily_action', { p_couple_id: spaceId });
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [spaceId, load]);

  const useShield = useCallback(async () => {
    const { error } = await supabase.rpc('fn_use_loveshield');
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [load]);

  const buyShield = useCallback(async (cost: number = 200) => {
    const { error } = await supabase.rpc('fn_purchase_loveshield', { p_cost: cost });
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [load]);

  return {
    data,
    dailyStatus,
    loading,
    isPartner1,
    streakIncreased,
    confirmAction,
    useShield,
    buyShield, 
    reload: load,
  };
}

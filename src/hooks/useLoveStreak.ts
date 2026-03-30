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
  level_title?: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  type: string;
  target: number;
  current: number;
  completed: boolean;
  reward: number;
}

export interface DailyCompletion {
  me_active: boolean;
  partner_active: boolean;
  missions: DailyMission[];
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
    
    try {
      // 1. Load streak data
      const { data: streak } = await (supabase
        .from("love_streak" as any)
        .select("*")
        .eq("couple_id", spaceId)
        .maybeSingle() as any);

      // 1b. Load individual user points
      const { data: userPoints } = await (supabase
        .from("love_points" as any)
        .select("points")
        .eq("user_id", user.id)
        .eq("couple_id", spaceId)
        .maybeSingle() as any);

      // 2. Load user items (shields)
      const { data: items } = await (supabase
        .from("user_items" as any)
        .select("loveshield_count")
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (streak) {
        const s = streak as any;
        setData({
          ...s,
          last_streak_date: s.last_active_date, 
          loveshield_count: (items as any)?.loveshield_count || 0,
          total_points: (userPoints as any)?.points || 0,
          level_title: getStreakLevel(s.current_streak).title
        } as LoveStreakData);
      }

      // 3. Load daily interactions (only the 'real' ones)
      const { data: interactionRecords } = await (supabase
        .from("interactions" as any)
        .select("user_id, type")
        .eq("couple_id", spaceId)
        .gte("created_at", `${todayStr}T00:00:00` as any)
        .lte("created_at", `${todayStr}T23:59:59` as any) as any);

      const realInteractionTypes = ['message_sent', 'task_completed', 'mood_logged', 'plan_completed'];
      const meActive = (interactionRecords as any[])?.some(a => a.user_id === user.id && realInteractionTypes.includes(a.type)) || false;
      const partnerActive = (interactionRecords as any[])?.some(a => a.user_id !== user.id && realInteractionTypes.includes(a.type)) || false;

      // 4. Load 3 missions assigned for today
      const { data: dailyMissions } = await (supabase
        .from("couple_daily_missions" as any)
        .select("mission_id, love_missions!inner(*)")
        .eq("couple_id", spaceId)
        .eq("assignment_date", todayStr) as any);

      const missions: DailyMission[] = [];
      if (dailyMissions && (dailyMissions as any[]).length > 0) {
        for (const dm of (dailyMissions as any[])) {
          const m = dm.love_missions;
          const currentCount = (interactionRecords as any[])?.filter(a => a.user_id === user.id && a.type === m.mission_type).length || 0;
          
          // Check if completed
          const { data: isCompleted } = await (supabase
            .from("mission_completions" as any)
            .select("*")
            .eq("user_id", user.id)
            .eq("mission_id", m.id)
            .eq("completed_at" as any, todayStr)
            .maybeSingle() as any);

          missions.push({
            id: m.id,
            title: m.title,
            description: m.description,
            emoji: m.emoji || "✨",
            type: m.mission_type,
            target: m.target_count || 1,
            current: currentCount,
            completed: !!isCompleted,
            reward: m.reward_points || 0
          });
        }
      }

      setDailyStatus({
        me_active: meActive,
        partner_active: partnerActive,
        missions,
        day_complete: meActive && partnerActive
      });

      // 5. Determine if I am partner 1
      const { data: members } = await supabase
        .from("members")
        .select("user_id")
        .eq("couple_space_id", spaceId)
        .order("joined_at");
      
      if (members && members.length > 0) {
        setIsPartner1(members[0].user_id === user.id);
      }
    } catch (err) {
      console.error("Error in useLoveStreak.load:", err);
    } finally {
      setLoading(false);
    }
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
        table: "love_streak" as any,
        filter: `couple_id=eq.${spaceId}`,
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
        table: "interactions" as any,
        filter: `couple_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "mission_completions" as any,
        filter: `couple_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  const confirmAction = useCallback(async () => {
    if (!spaceId) return false;
    
    const { error } = await (supabase
      .from("interactions" as any)
      .insert({
        user_id: user?.id,
        couple_id: spaceId,
        type: 'manual_checkin'
      }) as any);
      
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [spaceId, user, load]);

  const useShield = useCallback(async () => {
    const { error } = await (supabase.rpc('fn_use_loveshield' as any) as any);
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [load]);

  const buyShield = useCallback(async (cost: number = 200) => {
    const { error } = await (supabase.rpc('fn_purchase_loveshield' as any, { p_cost: cost }) as any);
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [load]);

  const recordInteraction = useCallback(async (actionType: string = 'general') => {
    if (!spaceId || !user) return false;
    
    try {
      const { error } = await (supabase
        .from("interactions" as any)
        .insert({
          user_id: user.id,
          couple_id: spaceId,
          type: actionType
        }) as any);
      
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Error recording interaction:", err);
      return false;
    }
  }, [spaceId, user]);

  return {
    data,
    dailyStatus,
    loading,
    isPartner1,
    streakIncreased,
    confirmAction,
    recordInteraction,
    useShield,
    buyShield, 
    reload: load,
  };
}

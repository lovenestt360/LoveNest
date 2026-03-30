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

const FALLBACK_MISSIONS = [
  { title: "Mensagem Carinhosa", description: "Envia uma mensagem de voz ou texto a dizer o que mais gostas no teu par hoje.", emoji: "💌", points_reward: 15 },
  { title: "Foto Especial", description: "Partilha uma foto que represente um momento feliz que viveram juntos.", emoji: "📸", points_reward: 20 },
  { title: "Elogio do Dia", description: "Escolhe um traço de personalidade do teu amor e faz um elogio sincero.", emoji: "✨", points_reward: 10 },
  { title: "Plano para o Futuro", description: "Sugerir um encontro novo para o próximo fim de semana no chat.", emoji: "🗺️", points_reward: 10 },
  { title: "Abraço Virtual", description: "Envia um GIF ou sticker que represente o abraço que gostarias de dar agora.", emoji: "🫂", points_reward: 10 },
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
    const { data: streak } = await (supabase
      .from("love_streak" as any)
      .select("*")
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
        last_streak_date: s.last_active_date, // Map field name
        loveshield_count: (items as any)?.loveshield_count || 0,
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

    const validInteractionTypes = ['message_sent', 'task_completed', 'mood_logged', 'plan_completed'];
    const meActive = (interactionRecords as any[])?.some(a => a.user_id === user.id && validInteractionTypes.includes(a.type)) || false;
    const partnerActive = (interactionRecords as any[])?.some(a => a.user_id !== user.id && validInteractionTypes.includes(a.type)) || false;

    // 4. Load all missions to pick one for the day
    const { data: allMissions } = await (supabase
      .from("love_missions" as any)
      .select("*") as any);

    let mission = null;
    if (allMissions && (allMissions as any[]).length > 0) {
      const dayOfMonth = new Date().getDate();
      mission = (allMissions as any[])[dayOfMonth % (allMissions as any[]).length];
    } else {
      // Fallback if DB is empty
      const dayOfMonth = new Date().getDate();
      mission = FALLBACK_MISSIONS[dayOfMonth % FALLBACK_MISSIONS.length];
    }

    // 5. Check if mission completed today
    const { data: completion } = await (supabase
      .from("mission_completions" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("date" as any, todayStr) // Assuming date field names might vary slightly, but following SQL plan
      .maybeSingle() as any);

    setDailyStatus({
      me_active: meActive,
      partner_active: partnerActive,
      mission_completed: !!completion,
      mission_title: mission?.title || null,
      mission_description: mission?.description || null,
      mission_emoji: (mission as any)?.emoji || "✨",
      mission_points: (mission as any)?.points_reward || null,
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  const confirmAction = useCallback(async () => {
    if (!spaceId) return false;
    
    // Legacy manual action no longer bumps streak directly.
    // It now only records a 'manual_checkin' interaction.
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
    
    console.log(`Recording interaction: ${actionType}`);
    
    try {
      const { error } = await (supabase
        .from("interactions" as any)
        .insert({
          user_id: user.id,
          couple_id: spaceId,
          type: actionType
        }) as any);
      
      if (error) throw error;
      
      // We no longer need manually trigger checkStreak from here 
      // as the DB Trigger tr_interactions_streak_trigger handles it automatically!
      return true;
    } catch (err: any) {
      console.error("Error recording interaction:", err);
      return false;
    }
  }, [spaceId, user, confirmAction]);

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

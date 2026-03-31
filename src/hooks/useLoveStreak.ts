import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format, isSameDay, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";

export interface LoveStreakData {
  current_streak: number;
  best_streak: number;
  last_streak_date: string | null;
  loveshield_count: number;
  total_points: number;
  level_title?: string;
  last_shield_used_at?: string | null;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  type: "daily" | "weekly" | "special";
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
  
  const shieldToastShown = useRef(false);
  const alertToastShown = useRef(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!spaceId || !user) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. Determinar se o utilizador é o parceiro 1 ou 2 (Baseado nos membros)
      const { data: members } = await supabase
        .from("members")
        .select("user_id")
        .eq("couple_space_id", spaceId)
        .order("joined_at", { ascending: true });
      
      let isP1 = true;
      if (members && members.length > 0) {
        isP1 = members[0].user_id === user.id;
        setIsPartner1(isP1);
      }

      // 2. Carregar dados do streak (Tabela Plural: love_streaks)
      const { data: streak } = await (supabase
        .from("love_streaks" as any)
        .select("*")
        .eq("couple_space_id", spaceId)
        .maybeSingle() as any);

      // 2b. Carregar pontos individuais (Tabela Singular: love_points)
      const { data: points } = await (supabase
        .from("love_points" as any)
        .select("points")
        .eq("user_id", user.id)
        .eq("couple_space_id", spaceId)
        .maybeSingle() as any);

      // 2c. Carregar Escudos (Tabela: love_shields)
      const { data: shieldData } = await (supabase
        .from("love_shields" as any)
        .select("shields, last_shield_used_at")
        .eq("couple_space_id", spaceId)
        .maybeSingle() as any);

      if (streak) {
        const streakData = {
          current_streak: streak.current_streak,
          best_streak: streak.current_streak, 
          last_streak_date: streak.last_active_date,
          loveshield_count: (shieldData as any)?.shields || 0,
          total_points: (points as any)?.points || 0,
          level_title: getStreakLevel(streak.current_streak).title,
          last_shield_used_at: (shieldData as any)?.last_shield_used_at
        };
        setData(streakData as any);

        // Feedback Emocional: Escudo usado hoje
        if (streakData.last_shield_used_at && 
            isSameDay(parseISO(streakData.last_shield_used_at), new Date()) && 
            !shieldToastShown.current) {
          toast({
            title: "Proteção Ativa 🛡️",
            description: "Um escudo protegeu o vosso streak hoje 💛",
          });
          shieldToastShown.current = true;
        }
      } else {
        // Se não existir registro (casal novo ou migração de hoje), mostramos 0
        setData({
          current_streak: 0,
          best_streak: 0,
          last_streak_date: null,
          loveshield_count: (shieldData as any)?.shields || 1, // Casal novo começa com 1 escudo
          total_points: (points as any)?.points || 0,
          level_title: getStreakLevel(0).title,
        });
      }

      const startOfLocalDay = new Date();
      startOfLocalDay.setHours(0, 0, 0, 0);
      const endOfLocalDay = new Date();
      endOfLocalDay.setHours(23, 59, 59, 999);

      // 3. Carregar interações diárias (Tabela Singular: interactions)
      const { data: interactionRecords } = await (supabase
        .from("interactions" as any)
        .select("user_id, type")
        .eq("couple_space_id", spaceId)
        .gte("created_at", startOfLocalDay.toISOString())
        .lte("created_at", endOfLocalDay.toISOString()) as any);

      const meActive = (interactionRecords as any[])?.some(a => a.user_id === user.id) || false;
      const partnerActive = (interactionRecords as any[])?.some(a => a.user_id !== user.id) || false;

      // 4. Carregar missões diárias (Tabela: couple_daily_missions)
      const { data: dailyMissions } = await (supabase
        .from("couple_daily_missions" as any)
        .select("*, love_missions(*)")
        .eq("couple_space_id", spaceId)
        .order("created_at", { ascending: false })
        .limit(3) as any);

      let fetchedMissions = dailyMissions;

      // Eager Loading: Se não existirem missões, força a geração instantânea no backend
      if (!fetchedMissions || fetchedMissions.length === 0) {
        await supabase.from("interactions" as any).insert({
          user_id: user.id,
          couple_space_id: spaceId,
          type: 'app_opened' 
        });

        const { data: retryMissions } = await (supabase
          .from("couple_daily_missions" as any)
          .select("*, love_missions(*)")
          .eq("couple_space_id", spaceId)
          .order("created_at", { ascending: false })
          .limit(3) as any);
        
        fetchedMissions = retryMissions;
      }

      const missions: DailyMission[] = [];
      if (fetchedMissions && (fetchedMissions as any[]).length > 0) {
        for (const dm of (fetchedMissions as any[])) {
          const m = dm.love_missions;
          if (!m) continue;

          // Verificar completação individual (Tabela: mission_completions)
          const { data: isCompleted } = await (supabase
            .from("mission_completions" as any)
            .select("*")
            .eq("user_id", user.id)
            .eq("mission_id", m.id)
            .eq("completed_at", dm.assignment_date)
            .maybeSingle() as any);
          
          missions.push({
            id: m.id,
            title: m.title,
            description: m.description,
            emoji: m.emoji || "✨",
            type: m.mission_type || "daily",
            target: m.target_count || 1,
            current: isCompleted 
                ? (m.target_count || 1) 
                : ((interactionRecords as any[]) || []).filter(r => r.user_id === user.id && r.type === m.mission_type).length,
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

      console.log("LoveStreak: Sync complete for", todayStr);

    } catch (err) {
      console.error("Erro no useLoveStreak.load:", err);
      // Fallback em caso de erro (tabelas não criadas ou erro de rede)
      setData({
        current_streak: 0,
        best_streak: 0,
        last_streak_date: null,
        loveshield_count: 0,
        total_points: 0,
        level_title: getStreakLevel(0).title,
      });
    } finally {
      setLoading(false);
    }
  }, [spaceId, user, todayStr]);

  useEffect(() => {
    load();
  }, [load]);

  // Alerta de Prevenção removido a pedido do utilizador (atrapalhava a visão)

  // Realtime updates
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("love-streak-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "love_streaks" as any,
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
        table: "interactions" as any,
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "love_shields" as any,
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "couple_daily_missions" as any,
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  const confirmAction = useCallback(async () => {
    if (!spaceId || !user) return false;
    
    const { error } = await (supabase
      .from("interactions" as any)
      .insert({
        user_id: user.id,
        couple_space_id: spaceId,
        type: 'manual_checkin'
      }) as any);
      
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [spaceId, user, load]);

  const useShield = useCallback(async () => {
    const { error } = await (supabase.rpc('fn_use_loveshield_v4' as any) as any);
    if (!error) {
      load();
      return true;
    }
    return false;
  }, [load]);

  const buyShield = useCallback(async (cost: number = 200) => {
    const { error } = await (supabase.rpc('fn_purchase_loveshield_v4' as any, { p_cost: cost }) as any);
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
          couple_space_id: spaceId,
          type: actionType
        }) as any);
      
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Erro ao registrar interação:", err);
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

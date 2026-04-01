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

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!spaceId || !user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Carregar Dados do Streak (Nova Tabela: streaks)
      const { data: streak } = await (supabase
        .from("streaks" as any)
        .select("*")
        .eq("couple_id", spaceId)
        .maybeSingle() as any);

      // 2. Carregar Escudos (Nova Tabela: shields)
      const { data: shieldData } = await (supabase
        .from("shields" as any)
        .select("quantity")
        .eq("couple_id", spaceId)
        .maybeSingle() as any);

      // 2b. Carregar Pontos Reais (Nova Tabela: love_points)
      const { data: pointsData } = await (supabase
        .from("love_points" as any)
        .select("points")
        .eq("couple_space_id", spaceId)
        .eq("user_id", user.id)
        .maybeSingle() as any);

      // 3. Carregar Missões do Dia (Novo Motor V5)
      const { data: missionsRaw } = await supabase.rpc('fn_get_or_create_daily_missions_v5', {
        p_couple_id: spaceId
      });

      // Carregar os detalhes das missões
      const missionIds = (missionsRaw as any[])?.filter(m => m.mission_id || m.id).map(m => m.mission_id || m.id) || [];
      const { data: missionDetails } = await supabase
          .from('love_missions')
          .select('*')
          .in('id', missionIds);

      const missions: DailyMission[] = (missionsRaw as any[])?.map(m => {
          const mId = m.mission_id || m.id;
          const detail = missionDetails?.find(d => d.id === mId);
          return {
              id: m.id || m.mission_id, 
              title: detail?.title || "Missão",
              description: detail?.description || "",
              emoji: detail?.emoji || "✨",
              type: detail?.mission_type || "daily",
              target: detail?.target_count || 1,
              current: m.progress || 0,
              completed: m.completed || false,
              reward: (detail as any)?.points_reward || (detail as any)?.reward_points || 20
          };
      }) || [];

      // 4. Carregar Status Diário (Timezone Aware)
      const { data: dailyStatusRaw } = await supabase.rpc('get_couple_daily_status', {
        p_couple_id: spaceId
      });
      const status = (dailyStatusRaw as any)?.[0];

      if (streak) {
        setData({
          current_streak: streak.current_streak,
          best_streak: streak.current_streak,
          last_streak_date: streak.last_valid_day,
          loveshield_count: (shieldData as any)?.quantity || 0,
          total_points: (pointsData as any)?.points || 0,
          level_title: getStreakLevel(streak.current_streak).title
        });
      } else {
        setData({
          current_streak: 0,
          best_streak: 0,
          last_streak_date: null,
          loveshield_count: (shieldData as any)?.quantity || 1,
          total_points: (pointsData as any)?.points || 0
        });
      }

      setDailyStatus({
        me_active: status?.me_active || false,
        partner_active: status?.partner_active || false,
        missions: missions,
        day_complete: (status?.me_active && status?.partner_active) || false
      });

    } catch (err) {
      console.error("Erro no useLoveStreak.load:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime updates
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("love-streak-v5")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "streaks" as any,
        filter: `couple_id=eq.${spaceId}`,
      }, (payload) => {
        const newData = payload.new as any;
        setData((prev) => {
          if (prev && newData.current_streak > prev.current_streak) {
            setStreakIncreased(true);
            setTimeout(() => setStreakIncreased(false), 3000);
          }
          return {
            ...prev,
            current_streak: newData.current_streak,
            last_streak_date: newData.last_valid_day
          } as any;
        });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "daily_activity" as any,
        filter: `couple_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "couple_missions" as any,
        filter: `couple_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "love_points" as any,
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  const recordInteraction = useCallback(async (actionType: string = 'general') => {
    if (!spaceId || !user) return false;

    try {
      const { error } = await (supabase
        .from("daily_activity" as any)
        .insert({
          user_id: user.id,
          couple_id: spaceId,
          type: actionType
        }) as any);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error("Erro ao registrar atividade:", err);
      return false;
    }
  }, [spaceId, user]);

  const buyShield = useCallback(async () => {
    if (!spaceId || !user) return { success: false, message: "Não autenticado." };
    
    try {
      const { data: res, error } = await supabase.rpc('fn_purchase_loveshield_v5', {
        p_user_id: user.id,
        p_couple_id: spaceId
      });

      if (error) throw error;
      
      const response = res as any;
      if (response.success) {
        toast({ title: "Sucesso!", description: response.message });
        load();
      } else {
        toast({ title: "Ops!", description: response.message, variant: "destructive" });
      }
      return response;
    } catch (err: any) {
      console.error("Erro ao comprar escudo:", err);
      toast({ title: "Erro", description: "Falha na comunicação com o servidor.", variant: "destructive" });
      return { success: false, message: err.message };
    }
  }, [spaceId, user, load]);

  return {
    data,
    dailyStatus,
    loading,
    streakIncreased,
    recordInteraction,
    buyShield,
    reload: load,
  };
}

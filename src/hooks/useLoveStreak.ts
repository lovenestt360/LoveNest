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

      // 3. Carregar Atividade Diária (Fonte Única: daily_activity)
      const startOfLocalDay = new Date();
      startOfLocalDay.setHours(0, 0, 0, 0);
      const endOfLocalDay = new Date();
      endOfLocalDay.setHours(23, 59, 59, 999);

      const { data: activities } = await (supabase
        .from("daily_activity" as any)
        .select("user_id")
        .eq("couple_id", spaceId)
        .gte("created_at", startOfLocalDay.toISOString())
        .lte("created_at", endOfLocalDay.toISOString()) as any);

      const meActive = (activities as any[])?.some(a => a.user_id === user.id) || false;
      const partnerActive = (activities as any[])?.some(a => a.user_id !== user.id) || false;

      if (streak) {
        setData({
          current_streak: streak.current_streak,
          best_streak: streak.current_streak, // For now keeping same
          last_streak_date: streak.last_valid_day,
          loveshield_count: (shieldData as any)?.quantity || 0,
          total_points: 0, // Simplified out for now
          level_title: getStreakLevel(streak.current_streak).title
        });
      } else {
        setData({
          current_streak: 0,
          best_streak: 0,
          last_streak_date: null,
          loveshield_count: (shieldData as any)?.quantity || 1,
          total_points: 0
        });
      }

      setDailyStatus({
        me_active: meActive,
        partner_active: partnerActive,
        missions: [], // Missões removidas a pedido por simplicidade
        day_complete: meActive && partnerActive
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

  return {
    data,
    dailyStatus,
    loading,
    streakIncreased,
    recordInteraction,
    reload: load,
  };
}

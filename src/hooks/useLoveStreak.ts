import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export interface LoveStreakData {
  current_streak: number;
  best_streak: number;
  last_streak_date: string | null;
  loveshield_count: number;
  total_points: number;
  level_title?: string;
}

export interface DailyMission {
  id: string;          // couple_daily_missions.id
  mission_id: string;  // love_missions.id
  title: string;
  description: string;
  emoji: string;
  mission_type: string; // 'message_sent' | 'mood_logged' | 'plan_completed' | 'task_completed' | ...
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

  // Guardar missões anteriores para detetar conclusão e notificar
  const prevMissionsRef = useRef<DailyMission[]>([]);

  const load = useCallback(async () => {
    if (!spaceId || !user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Streak
      const { data: streak, error: streakErr } = await (supabase
        .from("streaks" as any)
        .select("*")
        .eq("couple_space_id", spaceId)
        .single() as any);
        
      if (streakErr) console.error("Erro Streak:", streakErr);

      // 2. Escudos
      const { data: shieldData } = await (supabase
        .from("shields" as any)
        .select("quantity")
        .eq("couple_space_id", spaceId)
        .maybeSingle() as any);

      // 3. Pontos (Individuais do Utilizador)
      const { data: pointsData, error: pointsError } = await (supabase
        .from("love_points" as any)
        .select("points")
        .eq("couple_space_id", spaceId)
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (pointsError) console.error("Erro ao carregar pontos:", pointsError);
      console.log("LOVE POINTS DATA:", pointsData);

      // 4. Missões do Dia — RPC retorna TUDO (title, description, emoji, type, target, progress, completed)
      const { data: missionsRaw, error: missionsError } = await supabase.rpc(
        'fn_get_or_create_daily_missions_v5' as any,
        { p_couple_space_id: spaceId }
      );

      console.log("MISSIONS RAW:", missionsRaw);

      if (missionsError) {
        console.error("Erro ao carregar missões:", missionsError);
      }

      const missions: DailyMission[] = (Array.isArray(missionsRaw) ? missionsRaw : []).map((m) => ({
        id: m.cdm_id || m.id,
        mission_id: m.mission_id,
        title: m.title || "Missão",
        description: m.description || "",
        emoji: m.emoji || "✨",
        mission_type: m.mission_type || "general",
        target: m.target_count || 1,
        current: Number(m.progress) || 0,
        completed: Boolean(m.completed),
        reward: m.reward_points || 20,
      }));

      // 5. Detetar missões recém concluídas e notificar
      const prev = prevMissionsRef.current;
      if (prev.length > 0) {
        missions.forEach((m) => {
          const wasPending = prev.find((p) => p.id === m.id && !p.completed);
          if (wasPending && m.completed) {
            toast({
              title: `🎉 Missão Concluída!`,
              description: `"${m.title}" — +${m.reward} LovePoints ganhos! 💛`,
            });
          }
        });
      }
      prevMissionsRef.current = missions;

      // 6. Status diário
      const { data: dailyStatusRaw } = await supabase.rpc('get_couple_daily_status' as any, {
        p_couple_space_id: spaceId,
      });
      const status = (dailyStatusRaw as any)?.[0];

      setData({
        current_streak: streak?.current_streak || 0,
        best_streak: streak?.current_streak || 0,
        last_streak_date: streak?.last_valid_day || null,
        loveshield_count: (shieldData as any)?.quantity || 0,
        total_points: (pointsData as any)?.points || 0,
        level_title: getStreakLevel(streak?.current_streak || 0).title,
      });

      setDailyStatus({
        me_active: status?.me_active || false,
        partner_active: status?.partner_active || false,
        missions,
        day_complete: (status?.me_active && status?.partner_active) || false,
      });

    } catch (err) {
      console.error("Erro no useLoveStreak.load:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => {
    load();
    const handleRefetch = () => {
      console.log("Forcing streak refetch via custom event...");
      load();
    };
    window.addEventListener("refetch-streak", handleRefetch);
    return () => window.removeEventListener("refetch-streak", handleRefetch);
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("love-streak-v7")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "streaks" as any,
        filter: `couple_space_id=eq.${spaceId}`,
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
            last_streak_date: newData.last_valid_day,
          } as any;
        });
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "daily_activity" as any,
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mission_completions" as any,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "love_points" as any,
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [spaceId, load]);

  // Registar uma interação na daily_activity
  const recordInteraction = useCallback(async (actionType: string = 'general') => {
    if (!spaceId || !user) return false;
    try {
      const { error } = await (supabase
        .from("daily_activity" as any)
        .insert({
          user_id: user.id,
          couple_space_id: spaceId,
          type: actionType,
        }) as any);
      if (error) throw error;
      
      // Pequeno delay para garantir que o Trigger do Postgres terminou o processamento v10
      setTimeout(() => {
        load();
      }, 300);
      
      return true;
    } catch (err: any) {
      console.error("Erro ao registrar atividade:", err);
      toast({ title: "Erro nas missões", description: "Falha ao registar atividade. Tente novamente.", variant: "destructive" });
      return false;
    }
  }, [spaceId, user, load]);

  // Comprar escudo
  const buyShield = useCallback(async () => {
    if (!spaceId || !user) return { success: false, message: "Não autenticado." };
    try {
      const { data: res, error } = await supabase.rpc('fn_purchase_loveshield_v5' as any, {
        p_user_id: user.id,
        p_couple_space_id: spaceId,
      });
      if (error) throw error;
      const response = res as any;
      if (response.success) {
        toast({ title: "Escudo comprado! 🛡️", description: response.message });
        load();
      } else {
        toast({ title: "Ops!", description: response.message, variant: "destructive" });
      }
      return response;
    } catch (err: any) {
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

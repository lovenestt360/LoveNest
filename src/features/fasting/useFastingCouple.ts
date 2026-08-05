import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { todayLocal } from "@/lib/timezone";
import type { FastingProfile, DayLog, CreatePlanInput } from "./types";

export interface FastingMessage {
  id: string;
  couple_space_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface PartnerInfo {
  userId: string;
  displayName: string | null;
  profile: FastingProfile | null;
  todayLog: DayLog | null;
  streak: number;
  completionRate: number;
  loggedDays: number;
}

export interface UseFastingCoupleReturn {
  loading: boolean;
  partner: PartnerInfo | null;
  myUserId: string | null;
  messages: FastingMessage[];
  sendMessage: (text: string) => Promise<void>;
  joinPartnerPlan: (createPlan: (input: CreatePlanInput) => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFastingCouple(): UseFastingCoupleReturn {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [messages, setMessages] = useState<FastingMessage[]>([]);

  const todayKey = todayLocal();

  const refresh = useCallback(async () => {
    if (!user || !spaceId) { setLoading(false); return; }
    setLoading(true);

    try {
      // Encontrar o userId do par
      const { data: memberRows } = await supabase
        .from("members" as any)
        .select("user_id")
        .eq("couple_space_id", spaceId)
        .neq("user_id", user.id)
        .limit(1);

      const partnerUserId: string | null = (memberRows as any)?.[0]?.user_id ?? null;

      if (!partnerUserId) {
        setPartner(null);
        setLoading(false);
        return;
      }

      // Carregar em paralelo: nome do par, plano de jejum do par, mensagens
      const [profileRes, fastingRes, messagesRes] = await Promise.all([
        supabase
          .from("profiles" as any)
          .select("display_name")
          .eq("user_id", partnerUserId)
          .maybeSingle(),
        supabase
          .from("fasting_profiles" as any)
          .select("*")
          .eq("couple_space_id", spaceId)
          .eq("is_active", true)
          .eq("user_id", partnerUserId)
          .limit(1),
        supabase
          .from("fasting_couple_messages" as any)
          .select("*")
          .eq("couple_space_id", spaceId)
          .order("created_at", { ascending: true })
          .limit(50),
      ]);

      const partnerFastingProfile = ((fastingRes.data as any)?.[0] as FastingProfile) ?? null;
      setMessages((messagesRes.data as unknown as FastingMessage[]) ?? []);

      if (!partnerFastingProfile) {
        setPartner({
          userId: partnerUserId,
          displayName: (profileRes.data as any)?.display_name ?? null,
          profile: null,
          todayLog: null,
          streak: 0,
          completionRate: 0,
          loggedDays: 0,
        });
        setLoading(false);
        return;
      }

      // Carregar day logs do par para calcular stats
      const { data: logsData } = await supabase
        .from("fasting_day_logs" as any)
        .select("*")
        .eq("profile_id", partnerFastingProfile.id);

      const logs = (logsData ?? []) as unknown as DayLog[];
      const logsMap: Record<string, DayLog> = {};
      for (const l of logs) logsMap[l.day_key] = l;

      const finalized = logs.filter(l => l.finalized);
      const done = finalized.filter(l => l.result === "cumprido").length;
      const completionRate = finalized.length > 0 ? Math.round((done / finalized.length) * 100) : 0;

      let streak = 0;
      for (let i = 0; i < 100; i++) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toLocaleDateString("sv-SE");
        if (logsMap[key]?.finalized && logsMap[key]?.result === "cumprido") streak++;
        else break;
      }

      setPartner({
        userId: partnerUserId,
        displayName: (profileRes.data as any)?.display_name ?? null,
        profile: partnerFastingProfile,
        todayLog: logsMap[todayKey] ?? null,
        streak,
        completionRate,
        loggedDays: finalized.length,
      });
    } catch (err) {
      console.error("useFastingCouple error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, spaceId, todayKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !spaceId || !text.trim()) return;
    const { data, error } = await supabase
      .from("fasting_couple_messages" as any)
      .insert({ couple_space_id: spaceId, sender_id: user.id, message: text.trim() })
      .select()
      .single();
    if (!error && data) {
      setMessages(prev => [...prev, data as unknown as FastingMessage]);
    }
  }, [user, spaceId]);

  const joinPartnerPlan = useCallback(async (
    createPlan: (input: CreatePlanInput) => Promise<void>
  ) => {
    if (!partner?.profile) return;
    const p = partner.profile;
    await createPlan({
      plan_name: p.plan_name,
      plan_type: p.plan_type,
      until_hour: p.until_hour ?? undefined,
      start_date: p.start_date,
      end_date: p.end_date,
      total_days: p.total_days,
      rules_allowed: p.rules_allowed ?? undefined,
      rules_forbidden: p.rules_forbidden ?? undefined,
      rules_exceptions: p.rules_exceptions ?? undefined,
      doItems: [],
      avoidItems: [],
    });
  }, [partner]);

  return { loading, partner, myUserId: user?.id ?? null, messages, sendMessage, joinPartnerPlan, refresh };
}

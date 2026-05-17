import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNowStrict, isToday, isYesterday, format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";

const MOOD_LABELS: Record<string, string> = {
  feliz:      "Feliz",
  tranquilo:  "Tranquilo",
  apaixonado: "Apaixonado",
  ansioso:    "Ansioso",
  triste:     "Triste",
  cansado:    "Cansado",
  irritado:   "Irritado",
  grato:      "Grato",
};

export interface FeedItem {
  id: string;
  type: string;
  iconType: string;  // key into ICON_MAP in feed components
  iconColor: string; // tailwind text color class
  message: string;
  detail?: string;
  timestamp: Date;
  dayLabel: string;  // "Hoje" | "Ontem" | weekday — used by Momentos page grouping
  timeAgo: string;
}

function getDayLabel(d: Date): string {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE", { locale: pt });
}

function getTimeAgo(d: Date): string {
  if (isToday(d)) {
    const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000);
    const diffM = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffM < 5)  return "agora";
    if (diffH < 1)  return `há ${diffM}m`;
    return `há ${diffH}h`;
  }
  if (isYesterday(d)) return "ontem";
  return format(d, "d MMM", { locale: pt });
}

export function useEmotionalFeed() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);

    try {
      const now       = new Date();
      const since7d   = new Date(now); since7d.setDate(since7d.getDate() - 7);
      const sinceStr  = since7d.toISOString();
      const sinceDate = since7d.toISOString().slice(0, 10);

      // Partner info + streak
      const { data: spaceData } = await supabase
        .from("couple_spaces")
        .select("streak_count, last_streak_date, members(user_id, profiles(display_name))")
        .eq("id", spaceId)
        .single();

      const memberList  = (spaceData as any)?.members || [];
      const partner     = memberList.find((m: any) => m.user_id !== user.id);
      const partnerId   = partner?.user_id as string | undefined;
      const firstName   = ((partner?.profiles as any)?.display_name || "O teu par").split(" ")[0];
      const streakCount = (spaceData as any)?.streak_count ?? 0;
      const lastStreakDate = (spaceData as any)?.last_streak_date as string | null;

      // Parallel fetches
      const [actRes, moodRes, spiritualRes, photosRes, capsulesRes, milestonesRes] = await Promise.all([
        supabase.from("daily_activity" as any)
          .select("user_id, activity_date, type, created_at")
          .eq("couple_space_id", spaceId)
          .gte("activity_date", sinceDate)
          .order("created_at", { ascending: false }),

        supabase.from("mood_checkins" as any)
          .select("user_id, day_key, mood_key, created_at")
          .eq("couple_space_id", spaceId)
          .gte("day_key", sinceDate)
          .order("created_at", { ascending: false }),

        supabase.from("daily_spiritual_logs" as any)
          .select("user_id, day_key, prayed_today, updated_at")
          .eq("couple_space_id", spaceId)
          .gte("day_key", sinceDate)
          .eq("prayed_today", true),

        supabase.from("photos" as any)
          .select("id, uploaded_by, caption, created_at")
          .eq("couple_space_id", spaceId)
          .gte("created_at", sinceStr)
          .order("created_at", { ascending: false })
          .limit(8),

        supabase.from("time_capsule_messages" as any)
          .select("id, creator_id, message, created_at")
          .eq("couple_space_id", spaceId)
          .gte("created_at", sinceStr)
          .order("created_at", { ascending: false })
          .limit(5),

        (supabase.from("relationship_milestones" as any)
          .select("milestone_value, created_at")
          .eq("couple_space_id", spaceId)
          .eq("milestone_type", "streak")
          .gte("created_at", sinceStr)
          .order("created_at", { ascending: false })
          .limit(3) as any),
      ]);

      const activities  = (actRes.data as any[])         || [];
      const moods       = (moodRes.data as any[])        || [];
      const spiritual   = (spiritualRes.data as any[])   || [];
      const photos      = (photosRes.data as any[])      || [];
      const capsules    = (capsulesRes.data as any[])    || [];
      const milestones  = (milestonesRes.data as any[])  || [];

      const feedItems: FeedItem[] = [];
      const seen = new Set<string>();

      const push = (item: FeedItem) => {
        if (!seen.has(item.id)) { seen.add(item.id); feedItems.push(item); }
      };

      // ── Activities grouped by day ─────────────────────────────────────────
      const byDay: Record<string, { myTypes: Set<string>; partnerTypes: Set<string> }> = {};
      for (const a of activities) {
        const d = a.activity_date as string;
        if (!byDay[d]) byDay[d] = { myTypes: new Set(), partnerTypes: new Set() };
        if (a.user_id === user.id)   byDay[d].myTypes.add(a.type);
        if (a.user_id === partnerId) byDay[d].partnerTypes.add(a.type);
      }

      const ALL_TYPES = ["message", "checkin", "mood", "prayer"];

      for (const [day, { myTypes, partnerTypes }] of Object.entries(byDay)) {
        const ts     = new Date(`${day}T12:00:00`);
        const dLabel = getDayLabel(ts);
        const tAgo   = getTimeAgo(ts);

        // Perfect day — all 4 missions complete by both
        if (ALL_TYPES.every(t => myTypes.has(t) && partnerTypes.has(t))) {
          push({
            id: `perfect_${day}`, type: "perfect_day",
            iconType: "sparkles", iconColor: "text-amber-400",
            message: "O vosso espaço esteve completo hoje",
            detail: "Todas as missões concluídas",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }

        // Presence — both checked in
        if (myTypes.has("checkin") && partnerTypes.has("checkin")) {
          push({
            id: `presence_${day}`, type: "presence",
            iconType: "heart_handshake", iconColor: "text-rose-400",
            message: "Hoje estiveram presentes",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        } else if (partnerTypes.has("checkin")) {
          push({
            id: `partner_checkin_${day}`, type: "partner_checkin",
            iconType: "flame", iconColor: "text-rose-400",
            message: `${firstName} esteve presente hoje`,
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }

        // Partner sent a message
        if (partnerTypes.has("message")) {
          push({
            id: `msg_${day}`, type: "message",
            iconType: "message_circle", iconColor: "text-zinc-400",
            message: `${firstName} partilhou um momento`,
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }
      }

      // ── Mood events ───────────────────────────────────────────────────────
      for (const m of moods.filter(x => x.user_id === partnerId)) {
        const mLabel = MOOD_LABELS[m.mood_key as string] ?? m.mood_key;
        const ts = new Date(m.created_at);
        push({
          id: `mood_${m.day_key}`, type: "mood",
          iconType: "smile_plus", iconColor: "text-zinc-400",
          message: `${firstName} partilhou como se sentia`,
          detail: mLabel,
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      // ── Prayer — both prayed ──────────────────────────────────────────────
      const spiritualByDay: Record<string, { me: boolean; partner: boolean }> = {};
      for (const s of spiritual) {
        const d = s.day_key as string;
        if (!spiritualByDay[d]) spiritualByDay[d] = { me: false, partner: false };
        if (s.user_id === user.id)   spiritualByDay[d].me = true;
        if (s.user_id === partnerId) spiritualByDay[d].partner = true;
      }
      for (const [day, { me, partner: partnerPrayed }] of Object.entries(spiritualByDay)) {
        const ts     = new Date(`${day}T10:00:00`);
        const dLabel = getDayLabel(ts);
        const tAgo   = getTimeAgo(ts);
        if (me && partnerPrayed) {
          push({
            id: `prayer_${day}`, type: "prayer",
            iconType: "moon_star", iconColor: "text-rose-400",
            message: "Criaram um momento de silêncio juntos",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        } else if (partnerPrayed) {
          push({
            id: `prayer_partner_${day}`, type: "prayer_partner",
            iconType: "moon_star", iconColor: "text-zinc-400",
            message: `${firstName} orou por vocês`,
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }
      }

      // ── Photo memories ────────────────────────────────────────────────────
      for (const photo of photos) {
        const ts = new Date(photo.created_at);
        push({
          id: `photo_${photo.id}`, type: "memory",
          iconType: "image", iconColor: "text-zinc-400",
          message: photo.uploaded_by === partnerId
            ? `${firstName} adicionou uma memória`
            : "Uma nova memória foi adicionada",
          detail: (photo.caption as string) || undefined,
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      // ── Time capsule ──────────────────────────────────────────────────────
      for (const cap of capsules) {
        const ts = new Date(cap.created_at);
        push({
          id: `capsule_${cap.id}`, type: "capsule",
          iconType: "clock", iconColor: "text-zinc-400",
          message: cap.creator_id === partnerId
            ? `${firstName} criou uma cápsula do tempo`
            : "Uma nova cápsula do tempo foi criada",
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      // ── Streak milestones ─────────────────────────────────────────────────
      for (const ms of milestones) {
        const ts = new Date(ms.created_at);
        push({
          id: `milestone_${ms.milestone_value}`, type: "milestone",
          iconType: "star", iconColor: "text-rose-400",
          message: "Chegaram a uma nova etapa juntos",
          detail: `${ms.milestone_value} dias`,
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setItems(feedItems);
    } catch (e) {
      console.error("[useEmotionalFeed]", e);
    } finally {
      setLoading(false);
    }
  }, [user, spaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("streak-updated", h);
    return () => window.removeEventListener("streak-updated", h);
  }, [refresh]);

  return { items, loading, refresh };
}

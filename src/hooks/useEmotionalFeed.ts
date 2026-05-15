import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNowStrict, isToday, isYesterday, format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";

const MOOD_LABELS: Record<string, [string, string]> = {
  feliz:      ["😊", "Feliz"],
  tranquilo:  ["😌", "Tranquilo"],
  apaixonado: ["🥰", "Apaixonado"],
  ansioso:    ["😰", "Ansioso"],
  triste:     ["😢", "Triste"],
  cansado:    ["😴", "Cansado"],
  irritado:   ["😤", "Irritado"],
  grato:      ["🙏", "Grato"],
};

export interface FeedItem {
  id: string;
  type: string;
  emoji: string;
  message: string;
  detail?: string;
  timestamp: Date;
  dayLabel: string;
  timeAgo: string;
}

function getDayLabel(d: Date): string {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE", { locale: pt });
}

function getTimeAgo(d: Date): string {
  if (isToday(d)) return formatDistanceToNowStrict(d, { locale: pt, addSuffix: true });
  if (isYesterday(d)) return "ontem";
  return format(d, "EEE", { locale: pt });
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
      const now = new Date();
      const since7d = new Date(now);
      since7d.setDate(since7d.getDate() - 7);
      const sinceStr  = since7d.toISOString();
      const sinceDate = since7d.toISOString().slice(0, 10);

      // Fetch partner info
      const { data: spaceData } = await supabase
        .from("couple_spaces")
        .select("streak_count, last_streak_date, members(user_id, profiles(display_name))")
        .eq("id", spaceId)
        .single();

      const memberList = (spaceData as any)?.members || [];
      const partner    = memberList.find((m: any) => m.user_id !== user.id);
      const partnerId  = partner?.user_id as string | undefined;
      const firstName  = ((partner?.profiles as any)?.display_name || "O teu par").split(" ")[0];
      const streakCount = (spaceData as any)?.streak_count ?? 0;
      const lastStreakDate = (spaceData as any)?.last_streak_date as string | null;

      // Parallel data fetches
      const [actRes, moodRes, spiritualRes, photosRes, capsulesRes] = await Promise.all([
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
      ]);

      const activities = (actRes.data as any[])      || [];
      const moods      = (moodRes.data as any[])     || [];
      const spiritual  = (spiritualRes.data as any[]) || [];
      const photos     = (photosRes.data as any[])   || [];
      const capsules   = (capsulesRes.data as any[]) || [];

      const feedItems: FeedItem[] = [];
      const seen = new Set<string>();

      const push = (item: FeedItem) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          feedItems.push(item);
        }
      };

      // ── Activities: group by day ───────────────────────────────────────
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

        // Perfect day — all missions by both
        if (ALL_TYPES.every(t => myTypes.has(t) && partnerTypes.has(t))) {
          push({
            id: `all_missions_${day}`, type: "all_missions", emoji: "✨",
            message: "Vocês completaram todas as missões de hoje",
            detail: "Um dia perfeito juntos",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }

        // Streak protected (both checked in)
        if (myTypes.has("checkin") && partnerTypes.has("checkin")) {
          push({
            id: `streak_${day}`, type: "streak", emoji: "🔥",
            message: "A chama foi protegida hoje",
            detail: "Ambos presentes",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        } else if (partnerTypes.has("checkin")) {
          push({
            id: `partner_checkin_${day}`, type: "partner_checkin", emoji: "❤️",
            message: `${firstName} protegeu a chama hoje`,
            detail: "A aguardar o teu gesto",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }

        // Partner sent a message
        if (partnerTypes.has("message")) {
          push({
            id: `partner_msg_${day}`, type: "message", emoji: "💌",
            message: `${firstName} enviou uma mensagem de amor`,
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }
      }

      // ── Mood events ────────────────────────────────────────────────────
      for (const m of moods.filter(x => x.user_id === partnerId)) {
        const [mEmoji, mLabel] = MOOD_LABELS[m.mood_key as string] || ["💛", m.mood_key];
        const ts = new Date(m.created_at);
        push({
          id: `mood_${m.day_key}`, type: "mood", emoji: mEmoji,
          message: `${firstName} está ${mLabel.toLowerCase()} hoje`,
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      // ── Prayer events ──────────────────────────────────────────────────
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
            id: `prayer_both_${day}`, type: "prayer", emoji: "🙏",
            message: "Uma oração de casal foi criada",
            detail: "Oraram juntos hoje",
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        } else if (partnerPrayed) {
          push({
            id: `prayer_partner_${day}`, type: "prayer", emoji: "🙏",
            message: `${firstName} orou por vocês`,
            timestamp: ts, dayLabel: dLabel, timeAgo: tAgo,
          });
        }
      }

      // ── Memory / photo events ──────────────────────────────────────────
      for (const photo of photos) {
        const ts = new Date(photo.created_at);
        push({
          id: `photo_${photo.id}`, type: "memory", emoji: "📸",
          message: photo.uploaded_by === partnerId
            ? `${firstName} adicionou uma nova memória`
            : "Uma nova memória foi adicionada",
          detail: (photo.caption as string) || undefined,
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      // ── Time capsule events ────────────────────────────────────────────
      for (const cap of capsules) {
        const ts = new Date(cap.created_at);
        push({
          id: `capsule_${cap.id}`, type: "capsule", emoji: "🕰️",
          message: cap.creator_id === partnerId
            ? `${firstName} criou uma cápsula do tempo`
            : "Uma nova cápsula do tempo foi criada",
          timestamp: ts, dayLabel: getDayLabel(ts), timeAgo: getTimeAgo(ts),
        });
      }

      // ── Streak milestone (today) ───────────────────────────────────────
      const MILESTONES = [7, 14, 30, 60, 90, 180, 365];
      const todayStr   = now.toISOString().slice(0, 10);
      if (lastStreakDate === todayStr && MILESTONES.includes(streakCount)) {
        const ts = new Date();
        push({
          id: `milestone_${streakCount}`, type: "milestone", emoji: "🏆",
          message: `${streakCount} dias de amor consecutivos!`,
          detail: "Um marco extraordinário",
          timestamp: ts, dayLabel: "Hoje", timeAgo: "agora",
        });
      }

      // Sort DESC
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

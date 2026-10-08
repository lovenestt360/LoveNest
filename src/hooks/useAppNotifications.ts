import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { toast } from "@/hooks/use-toast";
import { getFirebaseMessaging, getToken, onMessage } from "@/lib/firebase";
import {
  cacheNotificationPrefs,
  loadCachedNotificationPrefs,
  mergeServerNotificationPrefs,
} from "@/lib/notificationPreferences";

async function upsertFcmToken(fcmToken: string, userId: string, spaceId: string) {
  await supabase.from("push_subscriptions").upsert(
    {
      couple_space_id: spaceId,
      user_id: userId,
      fcm_token: fcmToken,
      user_agent: navigator.userAgent,
    },
    { onConflict: "fcm_token" },
  );
}

function isPreferenceEnabled(category: string) {
  return loadCachedNotificationPrefs()[category] !== false;
}

function preview(value: string, max = 60) {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

/**
 * Global notification coordinator.
 *
 * Realtime owns in-app feedback while LoveNest is open.
 * FCM owns background delivery and smart reminders. Immediate FCM messages
 * carry a type so foreground duplicates can be suppressed.
 */
export function useAppNotifications() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const location = useLocation();

  const [chatUnread, setChatUnread] = useState(0);
  const [moodUnread, setMoodUnread] = useState(0);
  const [tasksUnread, setTasksUnread] = useState(0);
  const [memoriesUnread, setMemoriesUnread] = useState(0);
  const [scheduleUnread, setScheduleUnread] = useState(0);
  const [prayerUnread, setPrayerUnread] = useState(0);
  const [complaintsUnread, setComplaintsUnread] = useState(0);
  const [capsuleUnread, setCapsuleUnread] = useState(0);

  const locationRef = useRef(location.pathname);
  const [channelKey, setChannelKey] = useState(0);

  useEffect(() => {
    locationRef.current = location.pathname;

    if (location.pathname === "/chat") setChatUnread(0);
    if (location.pathname === "/humor") setMoodUnread(0);

    if (
      location.pathname === "/plano" ||
      location.pathname.startsWith("/plano/") ||
      location.pathname.startsWith("/rotina")
    ) {
      setTasksUnread(0);
      setScheduleUnread(0);
    }

    if (location.pathname === "/memorias") setMemoriesUnread(0);
    if (location.pathname.startsWith("/jornada-espiritual")) setPrayerUnread(0);
    if (location.pathname === "/conflitos") setComplaintsUnread(0);
    if (location.pathname === "/capsula") setCapsuleUnread(0);
  }, [location.pathname]);

  const resetChatUnread = useCallback(() => setChatUnread(0), []);
  const resetMoodUnread = useCallback(() => setMoodUnread(0), []);
  const resetTasksUnread = useCallback(() => setTasksUnread(0), []);
  const resetMemoriesUnread = useCallback(() => setMemoriesUnread(0), []);
  const resetScheduleUnread = useCallback(() => setScheduleUnread(0), []);
  const resetPrayerUnread = useCallback(() => setPrayerUnread(0), []);
  const resetComplaintsUnread = useCallback(() => setComplaintsUnread(0), []);
  const resetCapsuleUnread = useCallback(() => setCapsuleUnread(0), []);

  // Keep the local cache aligned with account-level preferences so the same
  // choices apply across browsers and, later, native clients.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("notification_settings")
      .select("category, enabled")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const merged = mergeServerNotificationPrefs(
          loadCachedNotificationPrefs(),
          data as Array<{ category: string; enabled: boolean }> | null,
        );
        cacheNotificationPrefs(merged);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const MISSION_LABELS: Record<string, string> = {
      message: "Chat — Ambos enviaram mensagens hoje",
      checkin: "Check-in — Ambos fizeram check-in hoje",
      mood: "Humor — Ambos partilharam o humor hoje",
      prayer: "Oração — Ambos oraram hoje",
      leitura: "Leitura — Ambos leram um pouco hoje",
      general: "Missão completa — Os dois participaram hoje",
    };

    function onMissionComplete(event: Event) {
      if (sessionStorage.getItem("account_deleting")) return;
      const type = (event as CustomEvent<{ type: string }>).detail?.type ?? "general";
      toast({
        title: "Missão completa",
        description: MISSION_LABELS[type] ?? MISSION_LABELS.general,
      });
    }

    window.addEventListener("mission-complete", onMissionComplete);
    return () => window.removeEventListener("mission-complete", onMissionComplete);
  }, []);

  useEffect(() => {
    if (!spaceId || !user) return;

    const channelName = `app-notif-${spaceId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { sender_user_id: string; content: string };
          if (row.sender_user_id === user.id || locationRef.current === "/chat") return;

          setChatUnread((count) => count + 1);
          if (isPreferenceEnabled("chat")) {
            toast({ title: "Nova mensagem", description: preview(row.content) });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mood_checkins",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string } | undefined;
          if (!row || row.user_id === user.id || locationRef.current === "/humor") return;

          setMoodUnread((count) => count + 1);
          if (isPreferenceEnabled("humor")) {
            toast({ title: "O teu par partilhou como se sente" });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "plano_items",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; title: string };
          if (
            row.user_id === user.id ||
            locationRef.current === "/plano" ||
            locationRef.current.startsWith("/rotina")
          ) {
            return;
          }

          setTasksUnread((count) => count + 1);
          if (isPreferenceEnabled("plano")) {
            toast({ title: "Novo plano", description: preview(row.title) });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "routine_items",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; title: string };
          if (
            row.user_id === user.id ||
            locationRef.current === "/plano" ||
            locationRef.current.startsWith("/rotina")
          ) {
            return;
          }

          setScheduleUnread((count) => count + 1);
          if (isPreferenceEnabled("plano")) {
            toast({ title: "Rotina atualizada", description: preview(row.title) });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { uploaded_by: string; caption: string | null };
          if (row.uploaded_by === user.id || locationRef.current === "/memorias") return;

          setMemoriesUnread((count) => count + 1);
          if (isPreferenceEnabled("memorias")) {
            toast({
              title: "Nova memória",
              description: row.caption ? preview(row.caption) : "O teu par guardou uma nova foto.",
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "daily_prayers",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { created_by: string } | undefined;
          if (
            !row ||
            row.created_by === user.id ||
            locationRef.current.startsWith("/jornada-espiritual")
          ) {
            return;
          }

          setPrayerUnread((count) => count + 1);
          if (isPreferenceEnabled("oracao")) {
            toast({ title: "Oração do dia atualizada" });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "daily_spiritual_logs",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string } | undefined;
          if (
            !row ||
            row.user_id === user.id ||
            locationRef.current.startsWith("/jornada-espiritual")
          ) {
            return;
          }

          setPrayerUnread((count) => count + 1);
          if (isPreferenceEnabled("oracao")) {
            toast({ title: "O teu par atualizou a jornada espiritual" });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaints",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { created_by: string; title: string };
          if (row.created_by === user.id || locationRef.current === "/conflitos") return;

          setComplaintsUnread((count) => count + 1);
          if (isPreferenceEnabled("conflitos")) {
            toast({ title: "Algo ficou por conversar", description: preview(row.title) });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaint_messages",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; content: string };
          if (row.user_id === user.id || locationRef.current === "/conflitos") return;

          setComplaintsUnread((count) => count + 1);
          if (isPreferenceEnabled("conflitos")) {
            toast({ title: "Nova resposta", description: preview(row.content) });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "complaints",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { status: string; title: string };
          const old = payload.old as { status?: string };
          if (
            old.status === "resolved" ||
            row.status !== "resolved" ||
            locationRef.current === "/conflitos"
          ) {
            return;
          }

          setComplaintsUnread((count) => count + 1);
          if (isPreferenceEnabled("conflitos")) {
            toast({ title: "Conversa resolvida", description: preview(row.title) });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "time_capsule_messages",
          filter: `couple_space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new as { creator_id: string };
          if (row.creator_id === user.id || locationRef.current === "/capsula") return;
          setCapsuleUnread((count) => count + 1);
        },
      )
      .on("broadcast", { event: "prayer-invite" }, () => {
        if (!locationRef.current.startsWith("/jornada-espiritual")) {
          setPrayerUnread((count) => count + 1);
        }
        if (isPreferenceEnabled("oracao")) {
          toast({
            title: "Convite para um momento juntos",
            description: "O teu par quer rezar contigo agora.",
          });
        }
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[realtime] notification channel error", error);
          setTimeout(() => setChannelKey((key) => key + 1), 5_000);
        }

        if (status === "TIMED_OUT") {
          console.warn("[realtime] notification channel timed out");
          setTimeout(() => setChannelKey((key) => key + 1), 5_000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, user, channelKey]);

  useEffect(() => {
    const totalUnread =
      chatUnread +
      moodUnread +
      tasksUnread +
      memoriesUnread +
      scheduleUnread +
      prayerUnread +
      complaintsUnread +
      capsuleUnread;

    if (!("setAppBadge" in navigator)) return;

    if (totalUnread > 0) {
      (navigator as any).setAppBadge(totalUnread).catch(() => {});
    } else {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }, [
    chatUnread,
    moodUnread,
    tasksUnread,
    memoriesUnread,
    scheduleUnread,
    prayerUnread,
    complaintsUnread,
    capsuleUnread,
  ]);

  // In foreground, keep feedback inside the app. Immediate pushes are already
  // represented by Realtime above; smart/system messages still get a toast.
  useEffect(() => {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const realtimeHandledTypes = new Set([
      "chat",
      "humor",
      "tarefas",
      "agenda",
      "routine",
      "plano",
      "memorias",
      "oracao",
      "conflitos",
    ]);

    const unsubscribe = onMessage(messaging, (payload) => {
      const type = payload.data?.type as string | undefined;
      if (type && realtimeHandledTypes.has(type)) return;

      const title = payload.notification?.title || "LoveNest";
      const body = payload.notification?.body || "";

      toast({
        title,
        description: body || undefined,
      });
    });

    return () => unsubscribe();
  }, []);

  // When permission already exists, refresh the FCM token after critical app
  // startup work. This also recovers from browser token rotation.
  useEffect(() => {
    if (!user || !spaceId) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const refreshFcmToken = async () => {
      try {
        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const registration = await navigator.serviceWorker.ready;
        const vapidKey =
          (import.meta.env.VITE_FCM_VAPID_KEY as string | undefined)?.trim() || null;

        if (!vapidKey) return;

        const fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (fcmToken) {
          await upsertFcmToken(fcmToken, user.id, spaceId);
        }
      } catch (error) {
        console.warn("[fcm] token refresh failed", error);
      }
    };

    const startTimer = setTimeout(refreshFcmToken, 5_000);

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        refreshFcmToken();
      }
    };

    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);

    return () => {
      clearTimeout(startTimer);
      navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
    };
  }, [user, spaceId]);

  return {
    chatUnread,
    moodUnread,
    tasksUnread,
    memoriesUnread,
    scheduleUnread,
    prayerUnread,
    complaintsUnread,
    capsuleUnread,
    resetChatUnread,
    resetMoodUnread,
    resetTasksUnread,
    resetMemoriesUnread,
    resetScheduleUnread,
    resetPrayerUnread,
    resetComplaintsUnread,
    resetCapsuleUnread,
  };
}

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

function vapidKeyToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function upsertPushSubscription(
  sub: PushSubscription,
  userId: string,
  spaceId: string
) {
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return;
  await supabase.from("push_subscriptions").upsert(
    {
      couple_space_id: spaceId,
      user_id: userId,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "user_id,endpoint" }
  );
}

const NOTIF_KEY = "lovenest_notif_prefs";
const defaultPrefs = {
  chat: true,
  humor: true,
  tarefas: true,
  memorias: true,
  oracao: true,
  conflitos: true,
  ciclo_lembrete: false,
  ciclo_menstruacao: false,
  ciclo_fertil: false,
  ciclo_par: false,
};

function getNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch { }
  return { ...defaultPrefs };
}

/**
 * Global hook: listens for new messages + mood checkins via realtime.
 * Shows toasts and tracks unread counts per feature.
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
  const locationRef = useRef(location.pathname);
  // Incrementar força o useEffect do canal a recriar a subscrição Realtime
  const [channelKey, setChannelKey] = useState(0);

  useEffect(() => {
    locationRef.current = location.pathname;
    if (location.pathname === "/chat") setChatUnread(0);
    if (location.pathname === "/humor") setMoodUnread(0);
    if (location.pathname === "/tarefas") setTasksUnread(0);
    if (location.pathname === "/memorias") setMemoriesUnread(0);
    if (location.pathname === "/agenda") setScheduleUnread(0);
    if (location.pathname === "/oracao") setPrayerUnread(0);
    if (location.pathname === "/conflitos") setComplaintsUnread(0);
  }, [location.pathname]);

  const resetChatUnread = useCallback(() => setChatUnread(0), []);
  const resetMoodUnread = useCallback(() => setMoodUnread(0), []);
  const resetTasksUnread = useCallback(() => setTasksUnread(0), []);
  const resetMemoriesUnread = useCallback(() => setMemoriesUnread(0), []);
  const resetScheduleUnread = useCallback(() => setScheduleUnread(0), []);
  const resetPrayerUnread = useCallback(() => setPrayerUnread(0), []);
  const resetComplaintsUnread = useCallback(() => setComplaintsUnread(0), []);

  // Mission complete notifications
  useEffect(() => {
    const MISSION_LABELS: Record<string, string> = {
      message:  "Chat — Ambos enviaram mensagens hoje",
      checkin:  "Check-in — Ambos fizeram check-in hoje",
      mood:     "Humor — Ambos partilharam o humor hoje",
      prayer:   "Oração — Ambos oraram hoje",
      leitura:  "Leitura — Ambos leram um pouco hoje",
      general:  "Missão completa — Os dois participaram hoje",
    };

    function onMissionComplete(e: Event) {
      const type = (e as CustomEvent<{ type: string }>).detail?.type ?? "general";
      const label = MISSION_LABELS[type] ?? MISSION_LABELS.general;
      toast({ title: "Missão Completa!", description: label });
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
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const msg = payload.new as { sender_user_id: string; content: string };
          if (msg.sender_user_id === user.id) return;
          if (locationRef.current !== "/chat") {
            setChatUnread((c) => c + 1);
            if (getNotifPrefs().chat) {
              toast({ title: "Chat", description: msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mood_checkins", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string } | undefined;
          if (!row || row.user_id === user.id) return;
          if (locationRef.current !== "/humor") {
            setMoodUnread((c) => c + 1);
            if (getNotifPrefs().humor) {
              toast({ title: "O teu par registou o humor de hoje" });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string; assigned_to: string | null; title: string };
          if (row.created_by === user.id) return;
          if (row.assigned_to === user.id) {
            if (locationRef.current !== "/tarefas") {
              setTasksUnread((c) => c + 1);
              if (getNotifPrefs().tarefas) {
                toast({ title: "Nova tarefa para ti", description: row.title.length > 60 ? row.title.slice(0, 60) + "…" : row.title });
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string; status: string; title: string };
          const old = payload.old as { status?: string };
          if (old.status === "open" && row.status === "done" && row.created_by === user.id) {
            if (locationRef.current !== "/tarefas") {
              setTasksUnread((c) => c + 1);
              if (getNotifPrefs().tarefas) {
                toast({ title: "Tarefa concluída", description: row.title.length > 60 ? row.title.slice(0, 60) + "…" : row.title });
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { uploaded_by: string; caption: string | null };
          if (row.uploaded_by === user.id) return;
          if (locationRef.current !== "/memorias") {
            setMemoriesUnread((c) => c + 1);
            if (getNotifPrefs().memorias) {
              toast({ title: "Nova memória", description: row.caption || "O teu par adicionou uma foto" });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photo_comments", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string; content: string };
          if (row.user_id === user.id) return;
          if (locationRef.current !== "/memorias") {
            setMemoriesUnread((c) => c + 1);
            if (getNotifPrefs().memorias) {
              toast({ title: "Novo comentário numa memória", description: row.content.length > 60 ? row.content.slice(0, 60) + "…" : row.content });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string; title: string };
          if (row.created_by === user.id) return;
          if (locationRef.current !== "/agenda") {
            setScheduleUnread((c) => c + 1);
            if (getNotifPrefs().tarefas !== false) {
              toast({ title: "Novo evento", description: row.title });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_blocks", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string; title: string } | undefined;
          if (!row || row.user_id === user.id) return;
          if (locationRef.current !== "/agenda") {
            setScheduleUnread((c) => c + 1);
            // using tarefas config as fallback for agenda/rotinas since agenda missing from toggles
            if (getNotifPrefs().tarefas !== false) {
              toast({ title: "Rotina actualizada", description: row.title });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_prayers", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string } | undefined;
          if (!row || row.created_by === user.id) return;
          if (locationRef.current !== "/jornada-espiritual") {
            setPrayerUnread((c) => c + 1);
            if (getNotifPrefs().oracao) {
              toast({ title: "Oração do dia atualizada" });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_spiritual_logs", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string } | undefined;
          if (!row || row.user_id === user.id) return;
          if (locationRef.current !== "/jornada-espiritual") {
            setPrayerUnread((c) => c + 1);
            if (getNotifPrefs().oracao) {
              toast({ title: "O teu par atualizou o diário espiritual" });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "complaints", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string; title: string };
          if (row.created_by === user.id) return;
          if (locationRef.current !== "/conflitos") {
            setComplaintsUnread((c) => c + 1);
            if (getNotifPrefs().conflitos) {
              toast({ title: "Nova reclamação", description: row.title.length > 60 ? row.title.slice(0, 60) + "…" : row.title });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "complaint_messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string; content: string };
          if (row.user_id === user.id) return;
          if (locationRef.current !== "/conflitos") {
            setComplaintsUnread((c) => c + 1);
            if (getNotifPrefs().conflitos) {
              toast({ title: "Resposta num conflito", description: row.content.length > 60 ? row.content.slice(0, 60) + "…" : row.content });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "complaints", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string; status: string; title: string };
          const old = payload.old as { status?: string };
          if (old.status !== "resolved" && row.status === "resolved") {
            if (locationRef.current !== "/conflitos") {
              setComplaintsUnread((c) => c + 1);
              if (getNotifPrefs().conflitos) {
                toast({ title: "Conflito resolvido", description: row.title });
              }
            }
          }
        }
      )
      .on("broadcast", { event: "prayer-invite" }, () => {
          if (locationRef.current !== "/jornada-espiritual") {
            setPrayerUnread((c) => c + 1);
          }
          if (getNotifPrefs().oracao) {
            toast({ title: "Convite Especial", description: "O teu par quer rezar contigo agora!" });
          }
        })
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime:", channelName);
        }
        if (status === "CHANNEL_ERROR") {
          console.error("❌ Realtime: Channel error", err);
          setTimeout(() => setChannelKey(k => k + 1), 5_000);
        }
        if (status === "TIMED_OUT") {
          console.warn("⚠️ Realtime: Timed out — a reconectar...");
          setTimeout(() => setChannelKey(k => k + 1), 5_000);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [spaceId, user, channelKey]);

  useEffect(() => {
    const totalUnread = chatUnread + moodUnread + tasksUnread + memoriesUnread + scheduleUnread + prayerUnread + complaintsUnread;
    if ('setAppBadge' in navigator) {
      if (totalUnread > 0) {
        // Safe casting to any because setAppBadge is still experimental/types missing in some TS configs
        (navigator as any).setAppBadge(totalUnread).catch(console.error);
      } else {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [chatUnread, moodUnread, tasksUnread, memoriesUnread, scheduleUnread, prayerUnread, complaintsUnread]);

  // ── Auto-refresh da subscrição push ──────────────────────────────────────
  // 1. No arranque: se permissão já concedida, garante que a subscrição
  //    existe no BD com o couple_space_id correto (recupera após SW update).
  // 2. Mensagem SW: o sw.js envia PUSH_SUBSCRIPTION_CHANGED quando o browser
  //    invalida a subscrição; recria e guarda silenciosamente.
  useEffect(() => {
    if (!user || !spaceId) return;
    if (typeof Notification === "undefined" || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey) return;

    const refreshSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (sub) {
          // Verifica se esta subscrição ainda existe no BD.
          // Se não existe (foi apagada após 410 Gone), cria uma nova.
          const { data: dbRow } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("endpoint", sub.toJSON().endpoint ?? "")
            .maybeSingle();

          if (!dbRow) {
            await sub.unsubscribe();
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKeyToUint8Array(vapidKey),
            });
          }
        } else {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKeyToUint8Array(vapidKey),
          });
        }

        await upsertPushSubscription(sub, user.id, spaceId);
      } catch (e) {
        console.warn("[push] auto-refresh falhou:", e);
      }
    };

    refreshSubscription();

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        refreshSubscription();
      }
    };

    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [user, spaceId]);

  return { chatUnread, moodUnread, tasksUnread, memoriesUnread, scheduleUnread, prayerUnread, complaintsUnread, resetChatUnread, resetMoodUnread, resetTasksUnread, resetMemoriesUnread, resetScheduleUnread, resetPrayerUnread, resetComplaintsUnread };
}

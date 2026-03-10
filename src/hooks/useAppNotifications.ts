import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

const NOTIF_KEY = "dk_notif_prefs";
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

  useEffect(() => {
    if (!spaceId || !user) return;

    const channel = supabase
      .channel("app-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const msg = payload.new as { sender_user_id: string; content: string };
          if (msg.sender_user_id === user.id) return;
          if (locationRef.current !== "/chat") {
            setChatUnread((c) => c + 1);
            if (getNotifPrefs().chat) {
              toast({ title: "💬 Chat", description: msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content });
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
              toast({ title: "😊 O teu par registou o humor de hoje" });
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
                toast({ title: "📋 Nova tarefa para ti", description: row.title.length > 60 ? row.title.slice(0, 60) + "…" : row.title });
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
                toast({ title: "✅ Tarefa concluída", description: row.title.length > 60 ? row.title.slice(0, 60) + "…" : row.title });
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
              toast({ title: "📸 Nova memória", description: row.caption || "O teu par adicionou uma foto" });
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
              toast({ title: "💬 Novo comentário numa memória", description: row.content.length > 60 ? row.content.slice(0, 60) + "…" : row.content });
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
              toast({ title: "📅 Novo evento", description: row.title });
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
              toast({ title: "🗓️ Rotina actualizada", description: row.title });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_prayers", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { created_by: string } | undefined;
          if (!row || row.created_by === user.id) return;
          if (locationRef.current !== "/oracao") {
            setPrayerUnread((c) => c + 1);
            if (getNotifPrefs().oracao) {
              toast({ title: "🙏 Oração do dia atualizada" });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_spiritual_logs", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { user_id: string } | undefined;
          if (!row || row.user_id === user.id) return;
          if (locationRef.current !== "/oracao") {
            setPrayerUnread((c) => c + 1);
            if (getNotifPrefs().oracao) {
              toast({ title: "✨ O teu par atualizou o diário espiritual" });
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
              toast({ title: "⚡ Nova reclamação", description: row.title.length > 60 ? row.title.slice(0, 60) + "…" : row.title });
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
              toast({ title: "💬 Resposta num conflito", description: row.content.length > 60 ? row.content.slice(0, 60) + "…" : row.content });
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
                toast({ title: "✅ Conflito resolvido", description: row.title });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, user]);

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

  return { chatUnread, moodUnread, tasksUnread, memoriesUnread, scheduleUnread, prayerUnread, complaintsUnread, resetChatUnread, resetMoodUnread, resetTasksUnread, resetMemoriesUnread, resetScheduleUnread, resetPrayerUnread, resetComplaintsUnread };
}

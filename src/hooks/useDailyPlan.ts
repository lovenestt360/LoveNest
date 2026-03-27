import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format } from "date-fns";
import { useLoveStreak } from "@/hooks/useLoveStreak";

export type PlanType = "routine" | "agenda" | "task";

export interface PlanItem {
  id: string; // `${type}-${id}`
  user_id: string;
  type: PlanType;
  title: string;
  description: string | null;
  completed: boolean;
  datetime: string | null; // For events
  created_at: string;
  time?: string | null;
  location?: string | null;
  itemData: any; // Raw data for specific actions
}

export interface DailyProgress {
  day: string;
  completion_rate: number;
}

export function useDailyPlan(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { recordInteraction } = useLoveStreak();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<{ id: string; name: string } | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayOfWeek = selectedDate.getDay();

  const fetchItems = useCallback(async () => {
    if (!spaceId || !user) return;
    setLoading(true);

    try {
      const { data: members } = await supabase.from("members").select("user_id").eq("couple_space_id", spaceId);
      if (!members || members.length === 0) return;

      const userIds = members.map(m => m.user_id);
      const partnerId = userIds.find(id => id !== user.id);

      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      if (partnerId && profiles) {
        const pProf = profiles.find(p => p.user_id === partnerId);
        setPartnerInfo({ id: partnerId, name: pProf?.display_name || "Parceiro" });
      }

      // 7-day history range
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const historyStartStr = format(sevenDaysAgo, "yyyy-MM-dd");

      const [tasksRes, eventsRes, routineItemsRes, routineLogsRes, historyRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("couple_space_id", spaceId).or(`due_date.eq.${dateStr},due_date.is.null`),
        supabase.from("events").select("*").eq("couple_space_id", spaceId).eq("event_date", dateStr),
        supabase.from("routine_items").select("*").eq("couple_space_id", spaceId).eq("active", true),
        supabase.from("routine_day_logs").select("*").eq("couple_space_id", spaceId).eq("day", dateStr).eq("user_id", user.id),
        supabase.from("routine_day_logs").select("day, completion_rate").eq("couple_space_id", spaceId).eq("user_id", user.id).gte("day", historyStartStr)
      ]);

      setHistory((historyRes.data as DailyProgress[]) || []);

      const planItems: PlanItem[] = [];

      // Tasks
      (tasksRes.data || []).forEach(t => {
        planItems.push({
          id: `task-${t.id}`,
          user_id: t.assigned_to || t.created_by,
          type: "task",
          title: t.title,
          description: t.notes,
          completed: t.status === "done",
          datetime: t.due_date,
          created_at: t.created_at,
          itemData: t
        });
      });

      // Events
      (eventsRes.data || []).forEach(e => {
        planItems.push({
          id: `event-${e.id}`,
          user_id: e.created_by,
          type: "agenda",
          title: e.title,
          description: e.notes,
          completed: false,
          datetime: e.start_time ? `${dateStr}T${e.start_time}` : dateStr,
          time: e.start_time,
          location: e.location,
          created_at: e.created_at,
          itemData: e
        });
      });

      // Routine
      const routineLogs = routineLogsRes.data || [];
      (routineItemsRes.data || []).forEach(ri => {
        const log = routineLogs.find(l => l.user_id === ri.user_id);
        const checkedIds = (log?.checked_item_ids as string[]) || [];
        
        planItems.push({
          id: `routine-${ri.id}`,
          user_id: ri.user_id,
          type: "routine",
          title: ri.title,
          description: null,
          itemData: ri,
          completed: checkedIds.includes(ri.id),
          datetime: null,
          created_at: ri.created_at
        });
      });

      setItems(planItems);
    } catch (error) {
      console.error("Error in useDailyPlan:", error);
    } finally {
      setLoading(false);
    }
  }, [spaceId, user, dateStr]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleItem = async (item: PlanItem) => {
    if (!user || !spaceId || item.user_id !== user.id) return;

    // Optimistic Update
    const oldItems = [...items];
    const oldHistory = [...history];
    
    setItems(current => current.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));

    try {
      if (item.type === "task") {
        const newStatus = item.completed ? "open" : "done";
        await supabase.from("tasks").update({ status: newStatus }).eq("id", item.itemData.id);
      } else if (item.type === "routine") {
        const { data: currentLog } = await supabase.from("routine_day_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("day", dateStr)
          .maybeSingle();
        
        let checkedIds = (currentLog?.checked_item_ids as string[]) || [];
        if (item.completed) {
          checkedIds = checkedIds.filter(id => id !== item.itemData.id);
        } else {
          checkedIds = [...checkedIds, item.itemData.id];
        }

        const totalHabits = oldItems.filter(i => i.type === "routine" && i.user_id === user.id).length;
        const newRate = totalHabits > 0 ? (checkedIds.length / totalHabits) * 100 : 0;

        // Update history cache optimistically
        setHistory(prev => {
          const existing = prev.find(h => h.day === dateStr);
          if (existing) {
            return prev.map(h => h.day === dateStr ? { ...h, completion_rate: newRate } : h);
          }
          return [...prev, { day: dateStr, completion_rate: newRate }];
        });

        if (currentLog) {
          await supabase.from("routine_day_logs").update({ 
            checked_item_ids: checkedIds,
            completion_rate: newRate,
            status: newRate === 100 ? "completed" : newRate >= 50 ? "partial" : "failed"
          }).eq("id", currentLog.id);
        } else {
          await supabase.from("routine_day_logs").insert({
            user_id: user.id,
            couple_space_id: spaceId,
            day: dateStr,
            checked_item_ids: checkedIds,
            completion_rate: newRate,
            status: newRate === 100 ? "completed" : newRate >= 50 ? "partial" : "failed"
          });
        }
      }

      await recordInteraction();
      // No full re-fetch here, we rely on optimistic UI and background sync eventually if needed, 
      // but let's call fetchItems quietly in background to be safe
      // Actually, for instant feel, don't setLoading(true) in background
    } catch (error) {
      setItems(oldItems);
      setHistory(oldHistory);
      console.error("Error toggling item:", error);
    }
  };

  const addItem = async (type: PlanType, data: { title: string; time?: string; notes?: string; emoji?: string }) => {
    if (!user || !spaceId) return;

    try {
      if (type === "task") {
        await supabase.from("tasks").insert({
          title: data.title,
          notes: data.notes || "",
          assigned_to: user.id,
          created_by: user.id,
          couple_space_id: spaceId,
          due_date: dateStr,
          status: "open"
        });
      } else if (type === "agenda") {
        await supabase.from("events").insert({
          title: data.title,
          notes: data.notes || "",
          created_by: user.id,
          couple_space_id: spaceId,
          event_date: dateStr,
          start_time: data.time || null
        });
      } else if (type === "routine") {
        await supabase.from("routine_items").insert({
          title: data.title,
          emoji: data.emoji || null,
          user_id: user.id,
          couple_space_id: spaceId,
          active: true
        });
      }

      await recordInteraction();
      await fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const deleteItem = async (item: PlanItem) => {
    if (!user || !spaceId || item.user_id !== user.id) return;

    try {
      if (item.type === "task") {
        await supabase.from("tasks").delete().eq("id", item.itemData.id);
      } else if (item.type === "agenda") {
        await supabase.from("events").delete().eq("id", item.itemData.id);
      } else if (item.type === "routine") {
        await supabase.from("routine_items").delete().eq("id", item.itemData.id);
      }

      await fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  return { items, history, loading, partnerInfo, toggleItem, addItem, deleteItem, refresh: fetchItems };
}

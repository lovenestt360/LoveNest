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

export function useDailyPlan(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { recordInteraction } = useLoveStreak();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<{ id: string; name: string } | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayOfWeek = selectedDate.getDay();

  const fetchItems = useCallback(async () => {
    if (!spaceId || !user) return;
    setLoading(true);

    try {
      // 1. Get both users in the space
      const { data: members } = await supabase.from("members").select("user_id").eq("couple_space_id", spaceId);
      if (!members || members.length === 0) return;

      const userIds = members.map(m => m.user_id);
      const partnerId = userIds.find(id => id !== user.id);

      // 2. Fetch profiles for names
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      if (partnerId && profiles) {
        const pProf = profiles.find(p => p.user_id === partnerId);
        setPartnerInfo({ id: partnerId, name: pProf?.display_name || "Parceiro" });
      }

      // 3. Sequential fetch to avoid deep type instantiation errors
      const tasksRes = await supabase.from("tasks").select("*").eq("couple_space_id", spaceId).or(`due_date.eq.${dateStr},due_date.is.null`);
      const eventsRes = await supabase.from("events").select("*").eq("couple_space_id", spaceId).eq("event_date", dateStr);
      const routineItemsRes = await supabase.from("routine_items").select("*").eq("couple_space_id", spaceId).eq("active", true);
      const routineLogsRes = await supabase.from("routine_day_logs").select("*").eq("couple_space_id", spaceId).eq("day", dateStr);

      const planItems: PlanItem[] = [];

      // Process Tasks
      const tasks = tasksRes.data || [];
      tasks.forEach(t => {
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

      // Process Events
      const events = eventsRes.data || [];
      events.forEach(e => {
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

      // Process Routine (Habits)
      const routineItems = routineItemsRes.data || [];
      routineItems.forEach(ri => {
        const riUserLog = routineLogsRes.data?.find(log => log.user_id === ri.user_id);
        const checkedIds = (riUserLog?.checked_item_ids as string[]) || [];
        
        // Only show if active (frequency is not in schema yet)
        if (ri.active) {
          planItems.push({
            id: `routine-${ri.id}`,
            user_id: ri.user_id,
            type: "routine",
            title: ri.title,
            description: null,
            completed: checkedIds.includes(ri.id),
            datetime: null,
            created_at: ri.created_at,
            itemData: ri
          });
        }
      });

      setItems(planItems);
    } catch (error) {
      console.error("Error in useDailyPlan:", error);
    } finally {
      setLoading(false);
    }
  }, [spaceId, user, dateStr, dayOfWeek]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleItem = async (item: PlanItem) => {
    if (!user || !spaceId || item.user_id !== user.id) return;

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

        if (currentLog) {
          await supabase.from("routine_day_logs").update({ checked_item_ids: checkedIds }).eq("id", currentLog.id);
        } else {
          await supabase.from("routine_day_logs").insert({
            user_id: user.id,
            couple_space_id: spaceId,
            day: dateStr,
            checked_item_ids: checkedIds,
            status: "partial"
          });
        }
      }

      await recordInteraction();
      await fetchItems();
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const addItem = async (type: PlanType, data: { title: string; time?: string; notes?: string }) => {
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

  return { items, loading, partnerInfo, toggleItem, addItem, deleteItem, refresh: fetchItems };
}

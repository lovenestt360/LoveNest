import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format } from "date-fns";
import { useLoveStreak } from "@/hooks/useLoveStreak";

export type PlanType = "routine" | "agenda" | "task";

export interface PlanItem {
  id: string;
  title: string;
  description: string | null;
  type: PlanType;
  time?: string | null;
  endTime?: string | null;
  isCompleted: boolean;
  isShared: boolean;
  category?: string | null;
  location?: string | null;
  userId?: string;
  itemData: any; // Original object from DB
}

export function useDailyPlan(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { recordInteraction } = useLoveStreak();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayOfWeek = selectedDate.getDay();

  const fetchItems = useCallback(async () => {
    if (!spaceId || !user) return;
    setLoading(true);

    try {
      const tasksRes = await supabase.from("tasks").select("*").eq("couple_space_id", spaceId).or(`due_date.eq.${dateStr},due_date.is.null`);
      const eventsRes = await supabase.from("events").select("*").eq("couple_space_id", spaceId).eq("event_date", dateStr);
      const routineItemsRes = await supabase.from("routine_items").select("*").eq("couple_space_id", spaceId).eq("is_active", true);
      const routineLogsRes = await supabase.from("routine_day_logs").select("*").eq("user_id", user.id).eq("day", dateStr).maybeSingle();

      const planItems: PlanItem[] = [];

      // Process Tasks
      if (tasksRes.data) {
        tasksRes.data.forEach((t: any) => {
          planItems.push({
            id: `task-${t.id}`,
            title: t.title,
            description: t.description,
            type: "task",
            isCompleted: t.status === "done",
            isShared: true,
            userId: t.user_id,
            itemData: t,
          });
        });
      }

      // Process Events (Agenda)
      if (eventsRes.data) {
        eventsRes.data.forEach((e: any) => {
          planItems.push({
            id: `agenda-${e.id}`,
            title: e.title,
            description: e.notes,
            type: "agenda",
            time: e.start_time,
            endTime: e.end_time,
            location: e.location,
            isCompleted: false, // Events don't strictly have a done state in old system, but we keep it open
            isShared: true,
            itemData: e,
          });
        });
      }

      // Process Routine (Habits)
      if (routineItemsRes.data) {
        const checkedIds = (routineLogsRes.data?.checked_item_ids as string[]) || [];
        routineItemsRes.data.forEach((ri: any) => {
          // Check frequency (simple logic for now)
          const frequency = ri.frequency || "daily";
          const daysOfWeek = ri.days_of_week || []; // [1,2,3,4,5]
          
          let shouldShow = false;
          if (frequency === "daily") shouldShow = true;
          if (frequency === "weekly" && daysOfWeek.includes(dayOfWeek)) shouldShow = true;

          if (shouldShow) {
            planItems.push({
              id: `routine-${ri.id}`,
              title: ri.title,
              description: ri.description,
              type: "routine",
              isCompleted: checkedIds.includes(ri.id),
              isShared: false, // Habit definitions are per user but in same table often
              userId: ri.user_id,
              itemData: ri,
            });
          }
        });
      }

      setItems(planItems);
    } catch (error) {
      console.error("Error fetching daily plan items:", error);
    } finally {
      setLoading(false);
    }
  }, [spaceId, user, dateStr, dayOfWeek]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleItem = async (item: PlanItem) => {
    if (!user || !spaceId) return;

    try {
      if (item.type === "task") {
        const newStatus = item.isCompleted ? "open" : "done";
        await supabase.from("tasks").update({ status: newStatus }).eq("id", item.itemData.id);
      } else if (item.type === "routine") {
        const currentLogRes = await supabase.from("routine_day_logs").select("*").eq("user_id", user.id).eq("day", dateStr).maybeSingle();
        let checkedIds = (currentLogRes.data?.checked_item_ids as string[]) || [];
        
        if (item.isCompleted) {
          checkedIds = checkedIds.filter(id => id !== item.itemData.id);
        } else {
          checkedIds = [...checkedIds, item.itemData.id];
        }

        if (currentLogRes.data) {
          await supabase.from("routine_day_logs").update({ checked_item_ids: checkedIds }).eq("id", currentLogRes.data.id);
        } else {
          await supabase.from("routine_day_logs").insert({
            user_id: user.id,
            couple_space_id: spaceId,
            day: dateStr,
            checked_item_ids: checkedIds,
            status: checkedIds.length > 0 ? "partial" : "unlogged"
          });
        }
      }

      // Record interaction for LoveStreak
      await recordInteraction();
      
      // Refresh local state
      fetchItems();
    } catch (error) {
      console.error("Error toggling plan item:", error);
    }
  };

  return { items, loading, toggleItem, refresh: fetchItems };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365];

export function useMilestone(currentStreak: number, spaceId: string | null) {
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);
  const [recentMilestone, setRecentMilestone] = useState<number | null>(null);
  const checkedRef = useRef<Set<number>>(new Set());

  // On mount: check if there's a milestone recorded in the last 24h (for micro-memory line)
  useEffect(() => {
    if (!spaceId) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    (supabase
      .from("relationship_milestones" as any)
      .select("milestone_value, created_at")
      .eq("couple_space_id", spaceId)
      .eq("milestone_type", "streak")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1) as any)
      .then(({ data }: any) => {
        if (data?.[0]) setRecentMilestone(data[0].milestone_value);
      });
  }, [spaceId]);

  // When streak lands on a milestone value: check DB once, then show modal if new
  useEffect(() => {
    if (!spaceId || !currentStreak) return;
    if (!STREAK_MILESTONES.includes(currentStreak)) return;
    if (checkedRef.current.has(currentStreak)) return;
    checkedRef.current.add(currentStreak);

    (supabase
      .from("relationship_milestones" as any)
      .select("id")
      .eq("couple_space_id", spaceId)
      .eq("milestone_type", "streak")
      .eq("milestone_value", currentStreak)
      .maybeSingle() as any)
      .then(({ data }: any) => {
        if (!data) setPendingMilestone(currentStreak);
      });
  }, [currentStreak, spaceId]);

  // Called when user dismisses the modal — writes to DB then activates micro-memory
  const confirmMilestone = useCallback(async () => {
    if (!pendingMilestone || !spaceId) return;
    await (supabase
      .from("relationship_milestones" as any)
      .insert({
        couple_space_id: spaceId,
        milestone_type: "streak",
        milestone_value: pendingMilestone,
      }) as any);
    setRecentMilestone(pendingMilestone);
    setPendingMilestone(null);
  }, [pendingMilestone, spaceId]);

  return { pendingMilestone, recentMilestone, confirmMilestone };
}

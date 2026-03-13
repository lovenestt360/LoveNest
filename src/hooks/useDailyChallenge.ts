import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { format } from "date-fns";

export interface MicroChallenge {
  id: string;
  challenge_text: string;
  challenge_type: string;
  points: number;
  emoji: string;
}

export function useDailyChallenge() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [challenge, setChallenge] = useState<MicroChallenge | null>(null);
  const [completed, setCompleted] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!spaceId || !user) return;

    // Get all challenges and pick one deterministically for today
    const { data: challenges } = await supabase
      .from("micro_challenges")
      .select("*")
      .order("created_at");

    if (!challenges || challenges.length === 0) {
      setLoading(false);
      return;
    }

    // Deterministic daily challenge based on date hash
    const dateNum = parseInt(todayStr.replace(/-/g, ""), 10);
    const idx = dateNum % challenges.length;
    const todayChallenge = challenges[idx] as MicroChallenge;
    setChallenge(todayChallenge);

    // Check completions
    const { data: completions } = await supabase
      .from("micro_challenge_completions")
      .select("user_id")
      .eq("couple_space_id", spaceId)
      .eq("challenge_id", todayChallenge.id)
      .eq("day_key", todayStr);

    if (completions) {
      setCompleted(completions.some(c => c.user_id === user.id));
      setPartnerCompleted(completions.some(c => c.user_id !== user.id));
    }

    setLoading(false);
  }, [spaceId, user, todayStr]);

  useEffect(() => {
    load();
  }, [load]);

  const completeChallenge = useCallback(async () => {
    if (!spaceId || !user || !challenge) return;

    await supabase.from("micro_challenge_completions").upsert({
      couple_space_id: spaceId,
      challenge_id: challenge.id,
      user_id: user.id,
      day_key: todayStr,
      completed: true,
    }, { onConflict: "couple_space_id,challenge_id,user_id,day_key" });

    setCompleted(true);
    load();
  }, [spaceId, user, challenge, todayStr, load]);

  return { challenge, completed, partnerCompleted, loading, completeChallenge };
}

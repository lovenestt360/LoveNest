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
  const [challenges, setChallenges] = useState<MicroChallenge[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [partnerCompletions, setPartnerCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!spaceId || !user) return;

    // Get all challenges
    const { data: allChallenges } = await supabase
      .from("micro_challenges")
      .select("*")
      .order("created_at");

    if (!allChallenges || allChallenges.length === 0) {
      setLoading(false);
      return;
    }

    // Deterministic 3 challenges based on date hash
    const dateNum = parseInt(todayStr.replace(/-/g, ""), 10);
    const dailyChallenges: MicroChallenge[] = [];
    
    for (let i = 0; i < 3; i++) {
      const idx = (dateNum + i * 7) % allChallenges.length;
      dailyChallenges.push(allChallenges[idx]);
    }
    
    setChallenges(dailyChallenges);

    // Check completions for these 3 challenges
    const challengeIds = dailyChallenges.map(c => c.id);
    const { data: compData } = await supabase
      .from("micro_challenge_completions")
      .select("challenge_id, user_id")
      .eq("couple_space_id", spaceId)
      .in("challenge_id", challengeIds)
      .eq("day_key", todayStr);

    if (compData) {
      const userComp: Record<string, boolean> = {};
      const partComp: Record<string, boolean> = {};
      
      challengeIds.forEach(id => {
        userComp[id] = compData.some(c => c.challenge_id === id && c.user_id === user.id);
        partComp[id] = compData.some(c => c.challenge_id === id && c.user_id !== user.id);
      });
      
      setCompletions(userComp);
      setPartnerCompletions(partComp);
    }

    setLoading(false);
  }, [spaceId, user, todayStr]);

  useEffect(() => {
    load();
    
    if (!spaceId) return;

    // Realtime subscription for completions
    const channel = supabase
      .channel("micro-completions")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "micro_challenge_completions",
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, spaceId]);

  return { challenges, completions, partnerCompletions, loading, reload: load };
}

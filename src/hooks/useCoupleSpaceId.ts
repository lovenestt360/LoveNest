import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * Returns the current user's couple_space_id (or null if not paired).
 * Reacts to authentication changes.
 */
export function useCoupleSpaceId() {
  const { user } = useAuth();
  const [spaceId, setSpaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSpaceId(null);
      return;
    }

    supabase.rpc("get_user_couple_space_id").then(({ data }) => {
      setSpaceId(data ?? null);
    });
  }, [user]);

  return spaceId;
}

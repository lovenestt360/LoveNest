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

    const fetchSpaceId = async () => {
      try {
        const { data, error } = await supabase.rpc("get_user_couple_space_id");
        if (error) {
          console.error("Error fetching couple_space_id:", error.message);
          setSpaceId(null);
        } else {
          console.log("Fetched couple_space_id:", data);
          setSpaceId(data ?? null);
        }
      } catch (err) {
        console.error("Unexpected error fetching couple_space_id:", err);
        setSpaceId(null);
      }
    };

    fetchSpaceId();
  }, [user]);

  return spaceId;
}

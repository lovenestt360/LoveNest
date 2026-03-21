import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "./useCoupleSpaceId";

export interface PartnerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
}

export function usePartnerProfile() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !spaceId) {
      if (!spaceId && !loading) setPartner(null);
      return;
    }

    const fetchPartner = async () => {
      setLoading(true);
      try {
        // 1. Get the other member of the couple space
        const { data: members, error: mError } = await supabase
          .from("members")
          .select("user_id")
          .eq("couple_space_id", spaceId)
          .neq("user_id", user.id);

        if (mError) throw mError;

        if (members && members.length > 0) {
          const partnerId = members[0].user_id;

          // 2. Get profile details with fallback
          const { data: profile, error: pError } = await (supabase
            .from("profiles")
            .select("*")
            .eq("user_id", partnerId)
            .maybeSingle() as any);

          if (pError || !profile) {
            setPartner(null);
            return;
          }

          setPartner({
            user_id: profile.user_id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            verification_status: profile.verification_status || "unverified"
          });
        } else {
          setPartner(null);
        }
      } catch (err) {
        console.error("Error fetching partner profile:", err);
        setPartner(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [user, spaceId]);

  return { partner, loading };
}

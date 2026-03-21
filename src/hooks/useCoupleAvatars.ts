import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

interface AvatarInfo {
  displayName: string | null;
  avatarUrl: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
}

export function useCoupleAvatars() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [me, setMe] = useState<AvatarInfo | null>(null);
  const [partner, setPartner] = useState<AvatarInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!spaceId || !user) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // Get both members of the couple space
        const { data: members } = await supabase
          .from("members")
          .select("user_id")
          .eq("couple_space_id", spaceId);

        if (!members) {
          setLoading(false);
          return;
        }

        const userIds = members.map((m) => m.user_id);

        // 2. Get profile details (Select all to avoid missing column errors)
        const { data: profiles, error: pError } = await (supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds) as any);

        if (pError || !profiles || profiles.length === 0) {
          setLoading(false);
          return;
        }

        const myProfile = profiles.find((p: any) => p.user_id === user.id);
        const partnerProfile = profiles.find((p: any) => p.user_id !== user.id);

        if (myProfile) {
          setMe({ 
            displayName: myProfile.display_name, 
            avatarUrl: myProfile.avatar_url, 
            verificationStatus: myProfile.verification_status || "unverified"
          });
        } else {
          setMe({ 
            displayName: user.email?.split("@")[0] || "Tu", 
            avatarUrl: null, 
            verificationStatus: "unverified" 
          });
        }

        if (partnerProfile) {
          setPartner({ 
            displayName: partnerProfile.display_name, 
            avatarUrl: partnerProfile.avatar_url, 
            verificationStatus: partnerProfile.verification_status || "unverified" 
          });
        } else {
          setPartner(null);
        }
      } catch (err) {
        console.error("Error in useCoupleAvatars:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [spaceId, user]);

  return { me, partner, loading };
}

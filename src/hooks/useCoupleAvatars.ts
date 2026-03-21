import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

interface AvatarInfo {
  displayName: string | null;
  avatarUrl: string | null;
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

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        if (!profiles) {
          setLoading(false);
          return;
        }

        const myProfile = profiles.find((p) => p.user_id === user.id);
        const partnerProfile = profiles.find((p) => p.user_id !== user.id);

        setMe(
          myProfile
            ? { displayName: myProfile.display_name, avatarUrl: myProfile.avatar_url }
            : null
        );
        setPartner(
          partnerProfile
            ? { displayName: partnerProfile.display_name, avatarUrl: partnerProfile.avatar_url }
            : null
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [spaceId, user]);

  return { me, partner, loading };
}

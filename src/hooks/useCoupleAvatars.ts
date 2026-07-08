import { useCallback, useEffect, useState } from "react";
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

  const fetchAvatars = useCallback(async () => {
    if (!spaceId || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: members } = await supabase
        .from("members").select("user_id").eq("couple_space_id", spaceId);
      if (!members) { setLoading(false); return; }
      const userIds = members.map((m) => m.user_id);
      const { data: profiles, error: pError } = await (supabase
        .from("profiles").select("*").in("user_id", userIds) as any);
      if (pError || !profiles || profiles.length === 0) { setLoading(false); return; }
      const myProfile      = profiles.find((p: any) => p.user_id === user.id);
      const partnerProfile = profiles.find((p: any) => p.user_id !== user.id);
      setMe(myProfile
        ? { displayName: myProfile.display_name, avatarUrl: myProfile.avatar_url, verificationStatus: myProfile.verification_status || "unverified" }
        : { displayName: user.email?.split("@")[0] || "Tu", avatarUrl: null, verificationStatus: "unverified" }
      );
      setPartner(partnerProfile
        ? { displayName: partnerProfile.display_name, avatarUrl: partnerProfile.avatar_url, verificationStatus: partnerProfile.verification_status || "unverified" }
        : null
      );
    } catch (err) {
      console.error("Error in useCoupleAvatars:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

  useEffect(() => { fetchAvatars(); }, [fetchAvatars]);

  // Actualiza quando o utilizador regressa à Home (keep-alive) ou guarda perfil
  useEffect(() => {
    window.addEventListener("home-visible", fetchAvatars);
    window.addEventListener("onboarding-refresh", fetchAvatars);
    return () => {
      window.removeEventListener("home-visible", fetchAvatars);
      window.removeEventListener("onboarding-refresh", fetchAvatars);
    };
  }, [fetchAvatars]);

  return { me, partner, loading };
}

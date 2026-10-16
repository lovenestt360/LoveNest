import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "./useCoupleSpaceId";

export interface PartnerProfile {
  user_id: string;
  /** Alcunha que eu dei ao meu par, se existir; senão o nome dele. */
  display_name: string | null;
  /** Nome que o par escolheu para si. */
  real_name: string | null;
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

          // 2. Perfil do par + o meu (onde guardo a alcunha que lhe dei)
          const { data: profiles, error: pError } = await (supabase
            .from("profiles")
            .select("*")
            .in("user_id", [partnerId, user.id]) as any);

          const profile = (profiles ?? []).find((p: any) => p.user_id === partnerId);
          const mine = (profiles ?? []).find((p: any) => p.user_id === user.id);

          if (pError || !profile) {
            setPartner(null);
            return;
          }

          const nickname = (mine?.partner_nickname ?? "").trim();
          setPartner({
            user_id: profile.user_id,
            display_name: nickname || profile.display_name,
            real_name: profile.display_name,
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
    // Volta a ler quando a alcunha (ou o perfil) é guardada.
    window.addEventListener("onboarding-refresh", fetchPartner);
    return () => window.removeEventListener("onboarding-refresh", fetchPartner);
  }, [user, spaceId]);

  return { partner, loading };
}

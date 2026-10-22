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

// Linha de profiles como é lida aqui (partner_nickname ainda não está nos tipos gerados).
type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  verification_status?: PartnerProfile["verification_status"] | null;
  partner_nickname?: string | null;
};

// Guardado no aparelho para o nome (ou a alcunha) aparecer logo, sem "piscar".
const cacheKey = (userId: string) => `ln_partner_${userId}`;
function readCache(userId: string | undefined): PartnerProfile | null {
  if (!userId) return null;
  try { return JSON.parse(localStorage.getItem(cacheKey(userId)) ?? "null"); } catch { return null; }
}
function writeCache(userId: string, partner: PartnerProfile | null) {
  try {
    if (partner) localStorage.setItem(cacheKey(userId), JSON.stringify(partner));
    else localStorage.removeItem(cacheKey(userId));
  } catch { /* sem armazenamento: lê sempre da rede */ }
}

export function usePartnerProfile() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [partner, setPartner] = useState<PartnerProfile | null>(() => readCache(user?.id));
  const [loading, setLoading] = useState(() => !readCache(user?.id));

  useEffect(() => {
    if (!user || !spaceId) {
      if (!spaceId && !loading) setPartner(null);
      return;
    }

    const fetchPartner = async () => {
      // Com cache, atualiza em segundo plano sem voltar ao estado de "a carregar".
      if (!readCache(user.id)) setLoading(true);
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
          const { data, error: pError } = await supabase
            .from("profiles")
            .select("*")
            .in("user_id", [partnerId, user.id]);
          const profiles = (data ?? []) as unknown as ProfileRow[];

          const profile = profiles.find(p => p.user_id === partnerId);
          const mine = profiles.find(p => p.user_id === user.id);

          if (pError || !profile) {
            if (pError) throw pError;
            setPartner(null);
            writeCache(user.id, null);
            return;
          }

          const nickname = (mine?.partner_nickname ?? "").trim();
          const next: PartnerProfile = {
            user_id: profile.user_id,
            display_name: nickname || profile.display_name,
            real_name: profile.display_name,
            avatar_url: profile.avatar_url,
            verification_status: profile.verification_status || "unverified"
          };
          setPartner(next);
          writeCache(user.id, next);
        } else {
          setPartner(null);
          writeCache(user.id, null);
        }
      } catch (err) {
        // Sem rede: fica o que estava guardado.
        console.error("Error fetching partner profile:", err);
        if (!readCache(user.id)) setPartner(null);
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

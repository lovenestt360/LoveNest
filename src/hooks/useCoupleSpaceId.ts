import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

function readSpaceIdCache(userId: string | undefined): string | null {
  if (!userId) return null;
  try { return sessionStorage.getItem(`ln_space_id_${userId}`) ?? null; } catch { return null; }
}

function writeSpaceIdCache(userId: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(`ln_space_id_${userId}`, id);
    else sessionStorage.removeItem(`ln_space_id_${userId}`);
  } catch {}
}

/**
 * Returns the current user's couple_space_id (or null if not paired).
 * Initializes synchronously from sessionStorage so downstream hooks can
 * read their own caches on first render (avoids skeleton flash on navigation).
 */
export function useCoupleSpaceId() {
  const { user } = useAuth();
  const [spaceId, setSpaceId] = useState<string | null>(() => readSpaceIdCache(user?.id));

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
        } else {
          const id = data ?? null;
          setSpaceId(id);
          writeSpaceIdCache(user.id, id);
        }
      } catch (err) {
        console.error("Unexpected error fetching couple_space_id:", err);
      }
    };

    fetchSpaceId();
    // Depende só do id (estável), não do objeto "user" inteiro — o Supabase
    // troca a referência de "user" sempre que renova o token (ex: quando a
    // app volta do background depois de abrir a galeria/câmara). Sem isto,
    // cada renovação refazia este pedido e, em caso de erro transitório
    // nesse instante, "spaceId" ia a null e desmontava a secção de compra,
    // perdendo o comprovativo já selecionado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return spaceId;
}

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
        } else {
          console.log("Fetched couple_space_id:", data);
          setSpaceId(data ?? null);
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

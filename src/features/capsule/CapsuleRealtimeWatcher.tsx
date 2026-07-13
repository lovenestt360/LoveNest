import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { dispatchCeremony } from "@/lib/ceremonies";

// Montado globalmente em App.tsx — deteta em tempo real novas cápsulas criadas
// pelo par e dispara a cerimónia no momento certo, sem precisar recarregar.
export function CapsuleRealtimeWatcher() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!spaceId || !user) return;

    const channel = supabase
      .channel(`capsule-watcher-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "time_capsule_messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { id: string; creator_id: string };
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          // Texto diferente conforme criador ou par
          const isOwn = row.creator_id === user.id;
          dispatchCeremony({
            type: "capsula",
            eyebrow: "Cápsula do Tempo",
            title: isOwn ? "Cápsula enterrada" : "O teu par enterrou uma cápsula",
            subtitle: "Uma memória foi guardada para o futuro do vosso ninho.",
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [spaceId, user]);

  return null;
}

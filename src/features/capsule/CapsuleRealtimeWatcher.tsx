import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { dispatchCeremony } from "@/lib/ceremonies";

// Chave partilhada com Index.tsx para dedupe persistente entre sessões
export function capsuleSeenKey(spaceId: string, userId: string) {
  return `ln_capsule_ceremony_${spaceId}_${userId}`;
}

function getSeenIds(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch { return new Set(); }
}

function markSeen(key: string, id: string) {
  try {
    const ids = getSeenIds(key);
    ids.add(id);
    // Limitar a 100 entradas para não crescer indefinidamente
    const arr = [...ids].slice(-100);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

// Montado globalmente em App.tsx — deteta em tempo real novas cápsulas e
// dispara a cerimónia exactamente uma vez por cápsula, mesmo após reiniciar.
export function CapsuleRealtimeWatcher() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  useEffect(() => {
    if (!spaceId || !user) return;

    const key = capsuleSeenKey(spaceId, user.id);

    const channel = supabase
      .channel(`capsule-watcher-${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "time_capsule_messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          const row = payload.new as { id: string; creator_id: string };
          if (getSeenIds(key).has(row.id)) return;
          markSeen(key, row.id);
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

import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { dispatchCeremony } from "@/lib/ceremonies";

// Partilhada com Index.tsx para dedupe persistente entre sessões
export function capsuleSeenKey(spaceId: string, userId: string) {
  return `ln_capsule_ceremony_${spaceId}_${userId}`;
}

const revealSeenKey = (spaceId: string, userId: string) =>
  `ln_capsule_reveal_${spaceId}_${userId}`;

function getSeenIds(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); }
  catch { return new Set(); }
}

function markSeen(key: string, id: string) {
  try {
    const ids = getSeenIds(key);
    ids.add(id);
    localStorage.setItem(key, JSON.stringify([...ids].slice(-100)));
  } catch {}
}

// Fallback: busca cápsulas do par dos últimos 7 dias e dispara cerimónia se não vistas.
// Cobre o caso de o utilizador estar offline/em background quando o par criou a cápsula.
async function checkUnseenPartnerCapsules(spaceId: string, userId: string) {
  const key = capsuleSeenKey(spaceId, userId);
  const seenIds = getSeenIds(key);

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data } = await (supabase as any)
    .from("time_capsule_messages")
    .select("id")
    .eq("couple_space_id", spaceId)
    .neq("creator_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  if (!data?.length) return;
  const unseen = (data as { id: string }[]).filter(c => !seenIds.has(c.id));
  if (!unseen.length) return;

  unseen.forEach(c => markSeen(key, c.id));
  dispatchCeremony({
    type: "capsula",
    eyebrow: "Cápsula do Tempo",
    title: "O teu par enterrou uma cápsula",
    subtitle: "Uma memória foi guardada para o futuro do vosso ninho.",
  });
}

// Montado globalmente em App.tsx.
// Deteta novas cápsulas (INSERT) e revelações do par (UPDATE) em tempo real,
// e faz fallback via visibilitychange para eventos perdidos em background.
export function CapsuleRealtimeWatcher() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  // Subscrição realtime — usa user?.id (estável) em vez de user (objeto muda em token refresh)
  useEffect(() => {
    if (!spaceId || !user) return;
    const userId = user.id;
    const insertKey = capsuleSeenKey(spaceId, userId);
    const rvlKey = revealSeenKey(spaceId, userId);

    const channel = supabase
      .channel(`capsule-watcher-${spaceId}-v2`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_capsule_messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          // Notifica a lista da página /capsula para atualizar
          window.dispatchEvent(new CustomEvent("lovenest-capsule-changed"));

          const row = payload.new as { id: string; creator_id: string; is_unlocked: boolean } | undefined;
          if (!row) return;

          // Nova cápsula criada
          if (payload.eventType === "INSERT") {
            if (getSeenIds(insertKey).has(row.id)) return;
            markSeen(insertKey, row.id);
            const isOwn = row.creator_id === userId;
            dispatchCeremony({
              type: "capsula",
              eyebrow: "Cápsula do Tempo",
              title: isOwn ? "Cápsula enterrada" : "O teu par enterrou uma cápsula",
              subtitle: "Uma memória foi guardada para o futuro do vosso ninho.",
            });
          }

          // Par revelou uma cápsula (UPDATE is_unlocked false→true)
          if (payload.eventType === "UPDATE" && row.is_unlocked && row.creator_id !== userId) {
            const old = payload.old as { is_unlocked?: boolean } | undefined;
            if (old?.is_unlocked) return; // já estava revelada
            if (getSeenIds(rvlKey).has(row.id)) return;
            markSeen(rvlKey, row.id);
            dispatchCeremony({
              type: "capsula",
              eyebrow: "Cápsula do Tempo",
              title: "O teu par abriu uma cápsula!",
              subtitle: "Uma memória do passado chegou ao presente.",
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [spaceId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback: quando o utilizador volta ao app do background, verifica cápsulas perdidas
  useEffect(() => {
    if (!spaceId || !user) return;
    const userId = user.id;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkUnseenPartnerCapsules(spaceId, userId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [spaceId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

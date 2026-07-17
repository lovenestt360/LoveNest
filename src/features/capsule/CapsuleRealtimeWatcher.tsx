import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";

// Partilhada com Index.tsx para dedupe persistente entre sessões
export function capsuleSeenKey(spaceId: string, userId: string) {
  return `ln_capsule_ceremony_${spaceId}_${userId}`;
}

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

// Fallback: busca cápsulas do par dos últimos 7 dias e dispara cerimónia de selagem se não vistas.
// Cobre o caso de o utilizador estar offline/em background quando o par criou a cápsula.
async function checkUnseenPartnerCapsules(spaceId: string, userId: string) {
  const key = capsuleSeenKey(spaceId, userId);
  const seenIds = getSeenIds(key);

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data } = await (supabase as any)
    .from("time_capsule_messages")
    .select("id, image_url, unlock_date")
    .eq("couple_space_id", spaceId)
    .neq("creator_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  if (!data?.length) return;
  const unseen = (data as { id: string; image_url?: string | null; unlock_date?: string }[])
    .filter(c => !seenIds.has(c.id));
  if (!unseen.length) return;

  unseen.forEach(c => markSeen(key, c.id));
  const recent = unseen[0];
  window.dispatchEvent(new CustomEvent("lovenest-capsule-sealed", {
    detail: {
      imageUrl: recent.image_url ?? null,
      unlockDate: recent.unlock_date ?? new Date().toISOString(),
      capsuleId: recent.id,
    },
  }));
}

// Montado globalmente em App.tsx.
// Deteta novas cápsulas (INSERT) em tempo real e faz fallback via visibilitychange.
// Revelações (UPDATE) não disparam cerimónia aqui — cada utilizador vive o momento
// individualmente quando abre a cápsula pela primeira vez.
export function CapsuleRealtimeWatcher() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  // Subscrição realtime — usa user?.id (estável) em vez de user (objeto muda em token refresh)
  useEffect(() => {
    if (!spaceId || !user) return;
    const userId = user.id;
    const insertKey = capsuleSeenKey(spaceId, userId);

    const channel = supabase
      .channel(`capsule-watcher-${spaceId}-v2`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_capsule_messages", filter: `couple_space_id=eq.${spaceId}` },
        (payload) => {
          // Notifica a lista da página /capsula para atualizar
          window.dispatchEvent(new CustomEvent("lovenest-capsule-changed"));

          const row = payload.new as {
            id: string; creator_id: string; is_unlocked: boolean;
            image_url?: string | null; unlock_date?: string;
          } | undefined;
          if (!row) return;

          // Nova cápsula criada — cerimónia de selagem apenas para o par
          if (payload.eventType === "INSERT") {
            if (getSeenIds(insertKey).has(row.id)) return;
            markSeen(insertKey, row.id);
            // O criador dispara o evento directamente em handleCreate com dados locais
            if (row.creator_id === userId) return;
            window.dispatchEvent(new CustomEvent("lovenest-capsule-sealed", {
              detail: {
                imageUrl: row.image_url ?? null,
                unlockDate: row.unlock_date ?? new Date().toISOString(),
                capsuleId: row.id,
              },
            }));
          }

          // UPDATE (revelação): não disparar cerimónia global.
          // Cada utilizador vive a animação individualmente ao abrir a cápsula
          // — controlado por hasSeenReveal/markRevealSeen em TimeCapsule.tsx.
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

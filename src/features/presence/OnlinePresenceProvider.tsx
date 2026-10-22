import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { OnlinePresenceContext } from "./onlinePresence";

/**
 * Presença em tempo real do casal (Supabase Realtime Presence).
 * Cada pessoa entra no canal do espaço enquanto a app está aberta e visível,
 * e sai quando a app vai para segundo plano ou fecha. Assim o "online" é real.
 */
export function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?.id || !spaceId) return;

    const channel = supabase.channel(`online:${spaceId}`, { config: { presence: { key: user.id } } });
    let joined = false;

    const sync = () => setOnlineIds(new Set(Object.keys(channel.presenceState())));
    const update = () => {
      if (!joined) return;
      if (document.visibilityState === "visible") channel.track({ since: new Date().toISOString() });
      else channel.untrack();
    };
    const leave = () => { if (joined) channel.untrack(); };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        joined = status === "SUBSCRIBED";
        setConnected(joined);
        if (joined) update();
      });

    document.addEventListener("visibilitychange", update);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", update);

    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", update);
      supabase.removeChannel(channel);
      setOnlineIds(new Set());
      setConnected(false);
    };
  }, [user?.id, spaceId]);

  return (
    <OnlinePresenceContext.Provider value={{ onlineIds, connected }}>
      {children}
    </OnlinePresenceContext.Provider>
  );
}

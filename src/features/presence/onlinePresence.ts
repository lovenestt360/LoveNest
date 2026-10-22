import { createContext, useContext } from "react";
import { useAuth } from "@/features/auth/AuthContext";

export interface OnlinePresenceValue {
  /** Quem do casal tem a app aberta e visível neste momento. */
  onlineIds: ReadonlySet<string>;
  /** Ligado ao canal de presença (a minha própria presença conta). */
  connected: boolean;
}

export const OnlinePresenceContext = createContext<OnlinePresenceValue>({ onlineIds: new Set(), connected: false });

/** Estado online real: eu e o meu par, com a app aberta agora. */
export function useOnlinePresence() {
  const { user } = useAuth();
  const { onlineIds, connected } = useContext(OnlinePresenceContext);
  const meOnline = connected && !!user && onlineIds.has(user.id);
  const partnerOnline = [...onlineIds].some((id) => id !== user?.id);
  return { meOnline, partnerOnline };
}

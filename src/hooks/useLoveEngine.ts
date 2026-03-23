import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useCallback } from "react";

export type LoveEventType = 'message' | 'task' | 'memory' | 'mood' | 'app_open' | 'prayer';

export function useLoveEngine() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();

  const emitEvent = useCallback(async (type: LoveEventType, metadata: any = {}) => {
    if (!user || !spaceId) return;

    try {
      const { error } = await supabase
        .from('love_events' as any)
        .insert({
          user_id: user.id,
          couple_space_id: spaceId,
          event_type: type,
          metadata: metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error emitting love event:', error);
      }
    } catch (err) {
      console.error('Failed to emit love event:', err);
    }
  }, [user, spaceId]);

  return { emitEvent };
}

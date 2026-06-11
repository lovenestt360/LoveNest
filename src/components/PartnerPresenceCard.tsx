import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Moon, Users } from "lucide-react";

interface PresenceState {
  partnerName: string;
  partnerActive: boolean;
  myActive: boolean;
}

function usePartnerPresence() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [state, setState] = useState<PresenceState | null>(null);

  useEffect(() => {
    if (!user || !spaceId) return;
    const today = new Date().toISOString().slice(0, 10);

    (supabase.from("members" as any)
      .select("user_id, profiles(display_name)")
      .eq("couple_space_id", spaceId)
      .neq("user_id", user.id)
      .limit(1) as any)
      .then(({ data: members }: any) => {
        const member = members?.[0];
        if (!member) return;

        const pId = member.user_id as string;
        const pName = ((member.profiles as any)?.display_name as string | null)
          ?.split(" ")[0] ?? "O teu par";

        (supabase.from("daily_activity" as any)
          .select("user_id")
          .eq("couple_space_id", spaceId)
          .eq("activity_date", today) as any)
          .then(({ data: acts }: any) => {
            const ids: string[] = [...new Set((acts ?? []).map((a: any) => a.user_id as string))];
            setState({
              partnerName: pName,
              partnerActive: ids.includes(pId),
              myActive: ids.includes(user.id),
            });
          });
      });
  }, [user, spaceId]);

  return state;
}

export function PartnerPresenceCard() {
  const presence = usePartnerPresence();

  if (!presence) return null;

  const { partnerName, partnerActive, myActive } = presence;
  const bothPresent = myActive && partnerActive;

  if (bothPresent) {
    return (
      <div className="px-1 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100/60 dark:border-rose-900/40 rounded-2xl">
          <Users className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] font-medium text-rose-500">
            Ambos presentes no ninho hoje
          </span>
        </div>
      </div>
    );
  }

  if (partnerActive) {
    return (
      <div className="px-1 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-2xl">
          <Heart className="w-3.5 h-3.5 text-rose-300 shrink-0" strokeWidth={1.5} />
          <span className="text-[11px] font-medium text-muted-foreground">
            {partnerName} esteve presente hoje
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-2xl">
        <Moon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] text-muted-foreground/50">
          O ninho ainda aguarda {partnerName} hoje
        </span>
      </div>
    </div>
  );
}

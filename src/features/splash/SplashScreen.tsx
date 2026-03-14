import { useEffect, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchInitials() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: member } = await supabase.from("members").select("couple_space_id").eq("user_id", session.user.id).maybeSingle();
        if (member?.couple_space_id) {
          const { data: house } = await supabase.from("couple_spaces").select("initials").eq("id", member.couple_space_id).maybeSingle();
          if (house?.initials && mounted) {
            setInitials(house.initials);
          }
        }
      } catch (err) {
        // ignore
      }
    }

    fetchInitials();

    const t1 = setTimeout(() => setFadeOut(true), 2500);
    const t2 = setTimeout(onDone, 3000);
    return () => {
      mounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute h-32 w-32 rounded-full bg-primary/20 animate-ping" />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full glow-primary"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Heart className="h-10 w-10 text-primary-foreground fill-primary-foreground" />
        </div>
      </div>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight gradient-text">
        LoveNest
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Seu espaço de casal</p>
    </div>
  );
}

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);
  const hide = useCallback(() => setShow(false), []);

  return (
    <>
      {show && <SplashOverlay onDone={hide} />}
      {children}
    </>
  );
}

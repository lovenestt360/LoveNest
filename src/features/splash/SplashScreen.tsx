import { useEffect, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [initials, setInitials] = useState<string | null>(null);
  const [showInitials, setShowInitials] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchInfo() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Try getting initials from space
        const { data: member } = await supabase.from("members").select("couple_space_id").eq("user_id", session.user.id).maybeSingle();
        if (member?.couple_space_id) {
          const { data: house } = await supabase.from("couple_spaces").select("initials, partner1_name, partner2_name").eq("id", member.couple_space_id).maybeSingle();
          if (house && mounted) {
            if (house.initials) {
              setInitials(house.initials);
            } else if (house.partner1_name && house.partner2_name) {
              setInitials(`${house.partner1_name[0]}${house.partner2_name[0]}`);
            }
          }
        } else {
          // Fallback to user's first letter
          const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", session.user.id).maybeSingle();
          if (profile?.display_name && mounted) {
            setInitials(profile.display_name[0].toUpperCase());
          }
        }
      } catch (err) {
        // ignore
      }
    }

    fetchInfo();

    // Sequence for premium feel
    const tInitials = setTimeout(() => setShowInitials(true), 1200);
    const tFade = setTimeout(() => setFadeOut(true), 2800);
    const tDone = setTimeout(onDone, 3300);

    return () => {
      mounted = false;
      clearTimeout(tInitials);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        fadeOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ 
        background: "radial-gradient(circle at center, #1a0a0a 0%, #050505 100%)",
      }}
    >
      {/* Background glow animation */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--tw-gradient-from)_0%,transparent_70%)] from-rose-900/40 animate-pulse pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center scale-100 group">
        {/* Animated Heart with scaling and glow */}
        <div className="relative mb-4 flex h-24 w-24 items-center justify-center animate-in zoom-in duration-1000 ease-out">
          <div className="absolute inset-0 rounded-full bg-rose-600/20 blur-2xl animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-rose-500/10 scale-150 animate-ping opacity-20" />
          
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-[0_0_40px_rgba(225,29,72,0.4)] transition-transform duration-1000 group-hover:scale-110">
            <Heart className="h-10 w-10 text-white fill-white animate-pulse" />
          </div>
        </div>

        <div className="text-center overflow-hidden">
          <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-2xl animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            LoveNest
          </h1>
          
          <div className={`mt-4 transition-all duration-1000 ${showInitials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {initials ? (
              <p className="text-xs font-bold tracking-[0.3em] text-rose-500/80 uppercase">
                {initials.length > 1 ? `${initials[0]} ♥ ${initials[1]}` : initials}
              </p>
            ) : (
              <div className="h-1 w-12 bg-rose-500/30 rounded-full mx-auto animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center animate-in fade-in duration-1000 delay-1000 fill-mode-both">
        <p className="text-[10px] tracking-widest text-zinc-500 font-medium uppercase mb-2">Para Casais Extraordinários</p>
        <div className="h-0.5 w-6 bg-rose-500/20 rounded-full" />
      </div>
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

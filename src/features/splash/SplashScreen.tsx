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

        // Try getting initials from space - refined query
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("couple_space_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (memberError) console.error("Splash: Error fetching member", memberError);

        if (member?.couple_space_id) {
          const { data: house, error: houseError } = await supabase
            .from("couple_spaces")
            .select("initials, partner1_name, partner2_name")
            .eq("id", member.couple_space_id)
            .maybeSingle();

          if (houseError) console.error("Splash: Error fetching house", houseError);

          if (house && mounted) {
            if (house.initials) {
              setInitials(house.initials);
            } else if (house.partner1_name && house.partner2_name) {
              // Construct initials if missing from field
              const i1 = house.partner1_name[0] || "";
              const i2 = house.partner2_name[0] || "";
              setInitials(`${i1}${i2}`);
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
        console.error("Splash: fetchInfo exception", err);
      }
    }

    fetchInfo();

    const tInitials = setTimeout(() => setShowInitials(true), 400);
    const tFade = setTimeout(() => setFadeOut(true), 1600);
    const tDone = setTimeout(onDone, 2200);

    return () => {
      mounted = false;
      clearTimeout(tInitials);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
        fadeOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ 
        background: "radial-gradient(circle at center, #0a0a0a 0%, #000 100%)",
      }}
    >
      {/* Background glow — static, no animation for performance */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center scale-100 group">
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center animate-in zoom-in duration-700 ease-out">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-primary/20 scale-125 animate-ping opacity-10" />
          
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-primary to-[#be123c] shadow-[0_0_50px_rgba(225,29,72,0.4)] transition-all duration-700 group-hover:scale-110">
            <Heart className="h-12 w-12 text-white fill-white animate-pulse" />
          </div>
        </div>

        <div className="text-center overflow-hidden space-y-3">
          <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
            LoveNest
          </h1>
          
          <div className={`transition-all duration-1000 delay-500 ${showInitials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {initials ? (
              <p className="text-sm font-black tracking-[0.4em] text-white/90 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {initials.includes("&") 
                  ? initials.replace("&", "♥") 
                  : (initials.length > 1 ? `${initials[0]} ♥ ${initials[initials.length - 1]}` : initials)}
              </p>
            ) : (
              <div className="h-0.5 w-12 bg-primary/40 rounded-full mx-auto animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center animate-in fade-in duration-1000 delay-700 fill-mode-both">
        <p className="text-[9px] tracking-[0.4em] text-zinc-400 font-black uppercase mb-3">Para Casais Extraordinários</p>
        <div className="h-0.5 w-8 bg-primary/40 rounded-full" />
      </div>
    </div>
  );
}

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem("splash_done"); } catch { return true; }
  });
  const hide = useCallback(() => {
    try { sessionStorage.setItem("splash_done", "1"); } catch { }
    setShow(false);
  }, []);

  return (
    <>
      {show && <SplashOverlay onDone={hide} />}
      {children}
    </>
  );
}

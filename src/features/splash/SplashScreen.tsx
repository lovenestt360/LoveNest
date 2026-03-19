import { useEffect, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [initials, setInitials] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchInfo() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

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
        }
      } catch (err) {
        // ignore
      }
    }

    fetchInfo();

    // Premium sequence
    const tContent = setTimeout(() => setShowContent(true), 400);
    const tFade = setTimeout(() => setFadeOut(true), 2800);
    const tDone = setTimeout(onDone, 3500);

    return () => {
      mounted = false;
      clearTimeout(tContent);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
        fadeOut ? "opacity-0 scale-110 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Dynamic Mesh Background */}
      <div className="bg-mesh" />

      <div className={`relative flex flex-col items-center justify-center transition-all duration-1000 transform ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {/* Apple-style Heart Container */}
        <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-[2.5rem] bg-white/20 backdrop-blur-2xl border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rotate-6 animate-pulse" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white border border-white/50 shadow-2xl transition-transform duration-700 hover:scale-110">
                <Heart className="h-12 w-12 text-primary fill-primary animate-pulse" />
            </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter gradient-text drop-shadow-sm">
            LoveNest
          </h1>
          
          <div className={`transition-all duration-1000 delay-300 ${initials ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[10px] font-black tracking-[0.4em] text-muted-foreground/60 uppercase">
              {initials && initials.length > 1 ? `${initials[0]} ♥ ${initials[1]}` : (initials || "")}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center opacity-40">
        <p className="text-[9px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-3">Para Casais Extraordinários</p>
        <div className="h-0.5 w-8 bg-primary/20 rounded-full" />
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

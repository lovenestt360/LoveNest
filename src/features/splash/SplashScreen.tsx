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
            const hInitials = house.initials?.trim();
            if (hInitials) {
              setInitials(hInitials);
            } else if (house.partner1_name || house.partner2_name) {
              // Construct initials if missing from field
              const i1 = house.partner1_name?.[0] || "";
              const i2 = house.partner2_name?.[0] || "";
              setInitials(`${i1}${i2}`.toUpperCase());
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

    // Sequence for premium feel - adjusted timings for better perceived performance
    const tInitials = setTimeout(() => setShowInitials(true), 800);
    const tFade = setTimeout(() => setFadeOut(true), 2500);
    const tDone = setTimeout(onDone, 3200);

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
        fadeOut ? "opacity-0 scale-110 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ 
        background: "radial-gradient(circle at center, #fdf2f8 0%, #fff 100%)",
      }}
    >
      {/* Premium Background Mesh */}
      <div className="bg-mesh opacity-30" />

      <div className="relative flex flex-col items-center justify-center scale-100 group">
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center animate-in zoom-in duration-1000 ease-out">
          <div className="absolute inset-0 rounded-[2.5rem] bg-primary/30 blur-3xl animate-pulse" />
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-primary/20 scale-150 animate-ping opacity-5" />
          
          {/* Replaced the single heart with initials and heart */}
          <div className="flex items-center justify-center">
            <div className="relative h-20 w-20 overflow-hidden transform hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 rounded-[2.5rem] bg-white/40 border border-white/50 backdrop-blur-md shadow-2xl" />
              <div className="relative flex h-full w-full items-center justify-center p-4">
                <span className="text-4xl font-black text-rose-500">{initials?.[0] || "L"}</span>
              </div>
            </div>
            <div className="h-10 w-10 flex items-center justify-center -mx-2 z-10">
              <Heart className="h-10 w-10 text-rose-500 fill-rose-500 animate-heart-beat shadow-glow-sm" />
            </div>
            <div className="relative h-20 w-20 overflow-hidden transform hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 rounded-[2.5rem] bg-white/40 border border-white/50 backdrop-blur-md shadow-2xl" />
              <div className="relative flex h-full w-full items-center justify-center p-4">
                <span className="text-4xl font-black text-rose-500 tracking-tighter">{initials?.[1] || "N"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center overflow-hidden space-y-4">
          <h1 className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">
            LoveNest
          </h1>
          
          <div className={`transition-all duration-1000 delay-700 ${showInitials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {initials ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/10 px-6 py-2 rounded-2xl shadow-xl inline-block">
                <p className="text-sm font-black tracking-[0.5em] text-white uppercase drop-shadow">
                  {initials.length > 1 ? `${initials[0]} ❤️ ${initials[initials.length - 1]}` : initials}
                </p>
              </div>
            ) : (
              <div className="h-1 w-16 bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-full mx-auto animate-pulse" />
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
  const [show, setShow] = useState(true);
  const hide = useCallback(() => setShow(false), []);

  return (
    <>
      {show && <SplashOverlay onDone={hide} />}
      {children}
    </>
  );
}

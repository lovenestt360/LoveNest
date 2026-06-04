import { useEffect, useState, useCallback } from "react";
import { LogoIcon } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [visible, setVisible]         = useState(true);
  const [showSub, setShowSub]         = useState(false);
  const [initials, setInitials]       = useState<string | null>(null);
  const [showInitials, setShowInitials] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchInitials() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: member } = await supabase
          .from("members")
          .select("couple_space_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (member?.couple_space_id) {
          const { data: house } = await supabase
            .from("couple_spaces")
            .select("initials, partner1_name, partner2_name")
            .eq("id", member.couple_space_id)
            .maybeSingle();

          if (house && mounted) {
            if (house.initials) {
              setInitials(house.initials);
            } else if (house.partner1_name && house.partner2_name) {
              setInitials(`${house.partner1_name[0]}${house.partner2_name[0]}`);
            }
          }
        }
      } catch {}
    }

    fetchInitials();

    const t1 = setTimeout(() => setShowSub(true), 350);
    const t2 = setTimeout(() => setShowInitials(true), 600);
    const t3 = setTimeout(() => setVisible(false), 1800);
    const t4 = setTimeout(onDone, 2400);

    return () => {
      mounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Logo — subtle breathing scale */}
      <div
        className="flex flex-col items-center gap-5"
        style={{ animation: "splash-breathe 3s ease-in-out infinite" }}
      >
        <LogoIcon size={88} />

        {/* Wordmark */}
        <div className="text-center space-y-1.5">
          <h1
            className={`text-[22px] font-bold tracking-tight text-[#0B1324] transition-all duration-500 ${
              showSub ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            LoveNest
          </h1>
          <p
            className={`text-[12px] text-[#999] leading-snug transition-all duration-500 delay-100 ${
              showSub ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            O amor também vive nos dias comuns.
          </p>
        </div>
      </div>

      {/* Couple initials — personal touch, low priority */}
      {initials && (
        <div
          className={`absolute bottom-16 text-center transition-all duration-700 ${
            showInitials ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-[11px] text-[#ccc] font-semibold tracking-[0.3em] uppercase">
            {initials.length >= 2
              ? `${initials[0]} · ${initials[initials.length - 1]}`
              : initials}
          </p>
        </div>
      )}

      <style>{`
        @keyframes splash-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(0.982); }
        }
      `}</style>
    </div>
  );
}

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem("splash_done"); } catch { return true; }
  });

  const hide = useCallback(() => {
    try { sessionStorage.setItem("splash_done", "1"); } catch {}
    setShow(false);
  }, []);

  return (
    <>
      {show && <SplashOverlay onDone={hide} />}
      {children}
    </>
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── SplashOverlay ─────────────────────────────────────────────────────────────
//
// Performance rules (iPhone 7 / low-end Safari):
//   - PNG instead of SVG component — SVG masks unreliable on old WebKit
//   - No blur-3xl (expensive GPU filter)
//   - No animate-ping (causes repaints every frame)
//   - Only opacity + transform transitions (compositor-only, cheap)
//   - will-change: opacity on the outer container
//   - No simultaneous competing animations
//
// Timing:
//   0ms   → logo fades in
//   500ms → wordmark appears
//   900ms → initials appear
//   2800ms → begin fade out
//   3400ms → onDone (children mount)

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  // 0 = logo in, 1 = text in, 2 = initials in, 3 = fading out
  const [initials, setInitials]   = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Fetch couple initials — fail silently, never block splash
    async function fetchInitials() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) return;

        const { data: member } = await supabase
          .from("members")
          .select("couple_space_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!member?.couple_space_id || !mounted) return;

        const { data: house } = await supabase
          .from("couple_spaces")
          .select("initials, partner1_name, partner2_name")
          .eq("id", member.couple_space_id)
          .maybeSingle();

        if (!house || !mounted) return;

        if (house.initials) {
          setInitials(house.initials);
        } else if (house.partner1_name && house.partner2_name) {
          setInitials(`${house.partner1_name[0]}${house.partner2_name[0]}`);
        }
      } catch {
        // Fail silently — never break splash
      }
    }

    fetchInitials();

    // Sequential stage progression
    const t1 = setTimeout(() => mounted && setStage(1), 500);
    const t2 = setTimeout(() => mounted && setStage(2), 900);
    const t3 = setTimeout(() => mounted && setStage(3), 2800);
    const t4 = setTimeout(onDone, 3400);

    return () => {
      mounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onDone]);

  const formatInitials = (s: string) => {
    if (s.length >= 2) return `${s[0]} ♥ ${s[s.length - 1]}`;
    return s;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        willChange: "opacity",
        transition: "opacity 600ms ease-in-out",
        opacity: stage === 3 ? 0 : 1,
        pointerEvents: stage === 3 ? "none" : "auto",
      }}
    >

      {/* Logo + wordmark */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        position: "relative",
      }}>
        {/* PNG icon — universally compatible */}
        <div style={{
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
          opacity: stage >= 0 ? 1 : 0,
          transform: stage >= 0 ? "scale(1)" : "scale(0.88)",
        }}>
          <img
            src="/icon-512.png"
            alt="LoveNest"
            width={96}
            height={96}
            style={{ borderRadius: 22, display: "block" }}
          />
        </div>

        {/* Wordmark */}
        <div style={{
          textAlign: "center",
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "translateY(0)" : "translateY(8px)",
        }}>
          <h1 style={{
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#ffffff",
            margin: 0,
            lineHeight: 1,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            LoveNest
          </h1>
        </div>
      </div>

      {/* Couple initials */}
      <div style={{
        position: "absolute",
        bottom: 64,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        transition: "opacity 700ms ease-out",
        opacity: stage >= 2 && initials ? 1 : 0,
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.4em",
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {initials ? formatInitials(initials) : ""}
        </p>
        <div style={{
          width: 32,
          height: 2,
          borderRadius: 1,
          background: "rgba(244,63,94,0.35)",
        }} />
      </div>

      {/* Bottom label */}
      <div style={{
        position: "absolute",
        bottom: 40,
        transition: "opacity 700ms ease-out",
        opacity: stage >= 2 && !initials ? 1 : 0,
      }}>
        <p style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.4em",
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          Para Casais Extraordinários
        </p>
      </div>
    </div>
  );
}

// ── SplashGate ────────────────────────────────────────────────────────────────

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

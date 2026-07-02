import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// ── SplashOverlay ─────────────────────────────────────────────────────────────
//
// Timing:
//   0ms   → logo fade in
//   500ms → wordmark aparece
//   900ms → iniciais aparecem
//   2800ms → começa fade out
//   3400ms → onDone

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [stage, setStage]     = useState<0 | 1 | 2 | 3>(0);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

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
      } catch { /* fail silently */ }
    }

    fetchInitials();

    const t1 = setTimeout(() => mounted && setStage(1), 500);
    const t2 = setTimeout(() => mounted && setStage(2), 900);
    const t3 = setTimeout(() => mounted && setStage(3), 2800);
    const t4 = setTimeout(onDone, 3400);

    return () => {
      mounted = false;
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [onDone]);

  const formatInitials = (s: string) => {
    if (s.length >= 2) return `${s[0]} ♥ ${s[s.length - 1]}`;
    return s;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#000000",
      transition: "opacity 600ms ease-in-out",
      opacity: stage === 3 ? 0 : 1,
      pointerEvents: stage === 3 ? "none" : "auto",
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
          opacity: stage >= 0 ? 1 : 0,
          transform: stage >= 0 ? "scale(1)" : "scale(0.88)",
        }}>
          <img src="/icon-512.png" alt="LoveNest" width={96} height={96}
            style={{ borderRadius: 22, display: "block" }} />
        </div>
        <div style={{
          textAlign: "center",
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "translateY(0)" : "translateY(8px)",
        }}>
          <h1 style={{
            fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em",
            color: "#ffffff", margin: 0, lineHeight: 1,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>LoveNest</h1>
        </div>
      </div>

      {/* Iniciais do casal — cada caracter anima individualmente */}
      {stage >= 2 && initials && (
        <div style={{
          position: "absolute", bottom: 64,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {formatInitials(initials).split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 18, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.45,
                  delay: 0.08 * i,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                style={{
                  fontSize: char === " " ? 14 : 28,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: char === "♥" ? "rgba(244,63,94,0.9)" : "rgba(255,255,255,0.92)",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  display: "inline-block",
                  minWidth: char === " " ? 8 : undefined,
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            style={{ width: 40, height: 2, borderRadius: 1, background: "rgba(244,63,94,0.5)", transformOrigin: "center" }}
          />
        </div>
      )}

      {/* Tagline quando sem iniciais */}
      <div style={{
        position: "absolute", bottom: 40,
        transition: "opacity 700ms ease-out",
        opacity: stage >= 2 && !initials ? 1 : 0,
      }}>
        <p style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.4em",
          color: "rgba(255,255,255,0.3)", textTransform: "uppercase", margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>Para Casais Extraordinários</p>
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

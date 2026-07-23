import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Keyframes injectadas uma vez — sem framer-motion
const SPLASH_CSS = `
@keyframes ln-pop{from{opacity:0;transform:translateY(18px) scale(.7)}to{opacity:1;transform:none}}
@keyframes ln-line{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
`;

// ── SplashOverlay ─────────────────────────────────────────────────────────────
//
// Timing:
//   0ms   → logo visível
//   300ms → wordmark aparece
//   600ms → iniciais aparecem
//   1600ms → começa fade out
//   2200ms → onDone

function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [stage, setStage]       = useState<0 | 1 | 2 | 3>(0);
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1 query com join em vez de 3 sequenciais
    async function fetchInitials() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) return;

        const { data: member } = await supabase
          .from("members")
          .select("couple_spaces(initials, partner1_name, partner2_name)")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!member || !mounted) return;
        const house = (member as any)?.couple_spaces;
        if (!house) return;

        if (house.initials) {
          setInitials(house.initials);
        } else if (house.partner1_name && house.partner2_name) {
          setInitials(`${house.partner1_name[0]}${house.partner2_name[0]}`);
        }
      } catch { /* fail silently */ }
    }

    fetchInitials();

    const t1 = setTimeout(() => mounted && setStage(1), 300);
    const t2 = setTimeout(() => mounted && setStage(2), 600);
    const t3 = setTimeout(() => mounted && setStage(3), 1600);
    const t4 = setTimeout(onDone, 2200);

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
    <>
      <style>{SPLASH_CSS}</style>
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

        {/* Iniciais do casal — animação CSS pura */}
        {stage >= 2 && initials && (
          <div style={{
            position: "absolute", bottom: 64,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {formatInitials(initials).split("").map((char, i) => (
                <span
                  key={i}
                  style={{
                    animation: `ln-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${0.08 * i}s both`,
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
                </span>
              ))}
            </div>
            <div style={{
              animation: "ln-line 0.5s ease-out 0.4s both",
              width: 40, height: 2, borderRadius: 1,
              background: "rgba(244,63,94,0.5)", transformOrigin: "center",
            }} />
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
    </>
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

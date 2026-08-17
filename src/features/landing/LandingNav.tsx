import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "@/components/Logo";

// Nav transitions: transparent with white text (over dark hero) → frosted white.
// LogoMark SVG uses pink+blue — legible on both dark and light backgrounds.

export function LandingNav() {
  const { scrollY } = useScroll();
  const navigate = useNavigate();

  const bgOpacity    = useTransform(scrollY, [0, 100], [0, 0.92]);
  const borderOp     = useTransform(scrollY, [60, 120], [0, 1]);
  const textOpDark   = useTransform(scrollY, [60, 120], [1, 0]);   // white, fades out
  const textOpLight  = useTransform(scrollY, [60, 120], [0, 1]);   // navy, fades in

  return (
    <motion.header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      }}
      aria-label="Navegação principal"
    >
      {/* White layer */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute", inset: 0,
          background: "rgb(255,255,255)", opacity: bgOpacity, pointerEvents: "none",
        }}
      />
      {/* Bottom border */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 1, background: "rgb(240,240,240)", opacity: borderOp, pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative", zIndex: 1,
          maxWidth: 1200, margin: "0 auto", padding: "0 24px",
          height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoMark size={24} />
          <div style={{ position: "relative" }}>
            {/* White text over dark hero */}
            <motion.span
              aria-hidden
              style={{
                position: "absolute", inset: 0,
                fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em",
                color: "white", whiteSpace: "nowrap",
                opacity: textOpDark,
              }}
            >
              LoveNest
            </motion.span>
            {/* Navy text over white nav */}
            <motion.span
              style={{
                display: "block",
                fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em",
                color: "#0B1324", whiteSpace: "nowrap",
                opacity: textOpLight,
              }}
            >
              LoveNest
            </motion.span>
          </div>
        </div>

        {/* Entrar */}
        <div style={{ position: "relative" }}>
          <motion.button
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              fontSize: 13, fontWeight: 600, background: "none", border: "none",
              cursor: "pointer", color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap", opacity: textOpDark,
            }}
            tabIndex={-1}
          >
            Entrar
          </motion.button>
          <motion.button
            onClick={() => navigate("/entrar?returning=1")}
            style={{
              display: "block",
              fontSize: 13, fontWeight: 600, background: "none", border: "none",
              cursor: "pointer", color: "rgba(11,19,36,0.55)",
              whiteSpace: "nowrap", opacity: textOpLight,
            }}
          >
            Entrar
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

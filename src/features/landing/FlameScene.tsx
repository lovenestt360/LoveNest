import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { FlamePet } from "@/components/FlamePet";
import type { FlameStage } from "@/types/flame";

const PINK = "#E0637A";
const NAVY = "#0B1324";

function useMediaQuery(query: string): boolean {
  const [m, setM] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
}

// Stage progression: scroll drives the narrative arc brasa → chama → guardiao
function resolveStage(pv: number): FlameStage {
  if (pv >= 0.58) return "guardiao";
  if (pv >= 0.40) return "chama";
  return "brasa";
}

// ── Reduced motion fallback ─────────────────────────────────────────────────────

function FlameSceneReduced() {
  return (
    <section style={{ background: NAVY, padding: "80px 0 100px", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 50% at 50% 36%, ${PINK}26 0%, transparent 68%)`,
      }} />
      <div style={{
        maxWidth: 860, margin: "0 auto", padding: "0 7%",
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 36,
      }}>
        {/* Chama */}
        <div style={{ width: 200, height: 266, margin: "0 auto", display: "block" }}>
          <FlamePet stage="guardiao" mood="apaixonado" environment="noite" compact
            personalization={{ auraColor: PINK }} />
        </div>

        <p style={{
          fontSize: "clamp(15px, 1.8vw, 22px)", fontWeight: 600,
          color: "rgba(255,255,255,0.58)", letterSpacing: "-0.01em",
          lineHeight: 1.45, margin: 0, maxWidth: "34ch",
        }}>
          Algumas coisas precisam de cuidado<br />para continuar vivas.
        </p>

        <p style={{
          fontSize: "clamp(36px, 5.5vw, 76px)", fontWeight: 900,
          color: "white", letterSpacing: "-0.04em", lineHeight: 1.00,
          margin: 0, textShadow: `0 0 60px ${PINK}55`,
        }}>
          A Vossa Chama
        </p>

        <p style={{
          fontSize: "clamp(14px, 1.6vw, 22px)", fontWeight: 600,
          color: "rgba(255,255,255,0.52)", letterSpacing: "-0.01em",
          lineHeight: 1.4, margin: 0, maxWidth: "32ch",
        }}>
          Pequenos gestos mantêm o que importa aceso.
        </p>
      </div>
    </section>
  );
}

// ── Animated component ──────────────────────────────────────────────────────────

function FlameAnimated() {
  const outerRef = useRef<HTMLDivElement>(null);
  const isMob = useMediaQuery("(max-width: 767px)");
  const [stage, setStage] = useState<FlameStage>("brasa");
  const [stageOpacity, setStageOpacity] = useState(1);
  const stageInitRef = useRef(true);

  // Softens the PNG swap when stage changes — feels like evolution, not a cut
  useLayoutEffect(() => {
    if (stageInitRef.current) { stageInitRef.current = false; return; }
    setStageOpacity(0.80);
    const t = setTimeout(() => setStageOpacity(1), 220);
    return () => clearTimeout(t);
  }, [stage]);

  const { scrollYProgress: p } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // Discrete stage updates as the user scrolls through the scene
  useMotionValueEvent(p, "change", (v) => {
    const next = resolveStage(v);
    setStage(prev => (prev === next ? prev : next));
  });

  // ─── Atmospheric glow (rose) — starts at 0.25 to pick up from Cena 04 glow ─
  const atmOp    = useTransform(p, [0.00, 0.10, 0.88, 1.00], [0.25, 0.80, 0.80, 0.42]);
  const atmScale = useTransform(p, [0.00, 0.20, 0.72, 1.00], [0.80, 1.10, 1.32, 1.68]);

  // Secondary warm glow — emerges at climax, subtle
  const warmOp   = useTransform(p, [0.52, 0.68, 0.88, 1.00], [0, 0.28, 0.28, 0.12]);

  // ─── FlamePet ─────────────────────────────────────────────────────────────
  const petOp     = useTransform(p, [0.04, 0.18, 0.94, 1.00], [0, 1, 1, 0.72]);
  const petSc_r   = useTransform(p, [0.04, 0.18, 0.62, 0.80, 0.92], [0.72, 1, 1, 1.06, 0.96]);
  const petScale  = useSpring(petSc_r, { stiffness: 40, damping: 18 });
  const petY_r    = useTransform(p, [0.04, 0.18], [44, 0]);
  const petY      = useSpring(petY_r, { stiffness: 44, damping: 20 });

  // ─── Texts ────────────────────────────────────────────────────────────────
  // phrase1: appears while flame breathes, before headline
  const ph1Op = useTransform(p, [0.26, 0.36, 0.52, 0.62], [0, 1, 1, 0]);
  const ph1Y  = useTransform(p, [0.26, 0.36], [14, 0]);

  // headline "A Vossa Chama" — appears at climax
  const hlOp  = useTransform(p, [0.58, 0.68, 0.90, 0.96], [0, 1, 1, 0]);
  const hlY   = useTransform(p, [0.58, 0.68], [16, 0]);

  // phrase2 — support text after headline establishes
  const ph2Op = useTransform(p, [0.80, 0.90, 0.98, 1.00], [0, 1, 1, 0.72]);
  const ph2Y  = useTransform(p, [0.80, 0.90], [14, 0]);

  // ─── Exit glow — bridge to ManifestoScene ─────────────────────────────────
  const exitOp    = useTransform(p, [0.90, 1.00], [0, 0.88]);
  const exitScale = useTransform(p, [0.90, 1.00], [0.50, 2.40]);

  const sceneH  = isMob ? "180vh" : "280vh";
  const flameW  = isMob ? "min(60vw, 240px)" : "256px";
  const flameH  = isMob ? "min(80vw, 320px)" : "340px";
  const flameTop = isMob ? "44%" : "43%";

  // Text bottom offsets — headline higher, phrase2 below
  const hlBottom  = isMob ? "clamp(100px, 18vh, 120px)" : "clamp(96px, 14vh, 130px)";
  const ph2Bottom = isMob ? "clamp(58px, 10vh, 76px)"  : "clamp(56px, 8vh,  82px)";

  return (
    <section
      ref={outerRef}
      style={{ height: sceneH, position: "relative" }}
      aria-label="A Vossa Chama"
    >
      <div style={{
        position: "sticky", top: 0,
        height: "100dvh",
        background: NAVY,
        overflow: "hidden",
      }}>

        {/* ── Main atmospheric glow — large rose radial ── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 1, pointerEvents: "none",
            left: "50%", top: flameTop,
            width:  "clamp(320px, 72vw, 720px)",
            height: "clamp(320px, 72vw, 720px)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${PINK}2e 0%, ${PINK}12 44%, transparent 70%)`,
            opacity: atmOp,
            scale:   atmScale,
            x: "-50%",
            y: "-50%",
          }}
        />

        {/* ── Secondary warm glow — climax boost ── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 1, pointerEvents: "none",
            left: "50%", top: flameTop,
            width:  "clamp(200px, 48vw, 480px)",
            height: "clamp(200px, 48vw, 480px)",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(232,137,90,0.20) 0%, transparent 65%)`,
            opacity: warmOp,
            x: "-50%",
            y: "-50%",
          }}
        />

        {/* ── Top/bottom gradient for legibility ── */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: `linear-gradient(to bottom, ${NAVY} 0%, ${NAVY}cc 8%, transparent 20%, transparent 78%, ${NAVY}cc 92%, ${NAVY} 100%)`,
        }} />

        {/* ── FlamePet — centered, compact mode (transparent bg + thumb PNG + PINK aura) ── */}
        <div style={{
          position: "absolute", zIndex: 3,
          left: "50%", top: flameTop,
          transform: "translate(-50%, -50%)",
        }}>
          <motion.div style={{ opacity: petOp, scale: petScale, y: petY }}>
            <div style={{
              width: flameW, height: flameH,
              opacity: stageOpacity,
              transition: "opacity 180ms ease-in-out",
            }}>
              <FlamePet
                stage={stage}
                mood="apaixonado"
                environment="noite"
                compact
                personalization={{ auraColor: PINK }}
              />
            </div>
          </motion.div>
        </div>

        {/* ── phrase1 — top area, before headline ── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          top: "clamp(44px, 7vh, 70px)", left: "7%",
        }}>
          <motion.p style={{
            opacity: ph1Op, y: ph1Y,
            fontSize: isMob ? "clamp(15px, 4.2vw, 22px)" : "clamp(16px, 1.8vw, 26px)",
            fontWeight: 600, color: "rgba(255,255,255,0.56)",
            letterSpacing: "-0.01em", lineHeight: 1.46,
            margin: 0, maxWidth: "32ch",
            textShadow: "0 2px 20px rgba(0,0,0,0.62)",
          }}>
            Algumas coisas precisam de cuidado<br />para continuar vivas.
          </motion.p>
        </div>

        {/* ── Headline "A Vossa Chama" — bottom area, higher ── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          bottom: hlBottom, left: "7%",
        }}>
          <motion.p style={{
            opacity: hlOp, y: hlY,
            fontSize: isMob ? "clamp(36px, 10.5vw, 52px)" : "clamp(44px, 5.8vw, 86px)",
            fontWeight: 900, color: "white",
            letterSpacing: "-0.04em", lineHeight: 1.00,
            margin: 0,
            textShadow: `0 2px 48px ${PINK}55, 0 0 80px ${PINK}28`,
          }}>
            A Vossa Chama
          </motion.p>
        </div>

        {/* ── phrase2 — bottom area, below headline ── */}
        <div style={{
          position: "absolute", zIndex: 5, pointerEvents: "none",
          bottom: ph2Bottom, left: "7%",
        }}>
          <motion.p style={{
            opacity: ph2Op, y: ph2Y,
            fontSize: isMob ? "clamp(13px, 3.8vw, 19px)" : "clamp(14px, 1.5vw, 21px)",
            fontWeight: 600, color: "rgba(255,255,255,0.52)",
            letterSpacing: "-0.005em", lineHeight: 1.45,
            margin: 0, maxWidth: "30ch",
            textShadow: "0 2px 16px rgba(0,0,0,0.52)",
          }}>
            Pequenos gestos mantêm o que importa aceso.
          </motion.p>
        </div>

        {/* ── Exit glow — transition to ManifestoScene ── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 4, pointerEvents: "none",
            left: "50%", top: "50%",
            width:  "clamp(260px, 50vw, 560px)",
            height: "clamp(260px, 50vw, 560px)",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,255,255,0.10) 0%, ${PINK}20 30%, transparent 65%)`,
            opacity: exitOp,
            scale:   exitScale,
            x: "-50%",
            y: "-50%",
          }}
        />

      </div>
    </section>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────────

export function FlameScene() {
  const reduced = useReducedMotion();
  const isMob = useMediaQuery("(max-width: 767px)");
  if (reduced || isMob) return <FlameSceneReduced />;
  return <FlameAnimated />;
}

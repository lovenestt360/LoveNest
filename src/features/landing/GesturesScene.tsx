import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Flame, Heart } from "lucide-react";

const PINK  = "#E0637A";
const NAVY  = "#0B1324";
const CREAM = "#FAF9F7";

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

// ── Reusable pieces ────────────────────────────────────────────────────────────

// Pure HTML/CSS chat bubble — no text embedded in images
function ChatBubble({ text, me, heart }: { text: string; me?: boolean; heart?: boolean }) {
  return (
    <div style={{
      background: me ? PINK : "rgba(255,255,255,0.94)",
      backdropFilter: me ? undefined : "blur(16px)",
      WebkitBackdropFilter: me ? undefined : "blur(16px)",
      color: me ? "white" : NAVY,
      padding: "10px 14px",
      borderRadius: me ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      fontSize: 13, fontWeight: 500, lineHeight: 1.4,
      boxShadow: "0 4px 24px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.10)",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      {text}
      {heart && (
        <Heart style={{ width: 11, height: 11, fill: "rgba(255,255,255,0.75)", color: "transparent", flexShrink: 0 }} />
      )}
    </div>
  );
}

// Floating polaroid-style memory card
function MemoryCard() {
  return (
    <div style={{
      width: 108, height: 86,
      borderRadius: 6,
      overflow: "hidden",
      boxShadow: "0 10px 32px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.18), 0 0 0 3px rgba(255,255,255,0.88)",
      background: "#c8bfb7",
      // VIDEO SLOT — future: replace with couple-specific memory asset
    }}>
      <picture>
        <source type="image/webp" srcSet="/safe-768.webp" sizes="120px" />
        <img
          src="/safe.jpg" alt="" aria-hidden loading="lazy" decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
      </picture>
    </div>
  );
}

// Streak flame badge
function FlameIndicator() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "rgba(255,255,255,0.10)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      borderRadius: 22, padding: "8px 14px",
      border: "1px solid rgba(255,255,255,0.14)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: `${PINK}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Flame style={{ width: 14, height: 14, color: PINK }} strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.48)", margin: 0, fontWeight: 600, letterSpacing: "0.04em" }}>JORNADA</p>
        <p style={{ fontSize: 12, color: "white", margin: 0, fontWeight: 700 }}>14 dias juntos</p>
      </div>
    </div>
  );
}

// ── Phone ─────────────────────────────────────────────────────────────────────

function GesturesPhoneScreen() {
  return (
    <div style={{ background: CREAM, padding: "44px 14px 14px", position: "relative" }}>
      {/* Notch */}
      <div aria-hidden style={{
        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
        width: 68, height: 18, background: "#000", borderRadius: 10,
      }} />
      <p style={{ fontSize: 10, color: "#aaa", margin: "0 0 2px" }}>Bom dia</p>
      <p style={{ fontSize: 15, fontWeight: 900, color: NAVY, margin: "0 0 13px", letterSpacing: "-0.02em" }}>O vosso dia</p>

      {/* Streak */}
      <div style={{ background: "white", borderRadius: 14, padding: "10px 12px", marginBottom: 8, boxShadow: "0 2px 8px rgba(11,19,36,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${PINK}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flame style={{ width: 13, height: 13, color: PINK }} strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, color: "#aaa", margin: 0 }}>Jornada</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>14 dias juntos</p>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "3px 7px", borderRadius: 999, background: `${PINK}15`, color: PINK }}>Ambos</span>
        </div>
      </div>

      {/* Chat — mirrors the floating narrative bubbles */}
      <div style={{ background: "white", borderRadius: 14, padding: "10px 12px", boxShadow: "0 2px 8px rgba(11,19,36,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
          <div style={{ maxWidth: "80%", padding: "6px 10px", borderRadius: "12px 12px 12px 3px", background: "#f3f3f3", color: NAVY, fontSize: 10, lineHeight: 1.5 }}>
            Chegaste bem?
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ maxWidth: "80%", padding: "6px 10px", borderRadius: "12px 12px 3px 12px", background: PINK, color: "white", fontSize: 10, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 4 }}>
            Estou a caminho
            <Heart style={{ width: 8, height: 8, fill: "rgba(255,255,255,0.70)", color: "transparent", flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GesturesPhone({ isMob }: { isMob: boolean }) {
  return (
    <div
      style={{
        width: isMob ? "min(80vw, 300px)" : "clamp(180px, 20vw, 240px)",
        borderRadius: 40, background: NAVY, overflow: "hidden",
        boxShadow: "0 40px 90px rgba(11,19,36,0.50), 0 0 0 1px rgba(255,255,255,0.08)",
      }}
      aria-label="Pré-visualização da aplicação LoveNest"
    >
      <GesturesPhoneScreen />
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", background: CREAM }}>
        <div aria-hidden style={{ width: 80, height: 4, borderRadius: 2, background: "#ddd" }} />
      </div>
    </div>
  );
}

// ── Reduced-motion fallback ───────────────────────────────────────────────────

function GesturesReduced() {
  return (
    <section style={{ background: NAVY, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <picture>
          <source type="image/webp" srcSet="/gestures-768.webp 768w, /gestures-1280.webp 1280w" sizes="100vw" />
          <img src="/gestures.jpg" alt="" aria-hidden loading="lazy" decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%", opacity: 0.35 }} />
        </picture>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, ${NAVY}f0 0%, ${NAVY}a0 60%, ${NAVY}70 100%)` }} />
      </div>
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1200, margin: "0 auto",
        padding: "88px clamp(24px, 7%, 80px)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 56, alignItems: "center",
      }}>
        <div>
          <h2 style={{ fontSize: "clamp(30px, 4.5vw, 56px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: "-0.025em", color: "white", marginTop: 0, marginBottom: 12 }}>
            Pequenos gestos.
          </h2>
          <p style={{ fontSize: "clamp(16px, 1.6vw, 22px)", fontWeight: 700, color: "rgba(255,255,255,0.70)", margin: "0 0 24px" }}>
            Que dizem 'estou aqui'.
          </p>
          <p style={{ fontSize: "clamp(14px, 1.3vw, 17px)", lineHeight: 1.72, color: "rgba(255,255,255,0.48)", margin: 0, maxWidth: 440 }}>
            Uma mensagem. Uma fotografia. Um dia registado. É assim que o amor permanece vivo nos dias comuns.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <GesturesPhone isMob={false} />
        </div>
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function GesturesScene() {
  const reduced      = useReducedMotion();
  const isMob        = useMediaQuery("(max-width: 767px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: p } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Desktop transforms — 300vh container, 200vh effective scroll ────────────

  // Background: slow scale throughout
  const D_imgScale   = useTransform(p, [0, 1],                       [1, 1.10]);
  // Headline: fades in → stays → dims when phone takes over → reasserts at closing
  const D_hlOp       = useTransform(p, [0, 0.08, 0.72, 0.82, 0.92, 1], [0, 1, 1, 0.22, 0.88, 1]);
  const D_hlY        = useTransform(p, [0, 0.10],                    [20, 0]);
  // Sub-line "Que dizem 'estou aqui'." — appears only at the closing
  const D_subOp      = useTransform(p, [0.90, 0.97],                 [0, 1]);
  const D_subY       = useTransform(p, [0.90, 0.98],                 [12, 0]);
  // Message 1: slides in from left, dims (stays in bg) when phone takes over
  const D_m1Op       = useTransform(p, [0.18, 0.27, 0.68, 0.80],    [0, 1, 1, 0.24]);
  const D_m1X        = useTransform(p, [0.18, 0.28],                 [-60, 0]);
  // Photo: parallax float + fade
  const D_photoOp    = useTransform(p, [0.33, 0.43, 0.80, 0.89],    [0, 1, 1, 0]);
  const D_photoY     = useTransform(p, [0, 1],                       [0, -44]);  // slow upward drift
  // Flame: appears, stays, fades before phone dominates
  const D_flameOp    = useTransform(p, [0.48, 0.57, 0.80, 0.89],    [0, 1, 1, 0]);
  const D_flameScale = useTransform(p, [0.48, 0.58],                 [0.80, 1]);
  // Message 2: slides in from right, stays visible through closing
  const D_m2Op       = useTransform(p, [0.63, 0.72],                 [0, 1]);
  const D_m2X        = useTransform(p, [0.63, 0.73],                 [60, 0]);
  // Phone: rises up, grows to fill space
  const D_phoneOp    = useTransform(p, [0.76, 0.87],                 [0, 1]);
  const D_phoneY     = useTransform(p, [0.76, 0.89],                 [80, 0]);
  const D_phoneScale = useTransform(p, [0.76, 0.95],                 [0.88, 1]);

  // ── Mobile transforms — 210vh container, 110vh effective scroll ─────────────
  // Elements appear/disappear sequentially to avoid clutter on small screens

  const M_imgScale   = useTransform(p, [0, 1],                       [1, 1.07]);
  const M_hlOp       = useTransform(p, [0, 0.08],                    [0, 1]);
  const M_hlY        = useTransform(p, [0, 0.10],                    [18, 0]);
  const M_subOp      = useTransform(p, [0.90, 0.97],                 [0, 1]);
  const M_subY       = useTransform(p, [0.90, 0.98],                 [12, 0]);
  // Each element fades IN then OUT before next appears
  const M_m1Op       = useTransform(p, [0.18, 0.27, 0.46, 0.54],    [0, 1, 1, 0]);
  const M_m1X        = useTransform(p, [0.18, 0.28],                 [-50, 0]);
  const M_photoOp    = useTransform(p, [0.33, 0.42, 0.58, 0.66],    [0, 1, 1, 0]);
  const M_photoY     = useTransform(p, [0, 1],                       [0, -22]);
  const M_flameOp    = useTransform(p, [0.48, 0.57, 0.66, 0.74],    [0, 1, 1, 0]);
  const M_flameScale = useTransform(p, [0.48, 0.58],                 [0.80, 1]);
  const M_m2Op       = useTransform(p, [0.62, 0.71, 0.78, 0.86],    [0, 1, 1, 0]);
  const M_m2X        = useTransform(p, [0.62, 0.72],                 [50, 0]);
  const M_phoneOp    = useTransform(p, [0.78, 0.88],                 [0, 1]);
  const M_phoneY     = useTransform(p, [0.78, 0.90],                 [70, 0]);
  const M_phoneScale = useTransform(p, [0.78, 0.95],                 [0.90, 1]);

  // Pick active transform set
  const imgScale   = isMob ? M_imgScale   : D_imgScale;
  const hlOp       = isMob ? M_hlOp       : D_hlOp;
  const hlY        = isMob ? M_hlY        : D_hlY;
  const subOp      = isMob ? M_subOp      : D_subOp;
  const subY       = isMob ? M_subY       : D_subY;
  const m1Op       = isMob ? M_m1Op       : D_m1Op;
  const m1X        = isMob ? M_m1X        : D_m1X;
  const photoOp    = isMob ? M_photoOp    : D_photoOp;
  const photoY     = isMob ? M_photoY     : D_photoY;
  const flameOp    = isMob ? M_flameOp    : D_flameOp;
  const flameScale = isMob ? M_flameScale : D_flameScale;
  const m2Op       = isMob ? M_m2Op       : D_m2Op;
  const m2X        = isMob ? M_m2X        : D_m2X;
  const phoneOp    = isMob ? M_phoneOp    : D_phoneOp;
  const phoneY     = isMob ? M_phoneY     : D_phoneY;
  const phoneScale = isMob ? M_phoneScale : D_phoneScale;

  if (reduced) return <GesturesReduced />;

  return (
    // VIDEO SLOT — future: add /gestures.mp4 to background when available
    <section
      ref={containerRef}
      style={{ height: isMob ? "210vh" : "300vh", position: "relative" }}
      aria-label="Pequenos gestos"
    >
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden" }}>

        {/* ── Background image — lazy loaded (hero already loaded) ──────────── */}
        <motion.div
          aria-hidden
          style={{ position: "absolute", inset: 0, scale: imgScale, transformOrigin: "center 38%" }}
        >
          <picture>
            <source
              type="image/webp"
              srcSet="/gestures-768.webp 768w, /gestures-1280.webp 1280w, /gestures-1920.webp 1920w"
              sizes="100vw"
            />
            <img
              src="/gestures.jpg" alt="" aria-hidden loading="lazy" decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }}
            />
          </picture>
        </motion.div>

        {/* Gradient overlay — left-heavy on desktop for text legibility; top-heavy on mobile */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: isMob
              ? `linear-gradient(to bottom, ${NAVY}d0 0%, ${NAVY}a8 38%, ${NAVY}80 100%)`
              : `linear-gradient(110deg, ${NAVY}f2 0%, ${NAVY}d4 26%, ${NAVY}88 50%, ${NAVY}44 70%, transparent 100%)`,
          }}
        />

        {/* ── Headline + sub-line (bottom-left desktop, top-left mobile) ─────── */}
        <div
          aria-hidden={false}
          style={{
            position: "absolute", pointerEvents: "none", zIndex: 3,
            ...(isMob
              ? { left: "clamp(24px, 7%, 56px)", top: "16%" }
              : { left: "clamp(40px, 7%, 88px)", bottom: "clamp(80px, 17%, 140px)" }
            ),
          }}
        >
          <motion.h2
            style={{
              opacity: hlOp, y: hlY,
              fontSize: isMob ? "clamp(30px, 9.5vw, 46px)" : "clamp(36px, 4.5vw, 64px)",
              fontWeight: 900, lineHeight: 1.04, letterSpacing: "-0.025em",
              color: "white", margin: "0 0 8px",
              textShadow: "0 2px 20px rgba(0,0,0,0.28)",
            }}
          >
            Pequenos gestos.
          </motion.h2>
          <motion.p
            style={{
              opacity: subOp, y: subY,
              fontSize: isMob ? "clamp(13px, 4vw, 18px)" : "clamp(15px, 1.7vw, 22px)",
              fontWeight: 700, color: "rgba(255,255,255,0.78)",
              letterSpacing: "-0.01em", margin: 0,
              textShadow: "0 2px 16px rgba(0,0,0,0.28)",
            }}
          >
            Que dizem 'estou aqui'.
          </motion.p>
        </div>

        {/* ── Message 1 "Chegaste bem?" — from left ─────────────────────────── */}
        <div
          aria-hidden
          style={{
            position: "absolute", pointerEvents: "none", zIndex: 4,
            ...(isMob
              ? { left: "clamp(20px, 6%, 40px)", top: "36%" }
              : { left: "clamp(40px, 6.5%, 72px)", top: "34%" }
            ),
          }}
        >
          <motion.div style={{ opacity: m1Op, x: m1X }}>
            <ChatBubble text="Chegaste bem?" />
          </motion.div>
        </div>

        {/* ── Photo memory card — opposite side for depth ────────────────────── */}
        <div
          aria-hidden
          style={{
            position: "absolute", pointerEvents: "none", zIndex: 3,
            ...(isMob
              ? { right: "clamp(20px, 8%, 50px)", top: "42%" }
              : { left: "clamp(80px, 11%, 140px)", top: "50%" }
            ),
          }}
        >
          <motion.div style={{ opacity: photoOp, y: photoY, rotate: isMob ? 4 : -5 }}>
            <MemoryCard />
          </motion.div>
        </div>

        {/* ── Flame indicator ────────────────────────────────────────────────── */}
        <div
          aria-hidden
          style={{
            position: "absolute", pointerEvents: "none", zIndex: 4,
            ...(isMob
              ? { left: "clamp(20px, 6%, 40px)", top: "55%" }
              : { left: "clamp(40px, 6.5%, 72px)", top: "60%" }
            ),
          }}
        >
          <motion.div style={{ opacity: flameOp, scale: flameScale }}>
            <FlameIndicator />
          </motion.div>
        </div>

        {/* ── Message 2 "Estou a caminho" — from right ──────────────────────── */}
        <div
          aria-hidden
          style={{
            position: "absolute", pointerEvents: "none", zIndex: 5,
            ...(isMob
              ? { right: "clamp(20px, 6%, 40px)", top: "36%" }
              : { left: "clamp(40px, 6.5%, 72px)", top: "47%" }
            ),
          }}
        >
          <motion.div style={{ opacity: m2Op, x: m2X }}>
            <ChatBubble text="Estou a caminho" me heart />
          </motion.div>
        </div>

        {/* ── Phone — right-center desktop, centered mobile ──────────────────── */}
        {/* Positioned for future: at p=1 this single phone transitions to Cena 03's two phones */}
        <div
          style={{
            position: "absolute", zIndex: 6,
            ...(isMob
              ? { left: "50%", top: "50%", transform: "translate(-50%, -45%)" }
              : { right: "clamp(48px, 7%, 100px)", top: "50%", transform: "translateY(-50%)" }
            ),
          }}
        >
          <motion.div style={{ opacity: phoneOp, y: phoneY, scale: phoneScale }}>
            <GesturesPhone isMob={isMob} />
          </motion.div>
        </div>

      </div>
    </section>
  );
}

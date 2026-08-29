import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";

const PINK = "#E0637A";
const NAVY = "#0B1324";

// ── Photo data — extensible for future memories ────────────────────────────────
// Slots 5 & 6: uncomment and fill src/w* when assets are available.
const MEMORIES = [
  { id: "distance", src: "/distance.jpg", w768: "/distance-768.webp", w1280: "/distance-1280.webp", w1920: "/distance-1920.webp", alt: "Memória" },
  { id: "gestures", src: "/gestures.jpg", w768: "/gestures-768.webp", w1280: "/gestures-1280.webp", w1920: "/gestures-1920.webp", alt: "Memória" },
  { id: "safe",     src: "/safe.jpg",     w768: "/safe-768.webp",     w1280: "/safe-1280.webp",     w1920: "/safe-1920.webp",     alt: "Memória" },
  { id: "hero",     src: "/hero.jpg",     w768: "/hero-768.webp",     w1280: "/hero-1280.webp",     w1920: "/hero-1920.webp",     alt: "Memória" },
  // Slot 5 — { id: "memory5", src: "", w768: "", w1280: "", w1920: "", alt: "Memória" },
  // Slot 6 — { id: "memory6", src: "", w768: "", w1280: "", w1920: "", alt: "Memória" },
] as const;

// Video slot — no-op until memories.mp4 is available
// const MEMORY_VIDEO = "/memories.mp4";

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

// ── MemoryImg — responsive WebP with srcset ────────────────────────────────────

function MemoryImg({
  src, w768, w1280, w1920, alt, priority = false, imgStyle,
}: {
  src: string; w768: string; w1280: string; w1920: string;
  alt: string; priority?: boolean; imgStyle?: React.CSSProperties;
}) {
  return (
    <picture style={{ display: "block", width: "100%", height: "100%" }}>
      <source
        srcSet={`${w768} 768w, ${w1280} 1280w, ${w1920} 1920w`}
        sizes="(max-width: 767px) 88vw, 50vw"
        type="image/webp"
      />
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", ...imgStyle }}
      />
    </picture>
  );
}

// ── PhotoFrame — editorial print aesthetic ────────────────────────────────────

function PhotoFrame({
  children, width, height, borderOpacity = 0.86, style,
}: {
  children: React.ReactNode;
  width: number | string;
  height: number | string;
  borderOpacity?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width, height,
      border: `3px solid rgba(255,255,255,${borderOpacity})`,
      borderRadius: 3,
      overflow: "hidden",
      boxShadow: "0 12px 56px rgba(0,0,0,0.62), 0 3px 16px rgba(0,0,0,0.42)",
      flexShrink: 0,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Reduced motion — editorial vertical layout (NOT a grid) ───────────────────

function MemoriesReduced() {
  return (
    <section style={{ background: NAVY, padding: "80px 0 100px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 7%" }}>

        {/* Label */}
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
          textTransform: "uppercase", color: `${PINK}80`, margin: "0 0 20px",
        }}>
          MEMÓRIAS
        </p>

        {/* Photo 1 — main, full width */}
        <div style={{ maxWidth: 520, margin: "0 auto 0" }}>
          <PhotoFrame width="100%" height="auto">
            <MemoryImg {...MEMORIES[0]} priority imgStyle={{ aspectRatio: "3/2" }} />
          </PhotoFrame>
        </div>

        {/* "Alguns momentos passam." */}
        <p style={{
          fontSize: "clamp(18px, 2.8vw, 32px)",
          fontWeight: 800, color: "white",
          letterSpacing: "-0.02em", lineHeight: 1.12,
          margin: "44px 0 44px",
        }}>
          Alguns momentos passam.
        </p>

        {/* Photo 2 — offset left */}
        <div style={{ maxWidth: 380, marginLeft: "4%", transform: "rotate(-0.8deg)" }}>
          <PhotoFrame width="100%" height="auto" borderOpacity={0.76}>
            <MemoryImg {...MEMORIES[1]} imgStyle={{ aspectRatio: "3/2" }} />
          </PhotoFrame>
        </div>

        {/* Photo 3 — offset right */}
        <div style={{ maxWidth: 310, marginLeft: "auto", marginRight: "3%", marginTop: 32, transform: "rotate(1.2deg)" }}>
          <PhotoFrame width="100%" height="auto" borderOpacity={0.68}>
            <MemoryImg {...MEMORIES[2]} imgStyle={{ aspectRatio: "3/2" }} />
          </PhotoFrame>
        </div>

        {/* Photo 4 — centered, subtle */}
        <div style={{ maxWidth: 260, margin: "28px auto 0", opacity: 0.52, transform: "rotate(-0.5deg)" }}>
          <PhotoFrame width="100%" height="auto" borderOpacity={0.50}>
            <MemoryImg {...MEMORIES[3]} imgStyle={{ aspectRatio: "3/2" }} />
          </PhotoFrame>
        </div>

        {/* "Mas alguns ficam." */}
        <p style={{
          fontSize: "clamp(28px, 4.5vw, 58px)",
          fontWeight: 900, color: "white",
          letterSpacing: "-0.035em", lineHeight: 1.04,
          margin: "64px 0 14px",
          textShadow: "0 2px 32px rgba(0,0,0,0.5)",
        }}>
          Mas alguns ficam.
        </p>

        {/* "Guardem o que importa." */}
        <p style={{
          fontSize: "clamp(16px, 2.2vw, 26px)",
          fontWeight: 700, color: "rgba(255,255,255,0.72)",
          letterSpacing: "-0.01em", lineHeight: 1.3,
          margin: 0,
        }}>
          Guardem o que importa.
        </p>

      </div>
    </section>
  );
}

// ── Animated main component ───────────────────────────────────────────────────

function MemoriesAnimated() {
  const outerRef = useRef<HTMLDivElement>(null);
  const isMob = useMediaQuery("(max-width: 767px)");

  const { scrollYProgress: p } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // ─── DESKTOP transforms ───────────────────────────────────────────────────

  // Photo 1 (distance.jpg) — main protagonist
  const D_p1Op    = useTransform(p, [0.10, 0.22, 0.88, 0.97], [0, 1, 1, 0.25]);
  const D_p1Scale = useTransform(p, [0.10, 0.22, 0.68, 0.82], [0.94, 1, 1, 1.07]);
  const D_p1Y_r   = useTransform(p, [0.10, 0.22, 0.68], [30, 0, -44]);
  const D_p1Y     = useSpring(D_p1Y_r, { stiffness: 48, damping: 18 });
  const D_p1X     = useTransform(p, [0.68, 0.82], [0, -26]);

  // Photo 2 (gestures.jpg) — left, middle plane; enters slightly earlier
  const D_p2Op    = useTransform(p, [0.26, 0.38, 0.68, 0.80], [0, 0.84, 0.84, 0]);
  const D_p2Scale = useTransform(p, [0.26, 0.38, 0.68, 0.80], [0.96, 1, 1, 0.76]);
  const D_p2Y_r   = useTransform(p, [0.26, 0.68], [10, -28]);
  const D_p2Y     = useSpring(D_p2Y_r, { stiffness: 56, damping: 20 });
  const D_p2X     = useTransform(p, [0.68, 0.80], [0, 120]);

  // Photo 3 (safe.jpg) — right, front plane; enters slightly earlier than before
  const D_p3Op    = useTransform(p, [0.32, 0.44, 0.68, 0.80], [0, 0.72, 0.72, 0]);
  const D_p3Scale = useTransform(p, [0.32, 0.44, 0.68, 0.80], [0.96, 1, 1, 0.76]);
  const D_p3Y_r   = useTransform(p, [0.32, 0.68], [0, -56]);
  const D_p3Y     = useSpring(D_p3Y_r, { stiffness: 64, damping: 22 });
  const D_p3X     = useTransform(p, [0.68, 0.80], [0, -120]);

  // Photo 4 (hero.jpg) — background; blur deepens as it converges and fades
  const D_p4Op    = useTransform(p, [0.40, 0.50, 0.68, 0.78], [0, 0.42, 0.42, 0]);
  const D_p4Y_r   = useTransform(p, [0.40, 0.68], [0, -18]);
  const D_p4Y     = useSpring(D_p4Y_r, { stiffness: 38, damping: 18 });
  const D_p4BlurV = useTransform(p, [0.40, 0.68, 0.78], [2.5, 2.5, 5]);
  const D_p4Filter = useMotionTemplate`blur(${D_p4BlurV}px)`;

  // ─── MOBILE transforms — crossfade stack at same center ─────────────────
  //
  // All photos at same position, different z-indices.
  // Photos 2/3/4 appear on top of Photo 1, then fade to REVEAL Photo 1 again.
  // This creates the "layers of memory converging" effect.

  // Photo 1 (distance) — base layer z=2, anchor; scale breathes up at payoff
  const M_p1Op    = useTransform(p, [0.10, 0.22, 0.93, 1.00], [0, 1, 1, 0.25]);
  const M_p1Scale = useTransform(p, [0.10, 0.22, 0.82, 0.92], [0.93, 1, 1, 1.06]);
  const M_p1Y_r   = useTransform(p, [0.10, 0.22], [32, 0]);
  const M_p1Y     = useSpring(M_p1Y_r, { stiffness: 44, damping: 20 });

  // Photo 2 (gestures) — z=3; long dissolve entrance/exit, medium spring
  const M_p2Op    = useTransform(p, [0.30, 0.44, 0.62, 0.72], [0, 1, 1, 0]);
  const M_p2Y_r   = useTransform(p, [0.30, 0.44], [16, 0]);
  const M_p2Y     = useSpring(M_p2Y_r, { stiffness: 52, damping: 20 });

  // Photo 3 (safe) — z=4; different timing — offset from Photo 2, looser spring
  const M_p3Op    = useTransform(p, [0.50, 0.64, 0.74, 0.80], [0, 1, 1, 0]);
  const M_p3Y_r   = useTransform(p, [0.50, 0.64], [16, 0]);
  const M_p3Y     = useSpring(M_p3Y_r, { stiffness: 46, damping: 16 });

  // Photo 4 (hero) — z=5, distant memory: low opacity, slow spring, slight blur
  const M_p4Op    = useTransform(p, [0.66, 0.72, 0.80], [0, 0.50, 0]);
  const M_p4Y_r   = useTransform(p, [0.66, 0.72], [14, 0]);
  const M_p4Y     = useSpring(M_p4Y_r, { stiffness: 36, damping: 15 });

  // ─── Common texts ─────────────────────────────────────────────────────────

  const labelOp   = useTransform(p, [0.12, 0.22, 0.72, 0.80], [0, 1, 1, 0]);
  const phrase1Op = useTransform(p, [0.22, 0.30, 0.48, 0.56], [0, 1, 1, 0]);
  const phrase1Y  = useTransform(p, [0.22, 0.30], [10, 0]);

  // "Mas alguns ficam." — THE BIG MOMENT; p 0.80–0.84 is the breathing room after layers fade
  const phrase2Op = useTransform(p, [0.84, 0.90, 0.93, 0.96], [0, 1, 1, 0]);
  const phrase2Y  = useTransform(p, [0.84, 0.90], [14, 0]);

  // "Guardem o que importa." — starts only after phrase 2 fully fades (pivot at p 0.96)
  const phrase3Op = useTransform(p, [0.96, 1.00], [0, 1]);
  const phrase3Y  = useTransform(p, [0.96, 1.00], [14, 0]);

  // ─── Cena 05 glow ────────────────────────────────────────────────────────
  const glowOp    = useTransform(p, [0.94, 1.00], [0, 0.80]);
  const glowScale = useTransform(p, [0.94, 1.00], [0.45, 2.0]);

  const sceneH = isMob ? "280vh" : "300vh";

  return (
    <section
      ref={outerRef}
      style={{ height: sceneH, position: "relative" }}
      aria-label="Memórias"
    >
      <div style={{
        position: "sticky", top: 0,
        height: "100dvh",
        background: NAVY,
        overflow: "hidden",
      }}>

        {/* ── Top/bottom gradient — legibility ── */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: `linear-gradient(to bottom, ${NAVY} 0%, ${NAVY}cc 9%, transparent 22%, transparent 76%, ${NAVY}cc 92%, ${NAVY} 100%)`,
        }} />

        {/* ══════════════════════════════════
            DESKTOP LAYOUT — editorial depth
            ══════════════════════════════════ */}
        {!isMob && (
          <>
            {/* Photo 4 — far-left, background plane, blurred */}
            <div style={{ position: "absolute", zIndex: 2, left: "12%", top: "31%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: D_p4Op, y: D_p4Y, rotate: -2, filter: D_p4Filter }}>
                <PhotoFrame width={248} height={165} borderOpacity={0.48}>
                  <MemoryImg {...MEMORIES[3]} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 2 — left, middle plane */}
            <div style={{ position: "absolute", zIndex: 3, left: "22%", top: "47%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: D_p2Op, scale: D_p2Scale, y: D_p2Y, x: D_p2X, rotate: -1.2 }}>
                <PhotoFrame width={360} height={240} borderOpacity={0.78}>
                  <MemoryImg {...MEMORIES[1]} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 3 — right, front plane */}
            <div style={{ position: "absolute", zIndex: 3, left: "77%", top: "60%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: D_p3Op, scale: D_p3Scale, y: D_p3Y, x: D_p3X, rotate: 1.4 }}>
                <PhotoFrame width={298} height={199} borderOpacity={0.68}>
                  <MemoryImg {...MEMORIES[2]} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 1 — MAIN, center-right, dominates */}
            <div style={{ position: "absolute", zIndex: 4, left: "56%", top: "50%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: D_p1Op, scale: D_p1Scale, y: D_p1Y, x: D_p1X }}>
                <PhotoFrame width={520} height={347}>
                  <MemoryImg {...MEMORIES[0]} priority />
                </PhotoFrame>
              </motion.div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            MOBILE LAYOUT — crossfade stack
            All photos centered; Photos 2/3/4
            layer on top of Photo 1, then fade
            to REVEAL Photo 1 for the payoff.
            ══════════════════════════════════ */}
        {isMob && (
          <>
            {/* Photo 1 — base layer (z=2), always present */}
            <div style={{ position: "absolute", zIndex: 2, left: "50%", top: "40%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: M_p1Op, scale: M_p1Scale, y: M_p1Y }}>
                <PhotoFrame width="min(88vw, 360px)" height="auto">
                  <MemoryImg {...MEMORIES[0]} priority imgStyle={{ aspectRatio: "3/2" }} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 2 — z=3, crossfades over Photo 1 */}
            <div style={{ position: "absolute", zIndex: 3, left: "50%", top: "40%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: M_p2Op, y: M_p2Y, rotate: -0.8 }}>
                <PhotoFrame width="min(84vw, 344px)" height="auto" borderOpacity={0.80}>
                  <MemoryImg {...MEMORIES[1]} imgStyle={{ aspectRatio: "3/2" }} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 3 — z=4 */}
            <div style={{ position: "absolute", zIndex: 4, left: "50%", top: "40%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: M_p3Op, y: M_p3Y, rotate: 1.1 }}>
                <PhotoFrame width="min(80vw, 324px)" height="auto" borderOpacity={0.70}>
                  <MemoryImg {...MEMORIES[2]} imgStyle={{ aspectRatio: "3/2" }} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 4 — z=5, brief glimpse */}
            <div style={{ position: "absolute", zIndex: 5, left: "50%", top: "40%", transform: "translate(-50%, -50%)" }}>
              <motion.div style={{ opacity: M_p4Op, y: M_p4Y, rotate: -0.6, filter: "blur(1.5px)" }}>
                <PhotoFrame width="min(76vw, 304px)" height="auto" borderOpacity={0.55}>
                  <MemoryImg {...MEMORIES[3]} imgStyle={{ aspectRatio: "3/2" }} />
                </PhotoFrame>
              </motion.div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            TEXT LAYER — zIndex 6 (above all)
            ══════════════════════════════════ */}

        {/* Label + "Alguns momentos passam." — top left */}
        <div style={{
          position: "absolute", zIndex: 6, pointerEvents: "none",
          top: "clamp(44px, 7vh, 70px)", left: "7%",
        }}>
          <motion.div style={{ opacity: labelOp }}>
            <p style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: `${PINK}88`, margin: "0 0 14px",
              textShadow: "0 1px 10px rgba(0,0,0,0.60)",
            }}>
              MEMÓRIAS
            </p>
          </motion.div>
          <motion.p style={{
            opacity: phrase1Op, y: phrase1Y,
            fontSize: isMob ? "clamp(20px, 6vw, 30px)" : "clamp(22px, 2.6vw, 38px)",
            fontWeight: 800, color: "white",
            letterSpacing: "-0.02em", lineHeight: 1.12,
            margin: 0, maxWidth: "18ch",
            textShadow: "0 2px 24px rgba(0,0,0,0.65)",
          }}>
            Alguns momentos<br />passam.
          </motion.p>
        </div>

        {/* "Mas alguns ficam." — THE BIG MOMENT — bottom left */}
        <div style={{
          position: "absolute", zIndex: 6, pointerEvents: "none",
          bottom: isMob ? "clamp(52px, 9vh, 72px)" : "clamp(56px, 8vh, 84px)",
          left: "7%",
        }}>
          <motion.p style={{
            opacity: phrase2Op, y: phrase2Y,
            fontSize: isMob ? "clamp(36px, 11vw, 50px)" : "clamp(44px, 5.5vw, 76px)",
            fontWeight: 900, color: "white",
            letterSpacing: "-0.04em", lineHeight: 1.02,
            margin: 0,
            textShadow: "0 2px 40px rgba(0,0,0,0.70)",
          }}>
            Mas alguns ficam.
          </motion.p>
        </div>

        {/* "Guardem o que importa." — crossfades with "Mas alguns ficam." */}
        <div style={{
          position: "absolute", zIndex: 6, pointerEvents: "none",
          bottom: isMob ? "clamp(52px, 9vh, 72px)" : "clamp(56px, 8vh, 84px)",
          left: "7%",
        }}>
          <motion.p style={{
            opacity: phrase3Op, y: phrase3Y,
            fontSize: isMob ? "clamp(18px, 5.5vw, 26px)" : "clamp(22px, 2.4vw, 34px)",
            fontWeight: 700, color: "rgba(255,255,255,0.78)",
            letterSpacing: "-0.01em", lineHeight: 1.3,
            margin: 0,
            textShadow: "0 2px 20px rgba(0,0,0,0.60)",
          }}>
            Guardem o que importa.
          </motion.p>
        </div>

        {/* ── Cena 05 transition glow ── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 5, pointerEvents: "none",
            left: "50%", top: "50%",
            width: "clamp(260px, 50vw, 560px)",
            height: "clamp(260px, 50vw, 560px)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${PINK}44 0%, transparent 65%)`,
            opacity: glowOp,
            scale: glowScale,
            x: "-50%",
            y: "-50%",
          }}
        />

      </div>
    </section>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function MemoriesScene() {
  const reduced = useReducedMotion();
  if (reduced) return <MemoriesReduced />;
  return <MemoriesAnimated />;
}

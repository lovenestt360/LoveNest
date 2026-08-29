import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";

const PINK = "#E0637A";
const NAVY = "#0B1324";

// ── Photo data — extensible for future memories ────────────────────────────────
// To activate slots 5/6: uncomment and fill src/w768/w1280/w1920 fields.
const MEMORIES = [
  {
    id: "distance",
    src: "/distance.jpg",
    w768: "/distance-768.webp",
    w1280: "/distance-1280.webp",
    w1920: "/distance-1920.webp",
    alt: "Memória",
  },
  {
    id: "gestures",
    src: "/gestures.jpg",
    w768: "/gestures-768.webp",
    w1280: "/gestures-1280.webp",
    w1920: "/gestures-1920.webp",
    alt: "Memória",
  },
  {
    id: "safe",
    src: "/safe.jpg",
    w768: "/safe-768.webp",
    w1280: "/safe-1280.webp",
    w1920: "/safe-1920.webp",
    alt: "Memória",
  },
  {
    id: "hero",
    src: "/hero.jpg",
    w768: "/hero-768.webp",
    w1280: "/hero-1280.webp",
    w1920: "/hero-1920.webp",
    alt: "Memória",
  },
  // Slot 5 — future memory (fill and uncomment when asset is available)
  // { id: "memory5", src: "", w768: "", w1280: "", w1920: "", alt: "Memória" },
  // Slot 6 — future memory (fill and uncomment when asset is available)
  // { id: "memory6", src: "", w768: "", w1280: "", w1920: "", alt: "Memória" },
] as const;

// Future video slot — no-op until memories.mp4 is available
// const MEMORY_VIDEO_SRC = "/memories.mp4"; // uncomment when ready

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

// ── MemoryImg — <picture> with responsive WebP srcset ─────────────────────────

function MemoryImg({
  src, w768, w1280, w1920, alt,
  priority = false,
  imgStyle,
}: {
  src: string; w768: string; w1280: string; w1920: string;
  alt: string; priority?: boolean;
  imgStyle?: React.CSSProperties;
}) {
  return (
    <picture style={{ display: "block", width: "100%", height: "100%" }}>
      <source
        srcSet={`${w768} 768w, ${w1280} 1280w, ${w1920} 1920w`}
        sizes="(max-width: 767px) 82vw, 50vw"
        type="image/webp"
      />
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...imgStyle,
        }}
      />
    </picture>
  );
}

// ── PhotoFrame — editorial print aesthetic ────────────────────────────────────

function PhotoFrame({
  children,
  width,
  height,
  style,
}: {
  children: React.ReactNode;
  width: number | string;
  height: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        border: "3px solid rgba(255,255,255,0.86)",
        borderRadius: 3,
        overflow: "hidden",
        boxShadow:
          "0 12px 56px rgba(0,0,0,0.60), 0 3px 16px rgba(0,0,0,0.40)",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Reduced motion — elegant static layout ─────────────────────────────────────

function MemoriesReduced() {
  return (
    <section style={{ background: NAVY, padding: "80px 0" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 clamp(24px, 7%, 80px)",
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: `${PINK}80`,
              margin: "0 0 16px",
            }}
          >
            MEMÓRIAS
          </p>
          <p
            style={{
              fontSize: "clamp(22px, 3vw, 42px)",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              margin: 0,
              maxWidth: "20ch",
            }}
          >
            Alguns momentos passam.<br />Mas alguns ficam.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          {MEMORIES.slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              style={{
                flex: "1 1 clamp(200px, 22%, 300px)",
                aspectRatio: "3/2",
                border: "3px solid rgba(255,255,255,0.82)",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.50)",
                transform: i % 2 === 1 ? "rotate(0.8deg)" : "rotate(-0.5deg)",
              }}
            >
              <MemoryImg
                {...m}
                priority={i === 0}
                imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: "clamp(15px, 1.8vw, 22px)",
            fontWeight: 700,
            color: "rgba(255,255,255,0.60)",
            letterSpacing: "-0.01em",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
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

  // ── Photo 1 (distance.jpg) — main protagonist ─────────────────────────────
  const p1Op    = useTransform(p, [0.10, 0.22, 0.88, 0.97], [0, 1, 1, 0.25]);
  const p1Scale = useTransform(p, [0.10, 0.22, 0.68, 0.82], [0.94, 1, 1, 1.06]);
  const p1Y_raw = useTransform(p, [0.10, 0.22, 0.68], [30, 0, -44]);
  const p1Y     = useSpring(p1Y_raw, { stiffness: 48, damping: 18 });
  const p1X     = useTransform(p, [0.68, 0.82], [0, -24]);

  // ── Photo 2 (gestures.jpg) — left, middle plane ───────────────────────────
  const p2Op    = useTransform(p, [0.28, 0.38, 0.68, 0.80], [0, 0.84, 0.84, 0]);
  const p2Scale = useTransform(p, [0.28, 0.38, 0.68, 0.80], [0.96, 1, 1, 0.78]);
  const p2Y_raw = useTransform(p, [0.28, 0.68], [10, -28]);
  const p2Y     = useSpring(p2Y_raw, { stiffness: 56, damping: 20 });
  const p2X_D   = useTransform(p, [0.68, 0.80], [0, 110]); // desktop convergence

  // ── Photo 3 (safe.jpg) — right, front plane ───────────────────────────────
  const p3Op    = useTransform(p, [0.34, 0.44, 0.68, 0.80], [0, 0.72, 0.72, 0]);
  const p3Scale = useTransform(p, [0.34, 0.44, 0.68, 0.80], [0.96, 1, 1, 0.78]);
  const p3Y_raw = useTransform(p, [0.34, 0.68], [0, -56]);
  const p3Y     = useSpring(p3Y_raw, { stiffness: 64, damping: 22 });
  const p3X_D   = useTransform(p, [0.68, 0.80], [0, -110]); // desktop convergence

  // ── Photo 4 (hero.jpg) — background, far plane ───────────────────────────
  const p4Op    = useTransform(p, [0.40, 0.50, 0.68, 0.78], [0, 0.42, 0.42, 0]);
  const p4Y_raw = useTransform(p, [0.40, 0.68], [0, -18]);
  const p4Y     = useSpring(p4Y_raw, { stiffness: 38, damping: 18 });

  // ── Texts ────────────────────────────────────────────────────────────────
  const labelOp   = useTransform(p, [0.16, 0.24, 0.68, 0.76], [0, 1, 1, 0]);
  const phrase1Op = useTransform(p, [0.22, 0.30, 0.48, 0.56], [0, 1, 1, 0]);
  const phrase1Y  = useTransform(p, [0.22, 0.30], [10, 0]);
  const phrase2Op = useTransform(p, [0.80, 0.88, 0.92, 0.97], [0, 1, 1, 0]);
  const phrase2Y  = useTransform(p, [0.80, 0.88], [12, 0]);
  const phrase3Op = useTransform(p, [0.92, 0.98], [0, 1]);
  const phrase3Y  = useTransform(p, [0.92, 0.98], [14, 0]);

  // ── Cena 05 transition glow ───────────────────────────────────────────────
  const glowOp    = useTransform(p, [0.93, 1.00], [0, 0.78]);
  const glowScale = useTransform(p, [0.93, 1.00], [0.5, 1.9]);

  const sceneH = isMob ? "240vh" : "300vh";

  return (
    <section
      ref={outerRef}
      style={{ height: sceneH, position: "relative" }}
      aria-label="Memórias"
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100dvh",
          background: NAVY,
          overflow: "hidden",
        }}
      >
        {/* ── Gradient — top/bottom fade for legibility ── */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
            background: `linear-gradient(to bottom, ${NAVY} 0%, ${NAVY}bb 8%, transparent 20%, transparent 78%, ${NAVY}bb 92%, ${NAVY} 100%)`,
          }}
        />

        {/* ══════════════════════════════════
            DESKTOP LAYOUT
            ══════════════════════════════════ */}
        {!isMob && (
          <>
            {/* Photo 4 — hero.jpg — far-left background plane */}
            <div
              style={{
                position: "absolute", zIndex: 2,
                left: "13%", top: "32%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div
                style={{
                  opacity: p4Op, y: p4Y, rotate: -2,
                  filter: "blur(2.5px)",
                }}
              >
                <PhotoFrame width={248} height={165} style={{ border: "2px solid rgba(255,255,255,0.52)" }}>
                  <MemoryImg {...MEMORIES[3]} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 2 — gestures.jpg — left, middle plane */}
            <div
              style={{
                position: "absolute", zIndex: 3,
                left: "23%", top: "47%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div
                style={{
                  opacity: p2Op, scale: p2Scale,
                  y: p2Y, x: p2X_D, rotate: -1.2,
                }}
              >
                <PhotoFrame width={358} height={239} style={{ border: "3px solid rgba(255,255,255,0.80)" }}>
                  <MemoryImg {...MEMORIES[1]} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 3 — safe.jpg — right, front plane */}
            <div
              style={{
                position: "absolute", zIndex: 3,
                left: "76%", top: "60%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div
                style={{
                  opacity: p3Op, scale: p3Scale,
                  y: p3Y, x: p3X_D, rotate: 1.4,
                }}
              >
                <PhotoFrame width={298} height={199} style={{ border: "3px solid rgba(255,255,255,0.70)" }}>
                  <MemoryImg {...MEMORIES[2]} />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 1 — distance.jpg — MAIN, center-right */}
            <div
              style={{
                position: "absolute", zIndex: 4,
                left: "55%", top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div style={{ opacity: p1Op, scale: p1Scale, y: p1Y, x: p1X }}>
                <PhotoFrame width={480} height={320}>
                  <MemoryImg {...MEMORIES[0]} priority />
                </PhotoFrame>
              </motion.div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            MOBILE LAYOUT
            ══════════════════════════════════ */}
        {isMob && (
          <>
            {/* Photo 1 — distance.jpg — main, centered */}
            <div
              style={{
                position: "absolute", zIndex: 4,
                left: "50%", top: "36%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div style={{ opacity: p1Op, scale: p1Scale, y: p1Y }}>
                <PhotoFrame
                  width="clamp(256px, 82vw, 316px)"
                  height="auto"
                >
                  <MemoryImg
                    {...MEMORIES[0]}
                    priority
                    imgStyle={{ width: "100%", aspectRatio: "3/2", objectFit: "cover" }}
                  />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 2 — gestures.jpg — below-left */}
            <div
              style={{
                position: "absolute", zIndex: 3,
                left: "44%", top: "63%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div
                style={{ opacity: p2Op, scale: p2Scale, y: p2Y, rotate: -1.2 }}
              >
                <PhotoFrame
                  width="clamp(216px, 70vw, 272px)"
                  height="auto"
                  style={{ border: "3px solid rgba(255,255,255,0.80)" }}
                >
                  <MemoryImg
                    {...MEMORIES[1]}
                    imgStyle={{ width: "100%", aspectRatio: "3/2", objectFit: "cover" }}
                  />
                </PhotoFrame>
              </motion.div>
            </div>

            {/* Photo 3 — safe.jpg — below-right */}
            <div
              style={{
                position: "absolute", zIndex: 2,
                left: "57%", top: "77%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div
                style={{ opacity: p3Op, scale: p3Scale, y: p3Y, rotate: 1.4 }}
              >
                <PhotoFrame
                  width="clamp(186px, 60vw, 238px)"
                  height="auto"
                  style={{ border: "3px solid rgba(255,255,255,0.68)" }}
                >
                  <MemoryImg
                    {...MEMORIES[2]}
                    imgStyle={{ width: "100%", aspectRatio: "3/2", objectFit: "cover" }}
                  />
                </PhotoFrame>
              </motion.div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            TEXT LAYER
            ══════════════════════════════════ */}

        {/* Label + Phrase 1 — top left */}
        <div
          style={{
            position: "absolute", zIndex: 6, pointerEvents: "none",
            top: "clamp(44px, 7vh, 70px)",
            left: "7%",
          }}
        >
          <motion.div style={{ opacity: labelOp }}>
            <p
              style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: `${PINK}88`, margin: "0 0 12px",
                textShadow: "0 1px 10px rgba(0,0,0,0.55)",
              }}
            >
              MEMÓRIAS
            </p>
          </motion.div>
          <motion.p
            style={{
              opacity: phrase1Op,
              y: phrase1Y,
              fontSize: isMob
                ? "clamp(20px, 6vw, 30px)"
                : "clamp(22px, 2.6vw, 38px)",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
              lineHeight: 1.12,
              margin: 0,
              maxWidth: "18ch",
              textShadow: "0 2px 24px rgba(0,0,0,0.60)",
            }}
          >
            Alguns momentos<br />passam.
          </motion.p>
        </div>

        {/* Phrase 2 — "Mas alguns ficam." — bottom left */}
        <div
          style={{
            position: "absolute", zIndex: 6, pointerEvents: "none",
            bottom: isMob ? "clamp(44px, 8vh, 64px)" : "clamp(52px, 8vh, 80px)",
            left: "7%",
          }}
        >
          <motion.p
            style={{
              opacity: phrase2Op,
              y: phrase2Y,
              fontSize: isMob
                ? "clamp(30px, 9vw, 44px)"
                : "clamp(34px, 4.4vw, 60px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              margin: 0,
              textShadow: "0 2px 36px rgba(0,0,0,0.65)",
            }}
          >
            Mas alguns ficam.
          </motion.p>
        </div>

        {/* Phrase 3 — "Guardem o que importa." — same position, crossfades */}
        <div
          style={{
            position: "absolute", zIndex: 6, pointerEvents: "none",
            bottom: isMob ? "clamp(44px, 8vh, 64px)" : "clamp(52px, 8vh, 80px)",
            left: "7%",
          }}
        >
          <motion.p
            style={{
              opacity: phrase3Op,
              y: phrase3Y,
              fontSize: isMob
                ? "clamp(16px, 5vw, 22px)"
                : "clamp(18px, 2vw, 28px)",
              fontWeight: 700,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
              margin: 0,
              textShadow: "0 2px 20px rgba(0,0,0,0.55)",
            }}
          >
            Guardem o que importa.
          </motion.p>
        </div>

        {/* ── Cena 05 transition glow (pink, centered) ── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", zIndex: 5, pointerEvents: "none",
            left: "50%", top: "50%",
            width: "clamp(280px, 50vw, 560px)",
            height: "clamp(280px, 50vw, 560px)",
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

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Flame, MessageCircle } from "lucide-react";

const PINK = "#E0637A";
const NAVY = "#0B1324";
const CREAM = "#FAF9F7";

// Detects mobile breakpoint reactively
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return matches;
}

// ── Phone screen content ───────────────────────────────────────────────────────

function HeroPhoneScreen({ compact }: { compact?: boolean }) {
  const fs = compact ? { title: 15, label: 9, body: 10 } : { title: 17, label: 10, body: 11 };
  return (
    <div style={{ background: CREAM, padding: `${compact ? 40 : 48}px 14px 16px`, position: "relative" }}>
      {/* Notch */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          width: 68, height: 18, background: "#000", borderRadius: 10, zIndex: 2,
        }}
      />
      <p style={{ fontSize: fs.label, color: "#aaa", margin: "0 0 2px" }}>Bom dia</p>
      <p style={{ fontSize: fs.title, fontWeight: 900, color: NAVY, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
        O vosso dia
      </p>

      {/* Streak */}
      <div style={{ background: "white", borderRadius: 16, padding: compact ? 10 : 12, marginBottom: 8, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${PINK}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flame style={{ width: 14, height: 14, color: PINK }} strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: fs.label, color: "#aaa", margin: 0 }}>Jornada</p>
            <p style={{ fontSize: fs.title - 3, fontWeight: 800, color: NAVY, margin: 0 }}>14 dias juntos</p>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "3px 7px", borderRadius: 999, background: `${PINK}15`, color: PINK }}>Ambos</span>
        </div>
      </div>

      {/* Mood */}
      <div style={{ background: "white", borderRadius: 16, padding: compact ? 10 : 12, marginBottom: 8, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <p style={{ fontSize: fs.label, color: "#aaa", margin: "0 0 8px" }}>Como se sentem hoje?</p>
        <div style={{ display: "flex", gap: 5 }}>
          {["Feliz", "Grato", "Em paz"].map((m, i) => (
            <span key={m} style={{
              fontSize: fs.label, fontWeight: 600, padding: "4px 8px", borderRadius: 999,
              background: i === 0 ? PINK : "#f3f3f3", color: i === 0 ? "white" : "#aaa",
            }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Chat preview */}
      <div style={{ background: "white", borderRadius: 16, padding: compact ? 10 : 12, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <MessageCircle style={{ width: 12, height: 12, color: PINK }} strokeWidth={1.5} />
          <span style={{ fontSize: fs.label, fontWeight: 700, color: PINK }}>Chat</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <div style={{ maxWidth: "78%", padding: "6px 10px", borderRadius: "12px 12px 3px 12px", background: PINK, color: "white", fontSize: fs.body, lineHeight: 1.5 }}>
            Boa semana, meu amor.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ maxWidth: "78%", padding: "6px 10px", borderRadius: "12px 12px 12px 3px", background: "#f5f5f5", color: NAVY, fontSize: fs.body, lineHeight: 1.5 }}>
            Chegaste bem?
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPhone({ isMob }: { isMob: boolean }) {
  return (
    <div
      style={{
        width: isMob ? "min(80vw, 300px)" : "clamp(200px, 22vw, 260px)",
        borderRadius: 40, background: NAVY, overflow: "hidden",
        boxShadow: "0 48px 120px rgba(11,19,36,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
      }}
      aria-label="Pré-visualização da aplicação LoveNest"
    >
      <HeroPhoneScreen compact={isMob} />
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", background: CREAM }}>
        <div aria-hidden style={{ width: 80, height: 4, borderRadius: 2, background: "#ddd" }} />
      </div>
    </div>
  );
}

// ── Fallback for prefers-reduced-motion ───────────────────────────────────────

function HeroReduced({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <section
      style={{
        minHeight: "92dvh", display: "flex", flexDirection: "column", justifyContent: "center",
        background: NAVY, padding: "80px clamp(24px, 7vw, 80px) 60px",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <picture>
          <source type="image/webp" srcSet="/hero-768.webp 768w, /hero-1280.webp 1280w" sizes="100vw" />
          <img src="/hero.jpg" alt="" aria-hidden="true" loading="eager" fetchPriority="high" decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
        </picture>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${NAVY}e0 0%, ${NAVY}88 60%, transparent 100%)` }} />
      </div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.03, letterSpacing: "-0.03em", color: "white", margin: "0 0 20px" }}>
          O amor também<br />vive nos<br />
          <span style={{ color: PINK }}>dias comuns.</span>
        </h1>
        <p style={{ fontSize: "clamp(14px, 1.5vw, 18px)", lineHeight: 1.68, color: "rgba(255,255,255,0.65)", margin: "0 0 36px", maxWidth: 380 }}>
          Não nos grandes gestos. Nos bons dias, nos momentos simples — e nas manhãs de segunda-feira.
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
          <button onClick={onStart} style={{ height: 54, padding: "0 32px", borderRadius: 16, background: PINK, color: "white", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: `0 8px 32px ${PINK}44` }}>
            Criar o nosso espaço
            <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
          </button>
          <button onClick={onLogin} style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Já tenho convite do meu par
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Main HeroScene ─────────────────────────────────────────────────────────────

export function HeroScene() {
  const navigate     = useNavigate();
  const reduced      = useReducedMotion();
  const isMob        = useMediaQuery("(max-width: 767px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: p } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Desktop transforms (300vh container — 200vh effective scroll) ────────────
  const D_headlineY       = useTransform(p, [0, 0.15], [0, -80]);
  const D_headlineOpacity = useTransform(p, [0, 0.15], [1, 0]);
  const D_ctaOpacity      = useTransform(p, [0, 0.12], [1, 0]);
  const D_ctaY            = useTransform(p, [0, 0.12], [0, -20]);
  const D_imageScale      = useTransform(p, [0, 0.60], [1, 1.10]);
  const D_overlayOpacity  = useTransform(p, [0, 0.15, 0.40], [0.62, 0.42, 0.36]);
  const D_cueFade         = useTransform(p, [0, 0.06], [1, 0]);
  const D_p2Opacity       = useTransform(p, [0.15, 0.22, 0.30, 0.35], [0, 1, 1, 0]);
  const D_p2Y             = useTransform(p, [0.15, 0.25], [28, 0]);
  const D_notifOpacity    = useTransform(p, [0.35, 0.42, 0.47, 0.50], [0, 1, 1, 0]);
  const D_notifY          = useTransform(p, [0.35, 0.45], [24, 0]);
  const D_phoneY          = useTransform(p, [0.50, 0.65], [600, 0]);
  const D_phoneOpacity    = useTransform(p, [0.50, 0.60], [0, 1]);
  const D_closingOpacity  = useTransform(p, [0.82, 0.90], [0, 1]);
  const D_closingY        = useTransform(p, [0.82, 0.92], [16, 0]);

  // ── Mobile transforms (200vh container — 100vh effective scroll) ─────────────
  // Sequence: 0% headline·CTA → 20% headline exits → 35% quote → 50% notif → 65% phone enters → 80% phone protagonist → 95% closing → 100% end
  const M_headlineY       = useTransform(p, [0, 0.22], [0, -80]);
  const M_headlineOpacity = useTransform(p, [0, 0.22], [1, 0]);
  const M_ctaOpacity      = useTransform(p, [0, 0.18], [1, 0]);
  const M_ctaY            = useTransform(p, [0, 0.18], [0, -20]);
  const M_imageScale      = useTransform(p, [0, 0.82], [1, 1.06]);
  const M_overlayOpacity  = useTransform(p, [0, 0.22, 0.60], [0.65, 0.40, 0.28]);
  const M_cueFade         = useTransform(p, [0, 0.08], [1, 0]);
  const M_p2Opacity       = useTransform(p, [0.22, 0.30, 0.42, 0.50], [0, 1, 1, 0]);
  const M_p2Y             = useTransform(p, [0.22, 0.33], [28, 0]);
  const M_notifOpacity    = useTransform(p, [0.50, 0.57, 0.62, 0.66], [0, 1, 1, 0]);
  const M_notifY          = useTransform(p, [0.50, 0.60], [24, 0]);
  const M_phoneY          = useTransform(p, [0.65, 0.82], [500, 0]);
  const M_phoneOpacity    = useTransform(p, [0.65, 0.78], [0, 1]);
  const M_closingOpacity  = useTransform(p, [0.90, 0.97], [0, 1]);
  const M_closingY        = useTransform(p, [0.90, 0.98], [16, 0]);

  // Select transform set based on current breakpoint
  const headlineY      = isMob ? M_headlineY      : D_headlineY;
  const headlineOpacity= isMob ? M_headlineOpacity: D_headlineOpacity;
  const ctaOpacity     = isMob ? M_ctaOpacity     : D_ctaOpacity;
  const ctaY           = isMob ? M_ctaY           : D_ctaY;
  const imageScale     = isMob ? M_imageScale     : D_imageScale;
  const overlayOpacity = isMob ? M_overlayOpacity : D_overlayOpacity;
  const cueFade        = isMob ? M_cueFade        : D_cueFade;
  const p2Opacity      = isMob ? M_p2Opacity      : D_p2Opacity;
  const p2Y            = isMob ? M_p2Y            : D_p2Y;
  const notifOpacity   = isMob ? M_notifOpacity   : D_notifOpacity;
  const notifY         = isMob ? M_notifY         : D_notifY;
  const phoneY         = isMob ? M_phoneY         : D_phoneY;
  const phoneOpacity   = isMob ? M_phoneOpacity   : D_phoneOpacity;
  const closingOpacity = isMob ? M_closingOpacity : D_closingOpacity;
  const closingY       = isMob ? M_closingY       : D_closingY;

  if (reduced) {
    return <HeroReduced onStart={() => navigate("/inicio")} onLogin={() => navigate("/entrar?returning=1")} />;
  }

  return (
    // 200vh on mobile (≈100vh effective scroll), 300vh on desktop (≈200vh)
    <section
      ref={containerRef}
      style={{ height: isMob ? "200vh" : "300vh", position: "relative" }}
      aria-label="Apresentação da LoveNest"
    >
      {/* Sticky viewport */}
      <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden", background: NAVY }}>

        {/* ── Background image ──────────────────────────────────────────────── */}
        {/*
          VIDEO SLOT — uncomment when /hero.mp4 is available:
          <motion.video
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                     objectFit:"cover", objectPosition:"center 30%", scale: imageScale }}
            autoPlay muted loop playsInline
            poster="/hero.jpg"
          >
            <source src="/hero.mp4" type="video/mp4" />
          </motion.video>
        */}
        <motion.div
          aria-hidden
          style={{ position: "absolute", inset: 0, scale: imageScale, transformOrigin: "center center" }}
        >
          <picture>
            <source type="image/webp" srcSet="/hero-768.webp 768w, /hero-1280.webp 1280w, /hero-1920.webp 1920w" sizes="100vw" />
            <img src="/hero.jpg" alt="" aria-hidden="true" loading="eager" fetchPriority="high" decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
          </picture>
        </motion.div>

        {/* ── Overlay ───────────────────────────────────────────────────────── */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${NAVY}ee 0%, ${NAVY}bb 45%, ${NAVY}55 100%)`,
            opacity: overlayOpacity,
          }}
        />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${NAVY}cc 0%, transparent 45%)`, pointerEvents: "none" }} />

        {/* ── Phase 1: Headline + CTA ───────────────────────────────────────── */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: `72px clamp(24px, 7vw, 80px) 60px`,
        }}>
          <motion.div style={{ y: headlineY, opacity: headlineOpacity }}>
            <h1 style={{
              fontSize: "clamp(32px, 6vw, 80px)",
              fontWeight: 900, lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "white", margin: 0,
              maxWidth: isMob ? "90vw" : "clamp(280px, 55vw, 640px)",
            }}>
              O amor também<br />vive nos<br />
              <span style={{ color: PINK }}>dias comuns.</span>
            </h1>
          </motion.div>

          <motion.div style={{
            opacity: ctaOpacity, y: ctaY,
            marginTop: 28,
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
          }}>
            <button
              onClick={() => navigate("/inicio")}
              style={{
                height: 54, padding: "0 28px", borderRadius: 16,
                background: PINK, color: "white", fontWeight: 700, fontSize: 15,
                border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: `0 8px 32px ${PINK}44`,
              }}
            >
              Criar o nosso espaço
              <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => navigate("/entrar?returning=1")}
              style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Já tenho convite do meu par
            </button>
          </motion.div>
        </div>

        {/* ── Phase 2: Quote ────────────────────────────────────────────────── */}
        <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <motion.p style={{
            opacity: p2Opacity, y: p2Y,
            fontSize: "clamp(20px, 3.5vw, 44px)",
            fontWeight: 800, color: "white",
            textAlign: "center", letterSpacing: "-0.02em", lineHeight: 1.2,
            maxWidth: isMob ? "82vw" : "clamp(280px, 55vw, 640px)",
            padding: isMob ? "0 24px" : "0 clamp(24px, 6vw, 60px)",
            textShadow: "0 2px 24px rgba(0,0,0,0.4)",
            margin: 0,
          }}>
            Há coisas que acontecem<br />todos os dias.
          </motion.p>
        </div>

        {/* ── Phase 3: Notification card ────────────────────────────────────── */}
        <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <motion.div style={{ opacity: notifOpacity, y: notifY }}>
            <div style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 20, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 24px 60px rgba(0,0,0,0.24), 0 0 0 1px rgba(255,255,255,0.3)",
              minWidth: isMob ? "min(82vw, 280px)" : "clamp(200px, 55vw, 280px)",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${PINK}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Heart style={{ width: 16, height: 16, color: PINK, fill: PINK }} strokeWidth={0} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#aaa", margin: "0 0 2px", fontWeight: 600, letterSpacing: "0.04em" }}>LoveNest</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Chegaste bem?</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Phase 4-5: Phone — protagonist on mobile, bottom accent on desktop ── */}
        <div
          aria-label="Pré-visualização da aplicação"
          style={{
            position: "absolute", inset: 0,
            display: "flex",
            alignItems: isMob ? "center" : "flex-end",
            justifyContent: "center",
            paddingBottom: isMob ? 0 : "clamp(0px, 2vh, 20px)",
            paddingTop: isMob ? "12vh" : 0,
            pointerEvents: "none",
          }}
        >
          <motion.div style={{ y: phoneY, opacity: phoneOpacity }}>
            <HeroPhone isMob={isMob} />
          </motion.div>
        </div>

        {/* ── Phase 6: Closing phrase ────────────────────────────────────────── */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          paddingTop: isMob ? "clamp(72px, 10vh, 100px)" : "clamp(80px, 14vh, 140px)",
          pointerEvents: "none",
        }}>
          <motion.p style={{
            opacity: closingOpacity, y: closingY,
            fontSize: isMob ? "clamp(16px, 4.5vw, 28px)" : "clamp(18px, 2.8vw, 36px)",
            fontWeight: 800, color: "rgba(255,255,255,0.92)",
            letterSpacing: "-0.015em", textAlign: "center",
            margin: 0,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}>
            Pequenos gestos.
          </motion.p>
        </div>

        {/* ── Scroll cue ────────────────────────────────────────────────────── */}
        <motion.div aria-hidden style={{ position: "absolute", bottom: 32, left: "50%", x: "-50%", opacity: cueFade, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 40, background: "rgba(255,255,255,0.25)" }}
          />
        </motion.div>

      </div>
    </section>
  );
}

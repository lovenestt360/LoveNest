import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";

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
import { ArrowRight, Flame } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { LandingNav } from "@/features/landing/LandingNav";
import { HeroScene } from "@/features/landing/HeroScene";
import { GesturesScene } from "@/features/landing/GesturesScene";
import { DistanceScene } from "@/features/landing/DistanceScene";
import { MemoriesScene } from "@/features/landing/MemoriesScene";
import { FlameScene } from "@/features/landing/FlameScene";

const PINK = "#E0637A";
const NAVY = "#0B1324";

// ── Reveal (used by FinalCTA) ─────────────────────────────────────────────────

function useReveal(threshold = 0.14) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, reduced = false }: {
  children: React.ReactNode; reduced?: boolean;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: (visible || reduced) ? "none" : "translate(0px, 24px)",
        transition: reduced
          ? "opacity 300ms ease"
          : "opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 900ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {children}
    </div>
  );
}

// ── Scene scroll progress (used by ManifestoScene) ───────────────────────────

function useSectionProgress(outerRef: React.RefObject<HTMLDivElement>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf: number;
    const update = () => {
      const el = outerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      if (scrollable <= 0) { setProgress(0); return; }
      setProgress(Math.max(0, Math.min(1, -rect.top / scrollable)));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return progress;
}

// ── Scene placeholders (Cenas 03–05) ─────────────────────────────────────────

function ScenePlaceholder({ number, title }: { number: string; title: string }) {
  return (
    <div style={{
      background: NAVY,
      borderTop: "1px solid rgba(255,255,255,0.05)",
      padding: "52px 7%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}40`, margin: "0 0 6px" }}>
          Cena {number}
        </p>
        <p style={{ fontSize: "clamp(18px, 2.2vw, 26px)", fontWeight: 800, color: "rgba(255,255,255,0.10)", margin: 0, letterSpacing: "-0.02em" }}>
          {title}
        </p>
      </div>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.07)", margin: 0 }}>
        Em construção
      </p>
    </div>
  );
}

// ── Cena 05.5 — Momento Interativo ────────────────────────────────────────────

function FlameInteractive({ reduced }: { reduced: boolean }) {
  const progressRef = useRef(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [done, setDone] = useState(false);
  const pressing = useRef(false);
  const rafId = useRef(0);
  const DURATION = 1500;

  useEffect(() => () => { cancelAnimationFrame(rafId.current); }, []);

  const updateProgress = (v: number) => {
    progressRef.current = v;
    setDisplayProgress(v);
  };

  const startHold = () => {
    if (done) return;
    pressing.current = true;
    const started = performance.now() - progressRef.current * DURATION;
    const tick = (now: number) => {
      if (!pressing.current) return;
      const p = Math.min(1, (now - started) / DURATION);
      updateProgress(p);
      if (p >= 1) { pressing.current = false; setDone(true); }
      else rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (!pressing.current) return;
    pressing.current = false;
    cancelAnimationFrame(rafId.current);
    const startP = progressRef.current;
    if (startP <= 0) return;
    const t0 = performance.now();
    const ease = (now: number) => {
      const t = Math.min(1, (now - t0) / 700);
      const p = startP * (1 - t * t);
      updateProgress(Math.max(0, p));
      if (p > 0.002) rafId.current = requestAnimationFrame(ease);
      else updateProgress(0);
    };
    rafId.current = requestAnimationFrame(ease);
  };

  const RADIUS = 36;
  const CIRC = 2 * Math.PI * RADIUS;
  const glowAlpha = done ? 0.22 : displayProgress * 0.18;

  return (
    <section
      style={{
        background: NAVY, padding: "80px 7%", textAlign: "center",
        position: "relative", overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
      aria-label="O vosso ritual"
    >
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${PINK} 0%, transparent 70%)`,
        opacity: glowAlpha,
        transition: done ? "opacity 600ms ease" : "none",
      }} />
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
        textTransform: "uppercase", color: `${PINK}88`,
        marginBottom: 40, marginTop: 0, position: "relative",
      }}>
        O vosso ritual
      </p>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, position: "relative" }}>
        <div style={{ position: "relative", width: 96, height: 96, userSelect: "none" }}>
          <svg
            style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
            width="96" height="96" viewBox="0 0 96 96"
            aria-hidden
          >
            <circle cx="48" cy="48" r={RADIUS} fill="none" stroke={`${PINK}28`} strokeWidth="3" />
            <circle
              cx="48" cy="48" r={RADIUS}
              fill="none" stroke={PINK} strokeWidth="3"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - displayProgress)}
              strokeLinecap="round"
            />
          </svg>
          <button
            onPointerDown={reduced ? () => setDone(true) : startHold}
            onPointerUp={reduced ? undefined : endHold}
            onPointerLeave={reduced ? undefined : endHold}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={done ? "Chama acesa" : "Manter pressionado para acender a chama"}
            style={{
              position: "absolute", inset: 8, borderRadius: "50%", border: "none",
              background: `rgba(224,99,122,${done ? 0.24 : 0.06 + displayProgress * 0.18})`,
              cursor: done ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              touchAction: "none",
              WebkitUserSelect: "none",
              transition: "background 200ms ease",
            } as React.CSSProperties}
          >
            <Flame
              style={{
                width: 28, height: 28,
                color: done ? PINK : `rgba(224,99,122,${0.35 + displayProgress * 0.65})`,
                transition: "color 200ms ease",
              }}
              strokeWidth={1.5}
            />
          </button>
        </div>
        <p style={{
          fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: "-0.01em",
          color: done ? PINK : "rgba(255,255,255,0.40)",
          transition: "color 400ms ease",
        }}>
          {done ? "A chama está acesa." : "Manter pressionado"}
        </p>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.50)", margin: 0,
          maxWidth: "28ch", lineHeight: 1.6,
          opacity: done ? 1 : 0,
          transform: done ? "none" : "translateY(8px)",
          transition: "opacity 600ms ease, transform 600ms ease",
        }}>
          Pequenos gestos mantêm o que importa aceso.
        </p>
      </div>
    </section>
  );
}

// ── Cena 06 — Manifesto ───────────────────────────────────────────────────────

const MANIFESTO_TEXT = "O amor não precisa de grandes gestos para ser real. Precisa de aparecer. Todos os dias. Em pequenos momentos que, somados, se tornam a história de vocês.";

function ManifestoScene({ reduced }: { reduced: boolean | null }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(outerRef);
  const isMob = useMediaQuery("(max-width: 767px)");
  const words = MANIFESTO_TEXT.split(" ");

  if (isMob) {
    return (
      <section style={{ background: NAVY, padding: "72px 7%", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: "20%", right: "-8%", width: 260, height: 260, borderRadius: "50%", background: `${PINK}16`, filter: "blur(70px)", pointerEvents: "none" }} />
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}88`, marginBottom: 24, marginTop: 0, position: "relative" }}>
          Manifesto
        </p>
        <p style={{ fontSize: "clamp(18px, 5.5vw, 26px)", fontWeight: 800, lineHeight: 1.45, letterSpacing: "-0.01em", margin: 0, color: "white", position: "relative", fontFamily: "'Fraunces', Georgia, serif" }}>
          {MANIFESTO_TEXT}
        </p>
      </section>
    );
  }

  return (
    <div ref={outerRef} style={{ height: "200vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", background: NAVY, display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "25%", right: "-8%", width: 440, height: 440, borderRadius: "50%", background: `${PINK}16`, filter: "blur(90px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "-5%", width: 300, height: 300, borderRadius: "50%", background: "rgba(77,124,254,0.09)", filter: "blur(70px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 7%", width: "100%" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}88`, marginBottom: 36, marginTop: 0 }}>
            Manifesto
          </p>
          <p style={{ fontSize: "clamp(20px, 3.6vw, 46px)", fontWeight: 800, lineHeight: 1.38, letterSpacing: "-0.01em", maxWidth: 860, margin: 0, fontFamily: "'Fraunces', Georgia, serif" }}>
            {words.map((word, i) => {
              const threshold = (i / (words.length - 1)) * 0.9;
              const lit = reduced || progress > threshold;
              return (
                <span key={i} style={{ color: lit ? "white" : "rgba(255,255,255,0.1)", transition: "color 0.35s ease" }}>
                  {word}{" "}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduced = useReducedMotion();
  const isMob = useMediaQuery("(max-width: 767px)");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("lovenest_ref", ref.toUpperCase());
      localStorage.setItem("lovenest_ref", ref.toUpperCase());
    }
  }, [searchParams]);

  const btn = (id: string): React.CSSProperties => ({
    background: PINK,
    boxShadow: activeBtn === id ? `0 14px 40px ${PINK}55` : `0 4px 20px ${PINK}44`,
    transform: activeBtn === id ? "translateY(-2px)" : "none",
    transition: "box-shadow 200ms ease, transform 200ms ease",
  });

  return (
    <div style={{ minHeight: "100vh", background: NAVY, overflowX: "hidden" }}>
      {/* Skip link — acessibilidade */}
      <a href="#main" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0, left: 0, top: 0 }}>Saltar para o conteúdo</a>

      {/* Fixed nav — flutua sobre todas as cenas */}
      <LandingNav />

      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
      {/* ══ CENA 01 — HERO ══ */}
      <HeroScene />

      {/* ══ CENA 02 — PEQUENOS GESTOS ══ */}
      <GesturesScene />

      {/* ══ CENA 03 — MESMO LONGE ══ */}
      <DistanceScene />

      {/* ══ CENA 04 — MEMÓRIAS ══ */}
      <MemoriesScene />

      {/* ══ CENA 05 — A VOSSA CHAMA ══ */}
      <FlameScene />

      {/* ══ CENA 05.5 — RITUAL INTERATIVO ══ */}
      <FlameInteractive reduced={!!reduced} />

      {/* ══ CENA 06 — MANIFESTO ══ */}
      <ManifestoScene reduced={reduced} />

      {/* ══ CENA 07 — CTA FINAL ══ */}
      <section style={{ background: NAVY, position: "relative", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position: "absolute", top: "30%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: `${PINK}1a`, filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-8%", width: 350, height: 350, borderRadius: "50%", background: "rgba(77,124,254,0.09)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMob ? "72px 24px" : "100px 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Reveal reduced={!!reduced}>
            <div>
              <h2 style={{ fontSize: "clamp(30px, 5vw, 68px)", fontWeight: 900, color: "white", lineHeight: 1.04, letterSpacing: "-0.03em", marginTop: 0, marginBottom: 20, fontFamily: "'Fraunces', Georgia, serif" }}>
                O vosso ninho<br />espera por vocês.
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.60)", marginBottom: 44, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
                Criem o vosso espaço e comecem a construir a vossa história juntos.
              </p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <button
                  onClick={() => navigate("/inicio")}
                  onMouseEnter={() => setActiveBtn("cta")}
                  onMouseLeave={() => setActiveBtn(null)}
                  style={{ height: 56, padding: "0 40px", borderRadius: 18, color: "white", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, ...btn("cta") }}
                >
                  Criar o nosso espaço
                  <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                </button>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", margin: 0 }}>Grátis · Privado · Sem publicidade</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{ background: NAVY, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={20} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>LoveNest</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", margin: 0 }}>Um espaço privado para o vosso amor.</p>
        </div>
      </footer>
    </div>
  );
}

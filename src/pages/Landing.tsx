import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Flame, Heart, MessageCircle, Camera } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const PINK = "#E0637A";
const NAVY = "#0B1324";
const CREAM = "#FAF9F7";

// ── Motion hooks ──────────────────────────────────────────────────────────────

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

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

// ── Images ────────────────────────────────────────────────────────────────────

type ImgName = "hero" | "distance" | "gestures";

function Pic({ name, alt, eager = false, imgStyle }: {
  name: ImgName; alt: string; eager?: boolean; imgStyle?: React.CSSProperties;
}) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`/${name}-768.webp 768w, /${name}-1280.webp 1280w, /${name}-1920.webp 1920w`}
        sizes="(max-width: 768px) 768px, (max-width: 1280px) 1280px, 1920px"
      />
      <img
        src={`/${name}.jpg`} alt={alt}
        loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "low"} decoding="async"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", ...imgStyle }}
      />
    </picture>
  );
}

// ── Reveal ────────────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, dx = 0, className = "", reduced = false }: {
  children: React.ReactNode; delay?: number; dx?: number; className?: string; reduced?: boolean;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: (visible || reduced) ? "none" : `translate(${dx}px, 24px)`,
        transition: reduced
          ? `opacity 300ms ease ${delay}ms`
          : `opacity 900ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 900ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Marquee ───────────────────────────────────────────────────────────────────

const MARQUEE_WORDS = [
  "Privado por design", "Só de vocês", "Presente todos os dias",
  "Sem algoritmos", "Sem publicidade", "O vosso espaço",
];

function Marquee() {
  const items = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div style={{ background: NAVY, overflow: "hidden", padding: "12px 0" }}>
      <div style={{
        display: "flex", whiteSpace: "nowrap",
        animation: "ln-marquee 32s linear infinite",
      }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", paddingRight: 36 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
              {item}
            </span>
            <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: PINK, opacity: 0.55, marginLeft: 36 }} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Phone content per feature ─────────────────────────────────────────────────

function PhoneScreen({ index }: { index: number }) {
  const screens = [
    // 0 — Jornada
    <div style={{ padding: "48px 16px 24px" }}>
      <p style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>Bom dia</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: NAVY, marginBottom: 20 }}>A vossa jornada</p>
      <div style={{ background: "white", borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${PINK}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Flame className="w-4 h-4" style={{ color: PINK }} strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, color: "#aaa", margin: 0 }}>Jornada</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>14 dias juntos</p>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: `${PINK}15`, color: PINK, flexShrink: 0 }}>Ambos</span>
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 16, padding: 14, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <p style={{ fontSize: 10, color: "#aaa", marginBottom: 8, marginTop: 0 }}>Hoje</p>
        <div style={{ display: "flex", gap: 6 }}>
          {["Oração", "Sem redes", "Juntos"].map((t, i) => (
            <span key={t} style={{ fontSize: 9, fontWeight: 600, padding: "4px 8px", borderRadius: 999, background: i === 0 ? PINK : "#f3f3f3", color: i === 0 ? "white" : "#aaa" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>,

    // 1 — Humor
    <div style={{ padding: "48px 16px 24px" }}>
      <p style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>Como estás hoje?</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: NAVY, marginBottom: 20 }}>O teu estado de alma</p>
      <div style={{ background: "white", borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <p style={{ fontSize: 10, color: "#aaa", marginTop: 0, marginBottom: 10 }}>Como te sentes?</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {["Feliz", "Grato", "Em paz", "Cansado"].map((m, i) => (
            <span key={m} style={{ fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 999, background: i === 0 ? PINK : "#f3f3f3", color: i === 0 ? "white" : "#aaa" }}>{m}</span>
          ))}
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 16, padding: 14, boxShadow: "0 2px 12px rgba(11,19,36,0.07)" }}>
        <p style={{ fontSize: 10, color: "#aaa", marginTop: 0, marginBottom: 6 }}>Ela está</p>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: `${PINK}15`, color: PINK }}>Feliz</span>
      </div>
    </div>,

    // 2 — Chat
    <div style={{ padding: "48px 16px 24px" }}>
      <p style={{ fontSize: 17, fontWeight: 800, color: NAVY, marginBottom: 16 }}>Só de vocês</p>
      {[
        { me: false, text: "Já reparei que hoje levantaste cedo." },
        { me: true, text: "Sim, precisava de silêncio antes do dia começar." },
        { me: false, text: "Boa semana, meu amor." },
      ].map((msg, i) => (
        <div key={i} style={{ display: "flex", justifyContent: msg.me ? "flex-end" : "flex-start", marginBottom: 8 }}>
          <div style={{
            maxWidth: "78%", padding: "8px 12px",
            borderRadius: msg.me ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            background: msg.me ? PINK : "white",
            color: msg.me ? "white" : NAVY,
            fontSize: 11, lineHeight: 1.5, fontWeight: 500,
            boxShadow: "0 2px 8px rgba(11,19,36,0.07)",
          }}>
            {msg.text}
          </div>
        </div>
      ))}
    </div>,

    // 3 — Memórias
    <div style={{ padding: "48px 16px 24px" }}>
      <p style={{ fontSize: 17, fontWeight: 800, color: NAVY, marginBottom: 16 }}>As vossas memórias</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {["#e8d5d8", "#d5dce8", "#d8e8d5", "#e8e2d5"].map((bg, i) => (
          <div key={i} style={{ aspectRatio: "1", borderRadius: 12, background: bg }} />
        ))}
      </div>
      <div style={{ background: "white", borderRadius: 12, padding: 12, boxShadow: "0 2px 8px rgba(11,19,36,0.07)" }}>
        <p style={{ fontSize: 10, color: "#aaa", margin: "0 0 4px" }}>Adicionada ontem</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: NAVY, margin: 0 }}>"Um dia ordinário inesquecível."</p>
      </div>
    </div>,
  ];

  return (
    <div style={{ background: CREAM, minHeight: 440, position: "relative" }}>
      <div key={index} style={{ animation: "ln-feature-in 0.45s cubic-bezier(0.16,1,0.3,1)" }}>
        {screens[index]}
      </div>
    </div>
  );
}

// ── Phone frame ───────────────────────────────────────────────────────────────

function PhoneMockup({ featureIndex }: { featureIndex: number }) {
  return (
    <div style={{
      width: 248, flexShrink: 0, borderRadius: 40, background: NAVY, overflow: "hidden",
      boxShadow: "0 40px 100px rgba(11,19,36,0.30), 0 0 0 1px rgba(11,19,36,0.08)",
      position: "relative", zIndex: 1,
    }}>
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 72, height: 18, background: "#000", borderRadius: 10, zIndex: 10 }} />
      <PhoneScreen index={featureIndex} />
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", background: CREAM }}>
        <div style={{ width: 80, height: 4, borderRadius: 2, background: "#ddd" }} />
      </div>
    </div>
  );
}

// ── Pinned feature scroll ─────────────────────────────────────────────────────

const FEATURES = [
  { icon: Flame,         label: "Jornada",  title: "Cada dia conta.", desc: "Uma jornada construída a dois. Pequenas ações diárias que criam um ritual de presença — mesmo quando a vida corre a cem à hora." },
  { icon: Heart,         label: "Humor",    title: "Como estás realmente?", desc: "Não o que dizes em público. O que sentes de verdade. Partilhar o teu humor diário cria uma intimidade que as palavras demoram a construir." },
  { icon: MessageCircle, label: "Chat",     title: "Mensagens que ficam.", desc: "Sem notificações de grupo. Sem distrações. Um espaço só para vocês — onde cada palavra foi escrita a pensar numa única pessoa." },
  { icon: Camera,        label: "Memórias", title: "A vossa história.", desc: "Um álbum privado que cresce dia após dia. Nenhum algoritmo decide o que aparece primeiro — apenas a vossa linha do tempo." },
];

function PinnedFeatures({ reduced }: { reduced: boolean }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(outerRef);
  const fi = Math.min(FEATURES.length - 1, Math.floor(progress * FEATURES.length));
  const { icon: Icon, label, title, desc } = FEATURES[fi];

  if (reduced) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, padding: "80px 24px" }}>
        {FEATURES.map(({ icon: I, label: l, title: t, desc: d }) => (
          <div key={l} style={{ background: "white", borderRadius: 20, padding: 28 }}>
            <I className="w-5 h-5" style={{ color: PINK, marginBottom: 16 }} strokeWidth={1.5} />
            <p style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 10 }}>{t}</p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#9CA3AF" }}>{d}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={outerRef} style={{ height: `${FEATURES.length * 100}vh` }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>

        {/* Left — text */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 6% 0 7%", background: "white" }}>
          {/* Dot nav */}
          <div style={{ display: "flex", gap: 8, marginBottom: 48 }}>
            {FEATURES.map((_, i) => (
              <div key={i} style={{
                height: 6, borderRadius: 3,
                width: i === fi ? 28 : 6,
                background: i === fi ? PINK : `${PINK}25`,
                transition: "all 0.45s cubic-bezier(0.16,1,0.3,1)",
              }} />
            ))}
          </div>

          {/* Label */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${PINK}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon className="w-4 h-4" style={{ color: PINK }} strokeWidth={1.5} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: PINK }}>{label}</span>
          </div>

          {/* Title + desc — keyed so they re-animate on change */}
          <h2 key={`t-${fi}`} style={{
            fontSize: "clamp(28px, 3.2vw, 48px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.025em",
            color: NAVY, marginBottom: 20,
            animation: "ln-feature-in 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {title}
          </h2>
          <p key={`d-${fi}`} style={{
            fontSize: "clamp(14px, 1.3vw, 17px)", lineHeight: 1.72, color: "#6B7280", maxWidth: 400,
            animation: "ln-feature-in 0.5s cubic-bezier(0.16,1,0.3,1) 60ms both",
          }}>
            {desc}
          </p>

          {/* Progress bar */}
          <div style={{ marginTop: 44 }}>
            <div style={{ height: 2, background: `${PINK}15`, borderRadius: 1, maxWidth: 180, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: PINK, borderRadius: 1,
                width: `${((fi + 1) / FEATURES.length) * 100}%`,
                transition: "width 0.45s cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
            <p style={{ fontSize: 11, color: "#d0d0d0", marginTop: 8 }}>{fi + 1} / {FEATURES.length}</p>
          </div>
        </div>

        {/* Right — phone */}
        <div style={{ background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", width: 360, height: 360, borderRadius: "50%",
            background: `${PINK}14`, filter: "blur(80px)", pointerEvents: "none",
          }} />
          <PhoneMockup featureIndex={fi} />
        </div>
      </div>
    </div>
  );
}

// ── Manifesto word reveal ─────────────────────────────────────────────────────

const MANIFESTO_TEXT = "O amor não precisa de grandes gestos para ser real. Precisa de aparecer. Todos os dias. Em pequenos momentos que, somados, se tornam a história de vocês.";

function ManifestoSection({ reduced }: { reduced: boolean }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(outerRef);
  const words = MANIFESTO_TEXT.split(" ");

  return (
    <div ref={outerRef} style={{ height: "200vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", background: NAVY, display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* Ambient */}
        <div style={{ position: "absolute", top: "25%", right: "-8%", width: 440, height: 440, borderRadius: "50%", background: `${PINK}16`, filter: "blur(90px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "-5%", width: 300, height: 300, borderRadius: "50%", background: "rgba(77,124,254,0.09)", filter: "blur(70px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 7%" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: `${PINK}88`, marginBottom: 36 }}>
            Manifesto
          </p>
          <p style={{ fontSize: "clamp(20px, 3.6vw, 46px)", fontWeight: 800, lineHeight: 1.38, letterSpacing: "-0.01em", maxWidth: 860, margin: 0 }}>
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduced = useReducedMotion();
  const [heroReady, setHeroReady] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("lovenest_ref", ref.toUpperCase());
      localStorage.setItem("lovenest_ref", ref.toUpperCase());
    }
    const t = setTimeout(() => setHeroReady(true), 80);
    return () => clearTimeout(t);
  }, [searchParams]);

  const heroIn = (delay: number): React.CSSProperties => ({
    opacity: heroReady ? 1 : 0,
    transform: (heroReady || reduced) ? "none" : "translateY(20px)",
    transition: reduced ? "none" : `opacity 900ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 900ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const btn = (id: string): React.CSSProperties => ({
    background: PINK,
    boxShadow: activeBtn === id ? `0 14px 40px ${PINK}55` : `0 4px 20px ${PINK}44`,
    transform: activeBtn === id ? "translateY(-2px)" : "none",
    transition: "box-shadow 200ms ease, transform 200ms ease",
  });

  return (
    <div style={{ minHeight: "100vh", background: "white", overflowX: "hidden" }}>
      <style>{`
        @keyframes ln-marquee    { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes ln-feature-in { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes ln-scroll-cue { 0%,100% { opacity: 0.25; transform: translateY(0) } 50% { opacity: 0.5; transform: translateY(8px) } }
        @media (max-width: 900px) { .ln-hero-img { display: none !important } .ln-hero-text { width: 100% !important; padding: 80px 24px !important } }
        @media (max-width: 768px) { .ln-two-col { grid-template-columns: 1fr !important } .ln-steps { grid-template-columns: 1fr !important } }
      `}</style>

      {/* ── NAV ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={24} />
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: NAVY }}>LoveNest</span>
          </div>
          <button
            onClick={() => navigate("/entrar?returning=1")}
            style={{ fontSize: 13, fontWeight: 600, color: NAVY, opacity: 0.55, background: "none", border: "none", cursor: "pointer", transition: "opacity 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ══ 01 HERO ══ */}
      <section style={{ minHeight: "92vh", display: "flex", alignItems: "stretch", position: "relative", overflow: "hidden" }}>

        {/* Left — text */}
        <div
          className="ln-hero-text"
          style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px 7vw", position: "relative", zIndex: 2 }}
        >
          <div style={{ ...heroIn(0) }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: `${PINK}0e`, border: `1px solid ${PINK}25`, marginBottom: 36 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: PINK }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PINK }}>Um espaço só para vocês</span>
            </div>

            <h1 style={{ fontSize: "clamp(38px, 5.2vw, 72px)", fontWeight: 900, lineHeight: 1.03, letterSpacing: "-0.03em", color: NAVY, margin: "0 0 24px" }}>
              O amor<br />vive nos<br />
              <span style={{ color: PINK }}>dias comuns.</span>
            </h1>

            <p style={{ fontSize: "clamp(15px, 1.4vw, 18px)", lineHeight: 1.68, color: "#6B7280", maxWidth: 380, margin: "0 0 40px" }}>
              Não nos grandes gestos. Nos bons dias, nos momentos simples e nas manhãs de segunda-feira.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, ...heroIn(220) }}>
            <button
              onClick={() => navigate("/inicio")}
              onMouseEnter={() => setActiveBtn("hero")}
              onMouseLeave={() => setActiveBtn(null)}
              style={{ height: 54, padding: "0 32px", borderRadius: 16, color: "white", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, ...btn("hero") }}
            >
              Criar o nosso espaço
              <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => navigate("/entrar?returning=1")}
              style={{ fontSize: 13, fontWeight: 600, color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Já tenho convite do meu par
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 40, ...heroIn(380) }}>
            {["Privado", "Sem publicidade", "Só de vocês"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "#f8f8f8", border: "1px solid #efefef" }}>
                <Lock style={{ width: 10, height: 10, color: "#ccc" }} strokeWidth={2} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#999" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — image */}
        <div
          className="ln-hero-img"
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            opacity: heroReady ? 1 : 0,
            transform: (heroReady || reduced) ? "none" : "translateX(20px)",
            transition: reduced ? "none" : "opacity 1400ms cubic-bezier(0.16,1,0.3,1) 120ms, transform 1400ms cubic-bezier(0.16,1,0.3,1) 120ms",
          }}
        >
          <Pic name="hero" alt="Dois num mesmo espaço" eager imgStyle={{ position: "absolute", inset: "0", width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, white 0%, transparent 16%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(255,255,255,0.3) 0%, transparent 25%)" }} />
        </div>

        {/* Scroll cue */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10, animation: "ln-scroll-cue 2.2s ease-in-out infinite" }}>
          <div style={{ width: 1, height: 36, background: NAVY, opacity: 0.2, margin: "0 auto" }} />
        </div>
      </section>

      {/* ══ MARQUEE ══ */}
      <Marquee />

      {/* ══ 02 PRESENÇA ══ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px" }}>
        <div className="ln-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "center" }}>
          <Reveal reduced={reduced}>
            <div style={{ borderRadius: 28, overflow: "hidden", aspectRatio: "4/3", boxShadow: "0 24px 60px rgba(11,19,36,0.10)" }}>
              <Pic name="distance" alt="Presença" />
            </div>
          </Reveal>
          <Reveal delay={100} reduced={reduced}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: PINK, marginBottom: 20, marginTop: 0 }}>Presença</p>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.025em", color: NAVY, marginTop: 0, marginBottom: 20 }}>
                Estar perto não chega.<br />
                <span style={{ color: PINK }}>Estar presente, sim.</span>
              </h2>
              <p style={{ fontSize: "clamp(14px, 1.3vw, 16px)", lineHeight: 1.72, color: "#6B7280", marginBottom: 16 }}>
                A vida move-se depressa. Os dias enchem-se. E de repente passam semanas sem que realmente se tenham visto — mesmo estando no mesmo sítio.
              </p>
              <p style={{ fontSize: "clamp(14px, 1.3vw, 16px)", lineHeight: 1.72, color: "#6B7280", margin: 0 }}>
                O LoveNest é um lembrete diário de que o outro existe. E que tu também.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 03 PINNED FEATURES ══ */}
      <div style={{ background: CREAM }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <PinnedFeatures reduced={reduced} />
        </div>
      </div>

      {/* ══ 04 EDITORIAL IMAGE ══ */}
      <section style={{ padding: "24px 24px" }}>
        <Reveal reduced={reduced}>
          <div style={{ borderRadius: 28, overflow: "hidden", minHeight: 480, position: "relative", boxShadow: "0 32px 80px rgba(11,19,36,0.15)" }}>
            <Pic name="gestures" alt="Pequenos gestos" imgStyle={{ position: "absolute", inset: "0", width: "100%", height: "100%" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${NAVY}f2 0%, ${NAVY}a8 32%, transparent 65%)` }} />
            <div style={{ position: "absolute", inset: 0, padding: "clamp(36px, 5vw, 64px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ maxWidth: 480 }}>
                <h2 style={{ fontSize: "clamp(24px, 3.5vw, 48px)", fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.025em", marginTop: 0, marginBottom: 16 }}>
                  São os pequenos<br />gestos que ficam.
                </h2>
                <p style={{ fontSize: "clamp(13px, 1.3vw, 16px)", lineHeight: 1.72, color: "rgba(255,255,255,0.60)", margin: 0 }}>
                  Uma mensagem de bom dia. Registar como te sentes. Uma foto de algo que te fez lembrar dele. Não é sobre fazer mais — é sobre estar presente de propósito.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ 05 MANIFESTO WORD REVEAL ══ */}
      <ManifestoSection reduced={reduced} />

      {/* ══ 06 COMO FUNCIONA ══ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
        <Reveal reduced={reduced}>
          <h2 style={{ fontSize: "clamp(26px, 3.2vw, 44px)", fontWeight: 900, letterSpacing: "-0.025em", color: NAVY, marginTop: 0, marginBottom: 64 }}>
            Tão simples como<br />um bom dia.
          </h2>
        </Reveal>
        <div className="ln-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
          {[
            { title: "Criam o vosso espaço",    desc: "Um de vocês abre o LoveNest e cria o ninho. Em dois minutos, está pronto.", delay: 0 },
            { title: "Convidam o vosso par",     desc: "Um código. Uma mensagem. E o outro está lá — no mesmo espaço, ao mesmo tempo.", delay: 80 },
            { title: "Aparecem um para o outro", desc: "Todos os dias. Nos grandes momentos e nos ordinários. O amor constrói-se assim.", delay: 160 },
          ].map(({ title, desc, delay }) => (
            <Reveal key={title} delay={delay} reduced={reduced}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 2, background: PINK, borderRadius: 1, marginBottom: 24 }} />
                <p style={{ fontSize: "clamp(15px, 1.4vw, 17px)", fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>{title}</p>
                <p style={{ fontSize: "clamp(13px, 1.2vw, 15px)", lineHeight: 1.72, color: "#9CA3AF", margin: 0 }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ 07 CTA ══ */}
      <section style={{ background: NAVY, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: `${PINK}1a`, filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-8%", width: 350, height: 350, borderRadius: "50%", background: "rgba(77,124,254,0.09)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Reveal reduced={reduced}>
            <div>
              <h2 style={{ fontSize: "clamp(30px, 5vw, 68px)", fontWeight: 900, color: "white", lineHeight: 1.04, letterSpacing: "-0.03em", marginTop: 0, marginBottom: 20 }}>
                O vosso ninho<br />espera por vocês.
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", marginBottom: 44, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
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
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.20)", margin: 0 }}>Grátis · Privado · Sem publicidade</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: NAVY, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={20} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>LoveNest</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", margin: 0 }}>Um espaço privado para o vosso amor.</p>
        </div>
      </footer>
    </div>
  );
}

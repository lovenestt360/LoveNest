import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Flame, Heart, MessageCircle, Camera, BookHeart } from "lucide-react";
import { LogoMark } from "@/components/Logo";

// ── Brand ─────────────────────────────────────────────────────────────────────
const PINK = "#FF6B8F";
const NAVY = "#0B1324";
const WARM = "#FFF0E8";

// ── Hooks ─────────────────────────────────────────────────────────────────────

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

function useReveal(threshold = 0.12) {
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

function useParallax(strength: number, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  useEffect(() => {
    if (!enabled) { setY(0); return; }
    let raf: number;
    const tick = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.5 - (r.top + r.height * 0.5)) / vh;
      setY(Math.max(-strength, Math.min(strength, progress * strength * 2)));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [enabled, strength]);
  return { ref, y };
}

// ── Responsive image with WebP ────────────────────────────────────────────────

type ImgName = "hero" | "distance" | "gestures" | "safe";

function Pic({
  name, alt, eager = false, imgStyle,
}: {
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
        src={`/${name}.jpg`}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "low"}
        decoding="async"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          ...imgStyle,
        }}
      />
    </picture>
  );
}

// ── Ambient light system — 4 blobs, extremely subtle, slow ───────────────────

function AmbientBlobs({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}
    >
      {/* Top-right — rosa, lento */}
      <div style={{
        position: "absolute", top: "-8%", right: "-10%",
        width: 640, height: 640, borderRadius: "50%",
        background: PINK, filter: "blur(140px)", opacity: 0.055,
        animation: "blob-a 16s ease-in-out infinite",
      }} />
      {/* Bottom-left — azul, mais lento */}
      <div style={{
        position: "absolute", bottom: "8%", left: "-12%",
        width: 520, height: 520, borderRadius: "50%",
        background: "#4D7CFE", filter: "blur(160px)", opacity: 0.04,
        animation: "blob-b 18s ease-in-out infinite",
      }} />
      {/* Centro — branco quente, muito largo, quase imperceptível */}
      <div style={{
        position: "absolute", top: "32%", left: "5%",
        width: 820, height: 340, borderRadius: "50%",
        background: WARM, filter: "blur(120px)", opacity: 0.07,
        animation: "blob-c 14s ease-in-out infinite",
      }} />
      {/* Topo-esquerdo — eco rosa, pequeno */}
      <div style={{
        position: "absolute", top: "12%", left: "-8%",
        width: 340, height: 340, borderRadius: "50%",
        background: PINK, filter: "blur(100px)", opacity: 0.025,
        animation: "blob-a 22s ease-in-out infinite",
        animationDelay: "-9s",
      }} />
    </div>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────

function Reveal({
  children, delay = 0, className = "", reduced = false,
}: {
  children: React.ReactNode; delay?: number; className?: string; reduced?: boolean;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible || reduced ? "translateY(0)" : "translateY(30px)",
        transition: reduced
          ? `opacity 300ms ease ${delay}ms`
          : `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Phone mockup ──────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 268 }}>
      {/* Chip — streak */}
      <div
        className="absolute z-20 bg-white rounded-2xl border border-[#f0f0f0] px-3 py-2.5 items-center gap-2.5 hidden md:flex"
        style={{ left: -84, top: 72, boxShadow: "0 8px 32px rgba(11,19,36,0.10)" }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${PINK}18` }}>
          <Flame className="w-3 h-3" style={{ color: PINK }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[9px] text-[#bbb] font-medium leading-none mb-0.5">LoveStreak</p>
          <p className="text-[13px] font-black leading-none" style={{ color: NAVY }}>14 dias</p>
        </div>
      </div>
      {/* Chip — mood */}
      <div
        className="absolute z-20 bg-white rounded-2xl border border-[#f0f0f0] px-3 py-2.5 hidden md:block"
        style={{ right: -80, bottom: 96, boxShadow: "0 8px 32px rgba(11,19,36,0.10)" }}
      >
        <p className="text-[9px] text-[#bbb] font-medium leading-none mb-1.5">Ela está bem</p>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: PINK }}>
          Feliz
        </span>
      </div>

      {/* Frame */}
      <div className="relative overflow-hidden" style={{
        borderRadius: 44,
        background: NAVY,
        boxShadow: "0 40px 100px rgba(11,19,36,0.28), 0 0 0 1px rgba(11,19,36,0.07)",
      }}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10" style={{ width: 80, height: 20, background: "#000", borderRadius: 12 }} />
        <div style={{ background: "#F8F7F5", paddingTop: 48, paddingBottom: 24 }}>
          <div className="flex items-center justify-between px-5 mb-5">
            <div>
              <p className="text-[10px] font-medium" style={{ color: "#aaa" }}>Bom dia</p>
              <p className="text-[16px] font-bold leading-tight" style={{ color: NAVY }}>O vosso espaço</p>
            </div>
            <div className="w-8 h-8 rounded-full" style={{ background: "#e0e0e0" }} />
          </div>
          <div className="mx-3 mb-2.5 bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 12px rgba(11,19,36,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${PINK}15` }}>
                <Flame className="w-4 h-4" style={{ color: PINK }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px]" style={{ color: "#aaa" }}>LoveStreak</p>
                <p className="text-[15px] font-black leading-tight" style={{ color: NAVY }}>14 dias juntos</p>
              </div>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${PINK}15`, color: PINK }}>
                Ambos
              </span>
            </div>
          </div>
          <div className="mx-3 mb-2.5 bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 12px rgba(11,19,36,0.06)" }}>
            <p className="text-[10px] mb-2" style={{ color: "#aaa" }}>Como estás hoje?</p>
            <div className="flex gap-1.5">
              {["Feliz", "Grato", "Em paz"].map((m, i) => (
                <span key={m} className="text-[9px] font-semibold px-2 py-1 rounded-full"
                  style={i === 0 ? { background: PINK, color: "#fff" } : { background: "#f3f3f3", color: "#aaa" }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="mx-3 bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 12px rgba(11,19,36,0.06)" }}>
            <p className="text-[10px] mb-1.5" style={{ color: "#aaa" }}>Mensagem do teu par</p>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: NAVY }}>
              "Já reparei que hoje levantaste cedo. Boa semana, meu amor."
            </p>
            <p className="text-[9px] mt-1.5" style={{ color: "#ccc" }}>08:24</p>
          </div>
        </div>
        <div className="flex justify-center py-2" style={{ background: "#F8F7F5" }}>
          <div className="w-24 h-1 rounded-full" style={{ background: "#ddd" }} />
        </div>
      </div>
    </div>
  );
}

// ── Feature pill ──────────────────────────────────────────────────────────────

function FeaturePill({ icon: Icon, label, accent }: { icon: React.ElementType; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#efefef]">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} strokeWidth={1.5} />
      <span className="text-[12px] font-medium" style={{ color: NAVY }}>{label}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reduced = useReducedMotion();
  const [heroReady, setHeroReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const pe = !reduced && isDesktop;

  const heroP     = useParallax(5, pe);
  const distanceP = useParallax(7, pe);
  const gesturesP = useParallax(7, pe);
  const safeP     = useParallax(7, pe);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("lovenest_ref", ref.toUpperCase());
      localStorage.setItem("lovenest_ref", ref.toUpperCase());
    }
    const t = setTimeout(() => setHeroReady(true), 60);
    return () => clearTimeout(t);
  }, [searchParams]);

  useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, []);

  const heroImgStyle: React.CSSProperties = {
    opacity: heroReady ? 1 : 0,
    transform: heroReady || reduced ? "scale(1)" : "scale(1.03)",
    transition: reduced
      ? "opacity 400ms ease"
      : "opacity 1400ms cubic-bezier(0.16,1,0.3,1), transform 1400ms cubic-bezier(0.16,1,0.3,1)",
  };

  const heroText = (delay: number): React.CSSProperties => ({
    opacity: heroReady ? 1 : 0,
    transform: heroReady || reduced ? "translateY(0)" : "translateY(20px)",
    transition: reduced
      ? "none"
      : `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const btnStyle = (id: string): React.CSSProperties => ({
    background: PINK,
    boxShadow: activeBtn === id
      ? `0 8px 32px ${PINK}55, 0 2px 8px ${PINK}30`
      : `0 4px 24px ${PINK}45`,
    transform: activeBtn === id ? "translateY(-2px)" : "translateY(0)",
    transition: "box-shadow 180ms ease, transform 180ms ease",
  });

  const pxWrap = (y: number): React.CSSProperties => ({
    position: "absolute", inset: 0,
    height: pe ? "calc(100% + 16px)" : "100%",
    marginTop: pe ? -8 : 0,
    transform: pe ? `translateY(${y}px)` : undefined,
    willChange: pe ? "transform" : "auto",
  });

  const pxImg = (y: number): React.CSSProperties => ({
    height: pe ? "calc(100% + 16px)" : "100%",
    marginTop: pe ? -8 : 0,
    transform: pe ? `translateY(${y}px)` : undefined,
    willChange: pe ? "transform" : "auto",
  });

  // Shared warm tint — applied inside all image containers for visual consistency
  const warmTint = (
    <div
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "rgba(255,180,110,0.07)",
        mixBlendMode: "multiply",
      }}
    />
  );

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ position: "relative", zIndex: 1 }}>

      <AmbientBlobs reduced={reduced} />

      {/* ══════════════════════════════════════════════
          NAV
          ════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#f0f0f0]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2"
            style={{ animation: reduced ? undefined : "logo-float 8s ease-in-out infinite" }}
          >
            <LogoMark size={26} />
            <span className="text-[14px] font-bold tracking-tight" style={{ color: NAVY }}>LoveNest</span>
          </div>
          <button
            onClick={() => navigate("/entrar")}
            className="text-[13px] font-semibold transition-opacity hover:opacity-60"
            style={{ color: NAVY }}
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          01 — HERO
          ════════════════════════════════════════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-5 pt-5">

        {/* Atmospheric glow — behind the hero image, sets the premium tone */}
        {!reduced && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute", top: 4, left: "4%", right: "4%",
              height: "clamp(260px, 55vw, 520px)",
              background: `radial-gradient(ellipse at 62% 42%, ${PINK}28 0%, rgba(77,124,254,0.12) 42%, transparent 68%)`,
              filter: "blur(52px)",
              borderRadius: "1.5rem",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Hero image */}
        <div
          ref={heroP.ref}
          className="relative w-full rounded-3xl overflow-hidden"
          style={{ height: "clamp(260px, 55vw, 520px)", zIndex: 1, ...heroImgStyle }}
        >
          <div style={pxWrap(heroP.y)}>
            <Pic name="hero" alt="Dois num mesmo espaço" eager imgStyle={{ height: "100%" }} />
          </div>
          {/* Warm tint */}
          {warmTint}
          {/* Gradient — fuses image into white below */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.55) 72%, #ffffff 100%)" }}
          />
        </div>

        {/* Headline + CTAs */}
        <div className="relative z-10 max-w-xl pt-1 pb-14 sm:pb-20 space-y-7">
          <div className="space-y-4" style={heroText(200)}>
            <h1 className="text-[40px] sm:text-[52px] font-black leading-[1.04] tracking-tight" style={{ color: NAVY }}>
              O amor vive<br />
              nos{" "}<span style={{ color: PINK }}>dias comuns.</span>
            </h1>
            <p className="text-[16px] sm:text-[17px] leading-relaxed max-w-sm" style={{ color: "#717171" }}>
              Não nos grandes gestos. Nos bons dias, nos momentos simples e nas manhãs de segunda-feira.
            </p>
          </div>

          <div className="space-y-3" style={heroText(350)}>
            <button
              onClick={() => navigate("/inicio")}
              onMouseEnter={() => setActiveBtn("hero")}
              onMouseLeave={() => setActiveBtn(null)}
              className="w-full sm:w-auto sm:px-8 h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98]"
              style={btnStyle("hero")}
            >
              Criar o nosso espaço
              <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            </button>
            <div>
              <button
                onClick={() => navigate("/entrar")}
                className="text-[13px] font-medium"
                style={{ color: "#aaa", transition: "color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#717171")}
                onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
              >
                Já tenho convite do meu par
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" style={heroText(480)}>
            {["Privado", "Sem publicidade", "Só de vocês"].map(t => (
              <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#efefef]">
                <Lock className="w-2.5 h-2.5 text-[#ccc]" strokeWidth={2} />
                <span className="text-[11px] font-medium" style={{ color: "#999" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          02 — PRESENÇA À DISTÂNCIA
          Transição suave: branco → branco (section flow)
          ════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">

          <Reveal delay={0} className="order-2 md:order-1 space-y-5" reduced={reduced}>
            <h2 className="text-[28px] sm:text-[36px] font-black leading-[1.1] tracking-tight" style={{ color: NAVY }}>
              Estar perto<br />não chega.<br />
              <span style={{ color: PINK }}>Estar presente, sim.</span>
            </h2>
            <p className="text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "#717171" }}>
              A vida move-se depressa. Os dias enchem-se. E de repente passam semanas sem que realmente se tenham visto — mesmo estando no mesmo sítio.
            </p>
            <p className="text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "#717171" }}>
              O LoveNest é um lembrete diário de que o outro existe. E que tu também.
            </p>
          </Reveal>

          <Reveal delay={120} className="order-1 md:order-2" reduced={reduced}>
            {/* Image container — rich shadow for mobile depth */}
            <div
              ref={distanceP.ref}
              className="relative rounded-3xl overflow-hidden"
              style={{
                aspectRatio: "4/3",
                boxShadow: "0 24px 60px rgba(11,19,36,0.11), 0 6px 18px rgba(11,19,36,0.06)",
              }}
            >
              <Pic name="distance" alt="Presença à distância" imgStyle={pxImg(distanceP.y)} />
              {warmTint}
            </div>
          </Reveal>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          03 — PRODUTO EM CONTEXTO
          Transição: gradiente branco → off-white → branco
          ════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(to bottom, #ffffff 0%, #FAFAF8 56px, #FAFAF8 calc(100% - 56px), #ffffff 100%)",
        position: "relative", zIndex: 1,
      }}>
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">

          <Reveal className="text-center mb-12 space-y-3" reduced={reduced}>
            <h2 className="text-[26px] sm:text-[34px] font-black leading-[1.1] tracking-tight" style={{ color: NAVY }}>
              Um espaço que só existe<br />para vocês dois.
            </h2>
            <p className="text-[14px] sm:text-[15px] leading-relaxed max-w-[300px] mx-auto" style={{ color: "#717171" }}>
              Sem feeds públicos. Sem notificações de estranhos. Cada gesto tem peso porque foi feito a pensar numa pessoa.
            </p>
          </Reveal>

          {/* Phone mockup with ambient glow behind it */}
          <Reveal delay={100} reduced={reduced}>
            <div className="relative">
              {!reduced && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "90%", height: "100%",
                    background: `radial-gradient(ellipse at center, ${PINK}1a 0%, rgba(77,124,254,0.08) 45%, transparent 70%)`,
                    filter: "blur(40px)",
                    pointerEvents: "none",
                  }}
                />
              )}
              <div style={{ position: "relative", zIndex: 1 }}>
                <PhoneMockup />
              </div>
            </div>
          </Reveal>

          <Reveal delay={200} className="mt-12 flex flex-wrap gap-2 justify-center" reduced={reduced}>
            <FeaturePill icon={Flame}         accent={PINK}    label="LoveStreak" />
            <FeaturePill icon={Heart}         accent={PINK}    label="Humor diário" />
            <FeaturePill icon={MessageCircle} accent="#4D7CFE" label="Mensagens" />
            <FeaturePill icon={Camera}        accent="#4D7CFE" label="Memórias" />
            <FeaturePill icon={BookHeart}     accent={PINK}    label="Rituais" />
          </Reveal>

          <p className="text-center text-[11px] mt-6" style={{ color: "#ccc", letterSpacing: "0.03em" }}>
            O vosso espaço, numa manhã qualquer.
          </p>

        </section>
      </div>

      {/* ══════════════════════════════════════════════
          04 — PEQUENOS GESTOS
          Imagem editorial full-bleed com tratamento de cor
          ════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
        <Reveal reduced={reduced}>
          <div
            ref={gesturesP.ref}
            className="relative rounded-3xl overflow-hidden"
            style={{
              minHeight: 420,
              boxShadow: "0 32px 80px rgba(11,19,36,0.15), 0 8px 24px rgba(11,19,36,0.08)",
            }}
          >
            {/* Image */}
            <div style={pxWrap(gesturesP.y)}>
              <Pic name="gestures" alt="Pequenos gestos" imgStyle={{ height: "100%" }} />
            </div>
            {/* Warm tint — sobre a imagem, abaixo dos gradientes */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "rgba(255,180,110,0.06)",
                mixBlendMode: "multiply",
              }}
            />
            {/* Gradient escuro para legibilidade do texto */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${NAVY}f5 0%, ${NAVY}cc 28%, ${NAVY}55 52%, transparent 72%)` }}
            />
            {/* Ambient top glow dentro da secção */}
            {!reduced && (
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 80% 10%, ${PINK}18 0%, transparent 50%)`,
                }}
              />
            )}
            {/* Text */}
            <div className="relative z-10 flex flex-col justify-end p-8 sm:p-12 md:p-14" style={{ minHeight: 420 }}>
              <div className="max-w-sm space-y-4">
                <h2 className="text-[26px] sm:text-[34px] font-black text-white leading-[1.1] tracking-tight">
                  São os pequenos<br />gestos que ficam.
                </h2>
                <p className="text-[14px] sm:text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Uma mensagem de bom dia. Registar como te sentes. Uma foto de algo que te fez lembrar dele.
                  Não é sobre fazer mais — é sobre estar presente de propósito.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════
          05 — ESPAÇO SEGURO
          Navy com atmosfera interna — dois. mais ninguém.
          ════════════════════════════════════════════ */}
      <div style={{ background: NAVY, position: "relative", zIndex: 1 }}>
        {/* Transição suave: branco → navy */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 64,
          background: `linear-gradient(to bottom, ${NAVY}00, ${NAVY})`,
          marginTop: -64, zIndex: 2, pointerEvents: "none",
        }} />

        <section className="relative max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
          {/* Atmosfera interna da secção navy */}
          {!reduced && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
                background: `
                  radial-gradient(ellipse at 88% 12%, rgba(77,124,254,0.20) 0%, transparent 48%),
                  radial-gradient(ellipse at 12% 88%, ${PINK}28 0%, transparent 40%)
                `,
              }}
            />
          )}

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">

            <Reveal reduced={reduced}>
              {/* Safe image — shadow dentro do fundo escuro */}
              <div
                ref={safeP.ref}
                className="relative rounded-3xl overflow-hidden"
                style={{
                  aspectRatio: "4/3",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.32)",
                }}
              >
                <Pic name="safe" alt="Espaço seguro" imgStyle={pxImg(safeP.y)} />
                {warmTint}
              </div>
            </Reveal>

            <Reveal delay={120} className="space-y-6" reduced={reduced}>
              <h2 className="text-[36px] sm:text-[48px] font-black text-white leading-[1.04] tracking-tight">
                Dois.<br />Mais ninguém.
              </h2>
              <p className="text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
                O LoveNest não é uma rede social. Não tem algoritmos, não tem audiência, não tem publicidade.
              </p>
              <p className="text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
                O que partilham aqui fica aqui — para sempre, só de vocês. O vosso espaço não é um feed. É um lar.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {["Privado por design", "Sem publicidade", "Os dados são vossos"].map(t => (
                  <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: "rgba(255,255,255,0.13)" }}>
                    <Lock className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(255,255,255,0.32)" }} strokeWidth={2} />
                    <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.42)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </Reveal>

          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════
          06 — COMO FUNCIONA
          ════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
        <div className="max-w-lg">
          <Reveal reduced={reduced}>
            <h2 className="text-[26px] sm:text-[34px] font-black leading-[1.1] tracking-tight mb-12" style={{ color: NAVY }}>
              Tão simples como<br />um bom dia.
            </h2>
          </Reveal>
          <div className="space-y-10">
            {[
              { n: "01", title: "Criam o vosso espaço",    desc: "Um de vocês abre o LoveNest e cria o ninho. Em dois minutos, está pronto.", delay: 0 },
              { n: "02", title: "Convidam o vosso par",     desc: "Um código. Uma mensagem. E o outro está lá — no mesmo espaço, ao mesmo tempo.", delay: 80 },
              { n: "03", title: "Aparecem um para o outro", desc: "Todos os dias. Nos grandes momentos e nos ordinários. O amor constrói-se assim.", delay: 160 },
            ].map(({ n, title, desc, delay }) => (
              <Reveal key={n} delay={delay} reduced={reduced}>
                <div className="flex gap-5 items-start">
                  <span
                    className="font-black leading-none shrink-0 select-none"
                    style={{ fontSize: 56, color: `${PINK}20`, lineHeight: 1 }}
                  >
                    {n}
                  </span>
                  <div className="pt-2.5 space-y-1.5">
                    <p className="text-[15px] font-bold" style={{ color: NAVY }}>{title}</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: "#999" }}>{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          07 — MANIFESTO
          Transição: gradiente branco → off-white → branco
          ════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(to bottom, #ffffff 0%, #FAFAF8 56px, #FAFAF8 calc(100% - 56px), #ffffff 100%)",
        position: "relative", zIndex: 1,
      }}>
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
          <Reveal reduced={reduced}>
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#bbb" }}>
                Manifesto
              </p>
              <div
                className="select-none"
                style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, color: `${PINK}18`, marginBottom: -24, fontFamily: "Georgia, serif" }}
                aria-hidden="true"
              >
                "
              </div>
              <blockquote className="text-[20px] sm:text-[26px] font-bold leading-[1.3] tracking-tight" style={{ color: NAVY }}>
                O amor não precisa de grandes gestos para ser real.
                Precisa de aparecer. Todos os dias. Em pequenos momentos
                que, somados, se tornam a história de vocês.
              </blockquote>
              <p className="text-[13px] sm:text-[14px] leading-relaxed max-w-xs mx-auto" style={{ color: "#999" }}>
                O LoveNest foi criado para os casais que acreditam que o amor se constrói — dia após dia, com intenção.
              </p>
            </div>
          </Reveal>
        </section>
      </div>

      {/* ══════════════════════════════════════════════
          08 — CTA FINAL
          ════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-20">
        <Reveal reduced={reduced}>
          <div className="text-center space-y-7">
            <h2 className="text-[30px] sm:text-[40px] font-black leading-[1.08] tracking-tight" style={{ color: NAVY }}>
              O vosso ninho<br />espera por vocês.
            </h2>
            <p className="text-[14px] sm:text-[15px] leading-relaxed max-w-[260px] mx-auto" style={{ color: "#999" }}>
              Criem o vosso espaço e comecem a construir a vossa história juntos.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/inicio")}
                onMouseEnter={() => setActiveBtn("cta")}
                onMouseLeave={() => setActiveBtn(null)}
                className="w-full sm:w-auto sm:px-10 h-14 rounded-2xl text-white font-bold text-[15px] inline-flex items-center justify-center gap-2 active:scale-[0.98]"
                style={btnStyle("cta")}
              >
                Criar o nosso espaço
                <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              </button>
              <p className="text-[11px]" style={{ color: "#ccc" }}>Grátis · Privado · Sem publicidade</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-[13px] font-bold text-white">LoveNest</span>
          </div>
          <p className="text-[11px] text-center sm:text-right" style={{ color: "rgba(255,255,255,0.33)" }}>
            Um espaço privado para o vosso amor.
          </p>
        </div>
      </footer>

    </div>
  );
}

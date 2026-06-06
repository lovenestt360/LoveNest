import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Flame, Heart, MessageCircle, Camera, BookHeart } from "lucide-react";
import { LogoMark } from "@/components/Logo";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const PINK = "#FF6B8F";
const NAVY = "#0B1324";

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
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

// ── App mockup – CSS-rendered phone ──────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 268 }}>
      {/* Chip left */}
      <div
        className="absolute z-20 bg-white rounded-2xl border border-[#f0f0f0] px-3 py-2.5 flex items-center gap-2.5 hidden md:flex"
        style={{ left: -80, top: 72, boxShadow: "0 8px 32px rgba(11,19,36,0.10)" }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${PINK}18` }}>
          <Flame className="w-3 h-3" style={{ color: PINK }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[9px] text-[#bbb] font-medium leading-none mb-0.5">LoveStreak</p>
          <p className="text-[13px] font-black leading-none" style={{ color: NAVY }}>14 dias</p>
        </div>
      </div>

      {/* Chip right */}
      <div
        className="absolute z-20 bg-white rounded-2xl border border-[#f0f0f0] px-3 py-2.5 hidden md:block"
        style={{ right: -76, bottom: 96, boxShadow: "0 8px 32px rgba(11,19,36,0.10)" }}
      >
        <p className="text-[9px] text-[#bbb] font-medium leading-none mb-1.5">Ela está bem</p>
        <span
          className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ background: PINK }}
        >
          Feliz
        </span>
      </div>

      {/* Phone frame */}
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: 44,
          background: NAVY,
          boxShadow: "0 32px 80px rgba(11,19,36,0.20), 0 0 0 1px rgba(11,19,36,0.07)",
        }}
      >
        {/* Dynamic island */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10"
          style={{ width: 80, height: 20, background: "#000", borderRadius: 12 }}
        />

        {/* Screen */}
        <div style={{ background: "#F8F7F5", paddingTop: 48, paddingBottom: 24 }}>
          {/* App header */}
          <div className="flex items-center justify-between px-5 mb-5">
            <div>
              <p className="text-[10px] font-medium" style={{ color: "#aaa" }}>Bom dia</p>
              <p className="text-[16px] font-bold leading-tight" style={{ color: NAVY }}>O vosso espaço</p>
            </div>
            <div className="w-8 h-8 rounded-full" style={{ background: "#e0e0e0" }} />
          </div>

          {/* Streak card */}
          <div className="mx-3 mb-2.5 bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 12px rgba(11,19,36,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${PINK}15` }}>
                <Flame className="w-4.5 h-4.5" style={{ color: PINK }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px]" style={{ color: "#aaa" }}>LoveStreak</p>
                <p className="text-[15px] font-black leading-tight" style={{ color: NAVY }}>14 dias juntos</p>
              </div>
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: `${PINK}15`, color: PINK }}
              >
                Ambos
              </span>
            </div>
          </div>

          {/* Mood */}
          <div className="mx-3 mb-2.5 bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 12px rgba(11,19,36,0.06)" }}>
            <p className="text-[10px] mb-2" style={{ color: "#aaa" }}>Como estás hoje?</p>
            <div className="flex gap-1.5">
              {["Feliz", "Grato", "Em paz"].map((m, i) => (
                <span
                  key={m}
                  className="text-[9px] font-semibold px-2 py-1 rounded-full"
                  style={i === 0
                    ? { background: PINK, color: "#fff" }
                    : { background: "#f3f3f3", color: "#aaa" }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="mx-3 bg-white rounded-2xl p-3.5" style={{ boxShadow: "0 2px 12px rgba(11,19,36,0.06)" }}>
            <p className="text-[10px] mb-1.5" style={{ color: "#aaa" }}>Mensagem do teu par</p>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: NAVY }}>
              "Já reparei que hoje levantaste cedo. Boa semana, meu amor."
            </p>
            <p className="text-[9px] mt-1.5" style={{ color: "#ccc" }}>08:24</p>
          </div>
        </div>

        {/* Home bar */}
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

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("lovenest_ref", ref.toUpperCase());
      localStorage.setItem("lovenest_ref", ref.toUpperCase());
    }
  }, [searchParams]);

  const cta = {
    background: PINK,
    boxShadow: `0 4px 24px ${PINK}45`,
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#f0f0f0]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
      <section className="max-w-6xl mx-auto px-4 sm:px-5 pt-5">

        {/* Hero image — rounded, gradient-fused at the bottom */}
        <div
          className="relative w-full rounded-3xl overflow-hidden"
          style={{ height: "clamp(260px, 55vw, 520px)" }}
        >
          <img
            src="/hero.jpg"
            alt="Dois num mesmo espaço"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 45%, rgba(255,255,255,0.6) 75%, #ffffff 100%)" }}
          />
        </div>

        {/* Text — emerges from the image */}
        <div className="max-w-xl pt-1 pb-14 sm:pb-20 space-y-7">
          <div className="space-y-4">
            <h1
              className="text-[40px] sm:text-[52px] font-black leading-[1.04] tracking-tight"
              style={{ color: NAVY }}
            >
              O amor vive<br />
              nos{" "}
              <span style={{ color: PINK }}>dias comuns.</span>
            </h1>
            <p className="text-[16px] sm:text-[17px] leading-relaxed max-w-sm" style={{ color: "#717171" }}>
              Não nos grandes gestos. Nos bons dias, nos momentos simples e nas manhãs de segunda-feira.
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/inicio")}
              className="w-full sm:w-auto sm:px-8 h-14 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={cta}
            >
              Criar o nosso espaço
              <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            </button>
            <div>
              <button
                onClick={() => navigate("/entrar")}
                className="text-[13px] font-medium transition-colors"
                style={{ color: "#aaa" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#717171")}
                onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
              >
                Já tenho convite do meu par
              </button>
            </div>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap gap-2">
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
          ════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">

          {/* Text */}
          <Reveal className="order-2 md:order-1 space-y-5">
            <h2
              className="text-[28px] sm:text-[36px] font-black leading-[1.1] tracking-tight"
              style={{ color: NAVY }}
            >
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

          {/* Image */}
          <Reveal delay={120} className="order-1 md:order-2">
            <div className="rounded-3xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
              <img
                src="/distance.jpg"
                alt="Presença à distância"
                className="w-full h-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          03 — PRODUTO EM CONTEXTO
          ════════════════════════════════════════════ */}
      <div style={{ background: "#FAFAF8" }}>
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
          <Reveal className="text-center mb-12 space-y-3">
            <h2
              className="text-[26px] sm:text-[34px] font-black leading-[1.1] tracking-tight"
              style={{ color: NAVY }}
            >
              Um espaço que só existe<br />para vocês dois.
            </h2>
            <p className="text-[14px] sm:text-[15px] leading-relaxed max-w-[300px] mx-auto" style={{ color: "#717171" }}>
              Sem feeds públicos. Sem notificações de estranhos. Cada gesto tem peso porque foi feito a pensar numa pessoa.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <PhoneMockup />
          </Reveal>

          {/* Feature pills */}
          <Reveal delay={200} className="mt-12 flex flex-wrap gap-2 justify-center">
            <FeaturePill icon={Flame}         accent={PINK} label="LoveStreak" />
            <FeaturePill icon={Heart}         accent={PINK} label="Humor diário" />
            <FeaturePill icon={MessageCircle} accent="#4D7CFE" label="Mensagens" />
            <FeaturePill icon={Camera}        accent="#4D7CFE" label="Memórias" />
            <FeaturePill icon={BookHeart}     accent={PINK} label="Rituais" />
          </Reveal>

          <p className="text-center text-[11px] mt-6" style={{ color: "#ccc", letterSpacing: "0.03em" }}>
            O vosso espaço, numa manhã qualquer.
          </p>
        </section>
      </div>

      {/* ══════════════════════════════════════════════
          04 — PEQUENOS GESTOS
          ════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: 420 }}>
            <img
              src="/gestures.jpg"
              alt="Pequenos gestos"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient overlay — dark at bottom for text legibility */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${NAVY}f0 0%, ${NAVY}99 35%, transparent 65%)` }}
            />
            {/* Content */}
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
          ════════════════════════════════════════════ */}
      <div style={{ background: NAVY }}>
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">

            {/* Image */}
            <Reveal>
              <div className="rounded-3xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <img
                  src="/safe.jpg"
                  alt="Espaço seguro"
                  className="w-full h-full object-cover"
                />
              </div>
            </Reveal>

            {/* Text */}
            <Reveal delay={120} className="space-y-6">
              <h2
                className="text-[36px] sm:text-[48px] font-black text-white leading-[1.04] tracking-tight"
              >
                Dois.<br />Mais ninguém.
              </h2>
              <p className="text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
                O LoveNest não é uma rede social. Não tem algoritmos, não tem audiência, não tem publicidade.
              </p>
              <p className="text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
                O que partilham aqui fica aqui — para sempre, só de vocês. O vosso espaço não é um feed. É um lar.
              </p>
              {/* Trust pills — dark variant */}
              <div className="flex flex-wrap gap-2 pt-2">
                {["Privado por design", "Sem publicidade", "Os dados são vossos"].map(t => (
                  <div
                    key={t}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                    style={{ borderColor: "rgba(255,255,255,0.14)" }}
                  >
                    <Lock className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} strokeWidth={2} />
                    <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{t}</span>
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
          <Reveal>
            <h2
              className="text-[26px] sm:text-[34px] font-black leading-[1.1] tracking-tight mb-12"
              style={{ color: NAVY }}
            >
              Tão simples como<br />um bom dia.
            </h2>
          </Reveal>

          <div className="space-y-10">
            {[
              {
                n: "01",
                title: "Criam o vosso espaço",
                desc: "Um de vocês abre o LoveNest e cria o ninho. Em dois minutos, está pronto.",
                delay: 0,
              },
              {
                n: "02",
                title: "Convidam o vosso par",
                desc: "Um código. Uma mensagem. E o outro está lá — no mesmo espaço, ao mesmo tempo.",
                delay: 80,
              },
              {
                n: "03",
                title: "Aparecem um para o outro",
                desc: "Todos os dias. Nos grandes momentos e nos ordinários. O amor constrói-se assim.",
                delay: 160,
              },
            ].map(({ n, title, desc, delay }) => (
              <Reveal key={n} delay={delay}>
                <div className="flex gap-5 items-start">
                  <span
                    className="text-[56px] font-black leading-none shrink-0 select-none"
                    style={{ color: `${PINK}20`, lineHeight: 1 }}
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
          ════════════════════════════════════════════ */}
      <div style={{ background: "#FAFAF8" }}>
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
          <Reveal>
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "#bbb" }}
              >
                Manifesto
              </p>

              {/* Large decorative quote mark */}
              <div
                className="text-[80px] font-black leading-none select-none"
                style={{ color: `${PINK}18`, marginBottom: -24, fontFamily: "Georgia, serif" }}
                aria-hidden
              >
                "
              </div>

              <blockquote
                className="text-[20px] sm:text-[26px] font-bold leading-[1.3] tracking-tight"
                style={{ color: NAVY }}
              >
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
        <Reveal>
          <div className="text-center space-y-7">
            <h2
              className="text-[30px] sm:text-[40px] font-black leading-[1.08] tracking-tight"
              style={{ color: NAVY }}
            >
              O vosso ninho<br />espera por vocês.
            </h2>
            <p
              className="text-[14px] sm:text-[15px] leading-relaxed max-w-[260px] mx-auto"
              style={{ color: "#999" }}
            >
              Criem o vosso espaço e comecem a construir a vossa história juntos.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/inicio")}
                className="w-full sm:w-auto sm:px-10 h-14 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-2"
                style={cta}
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

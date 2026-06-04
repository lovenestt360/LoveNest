import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Lock, Heart, Flame, BookHeart,
  Camera, MessageCircle, Sparkles, Users, Shield
} from "lucide-react";
import { LogoMark } from "@/components/Logo";

const PINK = "#FF6B8F";
const BLUE = "#4D7CFE";
const NAVY = "#0B1324";

// ── Floating product card ─────────────────────────────────────────────────────

function Card({ children, delay = "0s", className = "" }: {
  children: React.ReactNode; delay?: string; className?: string;
}) {
  return (
    <div
      className={`absolute bg-white rounded-2xl shadow-[0_8px_32px_rgba(11,19,36,0.12)] border border-white/80 animate-ob-float-a ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

// ── Hero visual ───────────────────────────────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative w-full h-[380px] md:h-[480px] flex items-center justify-center">
      {/* Glow rings */}
      <div className="absolute w-48 h-48 md:w-64 md:h-64 rounded-full opacity-20 animate-ob-ring-breathe"
        style={{ border: `1px solid ${PINK}` }} />
      <div className="absolute w-32 h-32 md:w-44 md:h-44 rounded-full opacity-15 animate-ob-ring-inner"
        style={{ border: `1px solid ${BLUE}`, animationDelay: "-2s" }} />

      {/* Central icon */}
      <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-ob-float-b"
        style={{ animationDelay: "-1s" }}>
        <img src="/icon-512.png" alt="LoveNest" className="w-14 h-14 md:w-16 md:h-16 rounded-2xl" />
      </div>

      {/* LoveStreak card */}
      <Card delay="-2s" className="left-2 md:left-4 top-8 px-4 py-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${PINK}18` }}>
          <Flame className="w-4 h-4" style={{ color: PINK }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] text-[#bbb] font-medium leading-none mb-0.5">LoveStreak</p>
          <p className="text-[15px] font-black leading-none" style={{ color: NAVY }}>14 dias</p>
        </div>
      </Card>

      {/* Mood card */}
      <Card delay="-4s" className="right-2 md:right-4 top-6 px-4 py-3 animate-ob-float-b">
        <p className="text-[10px] text-[#bbb] font-medium mb-1.5">Como estás hoje?</p>
        <div className="flex gap-1.5">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: PINK }}>Feliz</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f0f4ff]" style={{ color: BLUE }}>Grato</span>
        </div>
      </Card>

      {/* Message card */}
      <Card delay="-6s" className="left-0 md:left-4 bottom-16 px-4 py-3 max-w-[155px] animate-ob-float-b">
        <p className="text-[10px] text-[#bbb] font-medium mb-1">Mensagem</p>
        <p className="text-[12px] font-semibold leading-snug" style={{ color: NAVY }}>"Saudades de ti."</p>
      </Card>

      {/* Milestone card */}
      <Card delay="-1s" className="right-2 md:right-4 bottom-12 px-4 py-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}18` }}>
          <Sparkles className="w-4 h-4" style={{ color: BLUE }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] text-[#bbb] font-medium leading-none mb-0.5">Milestone</p>
          <p className="text-[12px] font-bold leading-none" style={{ color: NAVY }}>Dia Completo</p>
        </div>
      </Card>

      {/* Partners card */}
      <Card delay="-3s" className="left-1/2 -translate-x-1/2 bottom-4 px-4 py-2.5 flex items-center gap-2 animate-ob-float-a">
        <div className="flex -space-x-1.5">
          {["#FF6B8F", "#4D7CFE"].map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-black"
              style={{ background: c }}>
              {i === 0 ? "A" : "D"}
            </div>
          ))}
        </div>
        <p className="text-[11px] font-semibold" style={{ color: NAVY }}>Juntos hoje</p>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: PINK }} />
      </Card>
    </div>
  );
}

// ── Stat ─────────────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[32px] md:text-[40px] font-black" style={{ color: NAVY }}>{value}</p>
      <p className="text-[12px] text-[#999] font-medium mt-0.5">{label}</p>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc, accent }: {
  icon: React.ElementType; title: string; desc: string; accent: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-[#f0f0f0] space-y-4 hover:border-[#e0e0e0] hover:shadow-md transition-all duration-300 group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: `${accent}15` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[15px] font-bold mb-1.5" style={{ color: NAVY }}>{title}</p>
        <p className="text-[13px] text-[#999] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Trust pill ────────────────────────────────────────────────────────────────

function TrustPill({ text, icon: Icon }: { text: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
      <Icon className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} />
      <span className="text-[12px] text-white/80 font-medium">{text}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("lovenest_ref", ref.toUpperCase());
      localStorage.setItem("lovenest_ref", ref.toUpperCase());
    }
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#f0f0f0]" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-[16px] font-bold tracking-tight" style={{ color: NAVY }}>LoveNest</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/entrar")}
              className="text-[13px] font-semibold transition-colors hidden md:block"
              style={{ color: NAVY }}>
              Entrar
            </button>
            <button onClick={() => navigate("/inicio")}
              className="h-9 px-5 rounded-full text-white text-[13px] font-bold active:scale-95 transition-all"
              style={{ background: PINK }}>
              Começar
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero — full-width navy ── */}
      <section style={{ background: NAVY }} className="relative overflow-hidden">
        {/* Background gradient dots */}
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `radial-gradient(circle at 20% 50%, ${PINK}40 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${BLUE}40 0%, transparent 50%)` }} />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-center md:gap-16">

            {/* Left — text */}
            <div className="flex-1 space-y-8 md:space-y-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: PINK }} />
                <span className="text-[11px] font-semibold text-white/80 tracking-wide">Espaço privado para casais</span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-[42px] md:text-[56px] lg:text-[64px] font-black text-white leading-[1.05] tracking-tight">
                  O amor vive nos{" "}
                  <span style={{ color: PINK }}>dias comuns.</span>
                </h1>
                <p className="text-[16px] md:text-[18px] leading-relaxed max-w-[440px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Um espaço íntimo para dois. Presença diária, rituais partilhados e memórias que ficam para sempre.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate("/inicio")}
                  className="h-14 px-8 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{ background: PINK, boxShadow: `0 4px 24px ${PINK}60` }}>
                  Criar o nosso espaço
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
                <button onClick={() => navigate("/entrar")}
                  className="h-14 px-6 rounded-2xl font-semibold text-[14px] border border-white/20 text-white/80 hover:bg-white/10 transition-colors">
                  Já tenho convite
                </button>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap gap-2">
                <TrustPill text="100% Privado" icon={Lock} />
                <TrustPill text="Sem publicidade" icon={Shield} />
                <TrustPill text="Só de vocês" icon={Users} />
              </div>
            </div>

            {/* Right — floating cards */}
            <div className="flex-1 mt-8 md:mt-0">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-[#f0f0f0] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <Stat value="2 min" label="Para criar o espaço" />
            <Stat value="100%" label="Privado e seguro" />
            <Stat value="∞" label="Memórias partilhadas" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#bbb]">O que encontram</p>
          <h2 className="text-[32px] md:text-[40px] font-black leading-tight tracking-tight" style={{ color: NAVY }}>
            Tudo num só espaço.
          </h2>
          <p className="text-[15px] text-[#999] leading-relaxed">
            Ferramentas emocionais pensadas para casais que querem estar presentes todos os dias.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={Flame}         accent={PINK} title="LoveStreak"    desc="Apareçam um pelo outro todos os dias. A vossa chama não se apaga." />
          <FeatureCard icon={MessageCircle} accent={BLUE} title="Chat privado"  desc="Mensagens, áudios e momentos partilhados. Só de vocês dois." />
          <FeatureCard icon={Heart}         accent={PINK} title="Humor diário"  desc="Saibam como o outro está, mesmo quando as palavras são difíceis." />
          <FeatureCard icon={Camera}        accent={BLUE} title="Memórias"      desc="Fotos e momentos guardados no vosso espaço, para sempre." />
          <FeatureCard icon={BookHeart}     accent={PINK} title="Rituais"       desc="Oração, reflexão, planos — os pequenos rituais que unem." />
          <FeatureCard icon={Sparkles}      accent={BLUE} title="Missões"       desc="Gestos diários que mantêm a ligação presente e o amor próximo." />
        </div>
      </section>

      {/* ── Quote — navy ── */}
      <section style={{ background: NAVY }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${BLUE}60 0%, transparent 70%)` }} />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center space-y-8">
          <p className="text-[28px] md:text-[36px] lg:text-[42px] font-black text-white leading-[1.2] tracking-tight">
            "Pequenos gestos tornam-se grandes memórias."
          </p>
          <p className="text-[16px] leading-relaxed mx-auto max-w-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            O LoveNest foi criado para os casais que acreditam que o amor se constrói todos os dias.
          </p>
          <button onClick={() => navigate("/inicio")}
            className="inline-flex items-center gap-2 h-13 px-8 py-3.5 rounded-2xl font-bold text-[15px] text-white active:scale-[0.98] transition-all"
            style={{ background: PINK, boxShadow: `0 4px 24px ${PINK}50` }}>
            Começar agora
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#bbb]">Como funciona</p>
          <h2 className="text-[32px] md:text-[40px] font-black leading-tight tracking-tight" style={{ color: NAVY }}>
            Em três passos.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: "01", title: "Criam o espaço",       desc: "Um de vocês cria o espaço e gera um código de convite único.", color: PINK },
            { step: "02", title: "Convidam o par",       desc: "Partilham o código. O vosso par entra e o ninho fica completo.", color: BLUE },
            { step: "03", title: "Aparecem todos os dias", desc: "Pequenos gestos diários que mantêm o amor presente e a chama viva.", color: PINK },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="text-center md:text-left space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto md:mx-0" style={{ background: `${color}15` }}>
                <span className="text-[18px] font-black" style={{ color }}>{step}</span>
              </div>
              <div>
                <p className="text-[16px] font-bold mb-2" style={{ color: NAVY }}>{title}</p>
                <p className="text-[13px] text-[#999] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24 pt-4">
        <div className="rounded-3xl p-10 md:p-16 text-center space-y-8 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a2744 100%)` }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `radial-gradient(circle at 30% 50%, ${PINK}50 0%, transparent 50%), radial-gradient(circle at 70% 50%, ${BLUE}50 0%, transparent 50%)` }} />
          <div className="relative space-y-6 max-w-lg mx-auto">
            <div className="flex justify-center">
              <LogoMark size={56} />
            </div>
            <h2 className="text-[28px] md:text-[36px] font-black text-white leading-tight tracking-tight">
              O vosso espaço espera por vocês.
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              Criem o vosso ninho e comecem a construir a vossa história juntos.
            </p>
            <button onClick={() => navigate("/inicio")}
              className="w-full sm:w-auto h-14 px-10 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
              style={{ background: PINK, boxShadow: `0 4px 24px ${PINK}50` }}>
              Criar o nosso espaço
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>Grátis · Privado · Sem publicidade</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: NAVY }} className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-[14px] font-bold text-white">LoveNest</span>
          </div>
          <p className="text-[12px] text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
            Um espaço privado para o vosso amor.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/entrar")} className="text-[12px] font-medium transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
              Entrar
            </button>
            <button onClick={() => navigate("/inicio")} className="text-[12px] font-medium text-white/80 hover:text-white transition-colors">
              Criar conta
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

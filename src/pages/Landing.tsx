import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Heart, Flame, BookHeart, Camera, MessageCircle, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/Logo";

// Brand colors
const PINK  = "#FF6B8F";
const BLUE  = "#4D7CFE";
const NAVY  = "#0B1324";

// ── Hero floating product cards ───────────────────────────────────────────────

function HeroComposition() {
  return (
    <div className="relative w-full h-72 flex items-center justify-center select-none" aria-hidden>
      {/* Ambient */}
      <div className="absolute w-56 h-56 rounded-full blur-3xl opacity-20"
        style={{ background: `radial-gradient(circle, ${PINK} 0%, ${BLUE} 100%)` }} />

      {/* Central flame */}
      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white shadow-[0_8px_32px_rgba(11,19,36,0.12)] border border-[#f0f0f0] flex items-center justify-center animate-ob-float-a">
        <Flame className="w-7 h-7" style={{ color: PINK }} strokeWidth={1.5} />
      </div>

      {/* LoveStreak */}
      <div className="absolute z-10 left-4 top-8 bg-white rounded-2xl shadow-[0_4px_20px_rgba(11,19,36,0.08)] border border-[#f0f0f0] px-4 py-3 flex items-center gap-2.5 animate-ob-float-b" style={{ animationDelay: "-2s" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${PINK}18` }}>
          <Flame className="w-3.5 h-3.5" style={{ color: PINK }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] text-[#bbb] font-medium leading-none mb-0.5">LoveStreak</p>
          <p className="text-[14px] font-black leading-none" style={{ color: NAVY }}>14 dias</p>
        </div>
      </div>

      {/* Mood card */}
      <div className="absolute z-10 right-4 top-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(11,19,36,0.08)] border border-[#f0f0f0] px-4 py-3 animate-ob-float-a" style={{ animationDelay: "-4s" }}>
        <p className="text-[10px] text-[#bbb] font-medium mb-1">Como estás hoje?</p>
        <div className="flex gap-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: PINK }}>Feliz</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#aaa]">Grato</span>
        </div>
      </div>

      {/* Message */}
      <div className="absolute z-10 left-2 bottom-10 bg-white rounded-2xl shadow-[0_4px_20px_rgba(11,19,36,0.08)] border border-[#f0f0f0] px-4 py-3 max-w-[160px] animate-ob-float-b" style={{ animationDelay: "-6s" }}>
        <p className="text-[10px] text-[#bbb] font-medium mb-1">Mensagem</p>
        <p className="text-[12px] font-medium leading-snug" style={{ color: NAVY }}>"Saudades de ti."</p>
      </div>

      {/* Milestone */}
      <div className="absolute z-10 right-3 bottom-8 bg-white rounded-2xl shadow-[0_4px_20px_rgba(11,19,36,0.08)] border border-[#f0f0f0] px-4 py-3 flex items-center gap-2 animate-ob-float-a" style={{ animationDelay: "-1s" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}18` }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: BLUE }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] text-[#bbb] font-medium leading-none mb-0.5">Milestone</p>
          <p className="text-[11px] font-bold leading-none" style={{ color: NAVY }}>Dia Completo</p>
        </div>
      </div>

      {/* Rings */}
      <div className="absolute z-0 w-32 h-32 rounded-full border animate-ob-ring-breathe" style={{ borderColor: `${PINK}30` }} />
      <div className="absolute z-0 w-20 h-20 rounded-full border animate-ob-ring-inner" style={{ borderColor: `${BLUE}25`, animationDelay: "-2s" }} />
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc, accent }: {
  icon: React.ElementType; title: string; desc: string; accent: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-[#f0f0f0] space-y-3 hover:border-[#e0e0e0] hover:shadow-sm transition-all duration-300">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
        <Icon className="w-[18px] h-[18px]" style={{ color: accent }} strokeWidth={1.5} />
      </div>
      <p className="text-[14px] font-semibold leading-snug" style={{ color: NAVY }}>{title}</p>
      <p className="text-[12px] text-[#999] leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Trust pill ────────────────────────────────────────────────────────────────

function TrustPill({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#efefef]">
      <Lock className="w-2.5 h-2.5 text-[#ccc]" strokeWidth={2} />
      <span className="text-[11px] text-[#999] font-medium">{text}</span>
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

  const btnStyle = {
    background: PINK,
    boxShadow: `0 4px 24px ${PINK}50`,
  };

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#f0f0f0]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-[15px] font-bold tracking-tight" style={{ color: NAVY }}>LoveNest</span>
          </div>
          <button
            onClick={() => navigate("/entrar")}
            className="text-[13px] font-semibold transition-colors"
            style={{ color: NAVY }}
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-lg mx-auto px-6 pt-8 pb-16 space-y-8">
        <HeroComposition />

        <div className="space-y-4">
          <h1 className="text-[38px] font-black leading-[1.1] tracking-tight" style={{ color: NAVY }}>
            O amor vive nos{" "}
            <span style={{ color: PINK }}>dias comuns.</span>
          </h1>
          <p className="text-[15px] text-[#717171] leading-relaxed max-w-[300px]">
            Um espaço íntimo para dois. Presença diária, rituais partilhados e memórias que ficam.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/inicio")}
            className="w-full h-14 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={btnStyle}
          >
            Criar o nosso espaço
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate("/entrar")}
            className="w-full h-12 rounded-2xl text-[13px] font-medium text-[#aaa] hover:text-[#717171] transition-colors"
          >
            Já tenho convite do meu par
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <TrustPill text="Privado" />
          <TrustPill text="Sem publicidade" />
          <TrustPill text="Só de vocês" />
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-lg mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#e8e8e8] to-transparent" />
      </div>

      {/* ── Features ── */}
      <section className="max-w-lg mx-auto px-6 py-16 space-y-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bbb]">O que encontram</p>
          <h2 className="text-[24px] font-bold leading-snug tracking-tight" style={{ color: NAVY }}>
            Tudo num só espaço.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard icon={Flame}         accent={PINK} title="LoveStreak"  desc="Apareçam um pelo outro todos os dias. A vossa chama não se apaga." />
          <FeatureCard icon={MessageCircle} accent={BLUE} title="Chat privado" desc="Só de vocês. Mensagens, áudios e momentos partilhados." />
          <FeatureCard icon={Heart}         accent={PINK} title="Humor diário" desc="Saibam como o outro está, mesmo quando as palavras são difíceis." />
          <FeatureCard icon={Camera}        accent={BLUE} title="Memórias"     desc="Fotos e momentos guardados no vosso espaço, para sempre." />
          <FeatureCard icon={BookHeart}     accent={PINK} title="Rituais"      desc="Oração, reflexão, planos — os pequenos rituais que unem." />
          <FeatureCard icon={Sparkles}      accent={BLUE} title="Missões"      desc="Gestos diários que mantêm a ligação presente e o amor próximo." />
        </div>
      </section>

      {/* ── Quote — navy instead of rose ── */}
      <section style={{ background: NAVY }} className="w-full">
        <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
          <p className="text-[28px] font-black text-white leading-[1.2] tracking-tight">
            "Pequenos gestos tornam-se grandes memórias."
          </p>
          <p className="text-[14px] leading-relaxed max-w-[260px] mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            O LoveNest foi criado para os casais que acreditam que o amor se constrói todos os dias.
          </p>
          <button
            onClick={() => navigate("/inicio")}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl font-bold text-[14px] active:scale-[0.98] transition-all"
            style={{ background: PINK, color: "#fff" }}
          >
            Começar agora
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-lg mx-auto px-6 py-16 space-y-8">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bbb]">Como funciona</p>
          <h2 className="text-[24px] font-bold leading-snug tracking-tight" style={{ color: NAVY }}>
            Em três passos.
          </h2>
        </div>
        <div className="space-y-6">
          {[
            { step: "01", title: "Criam o espaço",      desc: "Um de vocês cria o espaço e gera um código de convite.", color: PINK },
            { step: "02", title: "Convidam o par",      desc: "Partilham o código com o vosso par para se juntarem ao ninho.", color: BLUE },
            { step: "03", title: "Aparecem todos os dias", desc: "Pequenos gestos diários que mantêm o amor presente.", color: PINK },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="flex gap-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}15` }}>
                <span className="text-[10px] font-black" style={{ color }}>{step}</span>
              </div>
              <div className="space-y-1">
                <p className="text-[14px] font-semibold" style={{ color: NAVY }}>{title}</p>
                <p className="text-[13px] text-[#999] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-lg mx-auto px-6 pb-20 pt-4">
        <div className="rounded-3xl border border-[#f0f0f0] bg-white p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: `${PINK}12` }}>
            <Heart className="w-5 h-5" style={{ color: PINK }} strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h2 className="text-[22px] font-bold leading-snug tracking-tight" style={{ color: NAVY }}>
              O vosso espaço espera por vocês.
            </h2>
            <p className="text-[13px] text-[#999] leading-relaxed max-w-[240px] mx-auto">
              Criem o vosso ninho e comecem a construir a vossa história juntos.
            </p>
          </div>
          <button
            onClick={() => navigate("/inicio")}
            className="w-full h-14 rounded-2xl text-white font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={btnStyle}
          >
            Criar o nosso espaço
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
          <p className="text-[11px] text-[#ccc]">Grátis · Privado · Sem publicidade</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#f0f0f0]" style={{ background: NAVY }}>
        <div className="max-w-lg mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="text-[13px] font-bold text-white">LoveNest</span>
          </div>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Um espaço privado para o vosso amor.
          </p>
        </div>
      </footer>

    </div>
  );
}

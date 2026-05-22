import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Heart, Flame, BookHeart, Camera, MessageCircle } from "lucide-react";

// ── Hero ambient visual ───────────────────────────────────────────────────────

function AmbientOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      aria-hidden
    />
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-[#f0f0f0] bg-white space-y-3">
      <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-rose-400" strokeWidth={1.5} />
      </div>
      <p className="text-[14px] font-semibold text-foreground leading-snug">{title}</p>
      <p className="text-[12px] text-[#999] leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Trust pill ────────────────────────────────────────────────────────────────

function TrustPill({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#f0f0f0] bg-white">
      <Lock className="w-2.5 h-2.5 text-[#ccc]" strokeWidth={2} />
      <span className="text-[11px] text-[#999] font-medium">{text}</span>
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#faf9f9] text-foreground overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-40 bg-[#faf9f9]/90 backdrop-blur-md border-b border-[#f0f0f0]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-[14px] font-bold tracking-tight">LoveNest</span>
          </div>
          <button
            onClick={() => navigate("/entrar")}
            className="text-[13px] font-medium text-[#717171] hover:text-foreground transition-colors"
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative max-w-lg mx-auto px-6 pt-16 pb-20 overflow-hidden">
        {/* Ambient background orbs */}
        <AmbientOrb className="w-64 h-64 bg-rose-100/40 blur-3xl -top-20 -right-20 animate-ob-float-a" />
        <AmbientOrb className="w-48 h-48 bg-rose-50/60 blur-3xl bottom-0 -left-16 animate-ob-float-b" style={{ animationDelay: "-5s" } as React.CSSProperties} />

        <div className="relative space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-rose-400 tracking-wide">Espaço privado para casais</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-[40px] font-black text-foreground leading-[1.1] tracking-tight">
              O amor vive nos{" "}
              <span className="text-rose-400">dias comuns.</span>
            </h1>
            <p className="text-[16px] text-[#717171] leading-relaxed max-w-[320px]">
              Um espaço íntimo para dois. Presença diária, rituais partilhados e memórias que ficam.
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/inicio")}
              className="w-full h-14 rounded-2xl bg-rose-500 text-white font-bold text-[15px] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(244,63,94,0.30)] flex items-center justify-center gap-2"
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

          {/* Trust pills */}
          <div className="flex flex-wrap gap-2">
            <TrustPill text="Privado" />
            <TrustPill text="Sem publicidade" />
            <TrustPill text="Só de vocês" />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-lg mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#e8e8e8] to-transparent" />
      </div>

      {/* ── Features grid ── */}
      <section className="max-w-lg mx-auto px-6 py-16 space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bbb]">O que encontram</p>
          <h2 className="text-[24px] font-bold text-foreground leading-snug tracking-tight">
            Tudo num só espaço.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FeatureCard
            icon={Flame}
            title="LoveStreak"
            desc="Aparecam um pelo outro todos os dias. A vossa chama não se apaga."
          />
          <FeatureCard
            icon={MessageCircle}
            title="Chat privado"
            desc="Só de vocês. Mensagens, áudios e momentos partilhados."
          />
          <FeatureCard
            icon={Heart}
            title="Humor diário"
            desc="Saibam como o outro está, mesmo quando as palavras são difíceis."
          />
          <FeatureCard
            icon={Camera}
            title="Memórias"
            desc="Fotos e momentos guardados no vosso espaço, para sempre."
          />
          <FeatureCard
            icon={BookHeart}
            title="Rituais"
            desc="Oração, reflexão, planos — os pequenos rituais que unem."
          />
          <FeatureCard
            icon={Flame}
            title="Missões"
            desc="Gestos diários que mantêm a ligação presente e o amor próximo."
          />
        </div>
      </section>

      {/* ── Emotional quote section ── */}
      <section className="relative overflow-hidden">
        <div className="bg-rose-500 max-w-lg mx-auto mx-0">
          <div className="max-w-lg mx-auto px-6 py-16 space-y-6 text-center">
            <p className="text-[28px] font-black text-white leading-[1.2] tracking-tight">
              "Pequenos gestos tornam-se grandes memórias."
            </p>
            <p className="text-[14px] text-rose-100 leading-relaxed max-w-[260px] mx-auto">
              O LoveNest foi criado para os casais que acreditam que o amor se constrói todos os dias.
            </p>
            <button
              onClick={() => navigate("/inicio")}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-white text-rose-500 font-bold text-[14px] active:scale-[0.98] transition-all shadow-lg"
            >
              Começar agora
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-lg mx-auto px-6 py-16 space-y-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bbb]">Como funciona</p>
          <h2 className="text-[24px] font-bold text-foreground leading-snug tracking-tight">
            Em três passos.
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              step: "01",
              title: "Criam o espaço",
              desc: "Um de vocês cria o espaço e gera um código de convite.",
            },
            {
              step: "02",
              title: "Convidam o par",
              desc: "Partilham o código com o vosso par para se juntarem ao ninho.",
            },
            {
              step: "03",
              title: "Aparecem todos os dias",
              desc: "Pequenos gestos diários que mantêm o amor presente.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-rose-400">{step}</span>
              </div>
              <div className="space-y-1">
                <p className="text-[14px] font-semibold text-foreground">{title}</p>
                <p className="text-[13px] text-[#999] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-lg mx-auto px-6 pb-20 pt-4">
        <div className="rounded-3xl border border-[#f0f0f0] bg-white p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h2 className="text-[22px] font-bold text-foreground leading-snug tracking-tight">
              O vosso espaço espera por vocês.
            </h2>
            <p className="text-[13px] text-[#999] leading-relaxed max-w-[240px] mx-auto">
              Criem o vosso ninho e comecem a construir a vossa história juntos.
            </p>
          </div>
          <button
            onClick={() => navigate("/inicio")}
            className="w-full h-14 rounded-2xl bg-rose-500 text-white font-bold text-[15px] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(244,63,94,0.25)] flex items-center justify-center gap-2"
          >
            Criar o nosso espaço
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
          <p className="text-[11px] text-[#ccc]">Grátis · Privado · Sem publicidade</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#f0f0f0] bg-white">
        <div className="max-w-lg mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
            <span className="text-[12px] font-bold text-foreground">LoveNest</span>
          </div>
          <p className="text-[11px] text-[#ccc]">Um espaço privado para o vosso amor.</p>
        </div>
      </footer>

    </div>
  );
}

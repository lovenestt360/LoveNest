import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// ── Abstract visual — two presences, consistent with onboarding language ──────

function HeroVisual() {
  return (
    <div className="relative w-48 h-40 mx-auto">
      <div className="absolute inset-0 rounded-full bg-rose-50/60 blur-3xl scale-75" />
      <div className="absolute w-24 h-24 rounded-full bg-rose-100/80 top-4 left-6 animate-ob-float-a" />
      <div
        className="absolute w-20 h-20 rounded-full bg-rose-50 border border-rose-100 bottom-4 right-6 animate-ob-float-b"
        style={{ animationDelay: "-4s" }}
      />
    </div>
  );
}

// ── Pillar item ────────────────────────────────────────────────────────────────

function Pillar({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="text-[13px] text-[#999] leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 pt-10 pb-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-300" />
          <span className="text-[14px] font-bold text-foreground tracking-tight">LoveNest</span>
        </div>
        <button
          onClick={() => navigate("/entrar")}
          className="text-[13px] font-medium text-[#999] hover:text-foreground transition-colors"
        >
          Entrar
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-16 max-w-lg mx-auto w-full text-center space-y-10">

        <HeroVisual />

        <div className="space-y-5 max-w-[300px]">
          <h1 className="text-[32px] font-bold text-foreground leading-[1.2] tracking-tight">
            Um espaço privado para dois.
          </h1>
          <p className="text-[15px] text-[#888] leading-relaxed">
            Pequenos gestos. Presença diária. Uma história em construção.
          </p>
        </div>

        <div className="w-full max-w-[280px] space-y-3">
          <button
            onClick={() => navigate("/inicio")}
            className="w-full h-14 rounded-2xl bg-rose-500/90 text-white font-semibold text-[15px] active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)] flex items-center justify-center gap-2"
          >
            Criar o nosso espaço
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => navigate("/entrar")}
            className="w-full h-12 text-[13px] font-medium text-[#bbb] hover:text-[#717171] transition-colors"
          >
            Já tenho convite
          </button>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="h-px bg-[#f5f5f5] mx-8" />

      {/* ── Emotional pillars ── */}
      <section className="px-8 py-16 max-w-lg mx-auto w-full space-y-10">
        <Pillar
          title="Presença"
          desc="Sintam-se próximos, mesmo nos dias mais silenciosos. O vosso espaço continua vivo."
        />
        <Pillar
          title="Rituais"
          desc="Pequenos gestos diários que mantêm o amor presente e a ligação forte."
        />
        <Pillar
          title="Memória"
          desc="Os vossos momentos, conversas e memórias guardados num só lugar."
        />
      </section>

      {/* ── Divider ── */}
      <div className="h-px bg-[#f5f5f5] mx-8" />

      {/* ── Closing CTA ── */}
      <section className="px-8 py-16 max-w-lg mx-auto w-full text-center space-y-8">
        <p className="text-[20px] font-bold text-foreground leading-snug tracking-tight max-w-[240px] mx-auto">
          O amor também vive nos dias comuns.
        </p>
        <button
          onClick={() => navigate("/inicio")}
          className="w-full max-w-[280px] h-14 rounded-2xl bg-rose-500/90 text-white font-semibold text-[15px] active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)] flex items-center justify-center gap-2 mx-auto"
        >
          Criar o nosso espaço
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 pb-12 pt-4 text-center border-t border-[#f5f5f5]">
        <p className="text-[11px] text-[#ccc]">
          lovenestt.vercel.app · Um espaço privado para o vosso amor.
        </p>
      </footer>

    </div>
  );
}

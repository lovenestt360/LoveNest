import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarHeart,
  Camera,
  Heart,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { MobileWelcome } from "@/features/landing/MobileWelcome";
import { LandingProductPreview } from "@/features/landing/LandingProductPreview";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

const pillars = [
  {
    icon: Heart,
    eyebrow: "Presença",
    title: "Um pouco, todos os dias.",
    copy: "Check-ins, pequenos gestos e a vossa chama transformam presença em hábito — sem pressão.",
  },
  {
    icon: MessageCircle,
    eyebrow: "Ligação",
    title: "Conversem num espaço só vosso.",
    copy: "Chat, humor e momentos importantes juntos, longe do ruído das redes sociais.",
  },
  {
    icon: Camera,
    eyebrow: "História",
    title: "O que vivem não se perde.",
    copy: "Memórias, datas, cápsulas e capítulos da relação ficam organizados para vocês revisitarem.",
  },
] as const;

const trust = [
  "Espaço privado para o casal",
  "Sem publicidade dentro da experiência",
  "Vocês escolhem o que partilhar",
] as const;

function DesktopNav() {
  const navigate = useNavigate();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-900/[0.05] bg-[#FBF9F7]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5"
          aria-label="LoveNest — início"
        >
          <LogoMark size={30} />
          <span className="text-[16px] font-extrabold tracking-[-0.025em] text-[#0B1324]">LoveNest</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/entrar?returning=1")}
            className="rounded-full px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-white"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => navigate("/inicio")}
            className="rounded-full bg-[#0B1324] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_25px_rgba(11,19,36,0.12)] transition hover:-translate-y-0.5"
          >
            Criar LoveNest
          </button>
        </div>
      </div>
    </header>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const reducedMotion = useReducedMotion();
  const [showMarketingOnMobile, setShowMarketingOnMobile] = useState(false);

  useEffect(() => {
    const referral = searchParams.get("ref");
    if (!referral) return;
    const normalized = referral.toUpperCase();
    sessionStorage.setItem("lovenest_ref", normalized);
    localStorage.setItem("lovenest_ref", normalized);
  }, [searchParams]);

  if (isMobile && !showMarketingOnMobile) {
    return <MobileWelcome onExplore={() => setShowMarketingOnMobile(true)} />;
  }

  const fadeUp = {
    initial: reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.22 },
    transition: { duration: reducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBF9F7] text-[#0B1324]">
      {!isMobile ? (
        <DesktopNav />
      ) : (
        <header className="sticky top-0 z-50 border-b border-slate-900/[0.05] bg-[#FBF9F7]/90 px-5 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <button
              type="button"
              onClick={() => setShowMarketingOnMobile(false)}
              className="flex items-center gap-2"
            >
              <LogoMark size={27} />
              <span className="text-sm font-extrabold tracking-tight">LoveNest</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/entrar?returning=1")}
              className="rounded-full px-3 py-2 text-xs font-bold text-slate-500"
            >
              Entrar
            </button>
          </div>
        </header>
      )}

      <main>
        <section className="relative overflow-hidden pt-10 md:pt-16 lg:pt-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-12 h-[440px] w-[440px] rounded-full bg-rose-200/45 blur-[120px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-36 bottom-0 h-[360px] w-[360px] rounded-full bg-indigo-100/70 blur-[110px]"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-8 md:min-h-[720px] md:grid-cols-[1.02fr_0.98fr] md:px-8 md:pb-24 lg:gap-8">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-xl text-center md:mx-0 md:text-left"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-2 text-[11px] font-bold text-rose-500 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Feito para a vida real a dois
              </div>

              <h1 className="text-[44px] font-black leading-[0.98] tracking-[-0.055em] text-[#0B1324] sm:text-[54px] lg:text-[72px]">
                O vosso espaço.
                <span className="block text-rose-500">Todos os dias.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-7 text-slate-500 md:mx-0 md:text-[18px]">
                LoveNest junta presença, conversa, memórias e vida a dois num lugar privado —
                sem transformar a relação numa lista de tarefas.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <button
                  type="button"
                  onClick={() => navigate("/inicio")}
                  className="flex h-14 items-center justify-center gap-2 rounded-[1.15rem] bg-[#0B1324] px-7 text-[14px] font-bold text-white shadow-[0_16px_35px_rgba(11,19,36,0.16)] transition hover:-translate-y-0.5 active:scale-[0.985]"
                >
                  Criar o nosso espaço
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/entrar?returning=1")}
                  className="h-14 rounded-[1.15rem] border border-slate-200 bg-white/70 px-7 text-[14px] font-bold text-[#0B1324] backdrop-blur transition hover:bg-white active:scale-[0.985]"
                >
                  Já temos LoveNest
                </button>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-400 md:justify-start">
                {trust.map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.97, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.75, delay: reducedMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <LandingProductPreview />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-slate-900/[0.05] bg-white/55">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
            <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500/80">
                Menos funções à vista. Mais sentido.
              </p>
              <h2 className="mt-4 text-[34px] font-black leading-[1.05] tracking-[-0.04em] md:text-[50px]">
                Não é uma rede social para casais.
                <span className="block text-slate-400">É um lugar para vocês.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-slate-500 md:text-[17px]">
                A tecnologia fica em segundo plano. Na frente ficam os pequenos sinais de presença,
                os planos que importam e a história que estão a construir.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {pillars.map(({ icon: Icon, eyebrow, title, copy }, index) => (
                <motion.article
                  key={title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: reducedMotion ? 0 : index * 0.06 }}
                  className="rounded-[1.75rem] border border-slate-900/[0.06] bg-[#FBF9F7] p-6 shadow-[0_16px_45px_rgba(15,23,42,0.04)] md:p-7"
                >
                  <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-rose-400" strokeWidth={1.7} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
                  <h3 className="mt-2 text-[21px] font-extrabold tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 text-[14px] leading-6 text-slate-500">{copy}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:px-8 md:py-28">
          <motion.div {...fadeUp}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500/70">Vida a dois</p>
            <h2 className="mt-4 max-w-xl text-[34px] font-black leading-[1.06] tracking-[-0.04em] md:text-[48px]">
              Tudo cabe. Mas nem tudo precisa aparecer ao mesmo tempo.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-500 md:text-[17px]">
              Humor, planos, ciclo, espiritualidade, localização, biblioteca e memórias continuam disponíveis.
              O LoveNest aprende a mostrar o que faz sentido para vocês naquele momento.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                [CalendarHeart, "Planos e datas", "O que vem a seguir, sem agenda pesada."],
                [Camera, "Memórias", "Fotos e capítulos organizados naturalmente."],
                [MessageCircle, "Conversa", "Um lugar íntimo para manter contacto."],
                [Sparkles, "Rituais", "Pequenas ações que criam consistência."],
              ].map(([Icon, title, copy]) => {
                const IconComponent = Icon as typeof Heart;
                return (
                  <div key={title as string} className="flex gap-3 rounded-2xl bg-white/60 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900/[0.04]">
                      <IconComponent className="h-4 w-4 text-slate-500" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold">{title as string}</p>
                      <p className="mt-1 text-[12px] leading-5 text-slate-400">{copy as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="relative">
            <div className="rounded-[2rem] border border-slate-900/[0.06] bg-[#0B1324] p-7 text-white shadow-[0_30px_70px_rgba(11,19,36,0.18)] md:p-9">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/40">Hoje para vocês</p>
                <LockKeyhole className="h-4 w-4 text-rose-300" strokeWidth={1.8} />
              </div>
              <p className="mt-5 text-[27px] font-extrabold leading-tight tracking-[-0.035em]">
                Duas pessoas. Um espaço. Só o que importa agora.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "O teu par partilhou como se sente.",
                  "Têm um plano para sexta-feira.",
                  "A vossa chama está protegida hoje.",
                ].map((text, index) => (
                  <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3.5">
                    <div className={index === 0 ? "h-2 w-2 rounded-full bg-rose-300" : index === 1 ? "h-2 w-2 rounded-full bg-indigo-300" : "h-2 w-2 rounded-full bg-orange-300"} />
                    <span className="text-[13px] font-medium text-white/70">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="bg-[#0B1324] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:px-8 md:py-28">
            <motion.div {...fadeUp}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08]">
                <LockKeyhole className="h-5 w-5 text-rose-300" strokeWidth={1.7} />
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300/80">Privacidade</p>
              <h2 className="mt-3 text-[34px] font-black leading-[1.05] tracking-[-0.04em] md:text-[46px]">
                A relação não é conteúdo.
              </h2>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-2xl">
              <p className="text-[16px] leading-8 text-white/60 md:text-[18px]">
                O LoveNest foi pensado para informação íntima: conversas, humor, memórias,
                localização e momentos pessoais. O produto deve tratar isso como responsabilidade,
                não como combustível para publicidade.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Privado por defeito", "Controlo do casal", "Sem feed público", "Sem publicidade no espaço"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[11px] font-semibold text-white/60">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden px-6 py-24 md:py-32">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-200/45 blur-[100px]"
          />
          <motion.div {...fadeUp} className="relative mx-auto max-w-3xl text-center">
            <LogoMark size={42} />
            <h2 className="mt-6 text-[38px] font-black leading-[1.02] tracking-[-0.045em] md:text-[58px]">
              Comecem pelos dias comuns.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-slate-500 md:text-[17px]">
              Criem o vosso espaço e deixem o LoveNest crescer com a vossa história.
            </p>
            <button
              type="button"
              onClick={() => navigate("/inicio")}
              className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-[1.15rem] bg-[#0B1324] px-8 text-[14px] font-bold text-white shadow-[0_16px_35px_rgba(11,19,36,0.16)] transition hover:-translate-y-0.5 active:scale-[0.985]"
            >
              Criar o nosso LoveNest
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-slate-900/[0.06] px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-xs font-bold">LoveNest</span>
          </div>
          <p className="text-[10px] font-medium text-slate-400">
            O amor também vive nos dias comuns.
          </p>
        </div>
      </footer>
    </div>
  );
}

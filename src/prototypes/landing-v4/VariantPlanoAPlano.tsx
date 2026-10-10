import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import {
  Bubble,
  COPY,
  EASE_OUT,
  LoginLink,
  Logo,
  Mark,
  MoodFragment,
  PrimaryCta,
  Shot,
  TogetherFragment,
  LOGIN_HREF,
  type Person,
} from "./shared";

/**
 * C — "Plano a plano". Eixo: cinemática mínima.
 * Planos de ecrã inteiro em scroll nativo (sem scroll-jacking, sem snap).
 * Uma linha de texto por plano; os fragmentos da app surgem como legendas.
 * As duas marcas estão sempre no ecrã e aproximam-se com o progresso da
 * página — o próprio scroll é a aproximação das duas pessoas.
 */

export function VariantPlanoAPlano() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const reduce = useReducedMotion();

  return (
    <div ref={ref} className="relative bg-[#0B1324] text-white">
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 pt-[env(safe-area-inset-top)] lg:h-20 lg:px-10">
        <Logo light />
        <a
          href={LOGIN_HREF}
          className="v4-focus-light -mr-2 inline-flex min-h-[44px] items-center px-2 text-[15px] font-medium text-white"
        >
          Entrar
        </a>
      </header>

      <ApproachingMarks progress={scrollYProgress} still={!!reduce} />

      {/* Plano 1 — o hero */}
      <Plano
        shot={{
          code: "S1",
          title: "Manhã, cozinha",
          brief: "Cozinha pequena, luz lateral da manhã, exposição baixa. Ana e Miguel em lados opostos do quadro.",
          people: [
            { name: "Ana", x: 22 },
            { name: "Miguel", x: 78 },
          ],
        }}
        labelledBy="c-h1"
      >
        <div className="mb-8 hidden max-w-[300px] space-y-2.5 lg:absolute lg:right-[12%] lg:top-[34%] lg:mb-0 lg:block" aria-hidden="true">
          <Caption delay={0.5} x={-14}>
            <Bubble from="a">{COPY.msgAna}</Bubble>
          </Caption>
          <Caption delay={0.8} x={14}>
            <Bubble from="b" dark>{COPY.msgMiguel}</Bubble>
          </Caption>
        </div>
        <div className="mb-6 space-y-2 lg:hidden" aria-hidden="true">
          <Caption delay={0.5} x={-12}>
            <Bubble from="a">{COPY.msgAna}</Bubble>
          </Caption>
        </div>
        <h1 id="c-h1" className="v4-serif max-w-[16ch] text-[38px] leading-[1.05] lg:text-[72px] lg:leading-[1.02]">
          {COPY.h1}
        </h1>
        <div className="mt-7 flex flex-col items-start gap-1 lg:mt-9 lg:flex-row lg:items-center lg:gap-7">
          <PrimaryCta light className="w-full lg:w-auto" />
          <LoginLink light />
        </div>
      </Plano>

      {/* Plano 2 — presença */}
      <Plano
        shot={{
          code: "S2",
          title: "Transporte",
          brief: "Ana à janela de um chapa, cidade a passar. Retrato a 3/4, exposição baixa, reflexos no vidro.",
          people: [{ name: "Ana", x: 62 }],
        }}
        labelledBy="c-h2"
      >
        <Caption delay={0.1} x={0} inView>
          <MoodFragment className="mb-6" />
        </Caption>
        <h2 id="c-h2" className="v4-serif max-w-[18ch] text-[34px] leading-[1.08] lg:text-[56px]">
          {COPY.presencaTitulo}
        </h2>
      </Plano>

      {/* Plano 3 — encontraram-se */}
      <Plano
        shot={{
          code: "S5",
          title: "Varanda, fim de tarde",
          brief: "Os dois lado a lado numa varanda simples, pequenos no quadro. Hora dourada, exposição baixa.",
          people: [
            { name: "Ana", x: 44, y: 40, h: 50 },
            { name: "Miguel", x: 56, y: 40, h: 50 },
          ],
        }}
      >
        <Caption delay={0.1} x={0} inView>
          <TogetherFragment dark />
        </Caption>
        <p className="v4-serif mt-5 max-w-[22ch] text-[30px] leading-[1.1] lg:text-[44px]">
          E, no fim do dia, um sítio que é só dos dois.
        </p>
      </Plano>

      {/* Onde as marcas se encontram */}
      <section className="relative flex min-h-[70svh] flex-col items-start justify-center bg-white px-5 pb-28 text-[#0B1324] lg:items-center lg:px-10 lg:text-center">
        <p className="v4-serif max-w-[18ch] text-[34px] leading-[1.08] lg:text-[52px]">Começa pelo teu lado.</p>
        <p className="mt-4 max-w-[38ch] text-[16px] leading-[1.55] text-[#4B5568] lg:text-[18px]">
          O teu par junta-se quando quiser. Também podes usá-lo só para ti e convidar alguém mais tarde.
        </p>
        <PrimaryCta className="mt-8 w-full lg:w-auto" />
        <p className="mt-10 text-[13px] text-[#4B5568]">Fim do protótipo: hero e primeiro capítulo.</p>
      </section>
    </div>
  );
}

/** Um plano de ecrã inteiro: fotografia a toda a área, texto no terço inferior. */
function Plano({
  shot,
  children,
  labelledBy,
}: {
  shot: { code: string; title: string; brief: string; people: Person[] };
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <Shot {...shot} tone="cinema" className="absolute inset-0" briefPosition="below-header" />
      {/* Véu funcional para a legibilidade do texto branco — não decorativo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0B1324]/85 via-[#0B1324]/45 to-transparent"
      />
      <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:px-[8vw] lg:pb-28">
        {children}
      </div>
    </section>
  );
}

/** Um fragmento da app a aparecer como legenda. */
function Caption({
  children,
  delay,
  x,
  inView = false,
}: {
  children: ReactNode;
  delay: number;
  x: number;
  inView?: boolean;
}) {
  const from = { opacity: 0, x, y: x === 0 ? 8 : 0 };
  const to = { opacity: 1, x: 0, y: 0 };
  return inView ? (
    <motion.div
      initial={from}
      whileInView={to}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  ) : (
    <motion.div initial={from} animate={to} transition={{ duration: 0.3, ease: EASE_OUT, delay }}>
      {children}
    </motion.div>
  );
}

/**
 * As duas marcas, fixas no ecrã, a aproximarem-se com o progresso do scroll.
 * Desktop: nas margens laterais, a meia altura. Mobile: no topo, ao centro.
 * Com reduced motion ficam paradas e já juntas.
 */
function ApproachingMarks({ progress, still }: { progress: MotionValue<number>; still: boolean }) {
  const deskA = useTransform(progress, [0, 0.92], ["0vw", "42vw"]);
  const deskB = useTransform(progress, [0, 0.92], ["0vw", "-42vw"]);
  const mobA = useTransform(progress, [0, 0.92], [-46, -2]);
  const mobB = useTransform(progress, [0, 0.92], [46, 2]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10">
      {/* Desktop */}
      <div className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 lg:block">
        <motion.span className="absolute left-[6vw] flex" style={still ? { left: "calc(50% - 16px)" } : { x: deskA }}>
          <Mark side="a" height={44} />
        </motion.span>
        <motion.span className="absolute right-[6vw] flex" style={still ? { right: "calc(50% - 16px)" } : { x: deskB }}>
          <Mark side="b" height={44} />
        </motion.span>
      </div>
      {/* Mobile */}
      <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+5rem)] flex -translate-x-1/2 lg:hidden">
        <motion.span className="flex" style={still ? undefined : { x: mobA }}>
          <Mark side="a" height={26} />
        </motion.span>
        <motion.span className="-ml-[2px] flex" style={still ? undefined : { x: mobB }}>
          <Mark side="b" height={26} />
        </motion.span>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import {
  Bubble,
  ChapterLabel,
  COPY,
  EASE_OUT,
  LoginLink,
  Logo,
  Mark,
  PrimaryCta,
  Shot,
  TogetherFragment,
  LOGIN_HREF,
} from "./shared";

/**
 * B — "Entre os dois". Eixo: díptico.
 * Cada pessoa tem a sua metade, no seu lugar e na sua hora. O LoveNest vive
 * literalmente na calha entre as duas imagens; a calha estreita-se de
 * capítulo para capítulo, até as metades se juntarem (capítulo 06).
 */

const arrive = (i: number, x: number) => ({
  initial: { opacity: 0, x },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3, ease: EASE_OUT, delay: 0.4 + i * 0.3 },
});

const ANA_CASA = {
  code: "S1a",
  title: "Ana, casa, fim do dia",
  brief: "Ana na cozinha de casa, ainda de casaco, a pousar as compras. Plano médio, vertical. Luz de fim de tarde pela janela.",
};
const MIGUEL_RUA = {
  code: "S4b",
  title: "Miguel, a caminho",
  brief: "Miguel à saída do trabalho, mochila ao ombro, a atravessar a rua ao anoitecer. Plano médio, vertical. Luz de candeeiros.",
};
const ANA_TRABALHO = {
  code: "S3a",
  title: "Ana, pausa no trabalho",
  brief: "Ana numa pausa, encostada à janela de uma loja ou escritório simples. Telemóvel na mão. Luz do meio-dia.",
};
const MIGUEL_TRANSPORTE = {
  code: "S2b",
  title: "Miguel, no chapa",
  brief: "Miguel sentado no chapa, cidade a passar na janela. Retrato a 3/4. Luz da manhã, reflexos no vidro.",
};

export function VariantEntreOsDois() {
  return (
    <div className="min-h-[100dvh] bg-white text-[#0B1324]">
      <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 pt-[env(safe-area-inset-top)] lg:h-20 lg:px-10">
        <Logo />
        <a
          href={LOGIN_HREF}
          className="v4-focus -mr-2 inline-flex min-h-[44px] items-center px-2 text-[15px] font-medium"
        >
          Entrar
        </a>
      </header>

      {/* ── 01 — o hero: duas metades e o espaço entre elas ─────────────── */}
      <section aria-labelledby="b-h1">
        {/* Desktop */}
        <div className="hidden lg:block">
          <div className="mx-auto grid h-[min(68vh,620px)] max-w-[1440px] grid-cols-[1fr_300px_1fr] px-10">
            <Shot
              {...ANA_CASA}
              className="h-full"
              people={[{ name: "Ana", x: 46, y: 20, h: 74 }]}
            />
            {/* A calha: é aqui que o LoveNest acontece. */}
            <div className="relative flex flex-col justify-center px-6" aria-hidden="true">
              <div className="absolute inset-y-10 left-1/2 w-px -translate-x-1/2 bg-[#0B1324]/[0.08]" />
              <div className="relative space-y-4">
                <motion.div {...arrive(0, -16)}>
                  <Bubble from="a" name="Ana · 19:04">{COPY.msgAna}</Bubble>
                </motion.div>
                <motion.div {...arrive(1, 16)}>
                  <Bubble from="b" name="Miguel · 19:06">{COPY.msgMiguel}</Bubble>
                </motion.div>
              </div>
            </div>
            <Shot
              {...MIGUEL_RUA}
              briefPosition="top-right"
              className="h-full"
              people={[{ name: "Miguel", x: 54, y: 18, h: 76 }]}
            />
          </div>

          <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_300px_1fr] px-10 pb-24 pt-14">
            <div>
              <ChapterLabel n="01">Dois lugares, um espaço</ChapterLabel>
              <h1 id="b-h1" className="v4-serif mt-5 max-w-[13ch] text-[64px] leading-[1.03]">
                {COPY.h1}
              </h1>
            </div>
            <div />
            <div className="flex flex-col justify-end">
              <p className="v4-pretty max-w-[34ch] text-[18px] leading-[1.6] text-[#4B5568]">{COPY.apoio}</p>
              <div className="mt-8 flex items-center gap-7">
                <PrimaryCta />
                <LoginLink />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: as metades empilham-se (Ana em cima, Miguel em baixo) e a
            conversa corre entre elas — cada mensagem junto de quem a escreveu. */}
        <div className="lg:hidden">
          <Shot
            {...ANA_CASA}
            ratio="16 / 9"
            compact
            className="w-full"
            people={[{ name: "Ana", x: 34, y: 34, h: 66 }]}
          />
          <div className="space-y-2.5 px-4 py-4" aria-hidden="true">
            <motion.div {...arrive(0, -14)}>
              <Bubble from="a">{COPY.msgAna}</Bubble>
            </motion.div>
            <motion.div {...arrive(1, 14)}>
              <Bubble from="b">{COPY.msgMiguel}</Bubble>
            </motion.div>
          </div>
          <Shot
            {...MIGUEL_RUA}
            ratio="16 / 9"
            compact
            className="w-full"
            people={[{ name: "Miguel", x: 62, y: 34, h: 66 }]}
          />
          <div className="px-5 pb-14 pt-7">
            <h1 className="v4-serif text-[34px] leading-[1.06]">{COPY.h1}</h1>
            <p className="v4-pretty mt-3 text-[16px] leading-[1.55] text-[#4B5568]">{COPY.apoio}</p>
            <PrimaryCta className="mt-6 w-full" />
            <LoginLink className="mt-2" />
          </div>
        </div>
      </section>

      {/* ── 02 · Presença — a calha estreita-se ────────────────────────── */}
      <section aria-labelledby="b-h2" className="pb-24">
        {/* Desktop */}
        <div className="mx-auto hidden max-w-[1440px] px-10 lg:block">
          <div className="max-w-[640px] pb-10">
            <ChapterLabel n="02">Meio da manhã</ChapterLabel>
            <h2 id="b-h2" className="v4-serif mt-5 text-[48px] leading-[1.08]">
              {COPY.presencaTitulo}
            </h2>
            <p className="v4-pretty mt-5 max-w-[40ch] text-[18px] leading-[1.6] text-[#4B5568]">{COPY.presencaApoio}</p>
          </div>
          <div className="grid h-[min(56vh,520px)] grid-cols-[1fr_120px_1fr]">
            <Shot {...ANA_TRABALHO} className="h-full" people={[{ name: "Ana", x: 40, y: 22, h: 72 }]} />
            <MeetingGutter />
            <Shot
              {...MIGUEL_TRANSPORTE}
              briefPosition="top-right"
              className="h-full"
              people={[{ name: "Miguel", x: 58, y: 22, h: 72 }]}
            />
          </div>
          <TogetherFragment className="mt-6 pl-[calc(50%-150px)]" />
        </div>

        {/* Mobile: as duas metades encostam-se; a marca de cada um fica na junção. */}
        <div className="lg:hidden">
          <div className="px-5 pb-6">
            <ChapterLabel n="02">Meio da manhã</ChapterLabel>
            <h2 className="v4-serif mt-3 text-[30px] leading-[1.1]">{COPY.presencaTitulo}</h2>
            <p className="v4-pretty mt-3 text-[16px] leading-[1.55] text-[#4B5568]">{COPY.presencaApoio}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Shot {...ANA_TRABALHO} ratio="3 / 4.4" compact people={[{ name: "Ana", x: 50, y: 30, h: 66 }]} />
            <Shot
              {...MIGUEL_TRANSPORTE}
              ratio="3 / 4.4"
              compact
              briefPosition="top-right"
              people={[{ name: "Miguel", x: 50, y: 30, h: 66 }]}
            />
          </div>
          <TogetherFragment className="mt-5 px-5" />
        </div>
      </section>

      <p className="mx-auto max-w-[1440px] px-5 pb-28 text-[13px] text-[#4B5568] lg:px-10">
        Fim do protótipo: hero e primeiro capítulo. No capítulo 06 as duas metades juntam-se numa só imagem.
      </p>
    </div>
  );
}

/** A calha mais estreita: as duas marcas aproximam-se até se tocarem. */
function MeetingGutter() {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <motion.span
        initial={{ x: -14 }}
        whileInView={{ x: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
        className="flex"
      >
        <Mark side="a" height={34} />
      </motion.span>
      <motion.span
        initial={{ x: 14 }}
        whileInView={{ x: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
        className="-ml-[3px] flex"
      >
        <Mark side="b" height={34} />
      </motion.span>
    </div>
  );
}

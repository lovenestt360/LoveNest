import { motion } from "framer-motion";
import {
  Bubble,
  ChapterLabel,
  COPY,
  EASE_OUT,
  LoginLink,
  Logo,
  MoodFragment,
  PrimaryCta,
  Shot,
  LOGIN_HREF,
} from "./shared";

/**
 * A — "Um dia". Eixo: composição vertical de revista.
 * Fotografia grande e assimétrica a sangrar para a margem, título em serifa
 * a sobrepor-se à imagem, um fragmento pequeno por cena.
 */

const arrive = (i: number, x: number) => ({
  initial: { opacity: 0, x },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3, ease: EASE_OUT, delay: 0.45 + i * 0.28 },
});

const S1 = {
  code: "S1",
  title: "Manhã, cozinha",
  brief:
    "Casal de trinta e poucos numa cozinha pequena de Maputo. Ela prepara chá, ele procura as chaves. Lados opostos do quadro, sem se olharem. Sol lateral da manhã.",
};
const S2 = {
  code: "S2",
  title: "Transporte",
  brief:
    "Ela, a caminho do trabalho, à janela de um chapa. Retrato a 3/4, telemóvel na mão, ecrã não visível. Um pequeno sorriso privado.",
};

export function VariantUmDia() {
  return (
    <div className="min-h-[100dvh] bg-white text-[#0B1324]">
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 pt-[env(safe-area-inset-top)] lg:h-20 lg:px-10">
        <Logo />
        <a
          href={LOGIN_HREF}
          className="v4-focus -mr-2 inline-flex min-h-[44px] items-center px-2 text-[15px] font-medium text-[#0B1324]"
        >
          Entrar
        </a>
      </header>

      {/* ── 01 · Manhã — o hero ─────────────────────────────────────────── */}
      <section aria-labelledby="a-h1" className="relative">
        {/* Desktop: foto à direita, a sangrar; título à esquerda a sobrepor-se. */}
        <div className="mx-auto hidden max-w-[1280px] grid-cols-12 px-10 pb-28 pt-6 lg:grid">
          {/* Mesma linha da grelha: o título sobrepõe-se ao canto da fotografia. */}
          <div className="relative z-10 col-span-6 col-start-1 row-start-1 flex flex-col justify-end pb-16">
            <ChapterLabel n="01">Manhã</ChapterLabel>
            <h1 id="a-h1" className="v4-serif mt-6 text-[78px] leading-[1.02]">
              O amor também vive nos dias <em className="italic">comuns</em>.
            </h1>
            <p className="v4-pretty mt-7 max-w-[30ch] text-[18px] leading-[1.6] text-[#4B5568]">{COPY.apoio}</p>
            <div className="mt-10 flex items-center gap-7">
              <PrimaryCta />
              <LoginLink />
            </div>
          </div>
          <div className="relative col-span-7 col-start-6 row-start-1 -mr-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <Shot
                {...S1}
                ratio="5 / 4"
                people={[
                  { name: "Ana", x: 24 },
                  { name: "Miguel", x: 80 },
                ]}
              />
            </motion.div>
            {/* A troca de mensagens vive no espaço entre os dois. */}
            <div aria-hidden="true" className="absolute left-[34%] top-[46%] w-[300px] space-y-3">
              <motion.div {...arrive(0, -14)}>
                <Bubble from="a">{COPY.msgAna}</Bubble>
              </motion.div>
              <motion.div {...arrive(1, 14)}>
                <Bubble from="b">{COPY.msgMiguel}</Bubble>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile: foto em cima, mensagens a sobrepor a base, título e CTA por baixo. */}
        <div className="lg:hidden">
          <div className="relative">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
              <Shot
                {...S1}
                ratio="4 / 4.4"
                compact
                className="max-h-[56svh] w-full"
                people={[
                  { name: "Ana", x: 22, y: 18, h: 70 },
                  { name: "Miguel", x: 80, y: 14, h: 76 },
                ]}
              />
            </motion.div>
            <div aria-hidden="true" className="absolute inset-x-4 -bottom-10 space-y-2.5">
              <motion.div {...arrive(0, -14)}>
                <Bubble from="a">{COPY.msgAna}</Bubble>
              </motion.div>
              <motion.div {...arrive(1, 14)}>
                <Bubble from="b">{COPY.msgMiguel}</Bubble>
              </motion.div>
            </div>
          </div>
          <div className="px-5 pb-16 pt-16">
            <h1 className="v4-serif text-[40px] leading-[1.05]">
              O amor também vive nos dias <em className="italic">comuns</em>.
            </h1>
            <p className="v4-pretty mt-4 text-[16px] leading-[1.55] text-[#4B5568]">{COPY.apoio}</p>
            <PrimaryCta className="mt-7 w-full" />
            <LoginLink className="mt-2" />
          </div>
        </div>
      </section>

      {/* ── 02 · Presença ──────────────────────────────────────────────── */}
      <section aria-labelledby="a-h2" className="relative">
        {/* Desktop: composição invertida — foto vertical à esquerda, a sangrar. */}
        <div className="mx-auto hidden max-w-[1280px] grid-cols-12 items-center px-10 pb-32 lg:grid">
          <div className="relative col-span-5 col-start-1 -ml-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))]">
            <Shot {...S2} ratio="3 / 4" briefPosition="top-right" people={[{ name: "Ana", x: 58, y: 20, h: 72 }]} />
            <MoodFragment className="absolute -right-16 bottom-16" />
          </div>
          <div className="col-span-5 col-start-8">
            <ChapterLabel n="02">Meio da manhã</ChapterLabel>
            <h2 id="a-h2" className="v4-serif mt-6 text-[50px] leading-[1.08]">
              {COPY.presencaTitulo}
            </h2>
            <p className="v4-pretty mt-6 max-w-[38ch] text-[18px] leading-[1.6] text-[#4B5568]">{COPY.presencaApoio}</p>
          </div>
        </div>

        {/* Mobile: foto vertical a toda a largura, fragmento por baixo, não sobre o rosto. */}
        <div className="pb-20 lg:hidden">
          <Shot {...S2} ratio="4 / 5" compact className="w-full" people={[{ name: "Ana", x: 56, y: 18, h: 74 }]} />
          <div className="relative z-10 -mt-8 flex justify-end px-5">
            <MoodFragment />
          </div>
          <div className="px-5 pt-10">
            <ChapterLabel n="02">Meio da manhã</ChapterLabel>
            <h2 className="v4-serif mt-4 text-[31px] leading-[1.1]">{COPY.presencaTitulo}</h2>
            <p className="v4-pretty mt-4 text-[16px] leading-[1.55] text-[#4B5568]">{COPY.presencaApoio}</p>
          </div>
        </div>
      </section>

      <EndOfPrototype />
    </div>
  );
}

function EndOfPrototype() {
  return (
    <p className="mx-auto max-w-[1280px] px-5 pb-28 text-[13px] text-[#4B5568] lg:px-10">
      Fim do protótipo: hero e primeiro capítulo. Os capítulos 03–06 seguem o documento de direção.
    </p>
  );
}

import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AuthHeader, AuthPage, EASE, HeaderLink, PrimaryButton, QuietLink, Reveal } from "@/features/auth/AuthKit";
import { Crescent } from "@/features/auth/Nest";

export function MobileWelcome({ onExplore }: { onExplore: () => void }) {
  const navigate = useNavigate();

  const start = () => navigate("/inicio?start=1");
  const login = () => navigate("/entrar?returning=1");

  return (
    <AuthPage>
      <AuthHeader meet right={<HeaderLink onClick={onExplore}>Conhecer</HeaderLink>} />

      <section className="flex flex-1 flex-col justify-center py-8">
        <Exchange />

        <Reveal delay={0.12} className="mt-12">
          <h1 className="text-[34px] font-extrabold leading-[1.04] tracking-[-0.042em]">
            Duas pessoas.
            <span className="block text-[#0B1324]/35">Um espaço só vosso.</span>
          </h1>
          <p className="mt-4 max-w-[30ch] text-[15px] leading-[1.55] text-slate-500">
            Conversas, memórias e pequenos rituais — só entre vocês os dois.
          </p>
        </Reveal>
      </section>

      <footer className="space-y-4">
        <PrimaryButton type="button" onClick={start}>
          Criar o nosso espaço
        </PrimaryButton>
        <p className="text-center text-[14px] text-slate-500">
          Já têm conta? <QuietLink onClick={login}>Entrar</QuietLink>
        </p>
      </footer>
    </AuthPage>
  );
}

/**
 * O único momento do ecrã: uma troca real. Cada mensagem chega do lado de
 * quem a escreveu e fica entre o crescente dessa pessoa — juntas, as duas
 * fecham o ninho à volta da conversa.
 */
function Exchange() {
  const reduce = useReducedMotion();
  const arrive = (i: number, fromX: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, x: fromX },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.34, ease: EASE, delay: 0.35 + i * 0.32 },
        };

  return (
    <div aria-hidden="true" className="space-y-3">
      <motion.p {...arrive(0, 0)} className="pl-1 text-[11px] font-semibold text-slate-400">
        Hoje, 22:41
      </motion.p>

      <motion.div {...arrive(0, -18)} className="flex items-end gap-2 pr-10">
        <Crescent side="a" height={38} />
        <div>
          <p className="mb-1 text-[11px] font-semibold text-slate-400">Ana</p>
          <p className="rounded-[18px] rounded-bl-[6px] bg-white px-4 py-2.5 text-[15px] leading-snug shadow-[0_1px_0_rgba(11,19,36,0.04),0_12px_28px_-18px_rgba(11,19,36,0.25)]">
            Chegaste bem?
          </p>
        </div>
      </motion.div>

      <motion.div {...arrive(1, 18)} className="flex items-end justify-end gap-2 pl-14">
        <div className="text-right">
          <p className="mb-1 text-[11px] font-semibold text-slate-400">Miguel</p>
          <p className="rounded-[18px] rounded-br-[6px] bg-[#0B1324] px-4 py-2.5 text-left text-[15px] leading-snug text-white">
            Cheguei. Guardei-te o último pastel.
          </p>
        </div>
        <Crescent side="b" height={38} />
      </motion.div>
    </div>
  );
}

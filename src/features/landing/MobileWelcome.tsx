import { useNavigate } from "react-router-dom";
import { AuthHeader, AuthPage, CoupleMoment, HeaderLink, PrimaryButton, QuietLink, Reveal } from "@/features/auth/AuthKit";

export function MobileWelcome({ onExplore }: { onExplore: () => void }) {
  const navigate = useNavigate();

  const start = () => navigate("/inicio?start=1");
  const login = () => navigate("/entrar?returning=1");

  return (
    <AuthPage>
      <AuthHeader right={<HeaderLink onClick={onExplore}>Conhecer</HeaderLink>} />

      {/* Um momento de uso real diz "isto é privado, para dois" sem o escrever. */}
      <section className="flex flex-1 flex-col justify-center py-8">
        <Reveal>
          <CoupleMoment />
        </Reveal>

        <Reveal delay={0.08} className="mt-10">
          <h1 className="max-w-[16ch] text-[31px] font-extrabold leading-[1.08] tracking-[-0.038em]">
            O amor também vive nos dias comuns.
          </h1>
          <p className="mt-3 max-w-[32ch] text-[15px] leading-[1.55] text-slate-500">
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

import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { AuthHeader, CoupleMoment, PAPER, PageTitle, Reveal } from "@/features/auth/AuthKit";

/**
 * Esqueleto das páginas de autenticação.
 * Móvel: cabeçalho discreto, título alinhado à esquerda, conteúdo integrado na
 * página (sem cartão) e rodapé opcional encostado ao fundo com safe area.
 * Desktop: painel de tinta com um momento real do casal à esquerda.
 */
export function AuthScaffold({
  children,
  eyebrow,
  title,
  subtitle,
  headerRight,
  footer,
  motif,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  /** O sinal do ninho por cima do título — reage ao estado da página. */
  motif?: ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] text-[#0B1324]" style={{ background: PAPER }}>
      <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="hidden flex-col justify-between bg-[#0B1324] px-12 py-11 text-white lg:flex xl:px-16">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">LoveNest</span>
          </div>

          <div className="max-w-[400px]">
            <CoupleMoment dark />
            <p className="mt-10 text-[34px] font-extrabold leading-[1.08] tracking-[-0.035em]">
              O que é vosso
              <span className="block text-white/40">fica entre vocês.</span>
            </p>
          </div>

          <p className="text-[12px] text-white/30">O amor também vive nos dias comuns.</p>
        </aside>

        <section className="flex min-h-[100dvh] flex-col">
          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:justify-center lg:py-14">
            <div className="lg:hidden">
              <AuthHeader right={headerRight} />
            </div>
            {headerRight && <div className="hidden justify-end lg:flex">{headerRight}</div>}

            <Reveal className="mt-8 lg:mt-6">
              {motif && <div className="mb-6">{motif}</div>}
              <PageTitle eyebrow={eyebrow} title={title} subtitle={subtitle} />
            </Reveal>

            <Reveal delay={0.06} className="mt-7">
              {children}
            </Reveal>

            {footer && <div className="mt-auto pt-8">{footer}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

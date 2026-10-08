import type { ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export function AuthScaffold({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="min-h-[100dvh] bg-[#F8F5F4] text-[#0B1324]">
      <div className="grid min-h-[100dvh] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden bg-[#0B1324] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-20 h-96 w-96 rounded-full bg-rose-400/20 blur-[110px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-indigo-400/10 blur-[120px]"
          />

          <div className="relative flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-[16px] font-extrabold tracking-[-0.02em]">LoveNest</span>
          </div>

          <div className="relative max-w-lg pb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300/75">
              O vosso espaço
            </p>
            <h2 className="mt-5 text-[46px] font-black leading-[1.02] tracking-[-0.045em] xl:text-[54px]">
              O que é íntimo
              <span className="block text-white/45">fica entre vocês.</span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-white/55">
              Conversas, memórias e pequenos rituais num lugar pensado para duas pessoas —
              não para uma audiência.
            </p>

            <div className="mt-9 grid max-w-md gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <ShieldCheck className="h-4 w-4 text-emerald-300" strokeWidth={1.8} />
                <p className="mt-3 text-xs font-bold text-white/80">Privado por defeito</p>
                <p className="mt-1 text-[11px] leading-5 text-white/40">Sem feed público ou audiência.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <LockKeyhole className="h-4 w-4 text-rose-300" strokeWidth={1.8} />
                <p className="mt-3 text-xs font-bold text-white/80">Só o que importa</p>
                <p className="mt-1 text-[11px] leading-5 text-white/40">A relação vem antes das funções.</p>
              </div>
            </div>
          </div>

          <p className="relative text-[10px] font-medium text-white/25">
            O amor também vive nos dias comuns.
          </p>
        </aside>

        <section className="relative flex min-h-[100dvh] flex-col">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-200/35 blur-3xl lg:hidden"
          />

          <header className="relative flex items-center gap-2 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] lg:hidden">
            <LogoMark size={28} />
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">LoveNest</span>
          </header>

          <div className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-7 sm:px-8 lg:px-10 lg:py-14">
            <div className="mb-7">
              {eyebrow && (
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500/80">
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-2 text-[32px] font-black leading-tight tracking-[-0.04em] sm:text-[36px]">
                {title}
              </h1>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-slate-500">{subtitle}</p>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

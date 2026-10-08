import { ArrowRight, Heart, LockKeyhole, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoIcon, LogoMark } from "@/components/Logo";

export function MobileWelcome({ onExplore }: { onExplore: () => void }) {
  const navigate = useNavigate();

  const start = () => navigate("/inicio");
  const login = () => navigate("/entrar?returning=1");

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F8F5F4] text-[#111827]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-rose-200/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">LoveNest</span>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 active:bg-black/5"
          >
            Conhecer
          </button>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-2 rounded-[2rem] bg-rose-300/25 blur-2xl"
              />
              <LogoIcon size={104} className="relative drop-shadow-[0_18px_35px_rgba(11,19,36,0.18)]" />
            </div>
          </div>

          <div className="mx-auto max-w-[330px] text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500/80">
              Um espaço só vosso
            </p>
            <h1 className="text-[36px] font-black leading-[1.02] tracking-[-0.045em] text-[#0B1324]">
              O amor também vive nos dias comuns.
            </h1>
            <p className="mx-auto mt-4 max-w-[300px] text-[15px] leading-6 text-slate-500">
              Conversem, cuidem um do outro e guardem a vossa história num lugar privado para dois.
            </p>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-[330px] grid-cols-3 gap-2.5">
            {[
              { icon: Heart, label: "Presença" },
              { icon: Sparkles, label: "Momentos" },
              { icon: LockKeyhole, label: "Privado" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-2 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl"
              >
                <Icon className="h-4 w-4 text-rose-400" strokeWidth={1.8} />
                <span className="text-[10px] font-semibold text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="space-y-3">
          <button
            type="button"
            onClick={start}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#0B1324] text-[15px] font-bold text-white shadow-[0_14px_35px_rgba(11,19,36,0.18)] transition active:scale-[0.985]"
          >
            Criar o nosso LoveNest
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={login}
            className="h-13 w-full rounded-[1.25rem] border border-slate-200/80 bg-white/70 py-3.5 text-[14px] font-bold text-[#0B1324] backdrop-blur active:scale-[0.985]"
          >
            Já tenho conta
          </button>

          <p className="pt-1 text-center text-[10px] leading-4 text-slate-400">
            Privado por defeito. Sem publicidade dentro do vosso espaço.
          </p>
        </footer>
      </div>
    </main>
  );
}

import { ArrowRight, Heart, LockKeyhole, Sparkles } from "lucide-react";
import { LogoIcon } from "@/components/Logo";

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
    return (
        <main className="relative min-h-[100dvh] overflow-hidden bg-[#F8F5F4] px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] text-[#0B1324]">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-rose-200/45 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />

            <div className="relative mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-sm flex-col">
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="relative mb-8">
                        <div aria-hidden className="absolute inset-2 rounded-[2rem] bg-rose-300/25 blur-2xl" />
                        <LogoIcon size={92} className="relative drop-shadow-[0_18px_35px_rgba(11,19,36,0.16)]" />
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500/80">Antes de começar</p>
                    <h1 className="mt-3 text-[34px] font-black leading-[1.04] tracking-[-0.045em]">
                        Vamos fazer o LoveNest parecer vosso.
                    </h1>
                    <p className="mt-4 max-w-[310px] text-[14px] leading-6 text-slate-500">
                        São só alguns passos para adaptar o espaço à forma como vocês querem usar a aplicação.
                    </p>

                    <div className="mt-8 grid w-full grid-cols-3 gap-2.5">
                        {[
                            { icon: Heart, label: "Vocês" },
                            { icon: Sparkles, label: "Preferências" },
                            { icon: LockKeyhole, label: "Privacidade" },
                        ].map(({ icon: Icon, label }) => (
                            <div
                                key={label}
                                className="flex flex-col items-center gap-2 rounded-2xl border border-white/70 bg-white/60 px-2 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur"
                            >
                                <Icon className="h-4 w-4 text-rose-400" strokeWidth={1.8} />
                                <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onContinue}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#0B1324] text-[14px] font-bold text-white shadow-[0_14px_35px_rgba(11,19,36,0.16)] transition active:scale-[0.985]"
                >
                    Personalizar o LoveNest
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
            </div>
        </main>
    );
}

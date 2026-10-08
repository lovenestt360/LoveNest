import { type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingStepShell({
    step, total, title, subtitle, icon, children,
    onBack, onContinue, continueDisabled, continueLabel = "Continuar",
}: {
    step: number;
    total: number;
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    children?: ReactNode;
    onBack?: () => void;
    onContinue: () => void;
    continueDisabled?: boolean;
    continueLabel?: string;
}) {
    return (
        <main
            key={step}
            className="relative min-h-[100dvh] overflow-hidden bg-[#F8F5F4] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1rem)] text-[#0B1324] animate-fade-in"
        >
            <div aria-hidden className="pointer-events-none absolute -right-28 -top-20 h-72 w-72 rounded-full bg-rose-100/55 blur-3xl" />

            <div className="relative mx-auto flex min-h-[calc(100dvh-2.25rem)] w-full max-w-md flex-col">
                <header className="flex items-center gap-3">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white/65 text-slate-500 transition active:scale-95"
                            aria-label="Voltar"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="h-10 w-10 shrink-0" />
                    )}

                    <div className="flex flex-1 items-center gap-1.5">
                        {Array.from({ length: total }).map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-colors duration-300",
                                    index < step ? "bg-rose-400" : "bg-slate-200/80",
                                )}
                            />
                        ))}
                    </div>

                    <span className="w-10 shrink-0 text-right text-[10px] font-bold tabular-nums text-slate-400">
                        {step}/{total}
                    </span>
                </header>

                <section className="flex flex-1 flex-col items-center justify-center py-8 text-center animate-slide-up">
                    {icon && (
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/70 bg-white/70 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                            {icon}
                        </div>
                    )}

                    <h1 className="max-w-sm text-[30px] font-black leading-[1.08] tracking-[-0.04em]">{title}</h1>

                    {subtitle && (
                        <p className="mt-3 max-w-[330px] text-[14px] leading-6 text-slate-500">
                            {subtitle}
                        </p>
                    )}

                    {children && <div className="mt-8 w-full max-w-sm">{children}</div>}
                </section>

                <button
                    type="button"
                    onClick={onContinue}
                    disabled={continueDisabled}
                    className="flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-[1.2rem] bg-[#0B1324] text-[14px] font-bold text-white shadow-[0_14px_35px_rgba(11,19,36,0.14)] transition active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35"
                >
                    {continueLabel}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
            </div>
        </main>
    );
}

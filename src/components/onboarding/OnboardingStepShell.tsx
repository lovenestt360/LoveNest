import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
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
        <div key={step} className="min-h-screen flex flex-col bg-background px-6 pt-6 pb-8 animate-fade-in overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
                {onBack ? (
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                ) : (
                    <div className="w-9" />
                )}
                <div className="flex-1 flex items-center gap-1.5">
                    {Array.from({ length: total }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                i < step ? "bg-rose-500" : "bg-muted"
                            )}
                        />
                    ))}
                </div>
                <span className="text-[11px] font-bold text-muted-foreground shrink-0 tabular-nums">{step} de {total}</span>
            </div>

            <div className="flex-1 flex flex-col items-center text-center justify-center animate-slide-up">
                {icon && (
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mb-5">
                        {icon}
                    </div>
                )}
                <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
                {subtitle && <p className="text-[14px] text-muted-foreground mt-2 max-w-xs">{subtitle}</p>}

                {children && <div className="w-full max-w-sm mt-8">{children}</div>}
            </div>

            <button
                type="button"
                onClick={onContinue}
                disabled={continueDisabled}
                className="w-full h-14 rounded-2xl font-bold text-[15px] bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg active:scale-[0.98] transition-all shrink-0"
            >
                {continueLabel}
            </button>
        </div>
    );
}

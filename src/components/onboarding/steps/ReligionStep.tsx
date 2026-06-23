import { useState } from "react";
import { Sparkles } from "lucide-react";
import { OnboardingStepShell } from "../OnboardingStepShell";
import { OnboardingOptionButton } from "../OnboardingOptionButton";

const OPTIONS = [
    { value: "christian", label: "Cristão" },
    { value: "muslim", label: "Muçulmano" },
    { value: "hindu", label: "Hindu" },
    { value: "jewish", label: "Judaico" },
    { value: "other", label: "Outra" },
    { value: "none", label: "Nenhuma" },
    { value: "unspecified", label: "Prefiro não dizer" },
];

export function ReligionStep({ initialValue, onSubmit, onBack }: {
    initialValue: string | null;
    onSubmit: (religion: string) => void;
    onBack: () => void;
}) {
    const [selected, setSelected] = useState<string | null>(initialValue);

    return (
        <OnboardingStepShell
            step={3}
            total={5}
            title="A espiritualidade faz parte da tua vida?"
            icon={<Sparkles className="w-7 h-7 text-rose-500" strokeWidth={1.5} />}
            onBack={onBack}
            onContinue={() => selected && onSubmit(selected)}
            continueDisabled={!selected}
        >
            <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                {OPTIONS.map(opt => (
                    <OnboardingOptionButton
                        key={opt.value}
                        label={opt.label}
                        selected={selected === opt.value}
                        onClick={() => setSelected(opt.value)}
                    />
                ))}
            </div>
        </OnboardingStepShell>
    );
}

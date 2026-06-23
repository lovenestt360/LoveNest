import { useState } from "react";
import { Target } from "lucide-react";
import { OnboardingStepShell } from "../OnboardingStepShell";
import { OnboardingOptionButton } from "../OnboardingOptionButton";

const OPTIONS = [
    { value: "relationship", label: "Melhorar o meu relacionamento" },
    { value: "books", label: "Ler livros" },
    { value: "wellbeing", label: "Bem-estar emocional" },
    { value: "growth", label: "Crescimento pessoal" },
    { value: "explore", label: "Explorar a aplicação" },
];

export function PrimaryGoalStep({ initialValue, onSubmit, onBack, continueLabel }: {
    initialValue: string | null;
    onSubmit: (goal: string) => void;
    onBack: () => void;
    continueLabel?: string;
}) {
    const [selected, setSelected] = useState<string | null>(initialValue);

    return (
        <OnboardingStepShell
            step={5}
            total={5}
            title="O que te trouxe ao LoveNest?"
            icon={<Target className="w-7 h-7 text-rose-500" strokeWidth={1.5} />}
            onBack={onBack}
            onContinue={() => selected && onSubmit(selected)}
            continueDisabled={!selected}
            continueLabel={continueLabel}
        >
            <div className="space-y-2.5">
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

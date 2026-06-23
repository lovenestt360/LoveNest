import { useState } from "react";
import { User, Users } from "lucide-react";
import { OnboardingStepShell } from "../OnboardingStepShell";
import { OnboardingOptionButton } from "../OnboardingOptionButton";

const OPTIONS: { value: "solo" | "couple"; label: string; description: string; icon: typeof User }[] = [
    { value: "solo", label: "Sozinho(a)", description: "Explora a tua jornada pessoal — podes convidar um parceiro mais tarde.", icon: User },
    { value: "couple", label: "Com parceiro(a)", description: "Cria ou entra no vosso espaço de casal.", icon: Users },
];

export function UsageModeStep({ initialValue, onSubmit, onBack }: {
    initialValue: "solo" | "couple" | null;
    onSubmit: (mode: "solo" | "couple") => void;
    onBack: () => void;
}) {
    const [selected, setSelected] = useState<"solo" | "couple" | null>(initialValue);

    return (
        <OnboardingStepShell
            step={4}
            total={5}
            title="Como pretendes utilizar o LoveNest?"
            icon={<Users className="w-7 h-7 text-rose-500" strokeWidth={1.5} />}
            onBack={onBack}
            onContinue={() => selected && onSubmit(selected)}
            continueDisabled={!selected}
        >
            <div className="space-y-2.5">
                {OPTIONS.map(opt => (
                    <OnboardingOptionButton
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        icon={<opt.icon className="w-5 h-5 text-rose-400" strokeWidth={1.5} />}
                        selected={selected === opt.value}
                        onClick={() => setSelected(opt.value)}
                    />
                ))}
            </div>
        </OnboardingStepShell>
    );
}

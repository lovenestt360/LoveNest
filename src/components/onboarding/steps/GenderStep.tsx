import { useState } from "react";
import { UserRound } from "lucide-react";
import { OnboardingStepShell } from "../OnboardingStepShell";
import { OnboardingOptionButton } from "../OnboardingOptionButton";

const OPTIONS: { key: string; label: string; dbValue: string | null }[] = [
    { key: "male", label: "Masculino", dbValue: "male" },
    { key: "female", label: "Feminino", dbValue: "female" },
    { key: "unspecified", label: "Prefiro não dizer", dbValue: null },
];

export function GenderStep({ initialValue, onSubmit, onBack }: {
    initialValue: string | null;
    onSubmit: (gender: string | null) => void;
    onBack: () => void;
}) {
    const [selectedKey, setSelectedKey] = useState<string | null>(initialValue ?? null);

    return (
        <OnboardingStepShell
            step={2}
            total={5}
            title="Como te identificas?"
            icon={<UserRound className="w-7 h-7 text-rose-500" strokeWidth={1.5} />}
            onBack={onBack}
            onContinue={() => {
                const opt = OPTIONS.find(o => o.key === selectedKey);
                if (opt) onSubmit(opt.dbValue);
            }}
            continueDisabled={!selectedKey}
        >
            <div className="space-y-2.5">
                {OPTIONS.map(opt => (
                    <OnboardingOptionButton
                        key={opt.key}
                        label={opt.label}
                        selected={selectedKey === opt.key}
                        onClick={() => setSelectedKey(opt.key)}
                    />
                ))}
            </div>
        </OnboardingStepShell>
    );
}

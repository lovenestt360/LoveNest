import { useState } from "react";
import { Globe } from "lucide-react";
import { OnboardingStepShell } from "../OnboardingStepShell";
import { CountryPicker } from "../CountryPicker";

export function CountryStep({ initialValue, onSubmit, onBack }: {
    initialValue: string | null;
    onSubmit: (countryCode: string) => void;
    onBack: () => void;
}) {
    const [selected, setSelected] = useState<string | null>(initialValue);

    return (
        <OnboardingStepShell
            step={1}
            total={5}
            title="De onde és?"
            icon={<Globe className="w-7 h-7 text-rose-500" strokeWidth={1.5} />}
            onBack={onBack}
            onContinue={() => selected && onSubmit(selected)}
            continueDisabled={!selected}
        >
            <CountryPicker value={selected} onSelect={setSelected} />
        </OnboardingStepShell>
    );
}

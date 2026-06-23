import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function OnboardingOptionButton({ label, description, icon, selected, onClick }: {
    label: string;
    description?: string;
    icon?: ReactNode;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.98]",
                selected ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20" : "border-border bg-card"
            )}
        >
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="flex-1">
                <p className="text-[14px] font-bold text-foreground">{label}</p>
                {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </button>
    );
}

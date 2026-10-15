import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Abas da temática refinada: fundo cinzento quente e a aba ativa em branco.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  size = "md",
  className,
}: {
  tabs: readonly { id: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 rounded-[16px] bg-[#F4F2EF] p-1 dark:bg-muted", className)}>
      {tabs.map(tab => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[12px] font-semibold transition-colors duration-150",
              size === "sm" ? "h-9 text-[12.5px]" : "h-10 text-[13px]",
              active
                ? "bg-white text-[#0B1324] shadow-[0_1px_2px_rgba(11,19,36,0.06),0_4px_12px_-6px_rgba(11,19,36,0.2)] dark:bg-card dark:text-foreground"
                : "text-[#7A7F8C] dark:text-muted-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

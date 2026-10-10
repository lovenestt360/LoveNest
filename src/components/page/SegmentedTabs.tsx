import { cn } from "@/lib/utils";

// Separadores de página: o ativo fica escuro, como a barra de baixo.
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 rounded-full bg-card p-1 shadow-[0_1px_2px_rgba(11,19,36,0.04),0_8px_22px_-14px_rgba(11,19,36,0.14)] dark:border dark:border-border/60",
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "h-9 flex-1 rounded-full text-[12.5px] font-semibold transition-colors duration-200",
              active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

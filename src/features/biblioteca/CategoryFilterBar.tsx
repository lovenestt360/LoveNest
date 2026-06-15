import { cn } from "@/lib/utils";
import type { BookCategory } from "@/hooks/useBiblioteca";

export function CategoryFilterBar({ categories, active, onChange }: {
    categories: BookCategory[];
    active: string | null;
    onChange: (categoryId: string | null) => void;
}) {
    return (
        <div className="flex gap-2 px-4 overflow-x-auto pb-1">
            <Chip label="Todos" isActive={active === null} onClick={() => onChange(null)} />
            {categories.map(cat => (
                <Chip key={cat.id} label={cat.name} isActive={active === cat.id} onClick={() => onChange(cat.id)} />
            ))}
        </div>
    );
}

function Chip({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-colors whitespace-nowrap active:scale-95",
                isActive
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-card text-muted-foreground border-border hover:border-rose-200 dark:hover:border-rose-900/40"
            )}
        >
            {label}
        </button>
    );
}

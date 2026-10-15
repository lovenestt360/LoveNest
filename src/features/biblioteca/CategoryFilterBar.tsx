import { cn } from "@/lib/utils";
import type { BookCategory } from "@/hooks/useBiblioteca";

export function CategoryFilterBar({ categories, active, onChange }: {
    categories: BookCategory[];
    active: string | null;
    onChange: (categoryId: string | null) => void;
}) {
    return (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
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
                "shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold border transition-colors whitespace-nowrap active:scale-95",
                isActive
                    ? "bg-[#0B1324] text-white border-[#0B1324] dark:bg-foreground dark:text-background dark:border-foreground"
                    : "bg-white text-[#3A4150] border-[#ECE8E3] dark:bg-card dark:text-muted-foreground dark:border-border"
            )}
        >
            {label}
        </button>
    );
}

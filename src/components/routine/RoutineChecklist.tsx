import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { RoutineItem } from "@/hooks/useRoutineItems";

interface RoutineChecklistProps {
    items: RoutineItem[];
    checkedIds: string[];
    onToggle: (itemId: string) => void;
    readOnly?: boolean;
}

export function RoutineChecklist({ items, checkedIds, onToggle, readOnly }: RoutineChecklistProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-2xl border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhum hábito configurado.</p>
                <p className="text-xs text-muted-foreground mt-1">Vai a "Gerir hábitos" para começar!</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border bg-card divide-y">
            {items.map(item => {
                const checked = checkedIds.includes(item.id);
                return (
                    <button
                        key={item.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onToggle(item.id)}
                        className={cn(
                            "flex items-center gap-3 w-full px-4 py-3 text-left transition-colors",
                            !readOnly && "active:bg-muted/50",
                            readOnly && "cursor-default",
                        )}
                    >
                        {/* Checkbox */}
                        <div className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-lg border-2 transition-all shrink-0",
                            checked
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-muted-foreground/30",
                        )}>
                            {checked && (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>

                        {/* Emoji + title */}
                        <span className={cn(
                            "flex-1 text-sm font-medium",
                            checked && "line-through text-muted-foreground",
                        )}>
                            {item.emoji && <span className="mr-1.5">{item.emoji}</span>}
                            {item.title}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

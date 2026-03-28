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
            <div className="rounded-apple bg-slate-50 p-10 text-center border border-slate-100">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum hábito configurado.</p>
                <p className="text-[10px] text-slate-300 font-bold mt-2 uppercase tracking-tight">Vai a "Gerir" para começar!</p>
            </div>
        );
    }

    return (
        <div className="rounded-apple bg-white shadow-apple overflow-hidden divide-y divide-slate-50">
            {items.map(item => {
                const checked = checkedIds.includes(item.id);
                return (
                    <button
                        key={item.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onToggle(item.id)}
                        className={cn(
                            "flex items-center gap-4 w-full px-6 py-5 text-left transition-all",
                            !readOnly && "active:bg-slate-50",
                            readOnly && "cursor-default",
                        )}
                    >
                        {/* Checkbox - More minimal and circular like iOS */}
                        <div className={cn(
                            "flex items-center justify-center h-7 w-7 rounded-full border-2 transition-all shrink-0",
                            checked
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "border-slate-100 bg-slate-50",
                        )}>
                            {checked && (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>

                        {/* Emoji + title */}
                        <span className={cn(
                            "flex-1 text-[15px] font-black tracking-tight transition-all",
                            checked ? "text-slate-300 line-through" : "text-slate-900",
                        )}>
                            {item.emoji && <span className="mr-3 scale-125 inline-block">{item.emoji}</span>}
                            {item.title}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

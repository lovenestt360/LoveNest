import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, onRate, size = "sm" }: {
    value: number;
    onRate?: (rating: number) => void;
    size?: "sm" | "md";
}) {
    const sizeClass = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <button
                    key={i}
                    type="button"
                    disabled={!onRate}
                    onClick={() => onRate?.(i)}
                    className={cn(onRate ? "active:scale-90 transition-transform" : "cursor-default")}
                >
                    <Star
                        className={cn(sizeClass, i <= Math.round(value) ? "fill-rose-400 text-rose-400" : "text-muted-foreground/30")}
                        strokeWidth={1.5}
                    />
                </button>
            ))}
        </div>
    );
}

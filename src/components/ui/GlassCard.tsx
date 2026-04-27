import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  elevated?: boolean;
}

const paddingMap = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, padding = "md", hover = false, elevated = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base glass — matches .glass-card
        "rounded-3xl border border-white/80 backdrop-blur-3xl",
        "bg-white/55",
        // Shadow
        elevated
          ? "shadow-xl shadow-black/8 [box-shadow:0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]"
          : "[box-shadow:0_2px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]",
        // Padding
        paddingMap[padding],
        // Hover
        hover && "transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/8 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = "GlassCard";

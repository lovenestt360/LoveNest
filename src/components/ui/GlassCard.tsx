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
        // Base glass
        "rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl",
        // Shadow
        elevated
          ? "shadow-xl shadow-black/8"
          : "shadow-sm shadow-black/5",
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

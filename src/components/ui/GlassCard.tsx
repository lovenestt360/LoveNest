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
        "rounded-[1.25rem] border border-[#e5e5e5] bg-white",
        elevated
          ? "shadow-md shadow-black/8"
          : "shadow-sm shadow-black/5",
        paddingMap[padding],
        hover && "transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = "GlassCard";

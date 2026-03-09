import * as React from "react";
import { cn } from "@/lib/utils";

// Lightweight shims – avoids @radix-ui/react-tooltip Provider
// which triggers duplicate-React "useRef is null" in Vite dev server.

const TooltipProvider: React.FC<{ children: React.ReactNode; [k: string]: unknown }> = ({ children }) => (
  <>{children}</>
);

const Tooltip: React.FC<{ children: React.ReactNode; [k: string]: unknown }> = ({ children }) => <>{children}</>;

const TooltipTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, asChild, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, { ref, ...props });
    }
    return (
      <button ref={ref} type="button" {...props}>
        {children}
      </button>
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: string; sideOffset?: number; hidden?: boolean; [k: string]: unknown }>(
  ({ className, side, sideOffset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("sr-only", className)}
      {...props}
    />
  ),
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

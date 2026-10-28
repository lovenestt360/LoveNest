import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Folha de baixo do Ciclo: pega no topo, fecha ao tocar fora (como as outras da app). */
export function CycleSheet({
  open, onClose, title, description, children, className, hero,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Imagem ao centro, por cima do título (ex.: a Faísca). */
  hero?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="bottom"
        className={cn(
          "mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-[28px] border-0 bg-white px-5 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] pt-3 shadow-[0_-16px_50px_-20px_rgba(11,19,36,0.4)] outline-none focus:outline-none dark:bg-card [&>button.absolute]:hidden",
          hero && "text-center",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E2DED8] dark:bg-border" aria-hidden="true" />
        {hero}
        <SheetTitle className={cn("text-balance text-[21px] font-bold leading-tight tracking-[-0.025em] text-foreground", hero && "mt-2")}>
          {title}
        </SheetTitle>
        {description ? (
          <SheetDescription className={cn("mt-1.5 text-[14px] leading-normal text-muted-foreground", hero && "mx-auto max-w-[32ch]")}>
            {description}
          </SheetDescription>
        ) : (
          <SheetDescription className="sr-only">{title}</SheetDescription>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}

export const btnInk =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#0B1324] text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] transition-transform active:scale-[0.99] disabled:opacity-50 dark:bg-foreground dark:text-background";
export const btnGhost =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-[#ECE8E3] bg-white text-[15px] font-semibold text-[#0B1324] transition-colors hover:bg-[#F7F5F2] active:scale-[0.99] disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted";
/** Escolha selecionada: contorno tinta e um halo leve. */
export const picked = "border-[#0B1324] shadow-[0_0_0_3px_rgba(11,19,36,0.07)] dark:border-foreground";

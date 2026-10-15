import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Botão redondo com borda fina, usado no cabeçalho dos ecrãs da temática refinada. */
export const ROUND_BUTTON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ECE8E3] bg-white text-foreground transition-colors active:bg-[#F7F5F2] dark:border-border dark:bg-card dark:active:bg-muted";

/**
 * Cabeçalho dos ecrãs internos: voltar, título e uma ação opcional à direita.
 * Sem `onBack`, volta ao ecrã anterior.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <header className={cn("flex items-center gap-3", className)}>
      <button type="button" aria-label="Voltar" onClick={onBack ?? (() => navigate(-1))} className={ROUND_BUTTON}>
        <ChevronLeft className="h-5 w-5" strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

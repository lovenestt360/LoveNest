import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TONE, type Tone } from "@/lib/tones";

// Cabeçalho comum a todas as páginas, na tipografia da Home:
// ícone da função no seu tom, título curto e uma linha de contexto.
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  tone = "rose",
  back,
  right,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** true volta ao ecrã anterior; uma string navega para esse caminho */
  back?: boolean | string;
  right?: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <header className={cn("flex items-center gap-3 px-0.5 pt-1", className)}>
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
          aria-label="Voltar"
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-[0_1px_2px_rgba(11,19,36,0.04),0_8px_22px_-14px_rgba(11,19,36,0.14)] active:scale-95 transition-transform"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
      )}

      {Icon && !back && (
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]", TONE[tone])}>
          <Icon className="h-[21px] w-[21px]" strokeWidth={1.7} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.025em] text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-[12.5px] text-muted-foreground">{subtitle}</p>}
      </div>

      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

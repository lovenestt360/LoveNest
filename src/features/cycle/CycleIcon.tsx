import { useId } from "react";
import { cn } from "@/lib/utils";
import { cycleIconSvg, type CycleIconKind } from "./cycleIconsSvg";

/** Desenho a cores do Ciclo (sintomas, fluxo, ações), sem quadrado à volta. */
export function CycleIcon({ kind, size = 32, className }: { kind: CycleIconKind; size?: number; className?: string }) {
  // Os SVG usam gradientes com id; cada instância precisa do seu prefixo.
  const prefix = "c" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: cycleIconSvg(kind, size, prefix) }}
    />
  );
}

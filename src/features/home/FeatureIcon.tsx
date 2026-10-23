import { useId } from "react";
import { cn } from "@/lib/utils";
import { featureIconSvg } from "./featureIconsSvg";

export type FeatureKind = "chat" | "humor" | "agenda" | "espiritual" | "conflitos" | "historia" | "capsula" | "desafios" | "wrapped";

/**
 * Ícone de uma funcionalidade: quadrado branco com o desenho a cores.
 * O Humor mostra a Faísca do humor de hoje (`mood`); a Agenda mostra o dia de hoje.
 */
export function FeatureIcon({ kind, size = 56, mood, className }: { kind: FeatureKind; size?: number; mood?: string | null; className?: string }) {
  const id = useId();
  const prefix = "f" + id.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: featureIconSvg(kind, size, prefix, { mood }) }}
    />
  );
}

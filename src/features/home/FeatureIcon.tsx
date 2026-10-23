import { useId } from "react";
import { cn } from "@/lib/utils";
import { featureIconSvg, featureGlyphSvg, presenceHeartSvg, shieldSvg } from "./featureIconsSvg";

export type FeatureKind = "chat" | "humor" | "agenda" | "espiritual" | "conflitos" | "historia" | "capsula" | "desafios" | "wrapped";
export type GlyphKind =
  | "chat" | "espiritual" | "historia" | "chama" | "presenca" | "calendario"
  | "menstrual" | "folicular" | "ovulacao" | "lutea";

// Os SVG usam gradientes com id; cada instância precisa do seu prefixo.
const usePrefix = () => "f" + useId().replace(/[^a-zA-Z0-9]/g, "");

function Svg({ html, size, className, label }: { html: string; size: number; className?: string; label?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Ícone de uma funcionalidade: quadrado branco com o desenho a cores.
 * O Humor mostra a Faísca do humor de hoje (`mood`); a Agenda mostra o dia de hoje.
 */
export function FeatureIcon({ kind, size = 56, mood, className }: { kind: FeatureKind; size?: number; mood?: string | null; className?: string }) {
  const prefix = usePrefix();
  return <Svg html={featureIconSvg(kind, size, prefix, { mood })} size={size} className={className} />;
}

/** Só o desenho, sem quadrado, para dentro dos cartões. `dim` deixa-o em cinza claro. */
export function FeatureGlyph({ kind, size = 18, dim = false, className, label }: { kind: GlyphKind; size?: number; dim?: boolean; className?: string; label?: string }) {
  const prefix = usePrefix();
  return <Svg html={featureGlyphSvg(kind, size, prefix, dim)} size={size} className={className} label={label} />;
}

export function PresenceHeartIcon({ on, size = 16, className }: { on: boolean; size?: number; className?: string }) {
  const prefix = usePrefix();
  return <Svg html={presenceHeartSvg(on, size, prefix)} size={size} className={className} />;
}

export function ShieldIcon({ on, size = 15, className }: { on: boolean; size?: number; className?: string }) {
  const prefix = usePrefix();
  return <Svg html={shieldSvg(on, size, prefix)} size={size} className={className} />;
}

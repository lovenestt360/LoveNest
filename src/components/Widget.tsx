import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Linguagem "widget" da temática refinada: cartão branco com presença sobre o
 * fundo cinzento claro, etiquetas em mono, números grandes e finos e um rodapé
 * separado por uma linha.
 */
export const WIDGET =
  "overflow-hidden rounded-[28px] border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(11,19,36,0.05),0_22px_44px_-26px_rgba(11,19,36,0.38)] dark:border-border dark:bg-card dark:shadow-none";

export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] font-normal uppercase leading-none tracking-[0.06em] text-[#7E838C] dark:text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BigNumber({
  value,
  unit,
  size = "lg",
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "font-light leading-[0.9] tracking-[-0.045em] tabular-nums text-[#0B1324] dark:text-foreground",
          size === "lg" ? "text-[54px]" : "text-[40px]",
        )}
      >
        {value}
      </span>
      {unit && (
        <span className="font-mono text-[12px] uppercase tracking-[0.04em] text-[#7E838C] dark:text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  );
}

/** Rodapé do widget: colunas separadas da parte de cima por uma linha fina. */
export function WidgetFoot({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid border-t border-black/[0.06] bg-[#FAFAF8] dark:border-border dark:bg-muted/20",
        cols === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function FootStat({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-5 py-3.5 [&+&]:border-l [&+&]:border-black/[0.06] dark:[&+&]:border-border", className)}>
      <MonoLabel className="flex items-center gap-1.5">{label}</MonoLabel>
      <div className="mt-2 flex items-baseline gap-1 text-[22px] font-light leading-none tracking-[-0.03em] tabular-nums text-[#0B1324] dark:text-foreground">
        {children}
      </div>
    </div>
  );
}

export function Unit({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-[#7E838C]">{children}</span>;
}

type SegmentTone = "ink" | "accent" | "idle" | "rose" | "blue" | "green" | "violet";

const SEGMENT_TONE: Record<SegmentTone, string> = {
  ink: "bg-[#1C1F24] dark:bg-foreground",
  accent: "bg-[#E5484D]",
  idle: "bg-[repeating-linear-gradient(135deg,#ECEBE8_0_3px,#F6F5F3_3px_6px)] dark:bg-muted",
  rose: "bg-rose-400",
  blue: "bg-sky-400",
  green: "bg-emerald-400",
  violet: "bg-violet-300",
};

/** Barra segmentada (pílulas): cada segmento tem um peso e um tom. */
export function SegmentBar({
  segments,
  className,
}: {
  segments: { weight?: number; tone: SegmentTone; key?: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex h-2.5 items-center gap-1", className)} aria-hidden="true">
      {segments.map((s, i) => (
        <span
          key={s.key ?? i}
          className={cn("h-full rounded-full", SEGMENT_TONE[s.tone])}
          style={{ flexGrow: s.weight ?? 1, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}

/** Pequenas barras verticais (como o nível de bateria das referências). */
export function LevelBars({ value, max, tone = "ink" }: { value: number; max: number; tone?: "ink" | "accent" | "blue" }) {
  const on = tone === "accent" ? "bg-[#E5484D]" : tone === "blue" ? "bg-sky-400" : "bg-[#1C1F24] dark:bg-foreground";
  return (
    <span className="inline-flex items-center gap-[2px]" aria-hidden="true">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={cn("h-[9px] w-[3px] rounded-[1px]", i < value ? on : "bg-[#D9D7D3] dark:bg-muted")} />
      ))}
    </span>
  );
}

import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * O NINHO — linguagem visual do LoveNest.
 *
 * O logo são dois crescentes: o rosa "(" e o azul ")". Separados, são duas
 * pessoas. Juntos, fecham-se à volta de algo — o "nós". Esta é a única
 * ideia gráfica do fluxo público, usada em três escalas:
 *
 *  · Crescent   — um lado sozinho. Marca uma pessoa (rosa = tu, azul = o par).
 *  · NestPair   — ( A M ): as duas pessoas dentro do ninho. Substitui avatares
 *                 com anéis genéricos.
 *  · NestMark   — os dois crescentes a aproximarem-se. Distância = quanto
 *                 falta. Em 0, é exatamente o logo.
 *
 * Regras de cor: rosa e azul só marcam PESSOAS. Nunca preenchem botões,
 * cartões ou estados selecionados — isso é tinta. Um lado "por chegar"
 * aparece esbatido, não apagado: o lugar está guardado.
 */

export const ROSE = "#FF6B8F";
export const BLUE = "#4D7CFE";
const EASE = [0.22, 1, 0.36, 1] as const;

// Geometria do logo (viewBox 512): elipse exterior menos elipse interior.
const OUTER = { a: 198, b: 314, cy: 265, rx: 115, ry: 195 };
const INNER = { cx: 256, cy: 252, rx: 97, ry: 172 };

function CrescentMask({ id, cx }: { id: string; cx: number }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x="-400" y="0" width="1312" height="512">
      <rect x="-400" width="1312" height="512" fill="black" />
      <ellipse cx={cx} cy={OUTER.cy} rx={OUTER.rx} ry={OUTER.ry} fill="white" />
      <ellipse cx={INNER.cx} cy={INNER.cy} rx={INNER.rx} ry={INNER.ry} fill="black" />
    </mask>
  );
}

/** Um só crescente, recortado à sua própria caixa. `side="a"` é o "(" rosa. */
export function Crescent({
  side,
  height = 24,
  faint = false,
  className,
}: {
  side: "a" | "b";
  height?: number;
  faint?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const isA = side === "a";
  return (
    <svg
      width={height * (192 / 398)}
      height={height}
      viewBox={isA ? "80 66 192 398" : "240 66 192 398"}
      className={cn("shrink-0 transition-opacity duration-300", className)}
      style={{ opacity: faint ? 0.22 : 1 }}
      aria-hidden="true"
    >
      <defs>
        <CrescentMask id={`c-${uid}`} cx={isA ? OUTER.a : OUTER.b} />
      </defs>
      <rect x="0" width="512" height="512" fill={isA ? ROSE : BLUE} mask={`url(#c-${uid})`} />
    </svg>
  );
}

/**
 * Os dois crescentes a aproximarem-se.
 * gap: 0 = logo fechado · 1 = afastados.  partner="pending" esbate o azul.
 */
export function NestMark({
  size = 40,
  gap = 0,
  partner = "present",
  className,
  initialGap,
}: {
  size?: number;
  gap?: number;
  partner?: "present" | "pending";
  className?: string;
  /** Distância de partida na montagem — para o momento em que se encontram. */
  initialGap?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const SPREAD = 150;
  const d = gap * SPREAD;
  const from = initialGap !== undefined && !reduce ? { x: initialGap * SPREAD } : false;
  const t = { duration: reduce ? 0 : 0.34, ease: EASE };
  const vbW = 512 + SPREAD * 2;

  return (
    <svg
      width={size * (vbW / 440)}
      height={size}
      viewBox={`${-SPREAD} 40 ${vbW} 440`}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <CrescentMask id={`na-${uid}`} cx={OUTER.a} />
        <CrescentMask id={`nb-${uid}`} cx={OUTER.b} />
      </defs>
      <motion.g
        initial={from ? { x: -from.x } : false}
        animate={{ x: -d }}
        transition={t}
      >
        <rect x="-400" width="1312" height="512" fill={ROSE} mask={`url(#na-${uid})`} />
      </motion.g>
      <motion.g
        initial={from ? { x: from.x, opacity: partner === "pending" ? 0.22 : 1 } : false}
        animate={{ x: d, opacity: partner === "pending" ? 0.22 : 1 }}
        transition={t}
      >
        <rect x="-400" width="1312" height="512" fill={BLUE} mask={`url(#nb-${uid})`} />
      </motion.g>
    </svg>
  );
}

/** Uma inicial sobre papel. Sem anel colorido — a cor vem do crescente. */
export function Initial({ children, size = 30, muted = false, dark = false }: { children?: ReactNode; size?: number; muted?: boolean; dark?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold transition-colors duration-300",
        dark ? "bg-[#1A2438] text-white" : muted ? "bg-transparent text-slate-300" : "bg-[#EDE6DE] text-[#0B1324]",
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        boxShadow: dark ? "0 0 0 2px #0B1324" : muted ? "inset 0 0 0 1.5px rgba(11,19,36,0.14)" : "0 0 0 2px #F7F3EE",
      }}
    >
      {children}
    </span>
  );
}

/**
 * ( A M ) — as duas pessoas dentro do ninho.
 * partner="pending": o lugar do par está guardado (azul esbatido, inicial vazia).
 */
export function NestPair({
  a = "A",
  b = "M",
  size = 30,
  partner = "present",
  solo = false,
  dark = false,
  className,
}: {
  a?: ReactNode;
  b?: ReactNode;
  size?: number;
  partner?: "present" | "pending";
  /** Só uma pessoa: o ninho fecha-se à volta de uma inicial. */
  solo?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const h = size * 1.32;
  const pending = partner === "pending";
  return (
    <span className={cn("flex items-center", className)} aria-hidden="true">
      <Crescent side="a" height={h} />
      <span className="-mx-[2px] flex items-center">
        <Initial size={size} dark={dark}>{a}</Initial>
        {!solo && (
          <span style={{ marginLeft: -size * 0.22 }}>
            <Initial size={size} muted={pending} dark={dark && !pending}>{pending ? "" : b}</Initial>
          </span>
        )}
      </span>
      <Crescent side="b" height={h} faint={pending || solo} />
    </span>
  );
}

/** Marca de pessoa em linha (nomes, mensagens): um crescente pequeno. */
export function PersonTag({ side, children, className }: { side: "a" | "b"; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Crescent side={side} height={11} />
      {children}
    </span>
  );
}

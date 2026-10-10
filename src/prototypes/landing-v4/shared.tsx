import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Peças partilhadas pelas três direções da Landing V4 (protótipo).
 * Tokens e copy vêm de docs/LANDING_V4_DIRECAO_ARTISTICA.md.
 * Rosa e azul marcam só pessoas: Ana (rosa) e Miguel (azul).
 */

export const ROSA = "#FF6B8F";
export const AZUL = "#4D7CFE";
export const TINTA = "#0B1324";
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const CTA_HREF = "/inicio?start=1";
export const LOGIN_HREF = "/entrar?returning=1";

export const COPY = {
  h1: "O amor também vive nos dias comuns.",
  apoio: "Um espaço privado para duas pessoas: falar, saber um do outro e guardar o que viveram.",
  cta: "Criar o nosso espaço",
  entrar: "Já temos conta",
  presencaTitulo: "Saber do outro, sem ter de perguntar.",
  presencaApoio:
    "Ao longo do dia, pequenos sinais dizem “estou aqui”: como cada um está, o que fizeram, se já se encontraram hoje.",
  msgAna: "Chegaste bem?",
  msgMiguel: "Cheguei. Guardei-te o último pastel.",
};

// ── O Ninho: um crescente por pessoa ─────────────────────────────────────────

const OUTER = { a: 198, b: 314, cy: 265, rx: 115, ry: 195 };
const INNER = { cx: 256, cy: 252, rx: 97, ry: 172 };

/** Um crescente do logo. `a` = "(" rosa (Ana), `b` = ")" azul (Miguel). */
export function Mark({
  side,
  height = 16,
  faint = false,
  className,
  style,
}: {
  side: "a" | "b";
  height?: number;
  faint?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const id = `m-${useId().replace(/:/g, "")}`;
  const isA = side === "a";
  return (
    <svg
      width={height * (192 / 398)}
      height={height}
      viewBox={isA ? "80 66 192 398" : "240 66 192 398"}
      className={cn("shrink-0", className)}
      style={{ opacity: faint ? 0.22 : 1, ...style }}
      aria-hidden="true"
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
          <rect width="512" height="512" fill="black" />
          <ellipse cx={isA ? OUTER.a : OUTER.b} cy={OUTER.cy} rx={OUTER.rx} ry={OUTER.ry} fill="white" />
          <ellipse cx={INNER.cx} cy={INNER.cy} rx={INNER.rx} ry={INNER.ry} fill="black" />
        </mask>
      </defs>
      <rect width="512" height="512" fill={isA ? ROSA : AZUL} mask={`url(#${id})`} />
    </svg>
  );
}

/** Logotipo pequeno: os dois crescentes juntos. */
export function Logo({ size = 22, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="flex items-center gap-2" aria-label="LoveNest">
      <span className="flex" aria-hidden="true">
        <Mark side="a" height={size} />
        {/* Os recortes de cada crescente sobrepõem-se 32 unidades na geometria do logo. */}
        <Mark side="b" height={size} style={{ marginLeft: -size * (32 / 398) }} />
      </span>
      <span className={cn("text-[15px] font-semibold tracking-[-0.01em]", light ? "text-white" : "text-[#0B1324]")}>
        LoveNest
      </span>
    </span>
  );
}

// ── Fotografia provisória ────────────────────────────────────────────────────

type Tone = "manha" | "tarde" | "noite" | "cinema";
const TONES: Record<Tone, { bg: string; ink: string; line: string }> = {
  manha: { bg: "#E4E6EA", ink: "#4B5568", line: "rgba(11,19,36,0.22)" },
  tarde: { bg: "#E6E1DA", ink: "#4B5568", line: "rgba(11,19,36,0.22)" },
  noite: { bg: "#18202E", ink: "rgba(255,255,255,0.62)", line: "rgba(255,255,255,0.22)" },
  // Exposição baixa, como um plano de cinema: o texto branco assenta por cima.
  cinema: { bg: "#2A303B", ink: "rgba(255,255,255,0.6)", line: "rgba(255,255,255,0.2)" },
};

export type Person = { name: "Ana" | "Miguel" | string; x: number; y?: number; h?: number };

/**
 * Placeholder fotográfico com a proporção e o shot brief corretos.
 * Marca onde as pessoas ficam no quadro, para se julgar a composição.
 * Provisório: não é um asset final nem tem licença assumida.
 */
export function Shot({
  code,
  title,
  brief,
  tone = "manha",
  ratio,
  people = [],
  className,
  briefPosition = "top-left",
  compact = false,
}: {
  code: string;
  title: string;
  brief: string;
  tone?: Tone;
  /** CSS aspect-ratio (ex.: "4 / 3"). Sem ratio, ocupa o contentor. */
  ratio?: string;
  people?: Person[];
  className?: string;
  /** "below-header": canto superior direito, abaixo de um cabeçalho sobreposto. */
  briefPosition?: "top-left" | "top-right" | "bottom-left" | "below-header";
  compact?: boolean;
}) {
  const t = TONES[tone];
  return (
    <figure
      role="img"
      aria-label={`Fotografia provisória ${code}: ${title}`}
      className={cn("v4-grain relative m-0 overflow-hidden", className)}
      style={{ background: t.bg, aspectRatio: ratio }}
    >
      {people.map((p) => (
        <span
          key={p.name}
          aria-hidden="true"
          className="absolute -translate-x-1/2 rounded-[999px_999px_40%_40%] border border-dashed"
          style={{
            left: `${p.x}%`,
            top: `${p.y ?? 26}%`,
            height: `${p.h ?? 74}%`,
            aspectRatio: "0.42",
            borderColor: t.line,
          }}
        >
          <span
            className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium"
            style={{ color: t.ink }}
          >
            {p.name}
          </span>
        </span>
      ))}
      <figcaption
        className={cn(
          "absolute max-w-[min(340px,78%)] text-[11px] leading-[1.45]",
          briefPosition === "top-left" && "left-4 top-4",
          briefPosition === "top-right" && "right-4 top-4 text-right",
          briefPosition === "bottom-left" && "bottom-4 left-4",
          briefPosition === "below-header" && "right-5 top-[calc(env(safe-area-inset-top)+4.5rem)] text-right lg:right-10 lg:top-24",
        )}
        style={{ color: t.ink }}
      >
        <span className="font-semibold">
          {code} · {title}
        </span>
        <span className="block opacity-80">Fotografia provisória</span>
        {!compact && <span className="mt-1 hidden opacity-80 sm:block">{brief}</span>}
      </figcaption>
    </figure>
  );
}

// ── Fragmentos reais da app ──────────────────────────────────────────────────

/** Uma mensagem, do lado de quem a escreveu, com a marca dessa pessoa. */
export function Bubble({
  from,
  children,
  name,
  dark = false,
  className,
}: {
  from: "a" | "b";
  children: ReactNode;
  name?: string;
  dark?: boolean;
  className?: string;
}) {
  const isA = from === "a";
  return (
    <div className={cn("flex items-end gap-2", !isA && "flex-row-reverse", className)}>
      <Mark side={from} height={30} />
      <div className={cn(!isA && "text-right")}>
        {name && (
          <p className={cn("mb-1 text-[12px] font-medium", dark ? "text-white/70" : "text-[#4B5568]")}>{name}</p>
        )}
        <p
          className={cn(
            "inline-block max-w-[260px] px-4 py-2.5 text-left text-[15px] leading-snug",
            isA
              ? "rounded-[18px] rounded-bl-[6px] bg-white text-[#0B1324] shadow-[0_1px_0_rgba(11,19,36,0.05),0_14px_30px_-18px_rgba(11,19,36,0.35)]"
              : "rounded-[18px] rounded-br-[6px] bg-[#0B1324] text-white shadow-[0_14px_30px_-18px_rgba(11,19,36,0.5)]",
            // Sobre fundo escuro, a mensagem navy precisa de uma aresta para se ler como superfície.
            !isA && dark && "ring-1 ring-white/15",
          )}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

/** Presença: o humor que o par registou. Texto real da app ("em paz"). */
export function MoodFragment({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-[16px] bg-white px-4 py-3 shadow-[0_1px_0_rgba(11,19,36,0.05),0_16px_34px_-20px_rgba(11,19,36,0.35)]",
        className,
      )}
    >
      <Mark side="b" height={22} />
      <p className="text-[14px] leading-snug text-[#0B1324]">
        Miguel registou o humor de hoje
        <span className="mt-0.5 block text-[13px] text-[#4B5568]">em paz · 09:12</span>
      </p>
    </div>
  );
}

/** Os dois encontraram-se hoje: as duas marcas a tocarem-se. Texto real da app. */
export function TogetherFragment({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex" aria-hidden="true">
        <Mark side="a" height={20} />
        <Mark side="b" height={20} style={{ marginLeft: -3 }} />
      </span>
      <p className={cn("text-[14px]", dark ? "text-white/85" : "text-[#0B1324]")}>Vocês encontraram-se aqui hoje</p>
    </div>
  );
}

// ── Ações ────────────────────────────────────────────────────────────────────

export function PrimaryCta({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <a
      href={CTA_HREF}
      className={cn(
        "v4-press v4-cta inline-flex h-[54px] items-center justify-center rounded-[16px] px-7 text-[16px] font-semibold",
        light ? "v4-focus-light bg-white text-[#0B1324]" : "v4-focus bg-[#0B1324] text-white",
        className,
      )}
    >
      {COPY.cta}
    </a>
  );
}

export function LoginLink({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <a
      href={LOGIN_HREF}
      className={cn(
        "v4-link inline-flex min-h-[44px] items-center text-[15px] font-medium underline decoration-1 underline-offset-[5px]",
        light ? "v4-focus-light text-white decoration-white/40" : "v4-focus text-[#0B1324] decoration-[#0B1324]/25",
        className,
      )}
    >
      {COPY.entrar}
    </a>
  );
}

export function ChapterLabel({ n, children, light = false }: { n: string; children: ReactNode; light?: boolean }) {
  return (
    <p className={cn("text-[13px] font-medium tabular-nums", light ? "text-white/70" : "text-[#4B5568]")}>
      {n} · {children}
    </p>
  );
}

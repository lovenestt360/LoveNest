import { forwardRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Flame, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

/**
 * Peças partilhadas do fluxo público (Welcome, registo, login, onboarding).
 *
 * Direção: papel quente liso (sem manchas de glow), tinta navy para estrutura
 * e ação, e o rosa/azul do logo reservados às DUAS PESSOAS — anéis de avatar,
 * balões, pontos — nunca para preencher botões ou estados selecionados.
 * Campos agrupados numa só superfície com divisórias finas, como a lista
 * "Hoje" da Home, para o Auth pertencer à app que vem a seguir.
 */

export const PAPER = "#F7F3EE";
export const INK = "#0B1324";
export const PERSON_A = "#FF6B8F"; // rosa do logo
export const PERSON_B = "#4D7CFE"; // azul do logo

export const EASE = [0.22, 1, 0.36, 1] as const;

// ── Cabeçalho ────────────────────────────────────────────────────────────────

export function AuthHeader({ right, onBrandClick }: { right?: ReactNode; onBrandClick?: () => void }) {
  const brand = (
    <span className="flex items-center gap-2">
      <LogoMark size={24} />
      <span className="text-[15px] font-extrabold tracking-[-0.02em] text-[#0B1324]">LoveNest</span>
    </span>
  );
  return (
    <header className="flex h-11 items-center justify-between">
      {onBrandClick ? (
        <button type="button" onClick={onBrandClick} className="-ml-1 rounded-lg px-1 active:opacity-60">
          {brand}
        </button>
      ) : (
        brand
      )}
      {right}
    </header>
  );
}

export function HeaderLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-2 rounded-lg px-2 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:text-[#0B1324] active:bg-black/[0.04]"
    >
      {children}
    </button>
  );
}

// ── Título de página ─────────────────────────────────────────────────────────

export function PageTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div>
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
      )}
      <h1 className="mt-2 text-[28px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#0B1324] sm:text-[32px]">
        {title}
      </h1>
      {subtitle && <p className="mt-2.5 max-w-[34ch] text-[15px] leading-[1.55] text-slate-500">{subtitle}</p>}
    </div>
  );
}

// ── Campos ───────────────────────────────────────────────────────────────────

/** Superfície única para um grupo de campos, com divisórias finas. */
export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#0B1324]/[0.08] bg-white",
        "divide-y divide-[#0B1324]/[0.06]",
        "transition-[border-color,box-shadow] duration-200 focus-within:border-[#0B1324]/20 focus-within:shadow-[0_0_0_4px_rgba(11,19,36,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: ReactNode;
};

/** Campo com rótulo pequeno por cima do valor. 16px para o iOS não fazer zoom. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, trailing, id, className, ...props },
  ref,
) {
  return (
    <label htmlFor={id} className="group relative block cursor-text px-4 pb-2.5 pt-2.5">
      <span className="block text-[11px] font-semibold text-slate-400 transition-colors group-focus-within:text-[#0B1324]">
        {label}
      </span>
      <input
        ref={ref}
        id={id}
        className={cn(
          "mt-0.5 block w-full bg-transparent text-[16px] font-medium text-[#0B1324] outline-none placeholder:text-slate-300",
          trailing && "pr-10",
          className,
        )}
        {...props}
      />
      {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
    </label>
  );
});

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:text-[#0B1324] active:bg-slate-100"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.7} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.7} />}
        </button>
      }
    />
  );
}

// ── Botões ───────────────────────────────────────────────────────────────────

export function PrimaryButton({
  children,
  loading,
  arrow = true,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; arrow?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1324] text-[15px] font-bold text-white",
        "transition-[transform,opacity] duration-150 active:scale-[0.985] disabled:opacity-50",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin" />
      ) : (
        <>
          {children}
          {arrow && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
        </>
      )}
    </button>
  );
}

export function GoogleButton({ loading, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-[54px] w-full items-center justify-center gap-3 rounded-2xl border border-[#0B1324]/[0.1] bg-white text-[15px] font-semibold text-[#0B1324] transition-[transform,background-color] duration-150 hover:bg-slate-50 active:scale-[0.985] disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin text-slate-400" /> : <GoogleIcon className="h-5 w-5" />}
      Continuar com Google
    </button>
  );
}

export function OrDivider({ label = "ou com email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden="true">
      <div className="h-px flex-1 bg-[#0B1324]/[0.08]" />
      <span className="text-[12px] font-medium text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-[#0B1324]/[0.08]" />
    </div>
  );
}

/** Ligação de texto secundária (rodapés, "Esqueci a senha", etc.). */
export function QuietLink({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "font-semibold text-[#0B1324] underline decoration-[#0B1324]/20 underline-offset-[3px] transition-colors hover:decoration-[#0B1324]/60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── O casal ──────────────────────────────────────────────────────────────────

/** Duas iniciais com o anel da cor de cada pessoa, ligeiramente sobrepostas. */
export function CouplePair({ a = "A", b = "M", size = 34, dark = false }: { a?: string; b?: string; size?: number; dark?: boolean }) {
  const ring = dark ? "#0B1324" : "#FFFFFF";
  const fill = dark ? "#1A2438" : "#F1ECE6";
  const text = dark ? "#FFFFFF" : "#0B1324";
  const dot = (letter: string, color: string, offset: boolean) => (
    <span
      className="flex items-center justify-center rounded-full text-[12px] font-bold"
      style={{
        width: size,
        height: size,
        marginLeft: offset ? -size * 0.28 : 0,
        background: fill,
        color: text,
        boxShadow: `0 0 0 2px ${ring}, 0 0 0 3.5px ${color}`,
      }}
    >
      {letter}
    </span>
  );
  return (
    <span className="flex items-center" aria-hidden="true">
      {dot(a, PERSON_A, false)}
      {dot(b, PERSON_B, true)}
    </span>
  );
}

/**
 * Um momento real de uso — o "Hoje" de um casal — em vez de uma lista de
 * funcionalidades. As mensagens entram uma a uma, como se estivessem a chegar.
 * Variante escura para o painel lateral em desktop.
 */
export function CoupleMoment({ dark = false, className }: { dark?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const enter = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.32, ease: EASE, delay: 0.15 + i * 0.22 },
        };

  const muted = dark ? "text-white/45" : "text-slate-400";
  const surface = dark
    ? "border-white/[0.08] bg-white/[0.04]"
    : "border-[#0B1324]/[0.07] bg-white shadow-[0_1px_0_rgba(11,19,36,0.03),0_18px_40px_-24px_rgba(11,19,36,0.18)]";

  return (
    <div className={cn("rounded-[22px] border p-4", surface, className)} aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CouplePair dark={dark} size={30} />
          <div>
            <p className={cn("text-[13px] font-bold", dark ? "text-white" : "text-[#0B1324]")}>Ana e Miguel</p>
            <p className={cn("text-[11px]", muted)}>Hoje, 22:41</p>
          </div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
            dark ? "bg-white/[0.06] text-white/70" : "bg-[#F7F3EE] text-slate-600",
          )}
        >
          <Flame className="h-3 w-3 text-orange-500" strokeWidth={2} />
          38 dias
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <motion.div {...enter(0)} className="flex">
          <p
            className={cn(
              "max-w-[78%] rounded-[16px] rounded-bl-[5px] px-3.5 py-2 text-[14px] leading-snug",
              dark ? "bg-white/[0.08] text-white/90" : "bg-[#EEF2FF] text-[#0B1324]",
            )}
          >
            Chegaste bem?
          </p>
        </motion.div>
        <motion.div {...enter(1)} className="flex justify-end">
          <p className="max-w-[78%] rounded-[16px] rounded-br-[5px] bg-[#0B1324] px-3.5 py-2 text-[14px] leading-snug text-white">
            Cheguei. Guardei-te o último pastel.
          </p>
        </motion.div>
        <motion.p {...enter(2)} className={cn("pt-1 text-center text-[11px]", muted)}>
          Ana registou o humor de hoje: <span className={dark ? "text-white/70" : "text-slate-600"}>em paz</span>
        </motion.p>
      </div>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

/** Contentor de página móvel: papel quente, safe areas, coluna estreita. */
export function AuthPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-[100dvh] text-[#0B1324]" style={{ background: PAPER }}>
      <div
        className={cn(
          "mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-6",
          "pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

/** Entrada discreta (fade + 8px) — comunica que o conteúdo mudou, não decora. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

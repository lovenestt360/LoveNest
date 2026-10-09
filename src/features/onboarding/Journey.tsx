import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { AuthPage, EASE } from "@/features/auth/AuthKit";
import { Crescent, Initial, NestMark, NestPair } from "@/features/auth/Nest";
import { cn } from "@/lib/utils";

/**
 * A personalização como uma jornada, não um formulário:
 * preparar o teu lado → como vais usar → o que importa → o vosso espaço.
 *
 * O elemento persistente é o ninho no topo: os dois crescentes começam
 * afastados e aproximam-se a cada resposta. O lado azul fica esbatido até
 * se escolher "A dois" — e no fim os dois encontram-se no logo.
 */

export const CHAPTERS = ["O teu lado", "Como vais usar", "O que importa"] as const;

// ── Moldura da jornada ────────────────────────────────────────────────────────

export function JourneyShell({
  chapter,
  gap,
  partner,
  visible,
  onBack,
  onSkip,
  skipLabel = "Saltar",
  skipBusy,
  previousAnswer,
  question,
  hint,
  children,
  moment,
}: {
  chapter: number;
  gap: number;
  partner: "present" | "pending";
  visible: boolean;
  onBack: () => void;
  onSkip: () => void;
  skipLabel?: string;
  skipBusy?: boolean;
  previousAnswer?: string;
  question: string;
  hint?: string;
  children: ReactNode;
  /** No máximo um pequeno momento de produto por passo. */
  moment?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <AuthPage>
      <header className="flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-[#0B1324] active:bg-black/[0.04]"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={skipBusy}
          className="-mr-2 flex items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-semibold text-slate-400 transition-colors hover:text-[#0B1324] disabled:opacity-50"
        >
          {skipBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {skipLabel}
        </button>
      </header>

      {/* O ninho persistente: a distância entre os dois lados é o que falta. */}
      <div className="mt-6 -ml-[10px]">
        <NestMark size={52} gap={gap} partner={partner} initialGap={Math.min(1, gap + 0.15)} />
      </div>

      {/* O mapa da jornada: onde estás, sem contagem de passos. */}
      <nav
        aria-label={`Etapa ${chapter + 1} de ${CHAPTERS.length}: ${CHAPTERS[chapter]}`}
        className="mt-5 flex items-center gap-2 text-[12px]"
      >
        {CHAPTERS.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            {i > 0 && <span className={cn("h-px w-4 transition-colors duration-300", i <= chapter ? "bg-[#0B1324]/40" : "bg-[#0B1324]/10")} />}
            <span
              className={cn(
                "transition-colors duration-300",
                i === chapter ? "font-bold text-[#0B1324]" : i < chapter ? "font-medium text-slate-500" : "font-medium text-slate-300",
              )}
            >
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div
        className="flex flex-1 flex-col"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible || reduce ? "none" : "translateY(8px)",
          transition: reduce ? "opacity 120ms linear" : `opacity 200ms ease, transform 220ms cubic-bezier(${EASE.join(",")})`,
        }}
      >
        {/* Como numa conversa: as mensagens assentam em baixo, perto do polegar. */}
        <section className="flex flex-1 flex-col justify-end pt-9 pb-2">
          {/* A tua resposta anterior, do teu lado da conversa. */}
          {previousAnswer && (
            <div className="mb-7 flex items-center justify-end gap-1.5">
              <Crescent side="a" height={22} />
              <span className="rounded-[16px] rounded-br-[5px] bg-[#0B1324]/[0.06] px-3.5 py-2 text-[14px] text-slate-600">
                {previousAnswer}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <LogoMark size={14} />
            <span className="text-[12px] font-semibold text-slate-400">LoveNest</span>
          </div>
          <h2 className="mt-2.5 max-w-[18ch] text-[28px] font-extrabold leading-[1.1] tracking-[-0.035em]">{question}</h2>
          {hint && <p className="mt-2.5 max-w-[34ch] text-[15px] leading-[1.5] text-slate-500">{hint}</p>}

          <div className="mt-7">{children}</div>

          {moment && <div className="mt-8">{moment}</div>}
        </section>
      </div>
    </AuthPage>
  );
}

// ── Peças de escolha ─────────────────────────────────────────────────────────

export function CheckDot({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-200",
        on ? "border-[#0B1324] bg-[#0B1324] text-white" : "border-[#0B1324]/15 bg-white",
      )}
      aria-hidden="true"
    >
      <Check className={cn("h-3 w-3 transition-transform duration-200", on ? "scale-100" : "scale-0")} strokeWidth={3} />
    </span>
  );
}

/** Respostas curtas em fichas. Selecionado = tinta, nunca rosa. */
export function ChipChoice({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(o.value)}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-full border px-4 text-[15px]",
              "transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.96]",
              selected
                ? "border-[#0B1324] bg-[#0B1324] font-semibold text-white"
                : "border-[#0B1324]/[0.1] bg-white font-medium text-slate-700 hover:border-[#0B1324]/25",
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Momentos (um por passo) ──────────────────────────────────────────────────

/** País: a hora deste lado, como o LoveNest a vai mostrar. */
export function LocalTimeMoment({ country }: { country?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const time = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(now);
  const date = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <div className="ml-auto w-[78%] rounded-[20px] border border-[#0B1324]/[0.07] bg-white px-4 py-3.5" aria-hidden="true">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <Crescent side="a" height={11} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={country || "aqui"}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18 }}
          >
            {country ? `Em ${country}, agora` : "Do teu lado, agora"}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="mt-1 text-[30px] font-extrabold tabular-nums leading-none tracking-[-0.03em]">{time}</p>
      <p className="mt-1 text-[13px] text-slate-500 first-letter:uppercase">{date}</p>
    </div>
  );
}

/** Género: como a saudação muda, na prática. */
export function GreetingMoment({ gender, name }: { gender: string; name: string }) {
  const first = name.trim().split(/\s+/)[0] || "";
  const who = first ? `, ${first}` : "";
  const line =
    gender === "male" ? `Bem-vindo de volta${who}.` :
    gender === "female" ? `Bem-vinda de volta${who}.` :
    gender ? `Que bom ver-te${who}.` : `Olá${who}.`;

  return (
    <div className="flex items-end gap-2 pr-8" aria-hidden="true">
      <LogoMark size={18} className="mb-1.5" />
      <div>
        <p className="mb-1 text-[11px] font-semibold text-slate-400">Assim, na tua Home</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={line}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="rounded-[18px] rounded-bl-[6px] bg-white px-4 py-2.5 text-[15px] font-semibold shadow-[0_1px_0_rgba(11,19,36,0.04),0_12px_28px_-18px_rgba(11,19,36,0.25)]"
          >
            {line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Modo: uma presença ou duas ───────────────────────────────────────────────

export function ModeChoice({
  value,
  initial,
  onSelect,
}: {
  value: string;
  initial: string;
  onSelect: (v: "solo" | "couple") => void;
}) {
  const options = [
    { value: "solo" as const, label: "Só para mim", desc: "Um espaço pessoal. Podes convidar alguém mais tarde." },
    { value: "couple" as const, label: "A dois", desc: "Criem um espaço que pertence aos dois." },
  ];
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(o.value)}
            className={cn(
              "relative flex min-h-[208px] flex-col rounded-[22px] border bg-white p-4 text-left",
              "transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.98]",
              selected
                ? "border-[#0B1324] shadow-[0_0_0_1px_#0B1324]"
                : "border-[#0B1324]/[0.08] hover:border-[#0B1324]/20",
            )}
          >
            <span className="absolute right-3 top-3">
              <CheckDot on={selected} />
            </span>
            <Presences count={o.value === "couple" ? 2 : 1} initial={initial} together={selected} />
            <span className="mt-auto block pt-6 text-[18px] font-extrabold tracking-[-0.02em]">{o.label}</span>
            <span className="mt-1 block text-[13px] leading-[1.45] text-slate-500">{o.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Uma ou duas presenças dentro do ninho. Ao escolher, aproximam-se. */
function Presences({ count, initial, together }: { count: 1 | 2; initial: string; together: boolean }) {
  const reduce = useReducedMotion();
  const t = { duration: reduce ? 0 : 0.3, ease: EASE };
  return (
    <span className="flex h-12 items-center" aria-hidden="true">
      <motion.span animate={{ x: together ? 2 : 0 }} transition={t} className="flex">
        <Crescent side="a" height={42} />
      </motion.span>
      <Initial size={32}>{initial}</Initial>
      {count === 2 && (
        <motion.span animate={{ marginLeft: together ? -9 : 3 }} transition={t} className="flex">
          <Initial size={32} muted={!together} />
        </motion.span>
      )}
      <motion.span animate={{ x: together ? -2 : 0 }} transition={t} className="flex">
        <Crescent side="b" height={42} faint={count === 1} />
      </motion.span>
    </span>
  );
}

// ── Objetivo: escolhas editoriais, agrupadas ─────────────────────────────────

const GOALS_TOGETHER = [
  { value: "relationship", label: "Cuidar da nossa relação", desc: "Rituais, conversas e memórias a dois." },
];
const GOALS_YOU = [
  { value: "books", label: "Ler mais", desc: "Livros e tempo de leitura." },
  { value: "wellbeing", label: "Sentir-me melhor por dentro", desc: "Humor, calma e cuidado diário." },
  { value: "growth", label: "Crescer como pessoa", desc: "Hábitos e reflexão." },
];

export function GoalChoice({
  value,
  solo,
  disabled,
  onSelect,
}: {
  value: string;
  solo: boolean;
  disabled?: boolean;
  onSelect: (v: string) => void;
}) {
  const row = (o: { value: string; label: string; desc: string }, mark: ReactNode) => {
    const selected = value === o.value;
    return (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={() => onSelect(o.value)}
        className={cn(
          "flex w-full items-center gap-3.5 border-b border-[#0B1324]/[0.06] px-4 py-3.5 text-left last:border-b-0",
          "transition-colors duration-200 active:bg-[#0B1324]/[0.04] disabled:opacity-60",
          selected && "bg-[#0B1324]/[0.03]",
        )}
      >
        <span className="flex w-9 shrink-0 justify-center">{mark}</span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[16px] transition-[font-weight]", selected ? "font-extrabold" : "font-semibold")}>{o.label}</span>
          <span className="block text-[13px] text-slate-500">{o.desc}</span>
        </span>
        <CheckDot on={selected} />
      </button>
    );
  };

  const together = (
    <div key="together">
      <p className="mb-2 px-1 text-[12px] font-semibold text-slate-400">A dois</p>
      <div className="overflow-hidden rounded-[20px] border border-[#0B1324]/[0.08] bg-white">
        {GOALS_TOGETHER.map((o) => row(o, <NestPair a="" b="" size={14} partner="present" />))}
      </div>
    </div>
  );
  const you = (
    <div key="you">
      <p className="mb-2 px-1 text-[12px] font-semibold text-slate-400">Para ti</p>
      <div className="overflow-hidden rounded-[20px] border border-[#0B1324]/[0.08] bg-white">
        {GOALS_YOU.map((o) => row(o, <Crescent side="a" height={20} />))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5" role="radiogroup">
      {solo ? [you, together] : [together, you]}
      <button
        type="button"
        role="radio"
        aria-checked={value === "explore"}
        disabled={disabled}
        onClick={() => onSelect("explore")}
        className={cn(
          "flex w-full items-center justify-between rounded-[20px] border border-dashed px-4 py-3.5 text-left transition-colors duration-200",
          value === "explore" ? "border-[#0B1324]/40" : "border-[#0B1324]/[0.14]",
        )}
      >
        <span className="text-[15px] font-semibold text-slate-600">Ainda não sei — só quero explorar</span>
        <CheckDot on={value === "explore"} />
      </button>
    </div>
  );
}

// ── Conclusão: os dois lados encontram-se ────────────────────────────────────

export function JourneyDone({ solo, name }: { solo: boolean; name: string }) {
  const first = name.trim().split(/\s+/)[0];
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, ease: EASE, delay } };

  return (
    <AuthPage>
      <section className="flex flex-1 flex-col justify-center pb-10">
        <div className="-ml-[26px]">
          <NestMark size={74} gap={solo ? 0.42 : 0} partner={solo ? "pending" : "present"} initialGap={0.75} />
        </div>

        <motion.p {...fade(0.3)} className="mt-10 text-[13px] font-semibold text-slate-400">
          {first ? `Está feito, ${first}.` : "Está feito."}
        </motion.p>
        <motion.h1 {...fade(0.38)} className="mt-2 max-w-[14ch] text-[34px] font-extrabold leading-[1.04] tracking-[-0.042em]">
          {solo ? "O teu espaço está pronto." : "O vosso espaço está pronto."}
        </motion.h1>
        <motion.p {...fade(0.46)} className="mt-3 max-w-[30ch] text-[15px] leading-[1.55] text-slate-500">
          {solo
            ? "É só teu. Quando quiseres, há lugar para mais um."
            : "Um lado já está cá dentro. Falta o do teu par."}
        </motion.p>
      </section>

      <footer className="flex items-center gap-2.5 text-[14px] text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        A preparar a tua Home…
      </footer>
    </AuthPage>
  );
}

// ── Convite do par (registo) ─────────────────────────────────────────────────

/** O convite do par como uma opção com contexto, não uma linha de configuração. */
export function InviteOption({
  open,
  onOpen,
  code,
  onCode,
}: {
  open: boolean;
  onOpen: () => void;
  code: string;
  onCode: (v: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="rounded-2xl border border-dashed border-[#0B1324]/[0.14]">
      {!open ? (
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-black/[0.02]">
          <Crescent side="b" height={26} />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">O teu par já criou o espaço?</span>
            <span className="block text-[13px] text-slate-500">Entra no mesmo, com o código do vosso LoveNest.</span>
          </span>
          <span className="text-[13px] font-semibold text-slate-500">Inserir</span>
        </button>
      ) : (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="px-4 py-3"
        >
          <label htmlFor="onboarding-invite" className="flex items-center gap-3">
            <Crescent side="b" height={26} />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-slate-400">Código do vosso espaço</span>
              <input
                id="onboarding-invite"
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="EX: AMOR2024"
                value={code}
                onChange={(e) => onCode(e.target.value)}
                className="mt-0.5 block w-full bg-transparent text-[16px] font-bold tracking-[0.12em] text-[#0B1324] outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-300"
              />
            </span>
          </label>
        </motion.div>
      )}
    </div>
  );
}

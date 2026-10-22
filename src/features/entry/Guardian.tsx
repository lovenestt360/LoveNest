import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ENVELOPE_SVG, HEART_SVG, prefersReducedMotion } from "./entryUtils";
import faiscaImg from "./assets/faisca.webp";
import guardiaoImg from "./assets/guardiao.webp";
import "./entry.css";

export type Reaction = "nod" | "wiggle" | "shake" | "spin" | "happy";
const REACTIONS: Reaction[] = ["nod", "wiggle", "shake", "spin", "happy"];

export interface GuardianHandle {
  react: (kind: Reaction) => void;
  /** Mostra um balão; ms = 0 deixa-o aberto até à próxima fala. */
  say: (text: string, ms?: number) => void;
  hearts: (n?: number) => void;
  /** Um envelope sai do Guardião a voar. */
  mail: () => void;
}


interface GuardianProps {
  kind: "faisca" | "guardiao";
  width: number;
  /** Para que lado abre o balão de fala. */
  sayAt?: "left" | "right" | "top";
  /** De costas, para não espreitar a senha. */
  shy?: boolean;
  /** A mexer-se enquanto "escreve". */
  talking?: boolean;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Frases ao tocar no Guardião. */
  tapLines?: string[];
  /** Outro estágio da chama (imagem) e a cor do brilho atrás dele. */
  src?: string;
  glow?: string;
  children?: React.ReactNode;
}

const DEFAULT_TAP = ["Olá! 💕", "Aqui estou!", "Hehe 😊"];

/** Mascote da app: flutua, fala por balões e reage ao que a pessoa faz. */
export const Guardian = forwardRef<GuardianHandle, GuardianProps>(function Guardian(
  { kind, width, sayAt = "left", shy, talking, delay = 0, className, style, tapLines = DEFAULT_TAP, src, glow, children },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const timer = useRef<number>();
  const frame = useRef(0);

  const react = useCallback((cls: Reaction) => {
    const el = rootRef.current;
    if (!el) return;
    REACTIONS.forEach((c) => el.classList.remove(c));
    void el.offsetWidth; // reinicia a animação
    el.classList.add(cls);
  }, []);

  const say = useCallback((text: string, ms = 2200) => {
    window.clearTimeout(timer.current);
    // Fecha e volta a abrir no frame seguinte, para o balão "saltar" de novo.
    setBubbleOpen(false);
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      setBubble(text);
      setBubbleOpen(true);
      if (ms) timer.current = window.setTimeout(() => setBubbleOpen(false), ms);
    });
  }, []);

  const hearts = useCallback((n = 7) => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;
    for (let i = 0; i < n; i++) {
      const h = document.createElement("span");
      h.className = "en-burst";
      h.innerHTML = HEART_SVG;
      h.setAttribute("aria-hidden", "true");
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      h.style.setProperty("--dx", `${Math.cos(a) * (40 + Math.random() * 30)}px`);
      h.style.setProperty("--dy", `${-30 - Math.random() * 50}px`);
      h.style.setProperty("--r", `${(Math.random() - 0.5) * 60}deg`);
      h.style.fontSize = `${10 + Math.random() * 8}px`;
      h.style.animationDelay = `${i * 30}ms`;
      el.appendChild(h);
      window.setTimeout(() => h.remove(), 1300);
    }
  }, []);

  const mail = useCallback(() => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;
    const env = document.createElement("span");
    env.className = "en-env fly mini";
    env.innerHTML = ENVELOPE_SVG;
    el.appendChild(env);
    window.setTimeout(() => env.remove(), 1700);
  }, []);

  useImperativeHandle(ref, () => ({ react, say, hearts, mail }), [react, say, hearts, mail]);
  useEffect(() => () => { window.clearTimeout(timer.current); window.cancelAnimationFrame(frame.current); }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "en-pet en-pet-in",
        glow ? "custom" : kind === "faisca" ? "rose" : "blue",
        sayAt === "right" && "say-right",
        sayAt === "top" && "say-top",
        shy && "shy",
        talking && "talking",
        className,
      )}
      style={{ width, ["--d" as string]: delay, ...(glow ? { ["--en-glow" as string]: glow } : {}), ...style }}
    >
      <button
        type="button"
        className="en-pet-body"
        aria-label={kind === "faisca" ? "Faísca" : "Guardião"}
        onClick={() => { react("happy"); hearts(); say(tapLines[Math.floor(Math.random() * tapLines.length)]); }}
        onMouseEnter={() => { if (!shy) react("wiggle"); }}
      >
        <img src={src ?? (kind === "faisca" ? faiscaImg : guardiaoImg)} alt="" draggable={false} />
      </button>
      {bubble && (
        <div className={cn("en-say", bubbleOpen && "show")} role="status" aria-live="polite">
          {bubble}
        </div>
      )}
      {children}
    </div>
  );
});

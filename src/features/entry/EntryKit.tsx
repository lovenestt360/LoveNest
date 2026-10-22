import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENVELOPE_SVG, prefersReducedMotion, webmailFor } from "./entryUtils";
import "./entry.css";

/**
 * Ecrã de entrada: fundo branco, ondinha nos botões e Guardiões que se
 * inclinam para onde está o dedo ou o rato.
 */
export function EntryScreen({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const lean = (e: React.PointerEvent) => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    root.querySelectorAll<HTMLElement>(".en-pet-body").forEach((body) => {
      if (body.closest(".en-pet")?.classList.contains("shy")) return;
      const r = body.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / root.clientWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / root.clientHeight;
      body.style.setProperty("--rot", `${Math.max(-10, Math.min(10, dx * 26))}deg`);
      body.style.setProperty("--tx", `${Math.max(-6, Math.min(6, dx * 18))}px`);
      body.style.setProperty("--ty", `${Math.max(-4, Math.min(4, dy * 10))}px`);
    });
  };

  const rest = () => {
    ref.current?.querySelectorAll<HTMLElement>(".en-pet-body").forEach((b) => {
      b.style.removeProperty("--rot");
      b.style.removeProperty("--tx");
      b.style.removeProperty("--ty");
    });
  };

  const ripple = (e: React.PointerEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".en-btn");
    if (!btn || (btn as HTMLButtonElement).disabled || prefersReducedMotion()) return;
    const r = btn.getBoundingClientRect();
    const s = Math.max(r.width, r.height) / 2;
    const span = document.createElement("span");
    span.className = "en-ripple";
    span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    btn.appendChild(span);
    window.setTimeout(() => span.remove(), 650);
  };

  return (
    <div className="en-page">
      <div
        ref={ref}
        className={cn("en-screen", className)}
        onPointerMove={lean}
        onPointerLeave={rest}
        onPointerUp={(e) => { if (e.pointerType !== "mouse") rest(); }}
        onPointerDown={ripple}
      >
        {children}
      </div>
    </div>
  );
}

export function BackButton({ onClick, label = "Voltar", className }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("en-back", className)} aria-label={label}>
      <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}

export type ChatLine = ["app" | "me", string];

/**
 * A app "escreve": pontinhos, depois a mensagem, uma a uma.
 * Volta a tocar quando o guião muda.
 */
export function ChatScript({
  script, start = 0, onTalking, onDone, className, style,
}: {
  script: ChatLine[];
  start?: number;
  onTalking?: (talking: boolean) => void;
  onDone?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [shown, setShown] = useState<ChatLine[]>([]);
  const [typing, setTyping] = useState(false);
  const key = JSON.stringify(script);
  const cb = useRef({ onTalking, onDone });
  cb.current = { onTalking, onDone };

  useEffect(() => {
    const lines = JSON.parse(key) as ChatLine[];
    const reduced = prefersReducedMotion();
    if (reduced) {
      setShown(lines);
      setTyping(false);
      cb.current.onDone?.();
      return;
    }
    let alive = true;
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    setShown([]);
    (async () => {
      await wait(start);
      for (const line of lines) {
        if (!alive) return;
        if (line[0] === "app") {
          setTyping(true);
          cb.current.onTalking?.(true);
          await wait(Math.min(1100, 380 + line[1].length * 14));
          if (!alive) return;
          setTyping(false);
          cb.current.onTalking?.(false);
        } else {
          await wait(450);
          if (!alive) return;
        }
        setShown((s) => [...s, line]);
        await wait(260);
      }
      if (alive) cb.current.onDone?.();
    })();
    return () => { alive = false; cb.current.onTalking?.(false); };
  }, [key, start]);

  return (
    <div className={cn("en-chat", className)} style={style} aria-live="polite">
      {shown.map(([who, text], i) => (
        <div key={i} className={cn("en-bub", who)}>{text}</div>
      ))}
      {typing && <div className="en-typing" aria-label="A escrever"><i /><i /><i /></div>}
    </div>
  );
}

/** Contagem que sobe até ao número, para o cartão "Tempo juntos". */
export function CountUp({ to, delay = 500, duration = 1400 }: { to: number; delay?: number; duration?: number }) {
  const [n, setN] = useState(() => (prefersReducedMotion() ? to : 0));
  useEffect(() => {
    if (prefersReducedMotion()) { setN(to); return; }
    let raf = 0;
    const t = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf); };
  }, [to, delay, duration]);
  return <>{n}</>;
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}


/** Envelope desenhado a traço; "fly" voa uma vez, "wait" flutua. */
export function Envelope({ mode, className, style }: { mode: "fly" | "wait"; className?: string; style?: React.CSSProperties }) {
  return <span className={cn("en-env", mode, className)} style={style} dangerouslySetInnerHTML={{ __html: ENVELOPE_SVG }} />;
}

export function EmailChip({ email }: { email: string }) {
  return (
    <div className="en-chip en-in" style={{ ["--d" as string]: 5 }}>
      <i>{email.trim().charAt(0) || "@"}</i><span>{email.trim()}</span>
    </div>
  );
}

/** Botão para abrir o email na web, só quando conhecemos o serviço. */
export function WebmailButton({ email, delay = 6 }: { email: string; delay?: number }) {
  const mail = webmailFor(email);
  if (!mail) return null;
  return (
    <a className="en-btn en-in" style={{ ["--d" as string]: delay }} href={mail.url} target="_blank" rel="noreferrer">
      {mail.label} <span className="en-arrow">→</span>
    </a>
  );
}

/** "Não chegou? Reenviar", bloqueado durante uns segundos depois de cada envio. */
export function ResendLink({ seconds, onResend, delay = 7 }: { seconds: number; onResend: () => Promise<boolean>; delay?: number }) {
  const [left, setLeft] = useState(seconds);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  const fmt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <p className="en-resend en-in" style={{ ["--d" as string]: delay }}>
      Não chegou?{" "}
      <button
        type="button"
        disabled={left > 0 || busy}
        onClick={async () => {
          setBusy(true);
          const ok = await onResend();
          setBusy(false);
          if (ok) setLeft(seconds);
        }}
      >
        {busy ? "A enviar…" : left > 0 ? `Reenviar em ${fmt}` : "Reenviar"}
      </button>
    </p>
  );
}

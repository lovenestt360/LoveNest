import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Screens — Refinement 1: secondary copy now more human and emotionally mature
const SCREENS = [
  {
    id: "presence",
    headline: "O amor também vive nos dias comuns.",
    sub: "Mesmo os dias silenciosos aproximam duas pessoas.",
  },
  {
    id: "rituals",
    headline: "Pequenos gestos criam proximidade.",
    sub: "A presença cresce nos pequenos momentos.",
  },
  {
    id: "space",
    headline: "Um espaço privado para aparecerem um para o outro.",
    sub: "Alguns espaços fazem duas pessoas sentirem-se mais próximas.",
  },
  {
    id: "invitation",
    headline: "Comecem a construir a vossa história.",
    sub: "O vosso espaço começa aqui.",
  },
] as const;

// ── Visuals — ambient motion (Phase 2) ───────────────────────────────────────

function PresenceVisual() {
  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="absolute inset-0 rounded-full bg-rose-50/40 blur-3xl scale-75" />
      <div className="absolute w-20 h-20 rounded-full bg-rose-100/90 top-5 left-5 animate-ob-float-a" />
      <div
        className="absolute w-16 h-16 rounded-full bg-rose-50 border border-rose-100 bottom-5 right-6 animate-ob-float-b"
        style={{ animationDelay: "-4s" }}
      />
    </div>
  );
}

function RitualsVisual() {
  const bars = [10, 22, 15, 28, 18, 12, 24, 10, 20];
  return (
    <div className="flex items-end justify-center gap-2.5 h-32">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: h, animationDelay: `${i * 120}ms` }}
          className={cn(
            "w-1.5 rounded-full animate-ob-bar-breathe",
            i % 2 === 0 ? "bg-rose-200" : "bg-rose-100"
          )}
        />
      ))}
    </div>
  );
}

function SpaceVisual() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="absolute w-40 h-40 rounded-full bg-rose-50/30 blur-3xl" />
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-[2.5rem] border border-rose-100 animate-ob-layer-breathe" style={{ animationDelay: "0s" }} />
        <div className="absolute inset-4 rounded-[1.8rem] border border-rose-100/60 bg-rose-50/30 animate-ob-layer-breathe" style={{ animationDelay: "-1.5s" }} />
        <div className="absolute inset-10 rounded-2xl bg-rose-100/60 animate-ob-layer-breathe" style={{ animationDelay: "-3s" }} />
      </div>
    </div>
  );
}

function InvitationVisual() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 rounded-full border border-rose-100 animate-ob-ring-breathe" />
        <div className="absolute inset-5 rounded-full border border-rose-100/70 bg-rose-50/30 animate-ob-ring-inner" style={{ animationDelay: "-2s" }} />
        <div className="absolute inset-11 rounded-full bg-rose-200/70 animate-ob-ring-breathe" style={{ animationDelay: "-3s" }} />
      </div>
    </div>
  );
}

const VISUALS = [PresenceVisual, RitualsVisual, SpaceVisual, InvitationVisual];

// ── Shared design tokens — Refinements 4 & 5 ─────────────────────────────────

// Input: softer focus border — less "beauty app", more premium neutral
const INPUT_CLASS =
  "w-full h-14 rounded-2xl border border-[#eeeeee] bg-white text-center text-[17px] font-medium text-foreground placeholder:text-[#d4d4d4] focus:outline-none focus:border-[#ddd0d0] focus:ring-2 focus:ring-rose-50 transition-all";

// Button: slightly reduced saturation + soft warm shadow
const BTN_PRIMARY =
  "w-full h-14 rounded-2xl bg-rose-500/90 text-white font-semibold text-[15px] disabled:opacity-30 active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)]";

// ── Phase 3: Personalisation screens ─────────────────────────────────────────

function FunctionalShell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white flex flex-col select-none overflow-hidden relative">
      {/* Refinement 3: ultra-subtle ambient warmth — same atmosphere as storytelling */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/60 blur-[90px] pointer-events-none" />

      {/* Back */}
      <div className="px-5 pt-14 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[#c0c0c0]" strokeWidth={1.5} />
        </button>
      </div>

      {children}
      <div className="pb-16 shrink-0" />
    </div>
  );
}

function NameScreen({ onContinue, onLogin }: { onContinue: (name: string) => void; onLogin: () => void }) {
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;

  return (
    <FunctionalShell onBack={onLogin}>
      <div
        key="name"
        className="flex-1 flex flex-col items-center justify-center px-8 animate-in fade-in slide-in-from-bottom-3 duration-[450ms] relative z-10"
      >
        <div className="w-full max-w-[272px] space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
              Como te chamas?
            </h1>
            <p className="text-[14px] text-[#999] leading-relaxed">
              Para personalizarmos o vosso espaço.
            </p>
          </div>

          <input
            type="text"
            placeholder="O teu nome"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && valid) onContinue(name.trim()); }}
            autoFocus
            className={INPUT_CLASS}
          />

          <div className="space-y-3">
            <button
              onClick={() => valid && onContinue(name.trim())}
              disabled={!valid}
              className={BTN_PRIMARY}
            >
              Continuar
            </button>
            <button
              onClick={onLogin}
              className="w-full text-[12px] text-[#c8c8c8] hover:text-[#999] transition-colors py-1"
            >
              Já tenho conta
            </button>
          </div>
        </div>
      </div>
    </FunctionalShell>
  );
}

function InviteScreen({ onContinue, onSkip, onBack }: { onContinue: (code: string) => void; onSkip: () => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const valid = code.trim().length >= 4;

  return (
    <FunctionalShell onBack={onBack}>
      <div
        key="invite"
        className="flex-1 flex flex-col items-center justify-center px-8 animate-in fade-in slide-in-from-bottom-3 duration-[450ms] relative z-10"
      >
        <div className="w-full max-w-[272px] space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
              Qual é o vosso código?
            </h1>
            <p className="text-[14px] text-[#999] leading-relaxed">
              O teu par partilhou um código de convite contigo.
            </p>
          </div>

          <input
            type="text"
            placeholder="Ex: AMOR2024"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter" && valid) onContinue(code.trim()); }}
            autoFocus
            maxLength={12}
            className={INPUT_CLASS + " tracking-[0.15em] font-bold"}
          />

          <div className="space-y-3">
            <button
              onClick={() => valid && onContinue(code.trim())}
              disabled={!valid}
              className={BTN_PRIMARY}
            >
              Entrar no nosso espaço
            </button>
            <button
              onClick={onSkip}
              className="w-full text-[12px] text-[#c8c8c8] hover:text-[#999] transition-colors py-1"
            >
              Não tenho código
            </button>
          </div>
        </div>
      </div>
    </FunctionalShell>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Phase = "screens" | "name" | "invite";

export default function Onboarding() {
  const [current, setCurrent]   = useState(0);
  const [exiting, setExiting]   = useState(false);
  const [phase, setPhase]       = useState<Phase>("screens");
  const [invitePath, setInvitePath] = useState(false);
  const navigate = useNavigate();

  const isLast = current === SCREENS.length - 1;
  const markSeen = () => localStorage.setItem("onboarding_seen", "1");

  const goTo = useCallback((index: number) => {
    if (exiting || index === current) return;
    setExiting(true);
    try { navigator.vibrate?.([6]); } catch {}
    setTimeout(() => { setCurrent(index); setExiting(false); }, 220);
  }, [exiting, current]);

  const advance = useCallback(() => {
    if (isLast || phase !== "screens") return;
    goTo(current + 1);
  }, [isLast, phase, current, goTo]);

  // Phase transitions
  const handleCreateSpace = () => { setInvitePath(false); setPhase("name"); };
  const handleHaveInvite  = () => { setInvitePath(true);  setPhase("name"); };

  const handleNameContinue = (name: string) => {
    localStorage.setItem("onboarding_name", name);
    if (invitePath) { setPhase("invite"); } else { markSeen(); navigate("/criar-conta"); }
  };

  const handleInviteContinue = (code: string) => {
    sessionStorage.setItem("lovenest_ref", code);
    markSeen();
    navigate("/criar-conta");
  };

  const handleLogin = () => { markSeen(); navigate("/entrar"); };
  const handleSkip  = (e: React.MouseEvent) => { e.stopPropagation(); markSeen(); navigate("/entrar"); };

  const screen = SCREENS[current];
  const Visual = VISUALS[current];

  // ── Functional phases ────────────────────────────────────────────────────
  if (phase === "name")   return <NameScreen   onContinue={handleNameContinue} onLogin={handleLogin} />;
  if (phase === "invite") return <InviteScreen onContinue={handleInviteContinue} onSkip={() => { markSeen(); navigate("/criar-conta"); }} onBack={() => setPhase("name")} />;

  // ── Storytelling screens ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-white flex flex-col select-none overflow-hidden"
      onClick={!isLast ? advance : undefined}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center px-6 pt-14 shrink-0">
        <div className="w-2 h-2 rounded-full bg-rose-200" />
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-[11px] font-medium text-[#ccc] hover:text-[#999] transition-colors py-1 px-2"
          >
            Saltar
          </button>
        )}
      </div>

      {/* Screen content */}
      <div
        key={current}
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-8",
          "animate-in fade-in slide-in-from-bottom-3 duration-[450ms] ease-out",
          exiting && "opacity-0 -translate-y-2 transition-[opacity,transform] duration-[220ms] ease-in"
        )}
      >
        <div className="mb-14">
          <Visual />
        </div>

        {/* Refinement 6: tighter max-width on headline for better line-break rhythm */}
        <div className="text-center space-y-5 max-w-[260px]">
          <h1 className="text-[26px] font-bold text-foreground leading-[1.25] tracking-tight">
            {screen.headline}
          </h1>
          <p className="text-[14px] text-[#999] leading-[1.7] font-normal">
            {screen.sub}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-14 pt-4 shrink-0 space-y-6">
        {/* Dots */}
        <div className="flex justify-center items-center gap-2">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); if (i <= current) goTo(i); }}
              className={cn(
                "rounded-full transition-all duration-300 ease-out",
                i === current
                  ? "w-6 h-1.5 bg-rose-400"
                  : i < current
                    ? "w-1.5 h-1.5 bg-rose-200"
                    : "w-1.5 h-1.5 bg-[#e8e8e8]"
              )}
            />
          ))}
        </div>

        {/* CTA or hint */}
        {isLast ? (
          <div
            className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCreateSpace}
              className={BTN_PRIMARY}
            >
              Criar espaço
            </button>
            <button
              onClick={handleHaveInvite}
              className="w-full h-12 rounded-2xl text-[13px] font-medium text-[#bbb] hover:text-[#717171] transition-colors"
            >
              Já tenho convite
            </button>
          </div>
        ) : (
          /* Refinement 2: breathing hint — slightly more visible, animated */
          <p className="text-center text-[10px] text-[#bbb] tracking-[0.06em] animate-ob-hint">
            toca para continuar
          </p>
        )}
      </div>
    </div>
  );
}

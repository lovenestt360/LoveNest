import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Screen definitions ────────────────────────────────────────────────────────

const SCREENS = [
  {
    id: "presence",
    headline: "O amor também vive nos dias comuns.",
    sub: "Pequenos momentos mantêm duas pessoas emocionalmente próximas.",
  },
  {
    id: "rituals",
    headline: "Pequenos gestos criam proximidade.",
    sub: "A presença cresce nos momentos repetidos todos os dias.",
  },
  {
    id: "space",
    headline: "Um espaço privado para aparecerem um para o outro.",
    sub: "Guardem momentos, criem rituais e mantenham a vossa chama presente.",
  },
  {
    id: "invitation",
    headline: "Comecem a construir a vossa história.",
    sub: "Criem o vosso espaço emocional privado no LoveNest.",
  },
] as const;

// ── Visuals — Phase 2: ambient motion ────────────────────────────────────────

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

// ── Phase 3: Personalisation screens ─────────────────────────────────────────

function NameScreen({
  onContinue,
  onLogin,
}: {
  onContinue: (name: string) => void;
  onLogin: () => void;
}) {
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;

  return (
    <div
      key="name"
      className="flex-1 flex flex-col items-center justify-center px-8 animate-in fade-in slide-in-from-bottom-3 duration-[450ms]"
    >
      <div className="w-full max-w-[280px] space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
            Como te chamas?
          </h1>
          <p className="text-[14px] text-[#888] leading-relaxed">
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
          className="w-full h-14 rounded-2xl border border-[#ececec] bg-white text-center text-[17px] font-medium text-foreground placeholder:text-[#d0d0d0] focus:outline-none focus:border-rose-200 focus:ring-2 focus:ring-rose-100/50 transition-all"
        />

        <button
          onClick={() => valid && onContinue(name.trim())}
          disabled={!valid}
          className="w-full h-14 rounded-2xl bg-rose-500 text-white font-semibold text-[15px] disabled:opacity-35 active:scale-[0.98] transition-all shadow-sm"
        >
          Continuar
        </button>

        <button
          onClick={onLogin}
          className="text-[12px] text-[#c0c0c0] hover:text-[#888] transition-colors"
        >
          Já tenho conta
        </button>
      </div>
    </div>
  );
}

function InviteScreen({
  onContinue,
  onSkip,
  onBack,
}: {
  onContinue: (code: string) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const valid = code.trim().length >= 4;

  return (
    <div
      key="invite"
      className="flex-1 flex flex-col items-center justify-center px-8 animate-in fade-in slide-in-from-bottom-3 duration-[450ms]"
    >
      <div className="w-full max-w-[280px] space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
            Qual é o vosso código?
          </h1>
          <p className="text-[14px] text-[#888] leading-relaxed">
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
          className="w-full h-14 rounded-2xl border border-[#ececec] bg-white text-center text-[17px] font-bold text-foreground placeholder:text-[#d0d0d0] tracking-[0.15em] focus:outline-none focus:border-rose-200 focus:ring-2 focus:ring-rose-100/50 transition-all"
        />

        <button
          onClick={() => valid && onContinue(code.trim())}
          disabled={!valid}
          className="w-full h-14 rounded-2xl bg-rose-500 text-white font-semibold text-[15px] disabled:opacity-35 active:scale-[0.98] transition-all shadow-sm"
        >
          Entrar no nosso espaço
        </button>

        <button
          onClick={onSkip}
          className="text-[12px] text-[#c0c0c0] hover:text-[#888] transition-colors"
        >
          Não tenho código
        </button>
      </div>
    </div>
  );
}

// ── Bottom bar — shared across all phases ─────────────────────────────────────

function PhaseHeader({
  phase,
  onBack,
}: {
  phase: "screens" | "name" | "invite";
  onBack?: () => void;
}) {
  return (
    <div className="flex justify-between items-center px-6 pt-14 shrink-0">
      {phase === "screens" ? (
        <div className="w-2 h-2 rounded-full bg-rose-300" />
      ) : (
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[#bbb]" strokeWidth={1.5} />
        </button>
      )}
      {/* Skip only on storytelling screens — handled by parent */}
      <div />
    </div>
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

  // Advance storytelling screens
  const goTo = useCallback((index: number) => {
    if (exiting || index === current) return;
    setExiting(true);
    try { navigator.vibrate?.([6]); } catch {}
    setTimeout(() => {
      setCurrent(index);
      setExiting(false);
    }, 220);
  }, [exiting, current]);

  const advance = useCallback(() => {
    if (isLast || phase !== "screens") return;
    goTo(current + 1);
  }, [isLast, phase, current, goTo]);

  // Screen 4 CTAs
  const handleCreateSpace = () => {
    setInvitePath(false);
    setPhase("name");
  };

  const handleHaveInvite = () => {
    setInvitePath(true);
    setPhase("name");
  };

  // Name screen continue
  const handleNameContinue = (name: string) => {
    localStorage.setItem("onboarding_name", name);
    if (invitePath) {
      setPhase("invite");
    } else {
      markSeen();
      navigate("/criar-conta");
    }
  };

  // Invite code continue
  const handleInviteContinue = (code: string) => {
    sessionStorage.setItem("lovenest_ref", code);
    markSeen();
    navigate("/criar-conta");
  };

  // Invite code — user doesn't have code, continue to signup anyway
  const handleInviteSkip = () => {
    markSeen();
    navigate("/criar-conta");
  };

  const handleLogin = () => {
    markSeen();
    navigate("/entrar");
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    markSeen();
    navigate("/entrar");
  };

  const screen = SCREENS[current];
  const Visual = VISUALS[current];

  // ── Name phase ───────────────────────────────────────────────────────────
  if (phase === "name") {
    return (
      <div className="min-h-screen bg-white flex flex-col select-none overflow-hidden">
        <PhaseHeader phase="name" onBack={() => setPhase("screens")} />
        <NameScreen
          onContinue={handleNameContinue}
          onLogin={handleLogin}
        />
        <div className="pb-14" />
      </div>
    );
  }

  // ── Invite phase ─────────────────────────────────────────────────────────
  if (phase === "invite") {
    return (
      <div className="min-h-screen bg-white flex flex-col select-none overflow-hidden">
        <PhaseHeader phase="invite" onBack={() => setPhase("name")} />
        <InviteScreen
          onContinue={handleInviteContinue}
          onSkip={handleInviteSkip}
          onBack={() => setPhase("name")}
        />
        <div className="pb-14" />
      </div>
    );
  }

  // ── Storytelling screens ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-white flex flex-col select-none overflow-hidden"
      onClick={!isLast ? advance : undefined}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center px-6 pt-14 shrink-0">
        <div className="w-2 h-2 rounded-full bg-rose-300" />
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-[11px] font-medium text-[#c8c8c8] hover:text-[#999] transition-colors py-1 px-2"
          >
            Saltar
          </button>
        )}
      </div>

      {/* Screen content — key remount on change */}
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

        <div className="text-center space-y-5 max-w-[272px]">
          <h1 className="text-[26px] font-bold text-foreground leading-[1.25] tracking-tight">
            {screen.headline}
          </h1>
          <p className="text-[14px] text-[#888] leading-[1.65] font-normal">
            {screen.sub}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-14 pt-6 shrink-0 space-y-7">
        {/* Dot pagination */}
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

        {/* CTA — screen 4 */}
        {isLast ? (
          <div
            className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCreateSpace}
              className="w-full h-14 rounded-2xl bg-rose-500 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-sm"
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
          <p className="text-center text-[10px] text-[#d8d8d8] tracking-[0.08em]">
            toca para continuar
          </p>
        )}
      </div>
    </div>
  );
}

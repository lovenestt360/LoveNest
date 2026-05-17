import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

// ── Abstract visuals — Phase 1: static, no animation ─────────────────────────
// Phase 2 will add floating motion and breathing glow

function PresenceVisual() {
  return (
    <div className="relative w-44 h-44 mx-auto">
      {/* Two soft presences — abstract, non-literal */}
      <div className="absolute w-20 h-20 rounded-full bg-rose-100/80 top-4 left-4" />
      <div className="absolute w-16 h-16 rounded-full bg-rose-50 border border-rose-100 bottom-4 right-6" />
    </div>
  );
}

function RitualsVisual() {
  // Rhythmic bars — small repeated gestures
  const bars = [12, 20, 16, 26, 18, 14, 22, 10, 18];
  return (
    <div className="flex items-end justify-center gap-2 h-28">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: h }}
          className={cn(
            "w-1.5 rounded-full",
            i % 2 === 0 ? "bg-rose-200" : "bg-rose-100"
          )}
        />
      ))}
    </div>
  );
}

function SpaceVisual() {
  // Layered container — a protected private space
  return (
    <div className="flex items-center justify-center h-44">
      <div className="relative w-36 h-36">
        <div className="absolute inset-0 rounded-[2.5rem] border border-rose-100" />
        <div className="absolute inset-4 rounded-[1.8rem] border border-rose-100/70 bg-rose-50/30" />
        <div className="absolute inset-10 rounded-2xl bg-rose-100/60" />
      </div>
    </div>
  );
}

function InvitationVisual() {
  // Concentric soft rings — beginning of something
  return (
    <div className="flex items-center justify-center h-44">
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border border-rose-100" />
        <div className="absolute inset-5 rounded-full border border-rose-150/80 bg-rose-50/40" />
        <div className="absolute inset-10 rounded-full bg-rose-200/70" />
      </div>
    </div>
  );
}

const VISUALS = [PresenceVisual, RitualsVisual, SpaceVisual, InvitationVisual];

// ── Onboarding ────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const navigate = useNavigate();

  const isLast = current === SCREENS.length - 1;

  const markSeen = () => localStorage.setItem("onboarding_seen", "1");

  const goTo = useCallback((index: number) => {
    if (fading || index === current) return;
    setFading(true);
    try { navigator.vibrate?.([6]); } catch {}
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 180);
  }, [fading, current]);

  const advance = useCallback(() => {
    if (isLast) return;
    goTo(current + 1);
  }, [isLast, current, goTo]);

  const handleCreate = () => {
    markSeen();
    navigate("/criar-conta");
  };

  const handleInvite = () => {
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

  return (
    <div
      className="min-h-screen bg-white flex flex-col select-none overflow-hidden"
      onClick={!isLast ? advance : undefined}
    >
      {/* Skip — subtle, low pressure */}
      <div className="flex justify-between items-center px-6 pt-14 pb-0 shrink-0">
        {/* Brand mark — minimal */}
        <div className="w-2 h-2 rounded-full bg-rose-300" />
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-[11px] font-medium text-[#c0c0c0] hover:text-[#999] transition-colors py-1 px-2"
          >
            Saltar
          </button>
        )}
      </div>

      {/* Screen content */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-8",
          "transition-opacity duration-[180ms] ease-out",
          fading ? "opacity-0" : "opacity-100"
        )}
      >
        {/* Visual */}
        <div className="mb-14">
          <Visual />
        </div>

        {/* Typography */}
        <div className="text-center space-y-5 max-w-[280px]">
          <h1 className="text-[26px] font-bold text-foreground leading-[1.25] tracking-tight">
            {screen.headline}
          </h1>
          <p className="text-[14px] text-[#888] leading-[1.65] font-normal">
            {screen.sub}
          </p>
        </div>
      </div>

      {/* Bottom — pagination + CTA */}
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

        {/* CTA — only on last screen */}
        {isLast ? (
          <div
            className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCreate}
              className="w-full h-14 rounded-2xl bg-rose-500 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-sm"
            >
              Criar espaço
            </button>
            <button
              onClick={handleInvite}
              className="w-full h-12 rounded-2xl text-[13px] font-medium text-[#aaa] hover:text-[#717171] transition-colors"
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

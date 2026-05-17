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

// ── Visuals — Phase 2: ambient ambient motion ─────────────────────────────────

function PresenceVisual() {
  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Soft ambient glow behind — stationary */}
      <div className="absolute inset-0 rounded-full bg-rose-50/40 blur-3xl scale-75" />
      {/* First presence — slow organic drift */}
      <div className="absolute w-20 h-20 rounded-full bg-rose-100/90 top-5 left-5 animate-ob-float-a" />
      {/* Second presence — counter-drift, slightly smaller */}
      <div
        className="absolute w-16 h-16 rounded-full bg-rose-50 border border-rose-100 bottom-5 right-6 animate-ob-float-b"
        style={{ animationDelay: "-4s" }}
      />
    </div>
  );
}

function RitualsVisual() {
  // Bars with staggered delays — wave of rhythm
  const bars = [10, 22, 15, 28, 18, 12, 24, 10, 20];
  return (
    <div className="flex items-end justify-center gap-2.5 h-32">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            animationDelay: `${i * 120}ms`,
          }}
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
      {/* Ambient background glow */}
      <div className="absolute w-40 h-40 rounded-full bg-rose-50/30 blur-3xl" />
      <div className="relative w-40 h-40">
        {/* Outer ring — slowest breathing */}
        <div
          className="absolute inset-0 rounded-[2.5rem] border border-rose-100 animate-ob-layer-breathe"
          style={{ animationDelay: "0s" }}
        />
        {/* Middle ring */}
        <div
          className="absolute inset-4 rounded-[1.8rem] border border-rose-100/60 bg-rose-50/30 animate-ob-layer-breathe"
          style={{ animationDelay: "-1.5s" }}
        />
        {/* Inner core */}
        <div
          className="absolute inset-10 rounded-2xl bg-rose-100/60 animate-ob-layer-breathe"
          style={{ animationDelay: "-3s" }}
        />
      </div>
    </div>
  );
}

function InvitationVisual() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="relative w-32 h-32">
        {/* Outer ring — slow expand breathe */}
        <div className="absolute inset-0 rounded-full border border-rose-100 animate-ob-ring-breathe" />
        {/* Middle ring — slightly faster, out of phase */}
        <div
          className="absolute inset-5 rounded-full border border-rose-100/70 bg-rose-50/30 animate-ob-ring-inner"
          style={{ animationDelay: "-2s" }}
        />
        {/* Inner core — opposite phase */}
        <div
          className="absolute inset-11 rounded-full bg-rose-200/70 animate-ob-ring-breathe"
          style={{ animationDelay: "-3s" }}
        />
      </div>
    </div>
  );
}

const VISUALS = [PresenceVisual, RitualsVisual, SpaceVisual, InvitationVisual];

// ── Onboarding ────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();

  const isLast = current === SCREENS.length - 1;

  const markSeen = () => localStorage.setItem("onboarding_seen", "1");

  const goTo = useCallback((index: number) => {
    if (exiting || index === current) return;
    setExiting(true);
    try { navigator.vibrate?.([6]); } catch {}
    // Exit: 220ms fade + drift up → swap screen → enter: animate-in from below
    setTimeout(() => {
      setCurrent(index);
      setExiting(false);
    }, 220);
  }, [exiting, current]);

  const advance = useCallback(() => {
    if (isLast) return;
    goTo(current + 1);
  }, [isLast, current, goTo]);

  const handleCreate = () => { markSeen(); navigate("/criar-conta"); };
  const handleInvite = () => { markSeen(); navigate("/entrar"); };

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
      {/* Top bar — brand mark + skip */}
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

      {/* Screen content — key forces remount on change, animate-in handles entrance */}
      <div
        key={current}
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-8",
          "animate-in fade-in slide-in-from-bottom-3 duration-[450ms] ease-out",
          // Exit: drift up + fade
          exiting && "opacity-0 -translate-y-2 transition-[opacity,transform] duration-[220ms] ease-in"
        )}
      >
        {/* Visual */}
        <div className="mb-14">
          <Visual />
        </div>

        {/* Typography */}
        <div className="text-center space-y-5 max-w-[272px]">
          <h1 className="text-[26px] font-bold text-foreground leading-[1.25] tracking-tight">
            {screen.headline}
          </h1>
          <p className="text-[14px] text-[#888] leading-[1.65] font-normal">
            {screen.sub}
          </p>
        </div>
      </div>

      {/* Bottom — dots + CTA */}
      <div className="px-8 pb-14 pt-6 shrink-0 space-y-7">

        {/* Dot pagination — pill for active, circles for past/future */}
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

        {/* CTA — screen 4 only */}
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

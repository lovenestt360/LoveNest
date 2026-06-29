import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// O Guardião — forma procedural (CSS puro, sem ilustração customizada).
// Evolui exatamente nos limiares do Nível da Jornada (journeyLevels.ts),
// nunca numa régua própria. Ver docs/LOVENEST_PROGRESS_SYSTEM.md, secção 5.
//
// Início → Faísca/Brasa/Chama usam o próprio ícone Flame (já é a
// linguagem visual da Chama em toda a app — garante que se reconhece
// de imediato como fogo, não como uma forma abstrata). Chama Viva em
// diante evolui para um orbe com brilho em camadas, mais abstrato.

export type GuardianGlowColor = "rose" | "graphite";

interface Stage {
  shape: "point" | "flame" | "orb";
  core: number;                       // diâmetro em px, à escala de size=96
  glowLayers: 0 | 1 | 2 | 3;
  particles: 0 | 1 | 3 | 5;
  breathing: boolean;
}

const STAGES: Record<number, Stage> = {
  1: { shape: "point", core: 14, glowLayers: 0, particles: 0, breathing: false },
  2: { shape: "flame", core: 26, glowLayers: 0, particles: 0, breathing: false },
  3: { shape: "flame", core: 32, glowLayers: 1, particles: 0, breathing: true },
  4: { shape: "flame", core: 36, glowLayers: 1, particles: 1, breathing: true },
  5: { shape: "orb",   core: 42, glowLayers: 2, particles: 1, breathing: false },
  6: { shape: "orb",   core: 48, glowLayers: 2, particles: 3, breathing: false },
  7: { shape: "orb",   core: 54, glowLayers: 3, particles: 5, breathing: false },
};

const PALETTE: Record<GuardianGlowColor, { core: string; light: string; dark: string; rgb: string }> = {
  rose:     { core: "#fb7185", light: "#ffe4e9", dark: "#e11d48", rgb: "244,63,94" },
  graphite: { core: "#475569", light: "#cbd5e1", dark: "#1e293b", rgb: "71,85,105" },
};

function rgba(rgb: string, a: number) {
  return `rgba(${rgb},${a})`;
}

export interface GuardianProps {
  level: number;                  // 1-7, ver journeyLevels.ts
  glowColor?: GuardianGlowColor;  // personalização, ver guardian_state
  ringUnlocked?: boolean;         // personalização ou automático no nível 7
  ringEnabled?: boolean;          // interruptor on/off após desbloqueio
  size?: number;                  // px do contentor quadrado
  className?: string;
}

export function Guardian({ level, glowColor = "rose", ringUnlocked = false, ringEnabled = true, size = 96, className }: GuardianProps) {
  const stage = STAGES[Math.min(7, Math.max(1, level))];
  const color = PALETTE[glowColor];
  const scale = size / 96;
  const showRing = (ringUnlocked || level >= 7) && ringEnabled;
  // Nunca encolhe abaixo do legível, mesmo em previews pequenas (ex: 26px).
  const coreSize = Math.max(stage.core * scale, stage.shape === "point" ? 5 : 14);
  const particleSize = Math.max(3 * scale, 2.5);

  const particleAngles = Array.from({ length: stage.particles }, (_, i) => i * (360 / stage.particles));

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      {showRing && (
        <div
          className="absolute rounded-full"
          style={{ inset: size * 0.08, border: `1.5px solid ${rgba(color.rgb, 0.45)}` }}
        />
      )}

      {stage.glowLayers >= 3 && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-glow-pulse"
          style={{
            width: coreSize * 2.1,
            height: coreSize * 2.1,
            background: `radial-gradient(circle, ${rgba(color.rgb, 0.22)} 0%, transparent 70%)`,
            filter: "blur(2px)",
          }}
        />
      )}

      {particleAngles.map((angle, i) => (
        <div
          key={i}
          className="absolute inset-0 animate-guardian-orbit"
          style={{ animationDuration: `${9 + i * 2.4}s`, transform: `rotate(${angle}deg)` }}
        >
          <span
            className="absolute rounded-full"
            style={{
              top: 0,
              left: "50%",
              width: particleSize,
              height: particleSize,
              marginLeft: -particleSize / 2,
              background: color.light,
              boxShadow: `0 0 5px 1px ${rgba(color.rgb, 0.9)}`,
            }}
          />
        </div>
      ))}

      {stage.shape === "point" && (
        <div
          className="absolute left-1/2 top-1/2 rounded-full animate-guardian-point-pulse"
          style={{
            width: coreSize,
            height: coreSize,
            background: color.core,
            boxShadow: `0 0 6px 2px ${rgba(color.rgb, 0.35)}`,
          }}
        />
      )}

      {stage.shape === "flame" && (
        <Flame
          className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", stage.breathing && "animate-flame-breathe")}
          style={{
            width: coreSize,
            height: coreSize,
            color: color.core,
            fill: color.core,
            filter: stage.glowLayers > 0 ? `drop-shadow(0 0 ${4 + stage.glowLayers * 4}px ${rgba(color.rgb, 0.55)})` : undefined,
          }}
          strokeWidth={1}
        />
      )}

      {stage.shape === "orb" && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-glow-pulse"
          style={{
            width: coreSize,
            height: coreSize,
            background: `radial-gradient(circle at 32% 28%, ${color.light} 0%, ${color.core} 42%, ${color.dark} 100%)`,
            boxShadow: `0 0 ${8 + stage.glowLayers * 8}px ${3 + stage.glowLayers * 3}px ${rgba(color.rgb, 0.22 + stage.glowLayers * 0.08)}`,
          }}
        />
      )}
    </div>
  );
}

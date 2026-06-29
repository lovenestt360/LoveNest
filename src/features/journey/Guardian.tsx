import { cn } from "@/lib/utils";

// O Guardião — forma procedural (SVG/CSS puro, sem ilustração customizada).
// Evolui exatamente nos limiares do Nível da Jornada (journeyLevels.ts),
// nunca numa régua própria. Ver docs/LOVENEST_PROGRESS_SYSTEM.md, secção 5.

export type GuardianGlowColor = "rose" | "graphite";

interface Stage {
  shape: "point" | "flame" | "orb";
  core: number;                       // diâmetro em px, à escala de size=96
  glowLayers: 0 | 1 | 2 | 3;
  particles: 0 | 1 | 3 | 5;
}

const STAGES: Record<number, Stage> = {
  1: { shape: "point", core: 8,  glowLayers: 0, particles: 0 },
  2: { shape: "flame", core: 24, glowLayers: 0, particles: 0 },
  3: { shape: "flame", core: 30, glowLayers: 1, particles: 0 },
  4: { shape: "flame", core: 34, glowLayers: 1, particles: 1 },
  5: { shape: "orb",   core: 42, glowLayers: 2, particles: 1 },
  6: { shape: "orb",   core: 46, glowLayers: 2, particles: 3 },
  7: { shape: "orb",   core: 52, glowLayers: 3, particles: 5 },
};

const PALETTE: Record<GuardianGlowColor, { core: string; rgb: string }> = {
  rose:     { core: "#fb7185", rgb: "244,63,94" },
  graphite: { core: "#94a3b8", rgb: "100,116,139" },
};

function rgba(rgb: string, a: number) {
  return `rgba(${rgb},${a})`;
}

export interface GuardianProps {
  level: number;                  // 1-7, ver journeyLevels.ts
  glowColor?: GuardianGlowColor;  // personalização, ver guardian_state
  ringUnlocked?: boolean;         // personalização ou automático no nível 7
  size?: number;                  // px do contentor quadrado
  className?: string;
}

export function Guardian({ level, glowColor = "rose", ringUnlocked = false, size = 96, className }: GuardianProps) {
  const stage = STAGES[Math.min(7, Math.max(1, level))];
  const color = PALETTE[glowColor];
  const scale = size / 96;
  const showRing = ringUnlocked || level >= 7;
  const coreSize = stage.core * scale;

  const particleAngles = Array.from({ length: stage.particles }, (_, i) => i * (360 / stage.particles));

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      {showRing && (
        <div
          className="absolute rounded-full"
          style={{ inset: size * 0.1, border: `1px solid ${rgba(color.rgb, 0.35)}` }}
        />
      )}

      {stage.glowLayers >= 3 && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-glow-pulse"
          style={{
            width: coreSize * 1.9,
            height: coreSize * 1.9,
            background: `radial-gradient(circle, ${rgba(color.rgb, 0.18)} 0%, transparent 70%)`,
            filter: "blur(3px)",
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
              width: 3 * scale,
              height: 3 * scale,
              marginLeft: -1.5 * scale,
              background: color.core,
              boxShadow: `0 0 4px ${rgba(color.rgb, 0.8)}`,
            }}
          />
        </div>
      ))}

      <div
        className={cn(
          "absolute left-1/2 top-1/2",
          stage.shape === "point" && "rounded-full animate-guardian-point-pulse",
          stage.shape === "flame" && "animate-guardian-flame-flicker",
          stage.shape === "orb" && "rounded-full animate-glow-pulse",
        )}
        style={{
          width: coreSize,
          height: coreSize,
          transform: stage.shape === "orb" ? "translate(-50%, -50%)" : undefined,
          background: stage.shape === "point" ? color.core : `radial-gradient(circle at 50% 35%, ${color.core} 0%, ${rgba(color.rgb, 0)} 75%)`,
          borderRadius: stage.shape === "flame" ? "50% 50% 50% 50% / 65% 65% 40% 40%" : "50%",
          opacity: stage.shape === "point" ? 0.5 : 1,
          boxShadow: stage.glowLayers > 0
            ? `0 0 ${10 + stage.glowLayers * 8}px ${4 + stage.glowLayers * 3}px ${rgba(color.rgb, 0.12 + stage.glowLayers * 0.08)}`
            : "none",
        }}
      />
    </div>
  );
}

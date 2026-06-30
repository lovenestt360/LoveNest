import { useRef } from "react";
import { cn } from "@/lib/utils";

// O Guardião — mascote SVG que evolui nos 7 níveis da Jornada.
// Inspirado nos personagens de chama fofinhos (estilo Duolingo): corpo
// em gota/chama, olhos grandes com brilho, expressão que cresce com o nível.

// "rose" = cor automática que evolui com o nível (default);
// "graphite" = skin fixa comprável na loja, ignora o nível.
export type GuardianGlowColor = "rose" | "graphite";

export interface GuardianProps {
  level: number;                 // 1-7, ver journeyLevels.ts
  glowColor?: GuardianGlowColor; // "rose" = automático por nível, "graphite" = skin fixa
  ringUnlocked?: boolean;        // anel desbloqueado na loja ou nível 7
  ringEnabled?: boolean;         // interruptor on/off após desbloqueio
  size?: number;                 // px do contentor quadrado
  className?: string;
}

// Progressão automática de cor por nível (estilo "selos de sequência"):
// vermelho → rosa → fúcsia → roxo conforme sobe de nível. Mantém-se sempre
// dentro da família rose/red/pink/purple — nunca amarelo/amber (regra do
// projeto) — para não se confundir com o aviso/streak-risk em laranja.
const LEVEL_PALETTE: Record<number, { light: string; core: string; dark: string; rgb: string }> = {
  1: { light: "#fda4af", core: "#fb7185", dark: "#9f1239", rgb: "251,113,133" },
  2: { light: "#fb7185", core: "#f43f5e", dark: "#881337", rgb: "244,63,94"  },
  3: { light: "#f87171", core: "#ef4444", dark: "#7f1d1d", rgb: "239,68,68"  },
  4: { light: "#f9a8d4", core: "#db2777", dark: "#831843", rgb: "219,39,119" },
  5: { light: "#e879f9", core: "#c026d3", dark: "#701a75", rgb: "192,38,211" },
  6: { light: "#c084fc", core: "#9333ea", dark: "#581c87", rgb: "147,51,234" },
  7: { light: "#a78bfa", core: "#7c3aed", dark: "#4c1d95", rgb: "124,58,237" },
};

// "graphite" é uma skin fixa comprável na loja — substitui a progressão
// automática por um tom monocromático, independente do nível.
const GRAPHITE_PALETTE = { light: "#e2e8f0", core: "#64748b", dark: "#0f172a", rgb: "71,85,105" } as const;

interface Stage {
  scale: number;
  face: "none" | "sleeping" | "cute" | "happy" | "ecstatic";
  arms: boolean;
  armAngle: number;   // graus; positivo = braço levantado
  particles: number;
  aura: boolean;
  crown: boolean;
  doubleTip: boolean; // duas pontas de chama no topo (vs uma)
}

const STAGES: Record<number, Stage> = {
  1: { scale: 0.34, face: "sleeping", arms: false, armAngle: 0,  particles: 0, aura: false, crown: false, doubleTip: false },
  2: { scale: 0.50, face: "sleeping", arms: false, armAngle: 0,  particles: 0, aura: false, crown: false, doubleTip: false },
  3: { scale: 0.62, face: "cute",     arms: false, armAngle: 0,  particles: 0, aura: false, crown: false, doubleTip: true  },
  4: { scale: 0.74, face: "cute",     arms: true,  armAngle: 22, particles: 3, aura: false, crown: false, doubleTip: true  },
  5: { scale: 0.85, face: "happy",    arms: true,  armAngle: 40, particles: 3, aura: false, crown: false, doubleTip: true  },
  6: { scale: 0.93, face: "happy",    arms: true,  armAngle: 55, particles: 5, aura: true,  crown: false, doubleTip: true  },
  7: { scale: 1.00, face: "ecstatic", arms: true,  armAngle: 70, particles: 8, aura: true,  crown: true,  doubleTip: true  },
};

// Corpo da chama em espaço de coordenadas 100×100
// Uma ponta: clássico teardrop / chama simples (estágios iniciais)
const PATH_1TIP = "M 50 90 C 29 90 15 76 15 60 C 15 42 25 28 34 21 C 29 11 33 2 50 8 C 67 2 71 11 66 21 C 75 28 85 42 85 60 C 85 76 71 90 50 90 Z";
// Duas pontas: chama expressiva com "cabelo" duplo (estágios 3-7)
const PATH_2TIP = "M 50 90 C 29 90 15 78 15 62 C 15 46 23 34 31 26 C 25 17 27 5 35 10 C 37 2 44 -1 50 7 C 56 -1 63 2 65 10 C 73 5 75 17 69 26 C 77 34 85 46 85 62 C 85 78 71 90 50 90 Z";

function rgba(rgb: string, a: number) { return `rgba(${rgb},${a})`; }

export function Guardian({
  level,
  glowColor = "rose",
  ringUnlocked = false,
  ringEnabled = true,
  size = 96,
  className,
}: GuardianProps) {
  // ID único por instância para isolar gradientes SVG no mesmo documento
  const uid = useRef(`g${Math.random().toString(36).slice(2, 7)}`).current;
  const lvl  = Math.min(7, Math.max(1, level));
  const stg  = STAGES[lvl];
  const pal  = glowColor === "graphite" ? GRAPHITE_PALETTE : LEVEL_PALETTE[lvl];
  const showRing = (ringUnlocked || level >= 7) && ringEnabled;

  const s = stg.scale;
  const t = +(50 * (1 - s)).toFixed(2); // translação para centrar na viewport

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Aura difusa por trás do personagem */}
      {stg.aura && (
        <div
          className="absolute inset-0 rounded-full animate-glow-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${rgba(pal.rgb, 0.28)} 0%, transparent 68%)`,
            filter: "blur(5px)",
          }}
        />
      )}

      {/* Personagem SVG */}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={cn("absolute inset-0", level >= 3 && "animate-flame-breathe")}
        style={{
          overflow: "visible",
          filter: `drop-shadow(0 0 ${Math.round(size * (stg.aura ? 0.09 : 0.04))}px ${rgba(pal.rgb, stg.aura ? 0.55 : 0.28)})`,
        }}
      >
        <defs>
          {/* Gradiente do corpo — brilho de cima-esquerda, escurece em baixo */}
          <radialGradient id={`${uid}-b`} cx="38%" cy="28%" r="70%">
            <stop offset="0%"   stopColor={pal.light} />
            <stop offset="45%"  stopColor={pal.core}  />
            <stop offset="100%" stopColor={pal.dark}  />
          </radialGradient>
          {/* Gradiente da íris dos olhos */}
          <radialGradient id={`${uid}-i`} cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor={pal.light} stopOpacity="0.55" />
            <stop offset="100%" stopColor={pal.core}  />
          </radialGradient>
        </defs>

        {/* Grupo escalado e centrado */}
        <g transform={`translate(${t},${t}) scale(${s})`}>

          {/* Pernas / pés — curtos, espreitam por baixo da ponta do corpo */}
          <ellipse cx="44" cy="89" rx="4.5" ry="3.5" fill={pal.dark} />
          <ellipse cx="56" cy="89" rx="4.5" ry="3.5" fill={pal.dark} />

          {/* Braços — desenhados antes do corpo para o corpo cobrir a base; mãozinha na ponta */}
          {stg.arms && (
            <>
              {/* Braço esquerdo: rotate positivo levanta a ponta exterior */}
              <g transform={`rotate(${stg.armAngle},10,65)`}>
                <ellipse cx="10" cy="65" rx="9" ry="5" fill={`url(#${uid}-b)`} />
                <circle cx="2" cy="65" r="3.3" fill={pal.core} />
              </g>
              {/* Braço direito: rotate negativo levanta a ponta exterior */}
              <g transform={`rotate(${-stg.armAngle},90,65)`}>
                <ellipse cx="90" cy="65" rx="9" ry="5" fill={`url(#${uid}-b)`} />
                <circle cx="98" cy="65" r="3.3" fill={pal.core} />
              </g>
            </>
          )}

          {/* Corpo principal */}
          <path d={stg.doubleTip ? PATH_2TIP : PATH_1TIP} fill={`url(#${uid}-b)`} />

          {/* Brilho glossy no canto superior esquerdo do corpo */}
          <ellipse
            cx="37" cy="44" rx="10" ry="7"
            fill="white" opacity="0.18"
            transform="rotate(-22,37,44)"
          />

          {/* Rosto */}
          {stg.face !== "none" && (
            <>
              {/* Sobrancelhas — finas e bem acima dos olhos, não os sufocam */}
              {stg.face === "sleeping" ? (
                <>
                  <path d="M 20 42 Q 33 37 46 41" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 54 41 Q 67 37 80 42" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : stg.face === "cute" ? (
                <>
                  <path d="M 19 41 Q 33 34 47 39" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 53 39 Q 67 34 81 41" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : stg.face === "happy" ? (
                <>
                  <path d="M 18 39 Q 33 31 48 37" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                  <path d="M 52 37 Q 67 31 82 39" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                </>
              ) : stg.face === "ecstatic" ? (
                <>
                  <path d="M 16 37 Q 33 27 49 35" stroke={pal.dark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                  <path d="M 51 35 Q 67 27 84 37" stroke={pal.dark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                </>
              ) : null}

              {/* Branco dos olhos — mais afastados, com "testa" visível por cima */}
              <circle cx="33" cy="58" r="11" fill="white" />
              <circle cx="67" cy="58" r="11" fill="white" />

              {stg.face === "sleeping" ? (
                /* Olhos fechados — arcos simples */
                <>
                  <path d="M 22 58 Q 33 65 44 58" stroke={pal.core} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M 56 58 Q 67 65 78 58" stroke={pal.core} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </>
              ) : (
                /* Olhos abertos: íris + pupila + brilhos */
                <>
                  <circle cx="33" cy="59" r="7.5" fill={`url(#${uid}-i)`} />
                  <circle cx="67" cy="59" r="7.5" fill={`url(#${uid}-i)`} />
                  <circle cx="34" cy="60" r="4.6" fill="#0f172a" />
                  <circle cx="66" cy="60" r="4.6" fill="#0f172a" />
                  {/* Brilho principal */}
                  <circle cx="37" cy="55" r="2.3" fill="white" />
                  <circle cx="63" cy="55" r="2.3" fill="white" />
                  {/* Brilho secundário menor */}
                  <circle cx="30" cy="63" r="1.2" fill="white" opacity="0.6" />
                  <circle cx="70" cy="63" r="1.2" fill="white" opacity="0.6" />
                </>
              )}

              {/* Boca — varia com a expressão */}
              {stg.face === "cute" && (
                <path d="M 41 72 Q 50 79 59 72"
                  stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              )}
              {stg.face === "happy" && (
                <path d="M 38 72 Q 50 83 62 72"
                  stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              )}
              {stg.face === "ecstatic" && (
                <>
                  <path d="M 36 73 Q 50 87 64 73"
                    stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                  {/* Bochechas rosadas */}
                  <ellipse cx="21" cy="67" rx="7" ry="4" fill={pal.core} opacity="0.36" />
                  <ellipse cx="79" cy="67" rx="7" ry="4" fill={pal.core} opacity="0.36" />
                </>
              )}
            </>
          )}

          {/* Coroa de cristais (estágio 7) */}
          {stg.crown && (
            <>
              <ellipse cx="36" cy="3"  rx="3.5" ry="5.5" fill={pal.light} opacity="0.92" />
              <ellipse cx="50" cy="-1" rx="4"   ry="6.5" fill={pal.light} opacity="0.96" />
              <ellipse cx="64" cy="3"  rx="3.5" ry="5.5" fill={pal.light} opacity="0.92" />
            </>
          )}
        </g>
      </svg>

      {/* Anel ornamental */}
      {showRing && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ inset: size * 0.07, border: `1.5px solid ${rgba(pal.rgb, 0.48)}` }}
        />
      )}

      {/* Partículas em órbita */}
      {Array.from({ length: stg.particles }, (_, i) => {
        const pSize = Math.max(size * 0.055, 2.5);
        return (
          <div
            key={i}
            className="absolute inset-0 animate-guardian-orbit pointer-events-none"
            style={{
              animationDuration: `${9 + i * 1.7}s`,
              transform: `rotate(${i * (360 / stg.particles)}deg)`,
            }}
          >
            <span
              className="absolute rounded-full"
              style={{
                top: size * 0.03,
                left: "50%",
                width: pSize,
                height: pSize,
                marginLeft: -pSize / 2,
                background: pal.light,
                boxShadow: `0 0 5px 2px ${rgba(pal.rgb, 0.85)}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

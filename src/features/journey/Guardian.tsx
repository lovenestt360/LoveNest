import { useRef } from "react";
import { cn } from "@/lib/utils";

// O Guardião — mascote SVG que evolui nos 7 níveis da Jornada.
// Réplica próxima da referência visual (corpo-chama com braços/pernas,
// acessórios por fase: escudo, cauda, capa+coroa, joia+arco-íris).

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

// Progressão automática de cor por nível. Evita amarelo/amber puro (regra
// do projeto) — onde a referência usa laranja/dourado, usamos tons
// vermelho-coral e magenta-rosado equivalentes em "preciosidade".
const LEVEL_PALETTE: Record<number, { light: string; core: string; dark: string; rgb: string }> = {
  1: { light: "#fecdd3", core: "#fb7185", dark: "#9f1239", rgb: "251,113,133" }, // Início — coral suave
  2: { light: "#fda4af", core: "#e11d48", dark: "#881337", rgb: "225,29,72"  }, // Faísca — vermelho vivo
  3: { light: "#5eead4", core: "#14b8a6", dark: "#134e4a", rgb: "20,184,166" }, // Brasa — turquesa
  4: { light: "#93c5fd", core: "#3b82f6", dark: "#1e3a8a", rgb: "59,130,246" }, // Chama — azul
  5: { light: "#d8b4fe", core: "#9333ea", dark: "#581c87", rgb: "147,51,234" }, // Chama Viva — roxo
  6: { light: "#f5d0fe", core: "#d946ef", dark: "#701a75", rgb: "217,70,239" }, // Farol — magenta real
  7: { light: "#c4b5fd", core: "#8b5cf6", dark: "#4c1d95", rgb: "139,92,246" }, // Eternidade — arco-íris
};

// "graphite" é uma skin fixa comprável na loja — substitui a progressão
// automática por um tom monocromático, independente do nível.
const GRAPHITE_PALETTE = { light: "#e2e8f0", core: "#64748b", dark: "#0f172a", rgb: "71,85,105" } as const;

interface Stage {
  scale: number;
  face: "newborn" | "happy" | "confident" | "ecstatic";
  arms: boolean;
  legs: boolean;
  armAngle: number;   // graus; positivo = braço levantado
  particles: number;
  aura: boolean;
  crown: boolean;
  cape: boolean;
  shield: boolean;
  tail: boolean;
  gem: boolean;
  rainbow: boolean;
  doubleTip: boolean; // duas pontas de chama no topo (vs uma)
}

const STAGES: Record<number, Stage> = {
  1: { scale: 0.32, face: "newborn",   arms: false, legs: false, armAngle: 0,  particles: 0, aura: false, crown: false, cape: false, shield: false, tail: false, gem: false, rainbow: false, doubleTip: false },
  2: { scale: 0.48, face: "happy",     arms: true,  legs: true,  armAngle: 16, particles: 0, aura: false, crown: false, cape: false, shield: false, tail: false, gem: false, rainbow: false, doubleTip: true  },
  3: { scale: 0.60, face: "happy",     arms: true,  legs: true,  armAngle: 20, particles: 0, aura: false, crown: false, cape: false, shield: false, tail: false, gem: false, rainbow: false, doubleTip: true  },
  4: { scale: 0.72, face: "happy",     arms: true,  legs: true,  armAngle: 24, particles: 2, aura: false, crown: false, cape: false, shield: true,  tail: false, gem: false, rainbow: false, doubleTip: false },
  5: { scale: 0.83, face: "confident", arms: true,  legs: true,  armAngle: 12, particles: 3, aura: true,  crown: false, cape: false, shield: false, tail: true,  gem: false, rainbow: false, doubleTip: false },
  6: { scale: 0.92, face: "ecstatic",  arms: true,  legs: true,  armAngle: 35, particles: 5, aura: true,  crown: true,  cape: true,  shield: false, tail: false, gem: false, rainbow: false, doubleTip: false },
  7: { scale: 1.00, face: "ecstatic",  arms: true,  legs: true,  armAngle: 78, particles: 8, aura: true,  crown: false, cape: false, shield: false, tail: false, gem: true,  rainbow: true,  doubleTip: false },
};

// Corpo da chama em espaço de coordenadas 100×100
// Uma ponta: corpo liso, em gota (Início, Chama em diante)
const PATH_1TIP = "M 50 90 C 29 90 15 76 15 60 C 15 42 25 28 34 21 C 29 11 33 2 50 8 C 67 2 71 11 66 21 C 75 28 85 42 85 60 C 85 76 71 90 50 90 Z";
// Duas pontas: chama irregular com "orelhas" (Faísca, Brasa)
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
  const showRainbow = stg.rainbow && glowColor !== "graphite";

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
          {/* Gradiente arco-íris — só na fase 7 (Eternidade) */}
          <linearGradient id={`${uid}-rb`} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%"   stopColor="#fda4af" />
            <stop offset="35%"  stopColor="#c084fc" />
            <stop offset="70%"  stopColor="#818cf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Grupo escalado e centrado */}
        <g transform={`translate(${t},${t}) scale(${s})`}>

          {/* Pernas — capsulas curtas com pezinhos, atrás do corpo */}
          {stg.legs && (
            <>
              <g transform="translate(40,80)">
                <rect x="-5" y="0" width="10" height="16" rx="5" fill={`url(#${uid}-b)`} />
                <ellipse cx="0" cy="17" rx="6" ry="4" fill={pal.dark} />
              </g>
              <g transform="translate(60,80)">
                <rect x="-5" y="0" width="10" height="16" rx="5" fill={`url(#${uid}-b)`} />
                <ellipse cx="0" cy="17" rx="6" ry="4" fill={pal.dark} />
              </g>
            </>
          )}

          {/* Cauda de chama (Chama Viva) — atrás do corpo */}
          {stg.tail && (
            <path d="M 80 68 Q 97 63 95 78 Q 88 75 80 77 Z" fill={`url(#${uid}-b)`} />
          )}

          {/* Capa (Farol) — atrás do corpo, sai por trás dos "ombros" */}
          {stg.cape && (
            <>
              <path d="M 28 30 Q 6 52 14 84 Q 24 75 30 58 Z" fill={pal.dark} opacity="0.85" />
              <path d="M 72 30 Q 94 52 86 84 Q 76 75 70 58 Z" fill={pal.dark} opacity="0.85" />
            </>
          )}

          {/* Braços — capsulas com mãozinha na ponta, atrás do corpo */}
          {stg.arms && (
            <>
              <g transform={`translate(14,56) rotate(${stg.armAngle})`}>
                <rect x="-5" y="-2" width="10" height="22" rx="5" fill={`url(#${uid}-b)`} />
                <circle cx="0" cy="21" r="4.2" fill={pal.core} />
              </g>
              <g transform={`translate(86,56) rotate(${-stg.armAngle})`}>
                <rect x="-5" y="-2" width="10" height="22" rx="5" fill={`url(#${uid}-b)`} />
                <circle cx="0" cy="21" r="4.2" fill={pal.core} />
              </g>
            </>
          )}

          {/* Corpo principal */}
          <path d={stg.doubleTip ? PATH_2TIP : PATH_1TIP} fill={showRainbow ? `url(#${uid}-rb)` : `url(#${uid}-b)`} />

          {/* Brilho glossy no canto superior esquerdo do corpo */}
          <ellipse
            cx="37" cy="44" rx="10" ry="7"
            fill="white" opacity="0.18"
            transform="rotate(-22,37,44)"
          />

          {/* Rosto */}
          {stg.face === "newborn" ? (
            /* Recém-nascido: só dois pontinhos, sem sobrancelhas nem boca */
            <>
              <circle cx="41" cy="58" r="2.8" fill={pal.dark} />
              <circle cx="59" cy="58" r="2.8" fill={pal.dark} />
            </>
          ) : (
            <>
              {/* Sobrancelhas — finas e bem acima dos olhos, não os sufocam */}
              {stg.face === "happy" ? (
                <>
                  <path d="M 18 39 Q 33 31 48 37" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                  <path d="M 52 37 Q 67 31 82 39" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                </>
              ) : stg.face === "confident" ? (
                /* Uma sobrancelha mais alta — ar confiante/sereno */
                <>
                  <path d="M 19 41 Q 33 35 47 39" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 53 33 Q 67 24 83 32" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M 16 37 Q 33 27 49 35" stroke={pal.dark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                  <path d="M 51 35 Q 67 27 84 37" stroke={pal.dark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* Branco dos olhos — afastados, com "testa" visível por cima */}
              <circle cx="33" cy="58" r="11" fill="white" />
              <circle cx="67" cy="58" r="11" fill="white" />

              {/* Íris + pupila + brilhos */}
              <circle cx="33" cy="59" r="7.5" fill={`url(#${uid}-i)`} />
              <circle cx="67" cy="59" r="7.5" fill={`url(#${uid}-i)`} />
              <circle cx="34" cy="60" r="4.6" fill="#0f172a" />
              <circle cx="66" cy="60" r="4.6" fill="#0f172a" />
              <circle cx="37" cy="55" r="2.3" fill="white" />
              <circle cx="63" cy="55" r="2.3" fill="white" />
              <circle cx="30" cy="63" r="1.2" fill="white" opacity="0.6" />
              <circle cx="70" cy="63" r="1.2" fill="white" opacity="0.6" />

              {/* Pálpebra semicerrada no olho direito — ar confiante */}
              {stg.face === "confident" && (
                <path d="M 56 51 Q 67 46 78 51 L 78 55 Q 67 50 56 55 Z" fill={pal.core} />
              )}

              {/* Boca — varia com a expressão */}
              {stg.face === "happy" && (
                <path d="M 38 72 Q 50 83 62 72"
                  stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              )}
              {stg.face === "confident" && (
                <path d="M 40 73 Q 52 79 61 70"
                  stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" />
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

          {/* Escudo (Chama) — segurado junto à mão esquerda */}
          {stg.shield && (
            <g transform="translate(10,74)">
              <path d="M0 -10 L9 -13 L9 -1 Q9 9 0 14 Q-9 9 -9 -1 L-9 -13 Z" fill={pal.light} stroke={pal.dark} strokeWidth="1.6" />
              <path d="M0 -8 L0 10" stroke={pal.dark} strokeWidth="1.2" />
            </g>
          )}

          {/* Joia no peito (Eternidade) */}
          {stg.gem && (
            <rect x="46" y="64" width="8" height="8" fill="white" opacity="0.92" transform="rotate(45,50,68)" />
          )}

          {/* Coroa de cristais (Farol) */}
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

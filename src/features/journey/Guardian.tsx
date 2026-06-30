import { useRef } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// O Guardião — mascote SVG que evolui nos 7 níveis da Jornada.
// Réplica fiel ao infográfico de referência: corpo-gota simples e fofo,
// braços/pernas curtos da mesma cor do corpo, acessórios por fase
// (escudo, cauda, coroa+capa, arco-íris). Cor 100% automática por nível.

export interface GuardianProps {
  level: number;          // 1-7, ver journeyLevels.ts
  size?: number;          // px do contentor quadrado
  uniformScale?: boolean; // ignora a escala progressiva por nível (ex: ícone do card da Home, onde todos devem parecer do mesmo tamanho)
  className?: string;
}

// Progressão automática de cor por nível, igual ao infográfico de
// referência (rosa → laranja → turquesa → azul → roxo → dourado → arco-íris).
const LEVEL_PALETTE: Record<number, { light: string; core: string; dark: string; rgb: string }> = {
  1: { light: "#fecdd3", core: "#fb7185", dark: "#be123c", rgb: "251,113,133" }, // rosa
  2: { light: "#fed7aa", core: "#fb923c", dark: "#c2410c", rgb: "251,146,60"  }, // laranja
  3: { light: "#99f6e4", core: "#2dd4bf", dark: "#0f766e", rgb: "45,212,191"  }, // turquesa
  4: { light: "#bfdbfe", core: "#3b82f6", dark: "#1e40af", rgb: "59,130,246"  }, // azul
  5: { light: "#ddd6fe", core: "#8b5cf6", dark: "#5b21b6", rgb: "139,92,246"  }, // roxo
  6: { light: "#fef08a", core: "#facc15", dark: "#a16207", rgb: "250,204,21"  }, // dourado
  7: { light: "#fbcfe8", core: "#ec4899", dark: "#831843", rgb: "236,72,153"  }, // base p/ arco-íris
};

interface Stage {
  scale: number;
  face: "newborn" | "happy" | "curious" | "confident" | "ecstatic";
  limbs: boolean;
  armAngle: number;   // graus; positivo = braço levantado
  particles: number;
  heartParticle: boolean; // partículas em forma de coração, em vez de pontos
  aura: boolean;
  crown: boolean;
  cape: boolean;
  shield: boolean;
  tail: boolean;
  rainbow: boolean;
}

const STAGES: Record<number, Stage> = {
  1: { scale: 0.50, face: "newborn",   limbs: false, armAngle: 0,  particles: 1, heartParticle: true,  aura: true,  crown: false, cape: false, shield: false, tail: false, rainbow: false },
  2: { scale: 0.60, face: "happy",     limbs: true,  armAngle: 18, particles: 1, heartParticle: true,  aura: false, crown: false, cape: false, shield: false, tail: false, rainbow: false },
  3: { scale: 0.69, face: "curious",   limbs: true,  armAngle: 18, particles: 2, heartParticle: false, aura: true,  crown: false, cape: false, shield: false, tail: false, rainbow: false },
  4: { scale: 0.78, face: "happy",     limbs: true,  armAngle: 14, particles: 2, heartParticle: false, aura: false, crown: false, cape: false, shield: true,  tail: false, rainbow: false },
  5: { scale: 0.86, face: "confident", limbs: true,  armAngle: 10, particles: 3, heartParticle: false, aura: true,  crown: false, cape: false, shield: false, tail: true,  rainbow: false },
  6: { scale: 0.93, face: "ecstatic",  limbs: true,  armAngle: 30, particles: 5, heartParticle: false, aura: true,  crown: true,  cape: true,  shield: false, tail: false, rainbow: false },
  7: { scale: 1.00, face: "ecstatic",  limbs: true,  armAngle: 80, particles: 8, heartParticle: false, aura: true,  crown: false, cape: false, shield: false, tail: false, rainbow: true  },
};

// Corpo em gota simples e arredondado — igual em todas as fases,
// só a escala e a cor mudam (como na referência).
const BODY_PATH = "M 50 92 C 27 92 12 76 12 58 C 12 39 24 22 50 6 C 76 22 88 39 88 58 C 88 76 73 92 50 92 Z";

function rgba(rgb: string, a: number) { return `rgba(${rgb},${a})`; }

export function Guardian({ level, size = 96, uniformScale = false, className }: GuardianProps) {
  // ID único por instância para isolar gradientes SVG no mesmo documento
  const uid = useRef(`g${Math.random().toString(36).slice(2, 7)}`).current;
  const lvl  = Math.min(7, Math.max(1, level));
  const stg  = STAGES[lvl];
  const pal  = LEVEL_PALETTE[lvl];
  const showRainbow = stg.rainbow;

  // Em contextos como o ícone do card da Home, todas as fases devem
  // parecer do mesmo tamanho — a escala progressiva fica só para a Jornada.
  const s = uniformScale ? 0.92 : stg.scale;
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
          {/* Gradiente arco-íris — só na fase 7 (Lendário) */}
          <linearGradient id={`${uid}-rb`} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%"   stopColor="#fda4af" />
            <stop offset="30%"  stopColor="#fb923c" />
            <stop offset="55%"  stopColor="#5eead4" />
            <stop offset="78%"  stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* Grupo escalado e centrado */}
        <g transform={`translate(${t},${t}) scale(${s})`}>

          {/* Cauda de chama (Sentinela) — atrás do corpo */}
          {stg.tail && (
            <path d="M 78 66 Q 96 60 94 76 Q 86 73 78 75 Z" fill={`url(#${uid}-b)`} />
          )}

          {/* Capa (Eterno) — atrás do corpo, em vermelho contrastante */}
          {stg.cape && (
            <>
              <path d="M 30 28 Q 8 50 16 84 Q 26 74 31 56 Z" fill="#be123c" opacity="0.88" />
              <path d="M 70 28 Q 92 50 84 84 Q 74 74 69 56 Z" fill="#be123c" opacity="0.88" />
            </>
          )}

          {/* Pernas — curtas, mesma cor do corpo, presas por baixo */}
          {stg.limbs && (
            <>
              <ellipse cx="40" cy="86" rx="7" ry="9" fill={`url(#${uid}-b)`} />
              <ellipse cx="60" cy="86" rx="7" ry="9" fill={`url(#${uid}-b)`} />
            </>
          )}

          {/* Braços — curtos, mesma cor do corpo, saem dos lados */}
          {stg.limbs && (
            <>
              <g transform={`rotate(${stg.armAngle},18,60)`}>
                <ellipse cx="18" cy="60" rx="8" ry="11" fill={`url(#${uid}-b)`} />
              </g>
              <g transform={`rotate(${-stg.armAngle},82,60)`}>
                <ellipse cx="82" cy="60" rx="8" ry="11" fill={`url(#${uid}-b)`} />
              </g>
            </>
          )}

          {/* Corpo principal — contorno subtil dá um acabamento "sticker" */}
          <path
            d={BODY_PATH}
            fill={showRainbow ? `url(#${uid}-rb)` : `url(#${uid}-b)`}
            stroke={pal.dark}
            strokeWidth="1.6"
            strokeOpacity="0.35"
          />

          {/* Brilho glossy no canto superior esquerdo do corpo */}
          <ellipse
            cx="35" cy="36" rx="13" ry="9"
            fill="white" opacity="0.30"
            transform="rotate(-22,35,36)"
          />
          <circle cx="31" cy="30" r="3.4" fill="white" opacity="0.55" />

          {/* Faísca de luz no topo — só na fase 1, dá vida ao recém-nascido */}
          {lvl === 1 && (
            <path d="M 50 -4 L 53 4 L 61 6 L 53 8 L 50 16 L 47 8 L 39 6 L 47 4 Z" fill={pal.light} opacity="0.85" />
          )}

          {/* Rosto */}
          {stg.face === "newborn" ? (
            /* Recém-nascido: olhinhos fechados e contentes + bochecha */
            <>
              <path d="M 27 56 Q 34 50 41 56" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
              <path d="M 59 56 Q 66 50 73 56" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
              <path d="M 42 66 Q 50 71 58 66" stroke={pal.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <ellipse cx="27" cy="63" rx="5" ry="3" fill={pal.core} opacity="0.4" />
              <ellipse cx="73" cy="63" rx="5" ry="3" fill={pal.core} opacity="0.4" />
            </>
          ) : (
            <>
              {/* Sobrancelha assimétrica — só na expressão confiante */}
              {stg.face === "confident" && (
                <path d="M 55 32 Q 67 23 81 30" stroke={pal.dark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
              )}

              {/* Sobrancelhas erguidas — expressão curiosa (Brasa) */}
              {stg.face === "curious" && (
                <>
                  <path d="M 18 38 Q 33 27 49 36" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 51 36 Q 67 27 82 38" stroke={pal.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* Branco dos olhos */}
              <circle cx="34" cy="56" r="12" fill="white" />
              <circle cx="66" cy="56" r="12" fill="white" />

              {/* Íris + pupila + brilhos */}
              <circle cx="34" cy="57" r="8.2" fill={`url(#${uid}-i)`} />
              <circle cx="66" cy="57" r="8.2" fill={`url(#${uid}-i)`} />
              <circle cx="35" cy="58" r="5" fill="#0f172a" />
              <circle cx="65" cy="58" r="5" fill="#0f172a" />
              <circle cx="37" cy="52.5" r="2.6" fill="white" />
              <circle cx="63" cy="52.5" r="2.6" fill="white" />
              <circle cx="31" cy="61" r="1.3" fill="white" opacity="0.6" />
              <circle cx="69" cy="61" r="1.3" fill="white" opacity="0.6" />

              {/* Pálpebra semicerrada no olho direito — ar confiante */}
              {stg.face === "confident" && (
                <path d="M 56 49 Q 66 42 80 49 L 80 54 Q 66 47 56 54 Z" fill={pal.core} />
              )}

              {/* Boca — varia com a expressão */}
              {stg.face === "happy" && (
                <path d="M 40 70 Q 50 79 60 70"
                  stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              )}
              {stg.face === "confident" && (
                <path d="M 42 71 Q 53 76 61 68"
                  stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              )}
              {stg.face === "curious" && (
                <ellipse cx="50" cy="72" rx="5.5" ry="6.5" fill="white" opacity="0.92" />
              )}
              {stg.face === "ecstatic" && (
                <>
                  <path d="M 38 70 Q 50 84 62 70"
                    stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                  {/* Bochechas rosadas */}
                  <ellipse cx="24" cy="65" rx="6.5" ry="4" fill={pal.dark} opacity="0.28" />
                  <ellipse cx="76" cy="65" rx="6.5" ry="4" fill={pal.dark} opacity="0.28" />
                </>
              )}
            </>
          )}

          {/* Escudo em coração (Guardião) — junto à mão esquerda */}
          {stg.shield && (
            <g transform="translate(16,68)">
              <path d="M0 -8 C-7 -14 -13 -7 -13 -1 C-13 7 -6 13 0 17 C6 13 13 7 13 -1 C13 -7 7 -14 0 -8 Z"
                fill={pal.light} stroke={pal.dark} strokeWidth="1.6" />
            </g>
          )}

          {/* Coroa (Eterno) */}
          {stg.crown && (
            <>
              <path d="M 38 4 L 42 -6 L 50 1 L 58 -6 L 62 4 Z" fill="#fde047" stroke="#a16207" strokeWidth="1" />
              <circle cx="50" cy="-3" r="2.2" fill="#fb7185" />
            </>
          )}
        </g>
      </svg>

      {/* Partículas em órbita — coração nas fases iniciais, ponto de luz depois */}
      {Array.from({ length: stg.particles }, (_, i) => {
        const pSize = stg.heartParticle ? Math.max(size * 0.16, 9) : Math.max(size * 0.055, 2.5);
        return (
          <div
            key={i}
            className="absolute inset-0 animate-guardian-orbit pointer-events-none"
            style={{
              animationDuration: `${9 + i * 1.7}s`,
              transform: `rotate(${i * (360 / stg.particles)}deg)`,
            }}
          >
            {stg.heartParticle ? (
              <Heart
                className="absolute"
                style={{
                  top: size * 0.01,
                  left: "50%",
                  width: pSize,
                  height: pSize,
                  marginLeft: -pSize / 2,
                  color: pal.core,
                  fill: pal.core,
                  filter: `drop-shadow(0 0 4px ${rgba(pal.rgb, 0.85)})`,
                }}
              />
            ) : (
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
            )}
          </div>
        );
      })}
    </div>
  );
}

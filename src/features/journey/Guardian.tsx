import { useRef } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// O Guardião — mascote de chama que evolui nos 7 níveis da Jornada.
// Anatomia em camadas (ver GUARDIAO_DA_CHAMA_SPEC.md secção 3), adaptada
// para SVG web: sombra do chão → corpo-chama (silhueta com lóbulos no
// topo) → brilho interno → rosto → bochechas → marca de coração no peito
// → membros (só a partir do Guardião) → acessórios → partículas.
// Os 7 níveis/nomes/pontos continuam os de journeyLevels.ts — esta spec
// serve só de referência visual, não de fonte de nomenclatura.

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
  limbs: boolean;      // braços/mãos + pernas — só a partir do Guardião (Nv4)
  armAngle: number;    // graus; positivo = braço levantado
  particles: number;
  heartParticle: boolean; // partículas em forma de coração, em vez de pontos
  heartMark: boolean;  // marca de coração no peito
  aura: boolean;
  crown: boolean;
  cape: boolean;
  shield: boolean;     // emblema de escudo (substitui a marca de coração simples)
  gem: boolean;        // joia no peito (substitui o coração na fase lendária)
  rainbow: boolean;
}

const STAGES: Record<number, Stage> = {
  1: { scale: 0.50, face: "newborn",   limbs: false, armAngle: 0,  particles: 1, heartParticle: true,  heartMark: false, aura: true,  crown: false, cape: false, shield: false, gem: false, rainbow: false },
  2: { scale: 0.62, face: "happy",     limbs: false, armAngle: 0,  particles: 1, heartParticle: true,  heartMark: true,  aura: true,  crown: false, cape: false, shield: false, gem: false, rainbow: false },
  3: { scale: 0.74, face: "curious",   limbs: false, armAngle: 0,  particles: 2, heartParticle: false, heartMark: true,  aura: true,  crown: false, cape: false, shield: false, gem: false, rainbow: false },
  4: { scale: 0.84, face: "happy",     limbs: true,  armAngle: 14, particles: 2, heartParticle: false, heartMark: true,  aura: true,  crown: false, cape: false, shield: false, gem: false, rainbow: false },
  5: { scale: 0.90, face: "confident", limbs: true,  armAngle: 10, particles: 3, heartParticle: false, heartMark: false, aura: true,  crown: false, cape: true,  shield: true,  gem: false, rainbow: false },
  6: { scale: 0.95, face: "ecstatic",  limbs: true,  armAngle: 30, particles: 5, heartParticle: false, heartMark: true,  aura: true,  crown: true,  cape: false, shield: false, gem: false, rainbow: false },
  7: { scale: 1.00, face: "ecstatic",  limbs: true,  armAngle: 80, particles: 8, heartParticle: false, heartMark: false, aura: true,  crown: false, cape: false, shield: false, gem: true,  rainbow: true  },
};

// Corpo em forma de chama — silhueta com 2 línguas de fogo no topo que se
// fundem num corpo arredondado em baixo (igual em todas as fases, só a
// escala e a cor mudam, como na referência).
const BODY_PATH = "M 50 4 C 54 14 58 20 56 28 C 64 22 70 28 68 38 C 80 42 90 56 90 70 C 90 88 72 96 50 96 C 28 96 10 88 10 70 C 10 56 20 42 32 38 C 30 28 36 22 44 28 C 42 20 46 14 50 4 Z";

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
            background: `radial-gradient(circle, ${rgba(pal.rgb, 0.20)} 0%, transparent 68%)`,
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
          filter: `drop-shadow(0 0 ${Math.round(size * (stg.aura ? 0.07 : 0.03))}px ${rgba(pal.rgb, stg.aura ? 0.42 : 0.22)})`,
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

          {/* Sombra do chão — elipse translúcida sob o personagem */}
          <ellipse cx="50" cy="97" rx="32" ry="7" fill={pal.dark} opacity="0.22" />

          {/* Capa (Sentinela) — atrás do corpo, em vermelho contrastante */}
          {stg.cape && (
            <>
              <path d="M 30 30 Q 8 52 16 86 Q 26 76 31 58 Z" fill="#be123c" opacity="0.88" />
              <path d="M 70 30 Q 92 52 84 86 Q 74 76 69 58 Z" fill="#be123c" opacity="0.88" />
            </>
          )}

          {/* Pernas — curtas, mesma cor do corpo, só a partir do Guardião */}
          {stg.limbs && (
            <>
              <ellipse cx="40" cy="88" rx="7" ry="9" fill={`url(#${uid}-b)`} />
              <ellipse cx="60" cy="88" rx="7" ry="9" fill={`url(#${uid}-b)`} />
            </>
          )}

          {/* Braços — curtos, mesma cor do corpo, só a partir do Guardião */}
          {stg.limbs && (
            <>
              <g transform={`rotate(${stg.armAngle},18,62)`}>
                <ellipse cx="18" cy="62" rx="8" ry="11" fill={`url(#${uid}-b)`} />
              </g>
              <g transform={`rotate(${-stg.armAngle},82,62)`}>
                <ellipse cx="82" cy="62" rx="8" ry="11" fill={`url(#${uid}-b)`} />
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

          {/* Brilho interno — núcleo translúcido mais claro, dá sensação de chama acesa */}
          <g transform="translate(50,58) scale(0.6) translate(-50,-58)">
            <path d={BODY_PATH} fill={pal.light} opacity="0.22" />
          </g>

          {/* Brilho glossy no canto superior esquerdo do corpo — mais forte na Faísca (Nv 2) */}
          <ellipse
            cx="35" cy="36" rx="13" ry="9"
            fill="white" opacity={lvl === 2 ? 0.42 : 0.30}
            transform="rotate(-22,35,36)"
          />
          <circle cx="31" cy="30" r={lvl === 2 ? 4.2 : 3.4} fill="white" opacity={lvl === 2 ? 0.7 : 0.55} />

          {/* Faísca de luz no topo — fase 1, dá vida ao recém-nascido */}
          {lvl === 1 && (
            <path d="M 50 -4 L 53 4 L 61 6 L 53 8 L 50 16 L 47 8 L 39 6 L 47 4 Z" fill={pal.light} opacity="0.85" />
          )}

          {/* Faíscas extra — fase 2 ("Faísca"), mais detalhe e brilho a saltar do corpo */}
          {lvl === 2 && (
            <>
              <path d="M 24 16 L 26 21 L 31 23 L 26 25 L 24 30 L 22 25 L 17 23 L 22 21 Z" fill={pal.light} opacity="0.9" />
              <path d="M 76 24 L 77.5 27.5 L 81 29 L 77.5 30.5 L 76 34 L 74.5 30.5 L 71 29 L 74.5 27.5 Z" fill={pal.light} opacity="0.8" />
              <circle cx="50" cy="8" r="2" fill={pal.light} opacity="0.85" />
            </>
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

          {/* Marca de coração no peito — surge a partir da Brasa (Nv 2) */}
          {stg.heartMark && (
            <path d="M 50 78 C 46 72 38 72 38 79 C 38 85 44 89 50 94 C 56 89 62 85 62 79 C 62 72 54 72 50 78 Z"
              fill="white" opacity="0.85" />
          )}

          {/* Emblema de escudo com coração — Sentinela (Nv 5) */}
          {stg.shield && (
            <g transform="translate(50,84)">
              <path d="M0 -14 C-11 -14 -16 -9 -16 -9 C-16 4 -9 14 0 20 C9 14 16 4 16 -9 C16 -9 11 -14 0 -14 Z"
                fill={pal.light} stroke={pal.dark} strokeWidth="1.6" opacity="0.95" />
              <path d="M0 -3 C-2 -6 -6 -6 -6 -2 C-6 1 -3 4 0 7 C3 4 6 1 6 -2 C6 -6 2 -6 0 -3 Z" fill={pal.dark} />
            </g>
          )}

          {/* Joia no peito — Lendário (Nv 7), substitui o coração */}
          {stg.gem && (
            <path d="M 50 76 L 59 84 L 50 94 L 41 84 Z" fill="white" opacity="0.9" stroke={pal.dark} strokeWidth="1" />
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

import { motion } from "framer-motion";
import type { FlameEnvironment, FlamePetProps } from "@/types/flame";

// O Guardião da Chama — GUARDIAO_DA_CHAMA_SPEC.md, Plano A (PNG + Framer
// Motion). O personagem de cada fase é uma imagem PNG final (arte pintada,
// fundo transparente) — o código nunca redesenha, só posiciona e anima a
// imagem como um todo. Camadas (secção 3): ambiente → aura/glow → sombra
// do chão → PNG do personagem → partículas.
//
// Prop extra fora da spec: `compact` — usa thumb PNGs (256px) e omite o
// fundo de ambiente, para contextos de ícone pequeno (ex: card da Home).

// ── Assets full (2048px) — ecrã de detalhe, Jornada, celebração ──────────
import flameFaisca    from "@/assets/flame/flame_01_faisca_full.png";
import flameBrasa     from "@/assets/flame/flame_02_brasa_full.png";
import flameChama     from "@/assets/flame/flame_03_chama_full.png";
import flameGuardiao  from "@/assets/flame/flame_04_guardiao_full.png";
import flameSentinela from "@/assets/flame/flame_05_sentinela_full.png";
import flameEterno    from "@/assets/flame/flame_06_eterno_full.png";
import flameSoberano  from "@/assets/flame/flame_07_soberano_full.png";

// ── Assets thumb (256px) — card da Home, listas, badges (spec 10.1.1) ────
import flameFaiscaT    from "@/assets/flame/flame_01_faisca_thumb.png";
import flameBrasaT     from "@/assets/flame/flame_02_brasa_thumb.png";
import flameChamaT     from "@/assets/flame/flame_03_chama_thumb.png";
import flameGuardiaoT  from "@/assets/flame/flame_04_guardiao_thumb.png";
import flameSentinelaT from "@/assets/flame/flame_05_sentinela_thumb.png";
import flameEternoT    from "@/assets/flame/flame_06_eterno_thumb.png";
import flameSoberanoT  from "@/assets/flame/flame_07_soberano_thumb.png";

const STAGE_ASSETS: Record<FlamePetProps["stage"], string> = {
  faisca: flameFaisca, brasa: flameBrasa, chama: flameChama,
  guardiao: flameGuardiao, sentinela: flameSentinela,
  eterno: flameEterno, soberano: flameSoberano,
};

const STAGE_THUMBS: Record<FlamePetProps["stage"], string> = {
  faisca: flameFaiscaT, brasa: flameBrasaT, chama: flameChamaT,
  guardiao: flameGuardiaoT, sentinela: flameSentinelaT,
  eterno: flameEternoT, soberano: flameSoberanoT,
};

// Cor por fase — GUARDIAO_DA_CHAMA_SPEC.md secção 2.
const STAGE_COLORS: Record<FlamePetProps["stage"], string> = {
  faisca: "#FF6B9D", brasa: "#FF8B3D", chama: "#2DD9C4",
  guardiao: "#3B82E5", sentinela: "#9B5DE5",
  eterno: "#FFC83D", soberano: "#9B5DE5",
};

const ENVIRONMENT_BG: Record<FlameEnvironment, string> = {
  suave:     "radial-gradient(circle at 50% 35%, #fff1eb 0%, #fde2e2 55%, #fde2e2 100%)",
  quente:    "radial-gradient(circle at 50% 35%, #ffd9b3 0%, #ff8b5e 55%, #e85d3d 100%)",
  romantico: "radial-gradient(circle at 50% 35%, #ffd9ec 0%, #f3a8e0 55%, #b985e8 100%)",
  noite:     "radial-gradient(circle at 50% 30%, #1e2a55 0%, #0b1330 60%, #060a1c 100%)",
  celebracao:"radial-gradient(circle at 50% 35%, #ffe27a 0%, #ff8bd1 45%, #7ad7ff 100%)",
};

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function Environment({ type, children }: { type: FlameEnvironment; children: React.ReactNode }) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ background: ENVIRONMENT_BG[type] }}
    >
      {children}
    </div>
  );
}

const PARTICLE_GLYPH: Record<NonNullable<FlamePetProps["personalization"]>["particleEffect"] & string, string> = {
  estrelas: "✦", coracoes: "♥", faiscas: "✧", confetti: "●",
};

function ParticleLayer({ effect, color }: { effect?: string; color: string }) {
  if (!effect) return null;
  const glyph = PARTICLE_GLYPH[effect as keyof typeof PARTICLE_GLYPH] ?? "✦";
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-sm"
          style={{ left: `${10 + ((i * 37) % 80)}%`, bottom: "18%", color }}
          animate={{ y: [0, -60, -100], opacity: [0, 1, 0] }}
          transition={{ duration: 3.2 + (i % 3) * 0.8, delay: (i % 4) * 0.6, repeat: Infinity, ease: "easeOut" }}
        >
          {glyph}
        </motion.span>
      ))}
    </div>
  );
}

// `compact` não é parte da FlamePetProps da spec — é um hint de renderização
// para contextos de ícone pequeno (card da Home, listas). Usa thumb PNGs e
// omite o fundo de ambiente para se integrar no fundo do elemento pai.
export function FlamePet({
  stage, environment, personalization, compact = false,
}: FlamePetProps & { compact?: boolean }) {
  const color = personalization?.auraColor ?? STAGE_COLORS[stage];
  const src   = compact ? STAGE_THUMBS[stage] : STAGE_ASSETS[stage];

  const inner = (
    <>
      {/* Aura/glow — pulsa suavemente (secção 10.4) */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: compact ? "80%" : "70%",
          height: compact ? "80%" : "70%",
          background: `radial-gradient(circle, ${rgba(color, compact ? 0.40 : 0.55)} 0%, transparent 70%)`,
          filter: `blur(${compact ? 6 : 12}px)`,
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sombra do chão — omitida no modo compacto */}
      {!compact && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: "38%", height: "8%", bottom: "8%",
            background: rgba(color, 0.35), filter: "blur(6px)" }}
        />
      )}

      {/* Personagem PNG — breathing + floating (secção 10.4) */}
      <motion.img
        src={src}
        alt={`Guardião da Chama — fase ${stage}`}
        className="relative w-3/4 h-3/4 object-contain select-none"
        draggable={false}
        animate={{ scale: [1, 1.03, 1], y: [0, compact ? -2 : -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Partículas — apenas no modo full (secção 8) */}
      {!compact && <ParticleLayer effect={personalization?.particleEffect} color={color} />}
    </>
  );

  if (compact) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {inner}
      </div>
    );
  }

  return <Environment type={environment}>{inner}</Environment>;
}

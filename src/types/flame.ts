// Tipos do Guardião da Chama — GUARDIAO_DA_CHAMA_SPEC.md secção 10.2.
// Abordagem PNG fixo por fase: `expression`/`mood` ficam prontos para o
// futuro, mas não têm efeito visual nesta primeira versão (Plano A).

export type FlameStage =
  | "faisca" | "brasa" | "chama" | "guardiao"
  | "sentinela" | "eterno" | "soberano";

export type FlameExpression =
  | "feliz" | "apaixonado" | "triste"
  | "surpreso" | "dormindo" | "empolgado";

export type FlameMood =
  | "alegre" | "animado" | "tranquilo"
  | "cansado" | "pensativo" | "empolgado" | "apaixonado";

export type FlameEvent =
  | "ganhaPontos" | "sobeDeNivel" | "chamaProtegida" | "perdeStreak";

export type FlameEnvironment =
  | "suave" | "quente" | "romantico" | "noite" | "celebracao";

export interface FlamePersonalization {
  auraColor?: string;
  particleEffect?: "estrelas" | "coracoes" | "faiscas" | "confetti";
}

export interface FlamePetProps {
  stage: FlameStage;
  mood: FlameMood;
  expression?: FlameExpression;
  environment: FlameEnvironment;
  personalization?: FlamePersonalization;
  onEvent?: (event: FlameEvent) => void;
}

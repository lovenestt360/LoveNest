import { useState } from "react";
import { FlamePet } from "@/components/FlamePet";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";
import type { FlameStage } from "@/types/flame";

// Página temporária de validação visual do Guardião da Chama (Plano A —
// PNG + Framer Motion). Mostra as 7 fases lado a lado. Não está ligada à
// navegação principal.

const STAGES: { stage: FlameStage; name: string; nivel: string }[] = [
  { stage: "faisca",    name: "Faísca",    nivel: "1–2" },
  { stage: "brasa",     name: "Brasa",     nivel: "3–6" },
  { stage: "chama",     name: "Chama",     nivel: "7–14" },
  { stage: "guardiao",  name: "Guardião",  nivel: "15–29" },
  { stage: "sentinela", name: "Sentinela", nivel: "30–49" },
  { stage: "eterno",    name: "Eterno",    nivel: "50–74" },
  { stage: "soberano",  name: "Soberano",  nivel: "75–100" },
];

const TEST_LEVELS = [
  { level: 2, newName: "Faísca",    prevName: "Início" },
  { level: 3, newName: "Brasa",     prevName: "Faísca" },
  { level: 4, newName: "Chama",     prevName: "Brasa" },
  { level: 5, newName: "Chama Viva",prevName: "Chama" },
  { level: 6, newName: "Farol",     prevName: "Chama Viva" },
  { level: 7, newName: "Eternidade",prevName: "Farol" },
];

export default function FlameDemo() {
  const [celebration, setCelebration] = useState<{ level: number; newName: string; prevName: string } | null>(null);

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-lg font-bold text-foreground">Preview — Guardião da Chama (Plano A, PNG)</h1>

        {/* ── Teste de celebração de evolução ── */}
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Teste — Animação de Evolução</p>
          <div className="flex flex-wrap gap-2">
            {TEST_LEVELS.map((t) => (
              <button
                key={t.level}
                onClick={() => setCelebration(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                {t.prevName} → {t.newName}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STAGES.map(({ stage, name, nivel }) => (
              <div key={stage} className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl overflow-hidden">
                  <FlamePet stage={stage} mood="alegre" environment="suave" />
                </div>
                <p className="text-[10px] text-center text-muted-foreground leading-tight">
                  {name}<br />Nv {nivel}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Ambientes — fase Guardião</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {(["suave", "quente", "romantico", "noite", "celebracao"] as const).map((env) => (
              <div key={env} className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl overflow-hidden">
                  <FlamePet stage="guardiao" mood="alegre" environment={env} />
                </div>
                <p className="text-[10px] text-center text-muted-foreground capitalize">{env}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Partículas — fase Sentinela</p>
          <div className="grid grid-cols-4 gap-4">
            {(["estrelas", "coracoes", "faiscas", "confetti"] as const).map((fx) => (
              <div key={fx} className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl overflow-hidden">
                  <FlamePet
                    stage="sentinela"
                    mood="alegre"
                    environment="suave"
                    personalization={{ particleEffect: fx }}
                  />
                </div>
                <p className="text-[10px] text-center text-muted-foreground capitalize">{fx}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LevelUpCelebration
        show={!!celebration}
        newLevel={celebration?.level ?? 2}
        newName={celebration?.newName ?? ""}
        prevName={celebration?.prevName ?? ""}
        onClose={() => setCelebration(null)}
      />
    </div>
  );
}

import { useState } from "react";
import { Guardian, type GuardianGlowColor } from "@/features/journey/Guardian";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// Página temporária de revisão visual — mostra todas as 7 fases do
// Guardião lado a lado, nas duas cores e com o anel ligado/desligado,
// para avaliação rápida em produção sem precisar subir de nível de
// verdade. Não está ligada à navegação principal.

const STAGE_NAMES: Record<number, string> = {
  1: "Faísca — Início",
  2: "Brasa",
  3: "Chama",
  4: "Chama Viva",
  5: "Guardião",
  6: "Elo Eterno",
  7: "Eternidade",
};

export default function GuardianPreview() {
  const { theme, setTheme } = useTheme();
  const [ringEnabled, setRingEnabled] = useState(true);
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Preview — Guardião (7 fases)</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRingEnabled((v) => !v)}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-muted text-foreground"
            >
              Anel: {ringEnabled ? "On" : "Off"}
            </button>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-muted text-foreground"
            >
              {isDark ? "Claro" : "Escuro"}
            </button>
          </div>
        </div>

        {(["rose", "graphite"] as GuardianGlowColor[]).map((color) => (
          <div key={color} className="glass-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">
              Brilho: {color === "rose" ? "Automático (por nível)" : "Grafite (fixo)"}
            </p>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                <div key={level} className={cn("flex flex-col items-center gap-2", level === 7 && "col-span-2")}>
                  <div className="flex items-center justify-center" style={{ height: 96 }}>
                    <Guardian
                      level={level}
                      glowColor={color}
                      ringUnlocked={level >= 5}
                      ringEnabled={ringEnabled}
                      size={level === 7 ? 88 : 64}
                    />
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground leading-tight">
                    Nv {level}<br />{STAGE_NAMES[level]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Tamanho real — card da Home (26px)</p>
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((level) => (
              <Guardian key={level} level={level} glowColor="rose" ringUnlocked={level >= 5} ringEnabled={ringEnabled} size={26} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

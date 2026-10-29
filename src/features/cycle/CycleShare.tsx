import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { CycleData } from "./useCycleData";
import { picked } from "./CycleSheet";
import { SubHeader } from "./cycleUi";

export type ShareLevel = "private" | "summary" | "summary_signals";

/** O que o par vê do ciclo: ela escolhe; nada é partilhado sem escolha dela. */
export function CycleShare({
  data, partnerName, onBack,
}: { data: CycleData; partnerName: string; onBack: () => void }) {
  const { profile, ensureProfile, reload } = data;
  const [level, setLevel] = useState<ShareLevel>((profile?.share_level as ShareLevel) ?? "private");
  const [saving, setSaving] = useState(false);
  // No início de frase ("O teu par vê…").
  const Name = partnerName.charAt(0).toUpperCase() + partnerName.slice(1);

  const options: { value: ShareLevel; title: string; text: string }[] = [
    { value: "private", title: "Nada", text: `${Name} vê só que preferes manter o ciclo privado.` },
    { value: "summary", title: "A fase e a previsão", text: "Em que fase estás e quando vem o período." },
    { value: "summary_signals", title: "Também como estou", text: `A fase, a previsão e se hoje estás com dores ou cansada, com dicas para ${partnerName} cuidar de ti.` },
  ];

  const choose = async (value: ShareLevel) => {
    if (value === level || saving) return;
    const prev = level;
    setLevel(value);
    setSaving(true);
    const p = await ensureProfile();
    const { error } = p ? await supabase.from("cycle_profiles").update({ share_level: value }).eq("id", p.id) : { error: true };
    setSaving(false);
    if (error) { setLevel(prev); return; }
    reload();
  };

  return (
    <div className="space-y-3.5">
      <SubHeader title={`Partilha com ${partnerName}`} onBack={onBack} />
      <p className="text-[13.5px] leading-snug text-muted-foreground">
        As tuas notas, a intimidade e o detalhe dos sintomas nunca são partilhados. Escolhe o resto.
      </p>

      <div role="radiogroup" className="space-y-2.5">
        {options.map((o) => {
          const on = level === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => choose(o.value)}
              className={cn("flex w-full items-start gap-3 rounded-[20px] border border-[#ECE8E3] bg-white p-3.5 text-left transition-[border-color,box-shadow] dark:border-border dark:bg-card", on && picked)}>
              <span className={cn("mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-[#CFCAC3] transition-all dark:border-border", on && "border-[6px] border-[#0B1324] dark:border-foreground")} />
              <span>
                <span className="block text-[14.5px] font-semibold tracking-[-0.01em] text-foreground">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{o.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="px-1 text-[12.5px] leading-snug text-muted-foreground">
        {level === "private"
          ? `${Name} não recebe avisos sobre o teu ciclo.`
          : `Quando marcas que o período começou ou terminou, ${partnerName} recebe um aviso.`}
      </p>

    </div>
  );
}

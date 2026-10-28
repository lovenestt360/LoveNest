import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { FeatureGlyph, type GlyphKind } from "@/features/home/FeatureIcon";

const PHASES: { kind: GlyphKind; label: string }[] = [
  { kind: "menstrual", label: "Período" },
  { kind: "folicular", label: "Folicular" },
  { kind: "ovulacao", label: "Ovulação" },
  { kind: "lutea", label: "Lútea" },
];

/** Entrada para o Centro de Conhecimento, no tema branco do Ciclo. */
export function KnowledgeCenterCard({ forPartner }: { forPartner?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/ciclo/conhecimento")}
      className="group w-full rounded-[24px] border border-[#ECE8E3] bg-white p-4 text-left transition-colors hover:bg-[#FBFAF8] active:scale-[0.99] dark:border-border dark:bg-card dark:hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {forPartner ? "Entende o ciclo dela" : "Aprende sobre o teu ciclo"}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            {forPartner
              ? "O que acontece em cada fase e como podes ajudar."
              : "Artigos curtos sobre cada fase, do período à ovulação."}
          </p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#ECE8E3] transition-transform group-hover:translate-x-0.5 dark:border-border">
          <ChevronRight className="h-4 w-4 text-foreground" />
        </span>
      </div>
      <div className="mt-3.5 grid grid-cols-4 gap-2">
        {PHASES.map((p) => (
          <span key={p.kind} className="flex flex-col items-center gap-1.5 rounded-[16px] bg-[#F7F5F2] py-2.5 text-[11.5px] font-medium text-[#3A4150] dark:bg-muted dark:text-foreground/75">
            <FeatureGlyph kind={p.kind} size={26} />
            {p.label}
          </span>
        ))}
      </div>
    </button>
  );
}

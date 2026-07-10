import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { IllustrationKnowledgeCenter } from "./illustrations";

export function KnowledgeCenterCard() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/ciclo/conhecimento")}
      className="w-full text-left rounded-[28px] overflow-hidden shadow-sm border border-rose-100/60 dark:border-rose-900/30 active:scale-[0.99] transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #fff1f2 60%, #ffe4e6 100%)",
      }}
    >
      <div className="dark:hidden flex items-center gap-0 min-h-[180px]">
        {/* Lado esquerdo */}
        <div className="flex-1 p-6 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">
            Centro de Conhecimento
          </p>
          <h2 className="text-[19px] font-bold text-gray-900 leading-snug">
            Aprende sobre o<br />teu ciclo
          </h2>
          <p className="text-[12px] text-gray-500 leading-relaxed max-w-[180px]">
            Menstruação, fertilidade, saúde íntima e muito mais.
          </p>
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[12px] font-semibold text-rose-500">Explorar</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400" strokeWidth={2.5} />
          </div>
        </div>
        {/* Ilustração */}
        <div className="pr-4 flex items-center justify-center self-stretch">
          <IllustrationKnowledgeCenter className="w-28 h-28 opacity-90" />
        </div>
      </div>

      {/* Dark mode variant */}
      <div
        className="hidden dark:flex items-center gap-0 min-h-[180px] rounded-[28px]"
        style={{ background: "linear-gradient(135deg, #1c1c1e 0%, #2a1520 60%, #3b1827 100%)" }}
      >
        <div className="flex-1 p-6 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">
            Centro de Conhecimento
          </p>
          <h2 className="text-[19px] font-bold text-white leading-snug">
            Aprende sobre o<br />teu ciclo
          </h2>
          <p className="text-[12px] text-gray-400 leading-relaxed max-w-[180px]">
            Menstruação, fertilidade, saúde íntima e muito mais.
          </p>
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[12px] font-semibold text-rose-400">Explorar</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400" strokeWidth={2.5} />
          </div>
        </div>
        <div className="pr-4 flex items-center justify-center self-stretch">
          <IllustrationKnowledgeCenter className="w-28 h-28 opacity-80" />
        </div>
      </div>
    </button>
  );
}

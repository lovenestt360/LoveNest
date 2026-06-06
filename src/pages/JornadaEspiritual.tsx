import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Flame, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import Prayer from "./Prayer";
import Fasting from "./Fasting";

type Tab = "oracao" | "jejum";

export default function JornadaEspiritual() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("tab") as Tab) ?? "oracao";
  const [tab, setTab] = useState<Tab>(initial);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  return (
    <section className="space-y-4 pb-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Jornada Espiritual</h1>
        <p className="text-sm text-muted-foreground">Oração e disciplina, juntos.</p>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#f5f5f5] rounded-xl p-1">
        <button
          onClick={() => switchTab("oracao")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.97]",
            tab === "oracao"
              ? "bg-white shadow-sm text-purple-600"
              : "text-muted-foreground"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          Oração
        </button>
        <button
          onClick={() => switchTab("jejum")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.97]",
            tab === "jejum"
              ? "bg-white shadow-sm text-orange-500"
              : "text-muted-foreground"
          )}
        >
          <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
          Jejum
        </button>
      </div>

      {/* Content */}
      {tab === "oracao" ? <Prayer hideHeader /> : <Fasting hideHeader />}
    </section>
  );
}

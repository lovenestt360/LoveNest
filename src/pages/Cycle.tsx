import { useState } from "react";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CyclePartnerView } from "@/features/cycle/CyclePartnerView";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Flower2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();
  const isPartner = data.isMale;

  const tabs = isPartner
    ? [{ id: "hoje", label: "Resumo" }, { id: "calendario", label: "Calendário" }]
    : [{ id: "hoje", label: "Hoje" }, { id: "calendario", label: "Calendário" }, { id: "historico", label: "Histórico" }];

  const [activeTab, setActiveTab] = useState("hoje");

  const handleReset = async () => {
    if (!user || !confirm("Apagar todos os dados do ciclo? Esta acção é irreversível.")) return;
    try {
      await supabase.from("daily_symptoms").delete().eq("user_id", user.id);
      await supabase.from("period_entries").delete().eq("user_id", user.id);
      await supabase.from("cycle_profiles").delete().eq("user_id", user.id);
      toast({ title: "Dados apagados" });
      data.reload();
    } catch (err: any) {
      toast({ title: "Erro ao apagar", description: err?.message, variant: "destructive" });
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-rose-300" />
      </div>
    );
  }

  return (
    <section className="space-y-5 pb-28">

      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Flower2 className="h-5 w-5 text-rose-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isPartner ? "Ciclo da Parceira" : "Ciclo"}
            </h1>
            <p className="text-sm text-[#717171]">
              {isPartner ? "Acompanha o ciclo da tua parceira." : "O teu rastreio menstrual privado."}
            </p>
          </div>
        </div>
        {isPartner && (
          <p className="text-[11px] font-medium text-rose-400 mt-2 px-1">
            Modo observador — apenas leitura
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
              activeTab === t.id ? "bg-white text-foreground shadow-sm" : "text-[#717171]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div key={activeTab + String(isPartner)}>
        {activeTab === "hoje" && (
          isPartner ? <CyclePartnerView data={data} /> : <CycleToday data={data} />
        )}
        {activeTab === "calendario" && <CycleCalendar data={data} />}
        {activeTab === "historico" && !isPartner && (
          <CycleHistory data={data} onReset={handleReset} />
        )}
      </div>
    </section>
  );
}

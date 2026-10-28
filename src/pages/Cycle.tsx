import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CyclePartnerView } from "@/features/cycle/CyclePartnerView";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { KnowledgeCenterCard } from "@/features/cycle/knowledge/KnowledgeCenterCard";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const isPartner = data.isMale;

  const tabs = [
    { id: "hoje", label: isPartner ? "Resumo" : "Hoje" },
    { id: "calendario", label: "Calendário" },
    { id: "historico", label: "Histórico" },
  ];

  const [activeTab, setActiveTab] = useState("hoje");

  // Homem em modo solo: não tem ciclo próprio nem parceira para acompanhar.
  if (!profileLoading && profile?.usage_mode === "solo" && profile?.gender === "male") {
    return <Navigate to="/" replace />;
  }

  const handleReset = async () => {
    if (!user || !confirm("Apagar todos os dados do ciclo? Esta acção é irreversível.")) return;
    try {
      await supabase.from("daily_symptoms").delete().eq("user_id", user.id);
      await supabase.from("period_entries").delete().eq("user_id", user.id);
      await supabase.from("cycle_profiles").delete().eq("user_id", user.id);
      await (supabase as any).from("intimacy_logs").delete().eq("user_id", user.id);
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
    <section className="space-y-5 pb-6">

      {/* Header */}
      <header>
        <div className="flex items-end justify-between px-1 pt-0.5">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
              {isPartner ? "Ciclo da Parceira" : "Ciclo"}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {isPartner ? "Acompanha o ciclo da tua parceira." : "Só tu vês os detalhes."}
            </p>
          </div>
        </div>
        {isPartner && (
          <p className="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11.5px] font-semibold text-rose-600 dark:bg-rose-950/30">
            Modo observador — apenas leitura
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[16px] bg-[#F4F2EF] p-1 dark:bg-muted">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex-1 h-10 rounded-[12px] text-[13px] font-semibold transition-colors duration-150",
              activeTab === t.id
                ? "bg-white text-[#0B1324] shadow-[0_1px_2px_rgba(11,19,36,0.06),0_4px_12px_-6px_rgba(11,19,36,0.2)] dark:bg-card dark:text-foreground"
                : "text-[#7A7F8C] dark:text-muted-foreground"
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
        {activeTab === "historico" && (
          <CycleHistory data={data} onReset={isPartner ? undefined : handleReset} />
        )}
      </div>

      {/* Centro de Conhecimento — sempre no final da página */}
      <div className="pt-2">
        <KnowledgeCenterCard />
      </div>
    </section>
  );
}

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
import { Loader2, Flower2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page/PageHeader";
import { SegmentedTabs } from "@/components/page/SegmentedTabs";

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const isPartner = data.isMale;

  type TabId = "hoje" | "calendario" | "historico";
  const tabs: { id: TabId; label: string }[] = [
    { id: "hoje", label: isPartner ? "Resumo" : "Hoje" },
    { id: "calendario", label: "Calendário" },
    { id: "historico", label: "Histórico" },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("hoje");

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
    <section className="space-y-3 pb-6">

      <PageHeader
        title={isPartner ? "Ciclo da Parceira" : "Ciclo"}
        subtitle={isPartner ? "Acompanha o ciclo da tua parceira." : "O teu rastreio menstrual privado."}
        icon={Flower2}
        tone="rose"
      />
      {isPartner && (
        <p className="-mt-1 px-1 text-[11px] font-medium text-rose-400">
          Modo observador — apenas leitura
        </p>
      )}

      <SegmentedTabs<TabId> tabs={tabs} value={activeTab} onChange={setActiveTab} />

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
      <div className="pt-1">
        <KnowledgeCenterCard />
      </div>
    </section>
  );
}

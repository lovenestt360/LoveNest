import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CyclePartnerView } from "@/features/cycle/CyclePartnerView";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { CycleShare } from "@/features/cycle/CycleShare";
import { CycleCareCard } from "@/features/cycle/CycleCareCard";
import { CycleIcon } from "@/features/cycle/CycleIcon";
import { ROUND } from "@/features/cycle/cycleUi";
import { KnowledgeCenterCard } from "@/features/cycle/knowledge/KnowledgeCenterCard";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type View = "hoje" | "calendario" | "historico" | "partilha";

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const { partner } = usePartnerProfile();
  // /ciclo#calendario, #historico ou #partilha abre logo esse ecrã.
  const [view, setView] = useState<View>(() => {
    const h = window.location.hash.slice(1);
    return h === "calendario" || h === "historico" || h === "partilha" ? h : "hoje";
  });
  const isPartner = data.isMale;

  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  // Homem em modo solo: não tem ciclo próprio nem parceira para acompanhar.
  if (!profileLoading && profile?.usage_mode === "solo" && profile?.gender === "male") {
    return <Navigate to="/" replace />;
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Ele: o ciclo dela, só o que ela partilha ──
  if (isPartner) {
    const herName = partner?.display_name?.trim() || "tua parceira";
    const shared = data.profile && data.profile.share_level !== "private" && data.engine;
    return (
      <section className="space-y-4 pb-6">
        <header className="px-1 pt-0.5">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em] text-foreground">Ciclo da {herName}</h1>
          {shared && <p className="mt-0.5 text-[13px] text-muted-foreground">A {herName} partilha isto contigo.</p>}
        </header>
        <CyclePartnerView data={data} herName={herName} myName={profile?.display_name?.trim() || undefined} />
        {shared && <KnowledgeCenterCard forPartner />}
      </section>
    );
  }

  const partnerName = partner?.display_name?.trim() || "o teu par";

  const handleReset = async () => {
    if (!user || !confirm("Apagar todos os dados do ciclo? Esta ação é irreversível.")) return;
    try {
      await supabase.from("daily_symptoms").delete().eq("user_id", user.id);
      await supabase.from("period_entries").delete().eq("user_id", user.id);
      await supabase.from("cycle_profiles").delete().eq("user_id", user.id);
      await (supabase as any).from("intimacy_logs").delete().eq("user_id", user.id);
      toast({ title: "Dados apagados" });
      setView("hoje");
      data.reload();
    } catch (err: any) {
      toast({ title: "Erro ao apagar", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <section className="space-y-4 pb-6">
      {view === "hoje" && (
        <>
          <header className="flex items-start justify-between px-1 pt-0.5">
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em] text-foreground">Ciclo</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Só tu vês os detalhes.</p>
            </div>
            {data.engine && (
              <div className="flex gap-2">
                <button type="button" aria-label="Partilha com o par" onClick={() => setView("partilha")} className={ROUND}>
                  <CycleIcon kind="partilha" size={22} />
                </button>
                <button type="button" aria-label="Calendário" onClick={() => setView("calendario")} className={ROUND}>
                  <CycleIcon kind="calendario" size={22} />
                </button>
              </div>
            )}
          </header>
          {user && data.spaceId && (
            <CycleCareCard userId={user.id} spaceId={data.spaceId} partnerName={partnerName} />
          )}
          <CycleToday data={data} onOpenCalendar={() => setView("calendario")} />
          {data.engine && <div className="pt-1"><KnowledgeCenterCard /></div>}
        </>
      )}

      {view === "calendario" && (
        <CycleCalendar data={data} onBack={() => setView("hoje")} onOpenHistory={() => setView("historico")} />
      )}
      {view === "historico" && (
        <CycleHistory data={data} onBack={() => setView("calendario")} onOpenShare={() => setView("partilha")} onReset={handleReset} />
      )}
      {view === "partilha" && (
        <CycleShare data={data} partnerName={partnerName} onBack={() => setView("hoje")} />
      )}
    </section>
  );
}

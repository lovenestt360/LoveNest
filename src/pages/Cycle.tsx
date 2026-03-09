import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = async () => {
    if (!user) return;
    setResetting(true);
    try {
      await supabase.from("daily_symptoms").delete().eq("user_id", user.id);
      await supabase.from("period_entries").delete().eq("user_id", user.id);
      await supabase.from("cycle_profiles").delete().eq("user_id", user.id);
      toast({ title: "Dados do ciclo apagados ✓" });
      setConfirmReset(false);
      data.reload();
    } catch (err: any) {
      toast({ title: "Erro ao apagar", description: err?.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  if (data.loading) {
    return (
      <section className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          🌸 Ciclo {data.isMale && <span className="text-lg text-muted-foreground font-normal ml-1">(Da Parceira)</span>}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.isMale ? "Acompanhamento do ciclo da tua parceira." : "Acompanhamento menstrual privado."}
        </p>
      </header>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="hoje" className="mt-4">
          <CycleToday data={data} />
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <CycleCalendar data={data} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <CycleHistory data={data} />
        </TabsContent>
      </Tabs>

      {/* Reset data (temporary dev utility) */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
        <p className="text-xs font-bold text-destructive">⚠️ Zona de perigo</p>
        {!confirmReset ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmReset(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Resetar dados do ciclo
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Isto apaga todos os teus registos de ciclo (perfil, períodos, sintomas). Tens a certeza?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Sim, apagar tudo
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

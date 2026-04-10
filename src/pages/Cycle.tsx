import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleReset = async () => {
    if (!user || !confirm("Apagar todos os dados do ciclo? Esta acção é irreversível.")) return;
    try {
      await supabase.from("daily_symptoms").delete().eq("user_id", user.id);
      await supabase.from("period_entries").delete().eq("user_id", user.id);
      await supabase.from("cycle_profiles").delete().eq("user_id", user.id);
      toast({ title: "Dados apagados ✓" });
      data.reload();
    } catch (err: any) {
      toast({ title: "Erro ao apagar", description: err?.message, variant: "destructive" });
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
    <section className="space-y-4 pb-28">
      <header>
        <h1 className="text-2xl font-black tracking-tight">
          🌸 Ciclo
          {data.isMale && (
            <span className="text-base text-muted-foreground font-normal ml-2">(Da Parceira)</span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.isMale ? "Acompanhamento do ciclo da tua parceira." : "O teu rastreio menstrual privado."}
        </p>
      </header>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/50 p-1 h-auto">
          <TabsTrigger
            value="hoje"
            className="rounded-xl py-2.5 text-[11px] font-black uppercase tracking-widest"
          >
            Hoje
          </TabsTrigger>
          <TabsTrigger
            value="calendario"
            className="rounded-xl py-2.5 text-[11px] font-black uppercase tracking-widest"
          >
            Calendário
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-xl py-2.5 text-[11px] font-black uppercase tracking-widest"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4">
          <CycleToday data={data} />
        </TabsContent>
        <TabsContent value="calendario" className="mt-4">
          <CycleCalendar data={data} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <CycleHistory data={data} onReset={!data.isMale ? handleReset : undefined} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

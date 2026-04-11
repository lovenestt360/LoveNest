import { useState } from "react";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "hoje", label: "Hoje", emoji: "🌸" },
  { id: "calendario", label: "Calendário", emoji: "📅" },
  { id: "historico", label: "Histórico", emoji: "📊" },
] as const;

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"hoje" | "calendario" | "historico">("hoje");

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
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center animate-pulse">
            <span className="text-xl">🌸</span>
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 pb-28">
      {/* ── Header premium ── */}
      <header className="space-y-1 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/20 flex items-center justify-center shadow-sm border border-rose-100/50">
            <span className="text-lg">🌸</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Ciclo
              {data.isMale && (
                <span className="text-base text-muted-foreground font-normal ml-2">(Da Parceira)</span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground/70">
              {data.isMale ? "Acompanhamento do ciclo da tua parceira." : "O teu rastreio menstrual privado."}
            </p>
          </div>
        </div>
      </header>

      {/* ── Tabs premium — custom (sem Radix Tabs para controlo total) ── */}
      <div className="flex p-1 rounded-3xl bg-rose-50/60 dark:bg-rose-950/10 border border-rose-100/40 backdrop-blur-sm">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[1.3rem] transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                isActive
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200/50 dark:shadow-rose-900/30 scale-[1.02]"
                  : "text-muted-foreground/60 hover:text-rose-400"
              )}
            >
              <span className={cn("text-sm transition-transform duration-300", isActive && "scale-110")}>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content with fade transition ── */}
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-300" key={activeTab}>
        {activeTab === "hoje" && <CycleToday data={data} />}
        {activeTab === "calendario" && <CycleCalendar data={data} />}
        {activeTab === "historico" && <CycleHistory data={data} onReset={!data.isMale ? handleReset : undefined} />}
      </div>
    </section>
  );
}

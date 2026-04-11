import { useState } from "react";
import { useCycleData } from "@/features/cycle/useCycleData";
import { CycleToday } from "@/features/cycle/CycleToday";
import { CyclePartnerView } from "@/features/cycle/CyclePartnerView";
import { CycleCalendar } from "@/features/cycle/CycleCalendar";
import { CycleHistory } from "@/features/cycle/CycleHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// TABS por role
// ─────────────────────────────────────────────

const OWNER_TABS = [
  { id: "hoje", label: "Hoje", emoji: "🌸" },
  { id: "calendario", label: "Calendário", emoji: "📅" },
  { id: "historico", label: "Histórico", emoji: "📊" },
] as const;

const PARTNER_TABS = [
  { id: "hoje", label: "Resumo", emoji: "💛" },
  { id: "calendario", label: "Calendário", emoji: "📅" },
] as const;

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function Cycle() {
  const data = useCycleData();
  const { user } = useAuth();
  const { toast } = useToast();

  // isPartner = utilizador a ver o ciclo da parceira (was: isMale)
  const isPartner = data.isMale;

  const tabs = isPartner ? PARTNER_TABS : OWNER_TABS;
  const [activeTab, setActiveTab] = useState<string>("hoje");

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

  // ── Loading state feminino ──
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
      {/* ── Header — diferenciado por role ── */}
      <header className="space-y-1 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/20 flex items-center justify-center shadow-sm border border-rose-100/50">
            <span className="text-lg">{isPartner ? "💛" : "🌸"}</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {isPartner ? "Ciclo da Parceira" : "Ciclo"}
            </h1>
            <p className="text-xs text-muted-foreground/70">
              {isPartner
                ? "Estás a acompanhar o ciclo da tua parceira."
                : "O teu rastreio menstrual privado."
              }
            </p>
          </div>
        </div>

        {/* ── Badge de role ── */}
        {isPartner && (
          <div className="flex items-center gap-1.5 px-1 pt-1 opacity-80">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E94E77]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E94E77]">
              Modo observador — apenas leitura
            </span>
          </div>
        )}
      </header>

      {/* ── Tabs premium ── */}
      <div className={cn(
        "flex p-1 rounded-3xl border backdrop-blur-sm bg-rose-50/60 dark:bg-rose-950/10 border-rose-100/40"
      )}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[1.3rem] transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                isActive
                  ? "bg-gradient-to-r from-[#E94E77] to-[#F06292] text-white shadow-lg shadow-rose-200/50 dark:shadow-rose-900/30 scale-[1.02]"
                  : "text-muted-foreground/60 hover:text-rose-400"
              )}
            >
              <span className={cn("text-sm transition-transform duration-300", isActive && "scale-110")}>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-300" key={activeTab + String(isPartner)}>
        {activeTab === "hoje" && (
          // ← SEPARAÇÃO DE ROLES AQUI
          isPartner
            ? <CyclePartnerView data={data} />    // Partner: dashboard read-only
            : <CycleToday data={data} />           // Owner: UI completa editável
        )}
        {activeTab === "calendario" && <CycleCalendar data={data} />}
        {activeTab === "historico" && !isPartner && (
          <CycleHistory data={data} onReset={handleReset} />
        )}
      </div>
    </section>
  );
}

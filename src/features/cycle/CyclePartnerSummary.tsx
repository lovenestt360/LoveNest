import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface PartnerSummary {
  shared: boolean;
  phase?: string;
  next_period?: string | null;
  cycle_day?: number;
  today_badge?: string | null;
  pain_level?: string;
  energy_level?: string;
}

// ── Todas as fases → variações de pink/neutro ──
const PHASE_BADGE: Record<string, string> = {
  "Menstruação": "bg-[#FADADD] dark:bg-rose-950/30 text-[#E94E77] dark:text-rose-300",
  "Fértil":      "bg-[#FADADD]/50 dark:bg-rose-950/30 text-[#F06292] dark:text-rose-300",
  "Ovulação":    "bg-[#FADADD]/50 dark:bg-rose-950/30 text-[#F06292] dark:text-rose-300",
  "TPM":         "bg-muted text-muted-foreground",
  "Folicular":   "bg-muted text-muted-foreground",
  "Lútea":       "bg-muted text-muted-foreground",
};

export function CyclePartnerSummary() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !spaceId) return;

    (async () => {
      const { data: members } = await supabase
        .from("members")
        .select("user_id")
        .eq("couple_space_id", spaceId);

      const partnerId = members?.find((m) => m.user_id !== user.id)?.user_id;
      if (!partnerId) { setLoading(false); return; }

      const { data } = await supabase.rpc("get_partner_cycle_summary", {
        _partner_user_id: partnerId,
      });

      setSummary(data as unknown as PartnerSummary | null);
      setLoading(false);
    })();
  }, [user, spaceId]);

  if (loading) return null;

  // ── Sem partilha ──────────────────────────────────────
  if (!summary || !summary.shared) {
    return (
      <div className="rounded-2xl border border-dashed border-[#F8BBD0]/40 dark:border-rose-900/40 bg-card px-4 py-3 flex items-center gap-3 shadow-sm">
        <Lock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <p className="text-xs text-muted-foreground/60">Resumo do ciclo não partilhado pelo teu par.</p>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

  // ── Resumo com dados ──────────────────────────────────
  return (
    <div className="rounded-[24px] border border-[#F8BBD0]/30 dark:border-rose-900/40 bg-card overflow-hidden shadow-sm">
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
          Resumo do teu par 💖
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(
            "text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full border-none shadow-sm",
            PHASE_BADGE[summary.phase ?? ""] ?? "bg-muted text-muted-foreground"
          )}>
            {summary.phase ?? "—"}
          </Badge>
          {summary.cycle_day && summary.cycle_day > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground/60">
              Dia {summary.cycle_day}
            </span>
          )}
        </div>

        {summary.next_period && (
          <p className="text-xs text-muted-foreground/60">
            Próxima menstruação:{" "}
            <span className="font-black text-[#E94E77] dark:text-rose-300">{formatDate(summary.next_period)}</span>
          </p>
        )}

        {(summary.pain_level || summary.energy_level) && (
          <div className="flex gap-4 pt-1">
            {summary.pain_level && (
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Dor</p>
                <p className="text-xs font-black text-[#E94E77] dark:text-rose-300">{summary.pain_level}</p>
              </div>
            )}
            {summary.energy_level && (
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Energia</p>
                <p className="text-xs font-black text-[#E94E77] dark:text-rose-300">{summary.energy_level}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const PHASE_COLORS: Record<string, string> = {
  "Menstruação": "bg-rose-100/80 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
  "Fértil": "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Ovulação": "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "TPM": "bg-purple-100/80 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
  "Folicular": "bg-sky-100/80 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
  "Lútea": "bg-purple-100/80 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
};

export function CyclePartnerSummary() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !spaceId) return;

    (async () => {
      // Find partner user_id
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

  if (!summary || !summary.shared) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-3 text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <p className="text-sm">Resumo do ciclo não partilhado pelo teu par.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

  return (
    <div className="rounded-3xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Resumo do teu par</p>
      </div>
      <div className="p-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={cn("text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 border-none", PHASE_COLORS[summary.phase ?? ""] ?? "bg-muted text-muted-foreground")}>
            {summary.phase ?? "—"}
          </Badge>
          {summary.cycle_day && summary.cycle_day > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground">Dia {summary.cycle_day}</span>
          )}
        </div>
        {summary.next_period && (
          <p className="text-xs text-muted-foreground/70">
            Próxima menstruação: <span className="font-bold text-foreground/80">{formatDate(summary.next_period)}</span>
          </p>
        )}
        {(summary.pain_level || summary.energy_level) && (
          <div className="flex gap-4 pt-1">
            {summary.pain_level && (
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Dor</p>
                <p className="text-xs font-bold text-foreground/70">{summary.pain_level}</p>
              </div>
            )}
            {summary.energy_level && (
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Energia</p>
                <p className="text-xs font-bold text-foreground/70">{summary.energy_level}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
  "Menstruação": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Fértil": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "TPM": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Folicular": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Lútea": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo do teu par</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-xs", PHASE_COLORS[summary.phase ?? ""] ?? "bg-muted text-muted-foreground")}>
            {summary.phase ?? "—"}
          </Badge>
          {summary.cycle_day && summary.cycle_day > 0 && (
            <span className="text-xs text-muted-foreground">Dia {summary.cycle_day}</span>
          )}
        </div>
        {summary.next_period && (
          <p className="text-xs text-muted-foreground">
            Próxima menstruação: <span className="font-medium text-foreground">{formatDate(summary.next_period)}</span>
          </p>
        )}
        {(summary.pain_level || summary.energy_level) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {summary.pain_level && <span>Dor: {summary.pain_level}</span>}
            {summary.energy_level && <span>Energia: {summary.energy_level}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

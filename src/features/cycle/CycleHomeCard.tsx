import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { computeCycleInfo, type CycleProfile, type PeriodEntry } from "./useCycleData";
import { cn } from "@/lib/utils";

const PHASE_COLORS: Record<string, string> = {
  "Menstruação": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Fértil": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "TPM": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Folicular": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Lútea": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export function CycleHomeCard() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CycleProfile | null>(null);
  const [lastPeriod, setLastPeriod] = useState<PeriodEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("cycle_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("period_entries").select("*").eq("user_id", user.id).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([pRes, peRes]) => {
      setProfile(pRes.data as CycleProfile | null);
      setLastPeriod(peRes.data as PeriodEntry | null);
    });
  }, [user]);

  const info = computeCycleInfo(profile, lastPeriod);

  // Only show if the user has a profile
  if (!profile) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">🌸 Ciclo</CardTitle>
        <CardDescription>Teu acompanhamento menstrual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", PHASE_COLORS[info.phase] ?? "")}>
            {info.phase}
          </Badge>
          {info.cycleDay > 0 && (
            <span className="text-xs text-muted-foreground">Dia {info.cycleDay}</span>
          )}
        </div>
        {info.nextPeriod && (
          <p className="text-xs text-muted-foreground">
            Próxima: {new Date(info.nextPeriod + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-1" onClick={() => navigate("/ciclo")}>
          Abrir ciclo
        </Button>
      </CardContent>
    </Card>
  );
}

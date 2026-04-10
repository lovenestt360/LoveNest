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
  "Menstruação": "bg-rose-100/80 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
  "Fértil": "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "TPM": "bg-purple-100/80 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
  "Folicular": "bg-sky-100/80 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
  "Lútea": "bg-purple-100/80 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
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
    <div className="rounded-[32px] border border-border/40 bg-card overflow-hidden shadow-sm transition-all active:scale-[0.98]" onClick={() => navigate("/ciclo")}>
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">O teu ciclo</p>
      </div>
      <div className="p-5 pt-1 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 border-none", PHASE_COLORS[info.phase] ?? "bg-muted text-muted-foreground")}>
            {info.phase}
          </Badge>
          {info.cycleDay > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground/60">Dia {info.cycleDay}</span>
          )}
        </div>
        {info.nextPeriod && (
          <p className="text-[13px] font-medium text-foreground/70">
            Próxima prevista: <span className="font-bold">{new Date(info.nextPeriod + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span>
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "./useCoupleSpaceId";

interface TimeTogether {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  startDate: string | null;
}

export function useTimeTogether() {
  const spaceId = useCoupleSpaceId();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [time, setTime] = useState<TimeTogether>({ days: 0, hours: 0, minutes: 0, seconds: 0, startDate: null });

  const fetchStartDate = useCallback(() => {
    if (!spaceId) return;
    supabase
      .from("couple_spaces")
      .select("relationship_start_date")
      .eq("id", spaceId)
      .maybeSingle()
      .then(({ data }) => {
        setStartDate((data as any)?.relationship_start_date ?? null);
      });
  }, [spaceId]);

  // Busca inicial quando spaceId fica disponível
  useEffect(() => { fetchStartDate(); }, [fetchStartDate]);

  // Re-busca quando: utilizador regressa à Home (keep-alive) OU
  // o perfil do casal foi guardado nas Definições
  useEffect(() => {
    window.addEventListener("home-visible", fetchStartDate);
    window.addEventListener("onboarding-refresh", fetchStartDate);
    return () => {
      window.removeEventListener("home-visible", fetchStartDate);
      window.removeEventListener("onboarding-refresh", fetchStartDate);
    };
  }, [fetchStartDate]);

  useEffect(() => {
    if (!startDate) return;

    const calc = () => {
      const start = new Date(startDate + "T00:00:00").getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);
      const totalSec = Math.floor(diff / 1000);
      return {
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
        startDate,
      };
    };

    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [startDate]);

  return time;
}

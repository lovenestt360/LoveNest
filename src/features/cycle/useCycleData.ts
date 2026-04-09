/**
 * useCycleData — Camada de dados do ciclo menstrual.
 * Toda a lógica de cálculo está em engine.ts.
 * Este hook trata apenas de: fetch, estado e operações de escrita.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { runCycleEngineFromProfile } from "./engine";
import type { CycleEngineOutput } from "./engine";

// ─────────────────────────────────────────────
// TIPOS DA BASE DE DADOS (sem alteração de schema)
// ─────────────────────────────────────────────

export interface CycleProfile {
  id: string;
  user_id: string;
  couple_space_id: string;
  share_level: string; // "private" | "summary" | "summary_signals"
  avg_cycle_length: number;
  avg_period_length: number;
  luteal_length: number;
  pms_days: number;
}

export interface PeriodEntry {
  id: string;
  user_id: string;
  couple_space_id: string;
  start_date: string;
  end_date: string | null;
  flow_level: string;
  pain_level: number;
  pms_level: number;
  notes: string | null;
  created_at: string;
}

export interface DailySymptom {
  id: string;
  user_id: string;
  couple_space_id: string;
  day_key: string;
  // Physical
  nausea: boolean;
  cramps: boolean;
  headache: boolean;
  back_pain: boolean;
  leg_pain: boolean;
  fatigue: boolean;
  dizziness: boolean;
  breast_tenderness: boolean;
  bloating: boolean;
  weakness: boolean;
  // Emotional
  mood_swings: boolean;
  irritability: boolean;
  anxiety: boolean;
  sadness: boolean;
  sensitivity: boolean;
  crying: boolean;
  // Digestive
  diarrhea: boolean;
  constipation: boolean;
  gas: boolean;
  // Skin/Appetite
  acne: boolean;
  cravings: boolean;
  increased_appetite: boolean;
  // Metrics
  discharge: string;
  discharge_type: string;
  libido: number;
  temperature_c: number | null;
  pain_level: number;
  energy_level: number;
  stress: number;
  sleep_hours: number | null;
  sleep_quality: string;
  tpm: boolean;
  notes: string | null;
}

/** Todos os campos booleanos de sintomas para iteração */
export const ALL_SYMPTOM_BOOLEANS = [
  "cramps", "headache", "nausea", "back_pain", "leg_pain", "fatigue", "dizziness",
  "breast_tenderness", "bloating", "weakness",
  "mood_swings", "irritability", "anxiety", "sadness", "sensitivity", "crying",
  "diarrhea", "constipation", "gas",
  "acne", "cravings", "increased_appetite",
] as const;

// ─────────────────────────────────────────────
// UTILITÁRIOS (mantidos para compatibilidade)
// ─────────────────────────────────────────────

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/**
 * @deprecated Use runCycleEngineFromProfile do engine.ts em vez disso.
 * Mantido apenas para compatibilidade com Index.tsx e CycleHomeCard.tsx.
 */
export function computeCycleInfo(
  profile: CycleProfile | null,
  lastPeriod: PeriodEntry | null
): {
  phase: string;
  cycleDay: number;
  nextPeriod: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  pmsStart: string | null;
  ovulationDate: string | null;
} {
  const engine = runCycleEngineFromProfile(profile, lastPeriod);
  if (!engine) {
    return { phase: "sem dados", cycleDay: 0, nextPeriod: null, fertileStart: null, fertileEnd: null, pmsStart: null, ovulationDate: null };
  }
  return {
    phase: engine.phaseLabel,
    cycleDay: engine.cycleDay,
    nextPeriod: engine.nextPeriodStr,
    fertileStart: engine.fertileStartStr,
    fertileEnd: engine.fertileEndStr,
    pmsStart: engine.pmsStartStr,
    ovulationDate: engine.ovulationDateStr,
  };
}


// ─────────────────────────────────────────────
// HOOK: useCycleTarget
// Determina qual utilizador cujos dados devemos mostrar
// (a própria utilizadora ou a parceira, no caso do utilizador ser homem)
// ─────────────────────────────────────────────

export function useCycleTarget() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isMale, setIsMale] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(true);

  useEffect(() => {
    if (!user || !spaceId) {
      setTargetUserId(null);
      setLoadingTarget(false);
      return;
    }

    supabase
      .from("profiles")
      .select("gender")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data: profile }) => {
        const gender = (profile as any)?.gender;

        if (gender === "male") {
          setIsMale(true);
          // Homem vê dados da parceira
          const { data: cycleProfiles } = await supabase
            .from("cycle_profiles")
            .select("user_id")
            .eq("couple_space_id", spaceId);

          const partnerProfile = cycleProfiles?.find((p) => p.user_id !== user.id);
          setTargetUserId(partnerProfile?.user_id ?? user.id);
        } else {
          setIsMale(false);
          setTargetUserId(user.id);
        }

        setLoadingTarget(false);
      });
  }, [user, spaceId]);

  return { targetUserId, isMale, loadingTarget };
}

// ─────────────────────────────────────────────
// HOOK PRINCIPAL: useCycleData
// ─────────────────────────────────────────────

export function useCycleData() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const { targetUserId, isMale, loadingTarget } = useCycleTarget();

  const [profile, setProfile] = useState<CycleProfile | null>(null);
  const [periods, setPeriods] = useState<PeriodEntry[]>([]);
  const [todaySymptoms, setTodaySymptoms] = useState<DailySymptom | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const reload = useCallback(async () => {
    if (!targetUserId || !spaceId) return;

    setLoading(true);
    const [profileRes, periodsRes, symptomsRes] = await Promise.all([
      supabase.from("cycle_profiles").select("*").eq("user_id", targetUserId).maybeSingle(),
      supabase.from("period_entries").select("*").eq("user_id", targetUserId)
        .order("start_date", { ascending: false }).limit(50),
      supabase.from("daily_symptoms").select("*").eq("user_id", targetUserId)
        .eq("day_key", today).maybeSingle(),
    ]);

    setProfile((profileRes.data as CycleProfile | null) ?? null);
    setPeriods((periodsRes.data as PeriodEntry[]) ?? []);
    setTodaySymptoms((symptomsRes.data as DailySymptom | null) ?? null);
    setLoading(false);
  }, [targetUserId, spaceId, today]);

  useEffect(() => {
    if (!loadingTarget && targetUserId) {
      reload();
    }
  }, [loadingTarget, targetUserId, reload]);

  // ── Garante que um CycleProfile existe para a utilizadora
  const ensureProfile = useCallback(async () => {
    if (!user || !spaceId) return null;
    if (profile) return profile;
    if (isMale) return null;

    const { data } = await supabase
      .from("cycle_profiles")
      .insert({ user_id: user.id, couple_space_id: spaceId })
      .select("*")
      .single();

    const p = data as CycleProfile;
    setProfile(p);
    return p;
  }, [user, spaceId, profile, isMale]);

  // ── Motor de inteligência (fonte única de verdade)
  const lastPeriod = periods[0] ?? null;
  const openPeriod = lastPeriod && !lastPeriod.end_date ? lastPeriod : null;

  // Usar o engine para todos os cálculos
  const engineOutput: CycleEngineOutput | null = runCycleEngineFromProfile(profile, lastPeriod);

  return {
    // Dados brutos
    profile,
    periods,
    todaySymptoms,
    loading: loadingTarget || loading,
    // Operações
    reload,
    ensureProfile,
    // Contexto
    lastPeriod,
    openPeriod,
    spaceId,
    user,
    today,
    isMale,
    targetUserId,
    // ── Output do engine (toda a lógica calculada)
    engine: engineOutput,
    /**
     * @deprecated Use `engine` em vez de `cycleInfo`.
     * Mantido para compatibilidade temporária.
     */
    cycleInfo: engineOutput
      ? {
          phase: engineOutput.phaseLabel,
          cycleDay: engineOutput.cycleDay,
          nextPeriod: engineOutput.nextPeriodStr,
          fertileStart: engineOutput.fertileStartStr,
          fertileEnd: engineOutput.fertileEndStr,
          pmsStart: engineOutput.pmsStartStr,
          ovulationDate: engineOutput.ovulationDateStr,
        }
      : {
          phase: "sem dados" as const,
          cycleDay: 0,
          nextPeriod: null,
          fertileStart: null,
          fertileEnd: null,
          pmsStart: null,
          ovulationDate: null,
        },
  };
}

export type CycleData = ReturnType<typeof useCycleData>;

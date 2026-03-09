import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import {
    FastingProfile, Abstention, ChecklistTemplate, DayLog, DayItemLog,
    FastingReminders, PartnerShare, CreatePlanInput, FastingStats, WeeklyPoint,
    DayResult, ItemStatus, ShareLevel,
    DEFAULT_DO_ITEMS, DEFAULT_AVOID_ITEMS,
} from "./types";

export type { FastingProfile, Abstention, ChecklistTemplate, DayLog, DayItemLog, FastingReminders, PartnerShare };

export interface UseFastingReturn {
    loading: boolean;
    profile: FastingProfile | null;
    abstentions: Abstention[];
    templates: ChecklistTemplate[];
    dayLogs: Record<string, DayLog>;       // key = YYYY-MM-DD
    todayLog: DayLog | null;
    todayItems: DayItemLog[];
    reminders: FastingReminders | null;
    partnerShare: PartnerShare | null;
    stats: FastingStats;

    // Mutators
    createPlan: (input: CreatePlanInput) => Promise<void>;
    updatePlan: (updates: Partial<FastingProfile>) => Promise<void>;
    deletePlan: () => Promise<void>;
    upsertDayLog: (dayKey: string, updates: {
        result?: DayResult;
        mood?: string | null;
        note?: string | null;
        finalized?: boolean;
    }) => Promise<DayLog | null>;
    ensureDayLog: (dayKey: string) => Promise<DayLog | null>;
    upsertItemLog: (dayLogId: string, item: {
        template_id?: string | null;
        label: string;
        section: "fazer" | "evitar";
        status: ItemStatus;
        reason?: string | null;
    }) => Promise<void>;
    saveAbstentions: (list: Omit<Abstention, "id" | "user_id" | "profile_id" | "created_at">[]) => Promise<void>;
    saveReminders: (updates: Omit<FastingReminders, "id" | "user_id" | "updated_at">) => Promise<void>;
    savePartnerShare: (updates: { share_level: ShareLevel; support_message?: string | null }) => Promise<void>;
    refresh: () => Promise<void>;
}

function buildStats(profile: FastingProfile, dayLogs: Record<string, DayLog>): FastingStats {
    const logs = Object.values(dayLogs);
    const finalized = logs.filter(l => l.finalized);
    const total = finalized.length;
    const done = finalized.filter(l => l.result === "cumprido").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Streak: consecutive finalized cumprido going backwards from today
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 100; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (dayLogs[key]?.finalized && dayLogs[key]?.result === "cumprido") {
            streak++;
        } else break;
    }

    // Weekly data — last 6 weeks
    const weeklyData: WeeklyPoint[] = [];
    for (let w = 5; w >= 0; w--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
        let weekDone = 0, weekTotal = 0;
        for (let d = 0; d < 7; d++) {
            const dd = new Date(weekStart);
            dd.setDate(dd.getDate() + d);
            const key = dd.toISOString().slice(0, 10);
            if (dayLogs[key]?.finalized) {
                weekTotal++;
                if (dayLogs[key].result === "cumprido") weekDone++;
            }
        }
        weeklyData.push({
            weekLabel: `S${6 - w}`,
            rate: weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0,
        });
    }

    return {
        streak,
        completionRate,
        totalDays: profile.total_days,
        loggedDays: total,
        topFailures: [],
        topSuccesses: [],
        weeklyData,
    };
}

export function useFasting(): UseFastingReturn {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<FastingProfile | null>(null);
    const [abstentions, setAbstentions] = useState<Abstention[]>([]);
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>({});
    const [todayItems, setTodayItems] = useState<DayItemLog[]>([]);
    const [reminders, setReminders] = useState<FastingReminders | null>(null);
    const [partnerShare, setPartnerShare] = useState<PartnerShare | null>(null);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayLog = dayLogs[todayKey] ?? null;

    const refresh = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);

        try {
            // Profile
            const { data: profileData } = await supabase
                .from("fasting_profiles" as any)
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            const activeProfile = profileData as unknown as FastingProfile | null;
            setProfile(activeProfile);

            if (!activeProfile) {
                setLoading(false);
                return;
            }

            // Parallel loads
            const [abstRes, tplRes, logsRes, remRes, shareRes] = await Promise.all([
                supabase.from("fasting_abstentions" as any).select("*").eq("user_id", user.id).eq("profile_id", activeProfile.id).order("sort_order"),
                supabase.from("fasting_checklist_templates" as any).select("*").eq("user_id", user.id).eq("profile_id", activeProfile.id).order("sort_order"),
                supabase.from("fasting_day_logs" as any).select("*").eq("user_id", user.id).eq("profile_id", activeProfile.id),
                supabase.from("fasting_reminders" as any).select("*").eq("user_id", user.id).maybeSingle(),
                supabase.from("fasting_partner_shares" as any).select("*").eq("user_id", user.id).maybeSingle(),
            ]);

            setAbstentions((abstRes.data ?? []) as Abstention[]);
            setTemplates((tplRes.data ?? []) as ChecklistTemplate[]);

            const logsMap: Record<string, DayLog> = {};
            for (const l of (logsRes.data ?? []) as DayLog[]) {
                logsMap[l.day_key] = l;
            }
            setDayLogs(logsMap);
            setReminders(remRes.data as FastingReminders | null);
            setPartnerShare(shareRes.data as PartnerShare | null);

            // Today's item logs
            const tLog = logsMap[todayKey];
            if (tLog) {
                const { data: itemsData } = await supabase
                    .from("fasting_day_item_logs" as any)
                    .select("*")
                    .eq("day_log_id", tLog.id)
                    .order("section").order("created_at");
                setTodayItems((itemsData ?? []) as DayItemLog[]);
            } else {
                setTodayItems([]);
            }
        } catch (err) {
            console.error("useFasting refresh error:", err);
        } finally {
            setLoading(false);
        }
    }, [user, todayKey]);

    useEffect(() => { refresh(); }, [refresh]);

    // ── MUTATORS ─────────────────────────────────────────────────────

    const createPlan = useCallback(async (input: CreatePlanInput) => {
        if (!user) return;
        // Deactivate existing plans
        await supabase.from("fasting_profiles" as any).update({ is_active: false }).eq("user_id", user.id);

        const { data: newProfile, error } = await supabase
            .from("fasting_profiles" as any)
            .insert({
                user_id: user.id,
                couple_space_id: spaceId ?? null,
                plan_name: input.plan_name,
                plan_type: input.plan_type,
                until_hour: input.until_hour ?? null,
                start_date: input.start_date,
                end_date: input.end_date,
                total_days: input.total_days,
                rules_allowed: input.rules_allowed ?? null,
                rules_forbidden: input.rules_forbidden ?? null,
                rules_exceptions: input.rules_exceptions ?? null,
                is_active: true,
            })
            .select()
            .single();

        if (error || !newProfile) { console.error(error); return; }

        const prof = newProfile as FastingProfile;

        // Insert default checklist templates
        const doRows = (input.doItems ?? DEFAULT_DO_ITEMS).map((label, i) => ({
            user_id: user.id, profile_id: prof.id, section: "fazer", label, sort_order: i, is_active: true,
        }));
        const avoidRows = (input.avoidItems ?? DEFAULT_AVOID_ITEMS).map((label, i) => ({
            user_id: user.id, profile_id: prof.id, section: "evitar", label, sort_order: i, is_active: true,
        }));
        if (doRows.length || avoidRows.length) {
            await supabase.from("fasting_checklist_templates" as any).insert([...doRows, ...avoidRows]);
        }

        await refresh();
    }, [user, spaceId, refresh]);

    const updatePlan = useCallback(async (updates: Partial<FastingProfile>) => {
        if (!user || !profile) return;
        await supabase.from("fasting_profiles" as any).update({ ...updates, updated_at: new Date().toISOString() }).eq("id", profile.id);
        await refresh();
    }, [user, profile, refresh]);

    const deletePlan = useCallback(async () => {
        if (!user || !profile) return;
        await supabase.from("fasting_profiles" as any).update({ is_active: false }).eq("id", profile.id);
        await refresh();
    }, [user, profile, refresh]);

    const ensureDayLog = useCallback(async (dayKey: string): Promise<DayLog | null> => {
        if (!user || !profile) return null;
        if (dayLogs[dayKey]) return dayLogs[dayKey];

        // Calculate day number
        const startMs = new Date(profile.start_date + "T00:00:00").getTime();
        const dayMs = new Date(dayKey + "T00:00:00").getTime();
        const dayNumber = Math.floor((dayMs - startMs) / 86400000) + 1;

        const { data, error } = await supabase
            .from("fasting_day_logs" as any)
            .insert({ user_id: user.id, profile_id: profile.id, day_key: dayKey, day_number: dayNumber })
            .select()
            .single();

        if (error || !data) { console.error(error); return null; }
        const newLog = data as DayLog;
        setDayLogs(prev => ({ ...prev, [dayKey]: newLog }));
        return newLog;
    }, [user, profile, dayLogs]);

    const upsertDayLog = useCallback(async (
        dayKey: string,
        updates: { result?: DayResult; mood?: string | null; note?: string | null; finalized?: boolean }
    ): Promise<DayLog | null> => {
        if (!user || !profile) return null;

        let existing = dayLogs[dayKey] ?? await ensureDayLog(dayKey);
        if (!existing) return null;

        const { data, error } = await supabase
            .from("fasting_day_logs" as any)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select()
            .single();

        if (error || !data) { console.error(error); return null; }
        const updated = data as DayLog;
        setDayLogs(prev => ({ ...prev, [dayKey]: updated }));
        return updated;
    }, [user, profile, dayLogs, ensureDayLog]);

    const upsertItemLog = useCallback(async (
        dayLogId: string,
        item: { template_id?: string | null; label: string; section: "fazer" | "evitar"; status: ItemStatus; reason?: string | null }
    ) => {
        if (!user) return;

        // Try update existing by label + day_log_id
        const { data: existing } = await supabase
            .from("fasting_day_item_logs" as any)
            .select("id")
            .eq("day_log_id", dayLogId)
            .eq("label", item.label)
            .maybeSingle();

        if (existing) {
            await supabase.from("fasting_day_item_logs" as any)
                .update({ status: item.status, reason: item.reason ?? null, updated_at: new Date().toISOString() })
                .eq("id", (existing as any).id);
        } else {
            await supabase.from("fasting_day_item_logs" as any).insert({
                user_id: user.id, day_log_id: dayLogId,
                template_id: item.template_id ?? null,
                label: item.label, section: item.section,
                status: item.status, reason: item.reason ?? null,
            });
        }

        // Refresh today items if needed
        if (todayLog?.id === dayLogId) {
            const { data } = await supabase.from("fasting_day_item_logs" as any)
                .select("*").eq("day_log_id", dayLogId).order("section").order("created_at");
            setTodayItems((data ?? []) as DayItemLog[]);
        }
    }, [user, todayLog]);

    const saveAbstentions = useCallback(async (
        list: Omit<Abstention, "id" | "user_id" | "profile_id" | "created_at">[]
    ) => {
        if (!user || !profile) return;
        await supabase.from("fasting_abstentions" as any).delete().eq("user_id", user.id).eq("profile_id", profile.id);
        if (list.length > 0) {
            await supabase.from("fasting_abstentions" as any).insert(
                list.map((a, i) => ({ ...a, user_id: user.id, profile_id: profile.id, sort_order: i }))
            );
        }
        await refresh();
    }, [user, profile, refresh]);

    const saveReminders = useCallback(async (
        updates: Omit<FastingReminders, "id" | "user_id" | "updated_at">
    ) => {
        if (!user) return;
        await supabase.from("fasting_reminders" as any).upsert(
            { ...updates, user_id: user.id, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );
        await refresh();
    }, [user, refresh]);

    const savePartnerShare = useCallback(async (
        updates: { share_level: ShareLevel; support_message?: string | null }
    ) => {
        if (!user) return;
        await supabase.from("fasting_partner_shares" as any).upsert(
            { ...updates, user_id: user.id, couple_space_id: spaceId ?? null, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
        );
        await refresh();
    }, [user, spaceId, refresh]);

    const stats = profile ? buildStats(profile, dayLogs) : {
        streak: 0, completionRate: 0, totalDays: 0, loggedDays: 0,
        topFailures: [], topSuccesses: [], weeklyData: [],
    };

    return {
        loading, profile, abstentions, templates, dayLogs,
        todayLog, todayItems, reminders, partnerShare, stats,
        createPlan, updatePlan, deletePlan,
        upsertDayLog, ensureDayLog, upsertItemLog,
        saveAbstentions, saveReminders, savePartnerShare,
        refresh,
    };
}

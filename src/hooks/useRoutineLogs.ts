import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";


export interface RoutineDayLog {
    id: string;
    couple_space_id: string | null;
    user_id: string;
    day: string;
    checked_item_ids: string[];
    status: "completed" | "partial" | "failed" | "unlogged";
    completion_rate: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export function computeStatus(checkedCount: number, totalActive: number): { status: RoutineDayLog["status"]; rate: number } {
    if (totalActive === 0) return { status: "unlogged", rate: 0 };
    const rate = checkedCount / totalActive;
    if (rate >= 1) return { status: "completed", rate: 1 };
    if (rate >= 0.5) return { status: "partial", rate };
    if (checkedCount === 0) return { status: "failed", rate: 0 };
    return { status: "failed", rate };
}

export function useRoutineLogs(userId?: string) {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const [logs, setLogs] = useState<RoutineDayLog[]>([]);
    const [loading, setLoading] = useState(true);

    const targetUserId = userId ?? user?.id;

    // isReady: pode ler dados (só precisa de userId)
    // canWrite: pode guardar logs (precisa de spaceId)
    const isReady = !!targetUserId;
    const canWrite = !!spaceId;

    const fetchMonth = useCallback(async (year: number, month: number) => {
        if (!targetUserId) return;
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;
        setLoading(true);
        const { data } = await supabase
            .from("routine_day_logs")
            .select("*")
            .eq("user_id", targetUserId)
            .gte("day", startDate)
            .lt("day", endDate)
            .order("day", { ascending: true });
        setLogs((data as RoutineDayLog[]) ?? []);
        setLoading(false);
    }, [targetUserId]);

    const getLogForDay = useCallback((day: string) => {
        return logs.find(l => l.day === day) ?? null;
    }, [logs]);

    const upsertLog = useCallback(async (
        day: string,
        checkedItemIds: string[],
        totalActive: number,
        notes?: string,
    ) => {
        if (!user) return;
        
        let sp = spaceId;
        if (!sp && user) {
            const { data: member } = await supabase
                .from('members')
                .select('couple_space_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();
            sp = member?.couple_space_id;
        }
        
        if (!sp) {
            console.error("CRITICAL: couple_space_id ainda null nas Rotinas", user?.id);
            return;
        }

        const { status, rate } = computeStatus(checkedItemIds.length, totalActive);
        const payload = {
            user_id: user.id,
            couple_space_id: sp,
            day,
            checked_item_ids: checkedItemIds,
            status,
            completion_rate: Math.round(rate * 100) / 100,
            notes: notes ?? null,
        };

        // Try update first
        const existing = logs.find(l => l.day === day && l.user_id === user.id);
        const oldStatus = existing?.status ?? "unlogged";

        if (existing) {
            await supabase.from("routine_day_logs")
                .update(payload)
                .eq("id", existing.id);
        } else {
            await supabase.from("routine_day_logs").insert(payload);
        }

        // Notificação e lógica de streak removidas para purga total

        if (status !== oldStatus && status !== "unlogged") {
            let msg = "";
            let emoji = "📋";
            if (status === "completed") { msg = "completou toda a sua rotina de hoje!"; emoji = "🎉"; }
            else if (status === "partial") { msg = "chegou a metade da sua rotina de hoje."; emoji = "💪"; }
            else if (status === "failed") { msg = "deixou a rotina por fazer hoje..."; emoji = "👀"; }

            if (msg) {
                notifyPartner({
                    couple_space_id: spaceId,
                    type: "routine",
                    title: `Rotina ${emoji}`,
                    body: `${user.user_metadata?.display_name || "O seu parceiro"} ${msg}`,
                    url: "/rotina"
                });
            }
        }

        // Refresh
        const now = new Date(day);
        await fetchMonth(now.getFullYear(), now.getMonth() + 1);
    }, [user, spaceId, logs, fetchMonth]);

    return { logs, loading, isReady, canWrite, fetchMonth, getLogForDay, upsertLog };
}

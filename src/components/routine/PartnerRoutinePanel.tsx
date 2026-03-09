import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { RoutineCalendar } from "./RoutineCalendar";
import { RoutineChecklist } from "./RoutineChecklist";
import { Loader2, Heart } from "lucide-react";
import type { RoutineItem } from "@/hooks/useRoutineItems";
import type { RoutineDayLog } from "@/hooks/useRoutineLogs";

export function PartnerRoutinePanel() {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState("");
    const [items, setItems] = useState<RoutineItem[]>([]);
    const [logs, setLogs] = useState<RoutineDayLog[]>([]);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    // Fetch partner ID
    useEffect(() => {
        if (!spaceId || !user) return;
        supabase
            .from("members")
            .select("user_id")
            .eq("couple_space_id", spaceId)
            .neq("user_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (data) setPartnerId(data.user_id);
                else setLoading(false);
            });
    }, [spaceId, user]);

    // Fetch partner profile name
    useEffect(() => {
        if (!partnerId) return;
        supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", partnerId)
            .maybeSingle()
            .then(({ data }) => {
                setPartnerName(data?.display_name ?? "Par");
            });
    }, [partnerId]);

    // Fetch partner items
    useEffect(() => {
        if (!partnerId) return;
        supabase
            .from("routine_items")
            .select("*")
            .eq("user_id", partnerId)
            .eq("active", true)
            .order("position")
            .then(({ data }) => setItems((data as RoutineItem[]) ?? []));
    }, [partnerId]);

    // Fetch partner logs for month
    useEffect(() => {
        if (!partnerId) return;
        setLoading(true);
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;
        supabase
            .from("routine_day_logs")
            .select("*")
            .eq("user_id", partnerId)
            .gte("day", startDate)
            .lt("day", endDate)
            .order("day")
            .then(({ data }) => {
                setLogs((data as RoutineDayLog[]) ?? []);
                setLoading(false);
            });
    }, [partnerId, year, month]);

    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(l => l.day === today);
    const todayChecked = (todayLog?.checked_item_ids ?? []) as string[];

    if (!partnerId) {
        return (
            <div className="rounded-2xl border bg-card p-6 text-center">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">O teu par ainda não se juntou.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground text-center">
                Rotina de <span className="text-foreground font-semibold">{partnerName}</span>
            </p>

            <RoutineCalendar
                logs={logs}
                year={year}
                month={month}
                onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
            />

            {items.length > 0 && (
                <>
                    <p className="text-xs font-medium text-muted-foreground px-1">
                        Hábitos de hoje ({todayChecked.length}/{items.length})
                    </p>
                    <RoutineChecklist items={items} checkedIds={todayChecked} onToggle={() => { }} readOnly />
                </>
            )}

            {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    {partnerName} ainda não criou hábitos.
                </p>
            )}
        </div>
    );
}

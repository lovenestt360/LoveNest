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
            <div className="rounded-[3rem] bg-slate-50 border border-slate-100 p-16 text-center space-y-4 opacity-40 grayscale">
                <div className="h-20 w-20 rounded-full bg-white mx-auto flex items-center justify-center shadow-sm">
                  <Heart className="h-10 w-10 text-slate-300" />
                </div>
                <div>
                  <p className="font-black text-[12px] text-slate-400 uppercase tracking-widest">O teu par ainda não se juntou.</p>
                  <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase tracking-tight italic">Convida o teu amor nas definições! 🤍</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in px-1">
            <div className="flex flex-col items-center gap-2">
               <h3 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-300">Rotina do Amor</h3>
               <p className="text-xl font-black text-slate-900 tracking-tighter">{partnerName} ✨</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-apple overflow-hidden p-2">
              <RoutineCalendar
                  logs={logs}
                  year={year}
                  month={month}
                  onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
              />
            </div>

            {items.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] px-4 flex items-center justify-between">
                        HÁBITOS HOJE
                        <span className="text-slate-400">{todayChecked.length}/{items.length}</span>
                    </h4>
                    <RoutineChecklist items={items} checkedIds={todayChecked} onToggle={() => { }} readOnly />
                </div>
            )}

            {items.length === 0 && (
                <div className="py-20 text-center space-y-2 grayscale opacity-40">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
                        Sem hábitos configurados
                    </p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">
                        {partnerName} ainda está a organizar o plano! ✨
                    </p>
                </div>
            )}
        </div>
    );
}

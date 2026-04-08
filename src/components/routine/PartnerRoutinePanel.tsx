import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { RoutineCalendar } from "./RoutineCalendar";
import { RoutineChecklist } from "./RoutineChecklist";
import { Loader2, Heart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineItem } from "@/hooks/useRoutineItems";
import type { RoutineDayLog } from "@/hooks/useRoutineLogs";

export function PartnerRoutinePanel() {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();

    // Usa o hook já existente — consistente com o resto da app
    const { partner, loading: loadingPartner } = usePartnerProfile();
    const partnerId = partner?.user_id ?? null;
    const partnerName = partner?.display_name ?? "Amor";
    const partnerAvatar = partner?.avatar_url ?? null;

    const [items, setItems] = useState<RoutineItem[]>([]);
    const [logs, setLogs] = useState<RoutineDayLog[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    // ── Buscar hábitos do parceiro (filtrando por partner.user_id)
    useEffect(() => {
        if (!partnerId) return;
        setLoadingItems(true);
        supabase
            .from("routine_items")
            .select("*")
            .eq("user_id", partnerId)   // ← parceiro, NÃO o utilizador atual
            .eq("active", true)
            .order("position")
            .then(({ data, error }) => {
                if (error) console.error("PartnerRoutinePanel: erro ao buscar hábitos:", error);
                setItems((data as RoutineItem[]) ?? []);
                setLoadingItems(false);
            });
    }, [partnerId]);

    // ── Buscar logs mensais do parceiro
    useEffect(() => {
        if (!partnerId) return;
        setLoadingLogs(true);
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        supabase
            .from("routine_day_logs")
            .select("*")
            .eq("user_id", partnerId)   // ← parceiro, NÃO o utilizador atual
            .gte("day", startDate)
            .lt("day", endDate)
            .order("day")
            .then(({ data, error }) => {
                if (error) console.error("PartnerRoutinePanel: erro ao buscar logs:", error);
                setLogs((data as RoutineDayLog[]) ?? []);
                setLoadingLogs(false);
            });
    }, [partnerId, year, month]);

    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(l => l.day === today);
    const todayChecked = (todayLog?.checked_item_ids ?? []) as string[];

    // ── Estado: a carregar partner
    if (loadingPartner) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    // ── Estado: parceiro não ligado
    if (!partnerId) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/40 backdrop-blur-sm p-10 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center">
                    <Heart className="h-7 w-7 text-rose-300" />
                </div>
                <p className="font-bold text-slate-500">O teu parceiro ainda não está ligado</p>
                <p className="text-xs text-slate-400">Convida-o para se juntar ao vosso ninho 💛</p>
            </div>
        );
    }

    // ── Estado: a carregar dados
    if (loadingItems || loadingLogs) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ── Header: identidade do parceiro ── */}
            <div className="flex items-center gap-3 px-1">
                <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 ring-2 ring-white shadow-sm",
                    "bg-gradient-to-br from-rose-300 to-pink-400 text-white"
                )}>
                    {partnerAvatar ? (
                        <img
                            src={partnerAvatar}
                            alt={partnerName}
                            className="h-full w-full object-cover rounded-full"
                        />
                    ) : (
                        <span>{partnerName.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Rotina de</p>
                    <p className="font-black text-slate-800 leading-tight">{partnerName} 💛</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {todayChecked.length}/{items.length} hoje
                    </span>
                </div>
            </div>

            {/* ── Calendário de progresso ── */}
            <div className="rounded-[2.5rem] overflow-hidden bg-white/30 bg-white/40 backdrop-blur-xl border border-white/20 shadow-sm">
                <RoutineCalendar
                    logs={logs}
                    year={year}
                    month={month}
                    onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
                />
            </div>

            {/* ── Checklist de hoje (read-only) ── */}
            {items.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] px-2">
                        Hábitos de hoje
                    </p>
                    <RoutineChecklist
                        items={items}
                        checkedIds={todayChecked}
                        onToggle={() => {}}
                        readOnly
                    />
                </div>
            ) : (
                <div className="rounded-2xl bg-slate-50/60 border border-slate-100 py-10 text-center space-y-1">
                    <UserRound className="mx-auto h-8 w-8 text-slate-200" />
                    <p className="text-sm font-bold text-slate-400">
                        {partnerName} ainda não criou hábitos
                    </p>
                </div>
            )}
        </div>
    );
}

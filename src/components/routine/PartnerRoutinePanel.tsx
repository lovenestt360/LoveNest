import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { RoutineCalendar } from "./RoutineCalendar";
import { RoutineChecklist } from "./RoutineChecklist";
import { Loader2, Heart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineItem } from "@/hooks/useRoutineItems";
import type { RoutineDayLog } from "@/hooks/useRoutineLogs";

export function PartnerRoutinePanel() {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();

    // ── Fase 1: obter partnerId direto da tabela members (fonte de verdade)
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState<string>("Amor");
    const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
    const [loadingPartner, setLoadingPartner] = useState(true);

    useEffect(() => {
        if (!spaceId || !user) return;
        setLoadingPartner(true);

        // Consulta directa a members — independente de profiles
        supabase
            .from("members")
            .select("user_id")
            .eq("couple_space_id", spaceId)
            .neq("user_id", user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) console.error("PartnerRoutinePanel: erro members:", error);

                if (data?.user_id) {
                    setPartnerId(data.user_id);

                    // Tenta obter o nome/avatar do profile — com fallback, não bloqueia
                    supabase
                        .from("profiles")
                        .select("display_name, avatar_url")
                        .eq("user_id", data.user_id)
                        .maybeSingle()
                        .then(({ data: profile }) => {
                            if (profile?.display_name) setPartnerName(profile.display_name.split(" ")[0]);
                            if (profile?.avatar_url)   setPartnerAvatar(profile.avatar_url);
                        });
                }

                setLoadingPartner(false);
            });
    }, [spaceId, user]);

    // ── Fase 2: hábitos e logs do parceiro
    const [items, setItems] = useState<RoutineItem[]>([]);
    const [logs, setLogs] = useState<RoutineDayLog[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    useEffect(() => {
        if (!partnerId) return;
        setLoadingItems(true);
        supabase
            .from("routine_items")
            .select("*")
            .eq("user_id", partnerId)  // ← parceiro, NÃO o utilizador atual
            .eq("active", true)
            .order("position")
            .then(({ data, error }) => {
                if (error) console.error("PartnerRoutinePanel: erro items:", error);
                setItems((data as RoutineItem[]) ?? []);
                setLoadingItems(false);
            });
    }, [partnerId]);

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
            .eq("user_id", partnerId)  // ← parceiro, NÃO o utilizador atual
            .gte("day", startDate)
            .lt("day", endDate)
            .order("day")
            .then(({ data, error }) => {
                if (error) console.error("PartnerRoutinePanel: erro logs:", error);
                setLogs((data as RoutineDayLog[]) ?? []);
                setLoadingLogs(false);
            });
    }, [partnerId, year, month]);

    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(l => l.day === today);
    const todayChecked = (todayLog?.checked_item_ids ?? []) as string[];

    // ── Loading inicial (à espera do partnerId)
    if (loadingPartner) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    // ── Parceiro não encontrado em members
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

    // ── Loading dos dados
    if (loadingItems || loadingLogs) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-[#e5e5e5] bg-rose-50 flex items-center justify-center text-sm font-semibold text-rose-400 shadow-sm">
                    {partnerAvatar
                        ? <img src={partnerAvatar} alt={partnerName} className="h-full w-full object-cover" />
                        : <span>{partnerName.charAt(0).toUpperCase()}</span>
                    }
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171]">Rotina de</p>
                    <p className="text-sm font-semibold text-foreground leading-tight">{partnerName}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#e5e5e5] bg-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] font-medium text-[#717171]">
                        {todayChecked.length}/{items.length} hoje
                    </span>
                </div>
            </div>

            {/* Calendário */}
            <RoutineCalendar
                logs={logs}
                year={year}
                month={month}
                onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
            />

            {/* Checklist read-only */}
            {items.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] px-1">
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
                <div className="glass-card py-10 text-center space-y-2">
                    <UserRound className="mx-auto h-7 w-7 text-[#c4c4c4]" strokeWidth={1.5} />
                    <p className="text-sm text-[#717171]">{partnerName} ainda não criou hábitos</p>
                </div>
            )}
        </div>
    );
}

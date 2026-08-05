import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { todayLocal } from "@/lib/timezone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFasting } from "@/features/fasting/useFasting";
import { useFastingCouple } from "@/features/fasting/useFastingCouple";
import { FastingOverview } from "@/features/fasting/FastingOverview";
import { FastingCalendar } from "@/features/fasting/FastingCalendar";
import { FastingDaySheet } from "@/features/fasting/FastingDaySheet";
import { FastingPlan } from "@/features/fasting/FastingPlan";
import { FastingAbstentions } from "@/features/fasting/FastingAbstentions";
import { FastingStats } from "@/features/fasting/FastingStats";
import { FastingReminders } from "@/features/fasting/FastingReminders";
import { FastingGuide } from "@/features/fasting/FastingGuide";
import { FastingCouple } from "@/features/fasting/FastingCouple";
import { FastingPartnerLanding } from "@/features/fasting/FastingPartnerLanding";
import { PLAN_TYPES, DEFAULT_DO_ITEMS, DEFAULT_AVOID_ITEMS } from "@/features/fasting/types";
import type { PlanType, CreatePlanInput } from "@/features/fasting/types";

// ── Wizard de criação de plano ───────────────────────────────────
function CreatePlanWizard({
    onSubmit,
    onBack,
}: {
    onSubmit: (input: CreatePlanInput) => Promise<void>;
    onBack?: () => void;
}) {
    const today = todayLocal();
    const defaultEnd = new Date(new Date(today + "T12:00:00").getTime() + 39 * 86400000).toLocaleDateString("sv-SE");

    const [planName, setPlanName] = useState("O meu Jejum");
    const [planType, setPlanType] = useState<PlanType>("combined");
    const [untilHour, setUntilHour] = useState("15:00");
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [allowed, setAllowed] = useState("");
    const [forbidden, setForbidden] = useState("");
    const [exceptions, setExceptions] = useState("");
    const [saving, setSaving] = useState(false);

    const totalDays = Math.max(1, Math.round(
        (new Date(endDate + "T12:00:00").getTime() - new Date(startDate + "T12:00:00").getTime()) / 86400000
    ) + 1);

    const handleSubmit = async () => {
        setSaving(true);
        await onSubmit({
            plan_name: planName,
            plan_type: planType,
            until_hour: planType === "until_hour" ? untilHour : undefined,
            start_date: startDate,
            end_date: endDate,
            total_days: totalDays,
            rules_allowed: allowed || undefined,
            rules_forbidden: forbidden || undefined,
            rules_exceptions: exceptions || undefined,
            doItems: DEFAULT_DO_ITEMS,
            avoidItems: DEFAULT_AVOID_ITEMS,
        });
        setSaving(false);
    };

    return (
        <div className="glass-card rounded-2xl p-4 space-y-4">
            {onBack && (
                <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground active:text-foreground transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Ver jejum do par
                </button>
            )}

            <div>
                <p className="text-base font-bold text-foreground">Criar o meu Jejum</p>
                <p className="text-xs text-muted-foreground mt-0.5">Um percurso de disciplina, fé e constância — dia após dia.</p>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome do plano</label>
                <Input value={planName} onChange={e => setPlanName(e.target.value)} />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Jejum</label>
                <Select value={planType} onValueChange={v => setPlanType(v as PlanType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PLAN_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {planType === "until_hour" && (
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Até que horas</label>
                    <Select value={untilHour} onValueChange={setUntilHour}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {["12:00", "15:00", "18:00", "21:00"].map(h => (
                                <SelectItem key={h} value={h}>Até às {h}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Data início</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Data fim</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="text-sm font-bold text-foreground">{totalDays} {totalDays === 1 ? "dia" : "dias"}</span>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-green-600">O que é permitido (opcional)</label>
                <Textarea placeholder="Ex: Água, chá, fruta…" value={allowed} onChange={e => setAllowed(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-red-500">O que é proibido (opcional)</label>
                <Textarea placeholder="Ex: Doces, redes sociais…" value={forbidden} onChange={e => setForbidden(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Excepções (opcional)</label>
                <Textarea placeholder="Ex: Domingos, viagens, saúde…" value={exceptions} onChange={e => setExceptions(e.target.value)} rows={2} />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={saving || !planName.trim()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Começar Jejum
            </Button>
        </div>
    );
}

// ── Página Principal ─────────────────────────────────────────────
export default function Fasting({ hideHeader = false }: { hideHeader?: boolean }) {
    const data = useFasting();
    const coupleData = useFastingCouple();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sheetDay, setSheetDay] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);

    if (searchParams.get("register")) {
        setSearchParams({}, { replace: true });
    }

    const openToday = () => { setSheetDay(todayLocal()); setSheetOpen(true); };
    const openDay = (dayKey: string) => { setSheetDay(dayKey); setSheetOpen(true); };

    const loading = data.loading || coupleData.loading;
    const partnerHasPlan = !!coupleData.partner?.profile;

    if (loading) {
        return (
            <section className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </section>
        );
    }

    const header = !hideHeader && (
        <header>
            <h1 className="text-2xl font-semibold tracking-tight">Jejum</h1>
            <p className="text-sm text-muted-foreground">Um percurso de disciplina, fé e constância — dia após dia.</p>
        </header>
    );

    // ── Sem plano próprio ────────────────────────────────────────
    if (!data.profile) {
        // Par tem plano e não quis criar o seu → mostrar landing do par
        if (partnerHasPlan && !showWizard) {
            return (
                <section className="space-y-4 pb-6">
                    {header}
                    <FastingPartnerLanding
                        coupleData={coupleData}
                        createPlan={data.createPlan}
                        onCreateOwn={() => setShowWizard(true)}
                    />
                </section>
            );
        }

        // Ninguém tem plano, ou utilizador escolheu criar o seu
        return (
            <section className="space-y-4 pb-6">
                {header}
                <CreatePlanWizard
                    onSubmit={data.createPlan}
                    onBack={partnerHasPlan ? () => setShowWizard(false) : undefined}
                />
            </section>
        );
    }

    // ── Tenho o meu plano — tabs completas ───────────────────────
    // Última mensagem do par (para notificação no Hoje)
    const lastPartnerMsg = [...coupleData.messages]
        .reverse()
        .find(m => m.sender_id !== coupleData.partner?.userId);

    return (
        <section className="space-y-4 pb-6">
            {header}

            <Tabs defaultValue="hoje" className="w-full">
                <TabsList className="grid w-full grid-cols-6 h-auto">
                    <TabsTrigger value="hoje"      className="text-[10px] py-1.5">Hoje</TabsTrigger>
                    <TabsTrigger value="calendario" className="text-[10px] py-1.5">Cal.</TabsTrigger>
                    <TabsTrigger value="plano"     className="text-[10px] py-1.5">Plano</TabsTrigger>
                    <TabsTrigger value="stats"     className="text-[10px] py-1.5">Stats</TabsTrigger>
                    <TabsTrigger value="casal"     className="text-[10px] py-1.5">Casal</TabsTrigger>
                    <TabsTrigger value="guia"      className="text-[10px] py-1.5">Guia</TabsTrigger>
                </TabsList>

                {/* ── Hoje ── */}
                <TabsContent value="hoje" className="mt-4 space-y-4">
                    {/* Notificação de mensagem do par */}
                    {lastPartnerMsg && (
                        <div className="glass-card rounded-2xl px-4 py-3 flex items-start gap-3">
                            <MessageCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                    {coupleData.partner?.displayName ?? "O teu par"}
                                </p>
                                <p className="text-sm text-foreground mt-0.5 truncate">"{lastPartnerMsg.message}"</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {format(new Date(lastPartnerMsg.created_at), "d MMM, HH:mm", { locale: pt })}
                                </p>
                            </div>
                        </div>
                    )}
                    <FastingOverview data={data} onRegister={openToday} />
                </TabsContent>

                {/* ── Calendário ── */}
                <TabsContent value="calendario" className="mt-4">
                    <FastingCalendar data={data} onDaySelect={openDay} />
                </TabsContent>

                {/* ── Plano ── */}
                <TabsContent value="plano" className="mt-4 space-y-4">
                    <FastingPlan data={data} />
                    <FastingAbstentions data={data} />
                </TabsContent>

                {/* ── Stats ── */}
                <TabsContent value="stats" className="mt-4 space-y-4">
                    <FastingStats data={data} />
                </TabsContent>

                {/* ── Casal ── */}
                <TabsContent value="casal" className="mt-4 space-y-4">
                    <FastingCouple
                        coupleData={coupleData}
                        createPlan={data.createPlan}
                        hasMyPlan={!!data.profile}
                    />
                </TabsContent>

                {/* ── Guia ── */}
                <TabsContent value="guia" className="mt-4 space-y-4">
                    <FastingGuide />
                    <FastingReminders data={data} />
                </TabsContent>
            </Tabs>

            <FastingDaySheet
                data={data}
                dayKey={sheetDay}
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
            />
        </section>
    );
}

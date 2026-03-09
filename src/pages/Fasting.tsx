import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useFasting } from "@/features/fasting/useFasting";
import { FastingOverview } from "@/features/fasting/FastingOverview";
import { FastingCalendar } from "@/features/fasting/FastingCalendar";
import { FastingDaySheet } from "@/features/fasting/FastingDaySheet";
import { FastingPlan } from "@/features/fasting/FastingPlan";
import { FastingAbstentions } from "@/features/fasting/FastingAbstentions";
import { FastingStats } from "@/features/fasting/FastingStats";
import { FastingReminders } from "@/features/fasting/FastingReminders";
import { FastingGuide } from "@/features/fasting/FastingGuide";
import { FastingPartnerShare } from "@/features/fasting/FastingPartnerShare";
import { PLAN_TYPES, DEFAULT_DO_ITEMS, DEFAULT_AVOID_ITEMS, getEasterDate, easterDate } from "@/features/fasting/types";
import type { PlanType, CreatePlanInput } from "@/features/fasting/types";

// ── Wizard de criação de plano ───────────────────────────────────
function CreatePlanWizard({ onSubmit }: { onSubmit: (input: CreatePlanInput) => Promise<void> }) {
    const now = new Date();
    const year = now.getFullYear();
    const easterStr = getEasterDate();
    const startDefault = new Date(new Date(easterStr + "T12:00:00").getTime() - 40 * 86400000)
        .toISOString().slice(0, 10);

    const [planName, setPlanName] = useState("Quaresma " + easterStr.slice(0, 4));
    const [planType, setPlanType] = useState<PlanType>("combined");
    const [untilHour, setUntilHour] = useState("15:00");
    const [startDate, setStartDate] = useState(startDefault);
    const [endDate, setEndDate] = useState(easterStr);
    const [totalDays, setTotalDays] = useState(40);
    const [allowed, setAllowed] = useState("");
    const [forbidden, setForbidden] = useState("");
    const [exceptions, setExceptions] = useState("");
    const [saving, setSaving] = useState(false);

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
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">🕊️ Criar o teu Plano de Jejum</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Um percurso de disciplina, fé e constância — dia após dia.
                </p>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium">Nome do plano</label>
                    <Input value={planName} onChange={e => setPlanName(e.target.value)} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium">Tipo de Jejum</label>
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
                        <label className="text-xs font-medium">Até que horas</label>
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
                        <label className="text-xs font-medium">Data início</label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Data fim</label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium">Total de dias</label>
                    <Input type="number" value={totalDays} onChange={e => setTotalDays(Number(e.target.value))} min={1} max={365} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-green-600">✅ O que é permitido (opcional)</label>
                    <Textarea placeholder="Ex: Água, chá, fruta…" value={allowed} onChange={e => setAllowed(e.target.value)} rows={2} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-red-600">🚫 O que é proibido (opcional)</label>
                    <Textarea placeholder="Ex: Doces, redes sociais…" value={forbidden} onChange={e => setForbidden(e.target.value)} rows={2} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-yellow-600">⚠️ Excepções (opcional)</label>
                    <Textarea placeholder="Ex: Domingos, viagens, saúde…" value={exceptions} onChange={e => setExceptions(e.target.value)} rows={2} />
                </div>

                <Button className="w-full" onClick={handleSubmit} disabled={saving || !planName.trim()}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Começar Jejum 🕯️
                </Button>
            </CardContent>
        </Card>
    );
}

// ── Página Principal ─────────────────────────────────────────────
export default function Fasting() {
    const data = useFasting();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sheetDay, setSheetDay] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    // Auto-abrir registo se ?register=1
    const defaultTab = searchParams.get("register") === "1" ? "hoje" : "hoje";
    if (searchParams.get("register")) {
        setSearchParams({}, { replace: true });
    }

    const openToday = () => {
        setSheetDay(new Date().toISOString().slice(0, 10));
        setSheetOpen(true);
    };

    const openDay = (dayKey: string) => {
        setSheetDay(dayKey);
        setSheetOpen(true);
    };

    if (data.loading) {
        return (
            <section className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </section>
        );
    }

    // Sem plano → wizard
    if (!data.profile) {
        return (
            <section className="space-y-4">
                <header>
                    <h1 className="text-2xl font-semibold tracking-tight">🕯️ Jejum (Páscoa)</h1>
                    <p className="text-sm text-muted-foreground">
                        Um percurso de disciplina, fé e constância — dia após dia.
                    </p>
                </header>
                <CreatePlanWizard onSubmit={data.createPlan} />
            </section>
        );
    }

    return (
        <section className="space-y-4 pb-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">🕯️ Jejum (Páscoa)</h1>
                <p className="text-sm text-muted-foreground">
                    Um percurso de disciplina, fé e constância — dia após dia.
                </p>
            </header>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto">
                    <TabsTrigger value="hoje" className="text-[11px] py-1.5">Hoje</TabsTrigger>
                    <TabsTrigger value="calendario" className="text-[11px] py-1.5">Calendário</TabsTrigger>
                    <TabsTrigger value="plano" className="text-[11px] py-1.5">Plano</TabsTrigger>
                    <TabsTrigger value="stats" className="text-[11px] py-1.5">Stats</TabsTrigger>
                    <TabsTrigger value="guia" className="text-[11px] py-1.5">Guia</TabsTrigger>
                </TabsList>

                {/* ── Hoje ── */}
                <TabsContent value="hoje" className="mt-4 space-y-4">
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
                    <FastingPartnerShare data={data} />
                </TabsContent>

                {/* ── Guia ── */}
                <TabsContent value="guia" className="mt-4 space-y-4">
                    <FastingGuide />
                    <FastingReminders data={data} />
                </TabsContent>
            </Tabs>

            {/* Day Sheet */}
            <FastingDaySheet
                data={data}
                dayKey={sheetDay}
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
            />
        </section>
    );
}

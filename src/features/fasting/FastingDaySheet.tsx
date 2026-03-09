import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFastingReturn } from "./useFasting";
import { DayResult, ItemStatus, dayResultLabel } from "./types";
import { useToast } from "@/hooks/use-toast";

interface Props {
    data: UseFastingReturn;
    dayKey: string | null;
    open: boolean;
    onClose: () => void;
}

const ITEM_STATUSES: { value: ItemStatus; label: string; icon: React.ReactNode; cls: string }[] = [
    { value: "consegui", label: "Consegui", icon: <CheckCircle2 className="h-4 w-4" />, cls: "bg-green-500/15 text-green-700 border-green-500/30" },
    { value: "falhei", label: "Falhei", icon: <XCircle className="h-4 w-4" />, cls: "bg-red-500/15 text-red-700 border-red-500/30" },
    { value: "pulei", label: "Pulei", icon: <MinusCircle className="h-4 w-4" />, cls: "bg-muted text-muted-foreground border-border" },
];

export function FastingDaySheet({ data, dayKey, open, onClose }: Props) {
    const { upsertDayLog, upsertItemLog, ensureDayLog, dayLogs, templates, todayItems, profile } = data;
    const { toast } = useToast();

    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState("");
    const [result, setResult] = useState<DayResult>(null);
    const [mood, setMood] = useState<string>("");
    const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});

    const isToday = dayKey === new Date().toISOString().slice(0, 10);
    const log = dayKey ? dayLogs[dayKey] : null;

    useEffect(() => {
        if (!open) return;
        setNote(log?.note ?? "");
        setResult(log?.result ?? null);
        setMood(log?.mood ?? "");
        // Init item statuses from existing logs
        const statusMap: Record<string, ItemStatus> = {};
        const items = isToday ? todayItems : [];
        for (const item of items) {
            statusMap[item.label] = item.status;
        }
        setItemStatuses(statusMap);
    }, [open, log, todayItems, isToday]);

    const toggleItem = (label: string, current: ItemStatus) => {
        const cycle: ItemStatus[] = ["pendente", "consegui", "falhei", "pulei"];
        const idx = cycle.indexOf(current === "pendente" ? "pendente" : current);
        const next = cycle[(idx + 1) % cycle.length];
        setItemStatuses(prev => ({ ...prev, [label]: next }));
    };

    const handleSave = async () => {
        if (!dayKey || !profile) return;
        setSaving(true);
        try {
            let dayLog = log;
            if (!dayLog) dayLog = await ensureDayLog(dayKey);
            if (!dayLog) throw new Error("Não foi possível criar o registo do dia.");

            // Save day log
            await upsertDayLog(dayKey, { result, mood: mood || null, note: note || null });

            // Save item statuses (only changed)
            for (const tpl of templates) {
                const status = itemStatuses[tpl.label] ?? "pendente";
                if (status !== "pendente") {
                    await upsertItemLog(dayLog.id, {
                        template_id: tpl.id,
                        label: tpl.label,
                        section: tpl.section,
                        status,
                    });
                }
            }

            toast({ title: "Dia guardado ✓" });
            onClose();
        } catch (err: any) {
            toast({ title: "Erro ao guardar", description: err?.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleFinalize = async () => {
        if (!dayKey || !result) {
            toast({ title: "Escolhe um resultado antes de finalizar.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            let dayLog = log;
            if (!dayLog) dayLog = await ensureDayLog(dayKey);
            if (!dayLog) throw new Error("Não foi possível criar o registo do dia.");

            await upsertDayLog(dayKey, { result, mood: mood || null, note: note || null, finalized: true });

            for (const tpl of templates) {
                const status = itemStatuses[tpl.label] ?? "pendente";
                if (status !== "pendente") {
                    await upsertItemLog(dayLog.id, {
                        template_id: tpl.id, label: tpl.label, section: tpl.section, status,
                    });
                }
            }

            toast({ title: "Dia finalizado! 🙏" });
            onClose();
        } catch (err: any) {
            toast({ title: "Erro ao finalizar", description: err?.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const doItems = templates.filter(t => t.section === "fazer" && t.is_active);
    const avoidItems = templates.filter(t => t.section === "evitar" && t.is_active);

    const getStatus = (label: string): ItemStatus => itemStatuses[label] ?? "pendente";

    const ItemRow = ({ label, section }: { label: string; section: "fazer" | "evitar" }) => {
        const status = getStatus(label);
        const cls = ITEM_STATUSES.find(s => s.value === status);
        return (
            <button
                type="button"
                onClick={() => toggleItem(label, status)}
                className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                    cls?.cls ?? "border-border text-foreground bg-muted/30"
                )}
            >
                <span>{label}</span>
                <span className="flex items-center gap-1 text-xs">
                    {cls?.icon} {cls?.label ?? "Pendente"}
                </span>
            </button>
        );
    };

    return (
        <Sheet open={open} onOpenChange={v => !v && onClose()}>
            <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/50 pb-[max(env(safe-area-inset-bottom),1rem)] max-h-[90vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                    <SheetTitle className="text-left">
                        {dayKey ? format(new Date(dayKey + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: pt }) : "—"}
                        {log?.finalized && <span className="ml-2 text-xs text-green-600 font-normal">✓ Finalizado</span>}
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-5">
                    {/* Section A: O que fiz */}
                    {doItems.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">A — O que fiz</p>
                            <div className="space-y-2">
                                {doItems.map(t => <ItemRow key={t.id} label={t.label} section="fazer" />)}
                            </div>
                        </div>
                    )}

                    {/* Section B: O que evitei */}
                    {avoidItems.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">B — O que evitei</p>
                            <div className="space-y-2">
                                {avoidItems.map(t => <ItemRow key={t.id} label={t.label} section="evitar" />)}
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resultado do dia</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(["cumprido", "parcial", "falhei"] as DayResult[]).map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setResult(r)}
                                    className={cn(
                                        "rounded-xl border py-2 text-xs font-bold transition-all",
                                        result === r
                                            ? r === "cumprido" ? "bg-green-500 text-white border-green-500"
                                                : r === "parcial" ? "bg-yellow-400 text-white border-yellow-400"
                                                    : "bg-red-500 text-white border-red-500"
                                            : "border-border text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {dayResultLabel(r)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mood */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Como me senti (opcional)</p>
                        <div className="flex gap-2">
                            {[{ v: "otimo", l: "😄" }, { v: "bom", l: "🙂" }, { v: "neutro", l: "😐" }, { v: "mau", l: "😔" }].map(m => (
                                <button
                                    key={m.v}
                                    type="button"
                                    onClick={() => setMood(prev => prev === m.v ? "" : m.v)}
                                    className={cn(
                                        "flex-1 rounded-xl border py-2 text-xl transition-all",
                                        mood === m.v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                                    )}
                                >
                                    {m.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nota privada (opcional)</p>
                        <Textarea
                            placeholder="Como correu o dia…"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <Button variant="outline" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Guardar
                        </Button>
                        <Button onClick={handleFinalize} disabled={saving || !result}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Finalizar dia
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

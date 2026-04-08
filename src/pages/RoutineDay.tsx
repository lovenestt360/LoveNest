import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { RoutineChecklist } from "@/components/routine/RoutineChecklist";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function RoutineDay() {
    const { date } = useParams<{ date: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { activeItems, loading: itemsLoading } = useRoutineItems();
    const { logs, fetchMonth, upsertLog, getLogForDay, loading: logsLoading, isReady } = useRoutineLogs();

    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const day = date ?? new Date().toISOString().slice(0, 10);

    // Fetch month for this day
    useEffect(() => {
        const d = new Date(day);
        fetchMonth(d.getFullYear(), d.getMonth() + 1);
    }, [day, fetchMonth]);

    // Load existing log data
    useEffect(() => {
        const log = getLogForDay(day);
        if (log) {
            setCheckedIds((log.checked_item_ids ?? []) as string[]);
            setNotes(log.notes ?? "");
        }
    }, [day, getLogForDay]);

    // Debounced auto-save
    const autoSave = useCallback((newChecked: string[], newNotes?: string) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            upsertLog(day, newChecked, activeItems.length, newNotes ?? notes);
        }, 500);
    }, [day, activeItems, notes, upsertLog]);

    const handleToggle = useCallback((itemId: string) => {
        setCheckedIds(prev => {
            const newChecked = prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId];
            autoSave(newChecked);
            return newChecked;
        });
    }, [autoSave]);

    const handleSave = useCallback(async () => {
        if (!isReady) return;
        setSaving(true);
        clearTimeout(debounceRef.current);
        await upsertLog(day, checkedIds, activeItems.length, notes);
        toast({ title: "Rotina salva ✓" });
        setSaving(false);
    }, [day, checkedIds, activeItems, notes, upsertLog, toast]);

    const done = checkedIds.filter(id => activeItems.some(i => i.id === id)).length;
    const loading = itemsLoading || logsLoading;
    const dayLabel = format(new Date(day + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: pt });

    return (
        <section className="space-y-4 pb-24">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/rotina")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-semibold capitalize">{dayLabel}</h1>
                    <p className="text-xs text-muted-foreground">{done}/{activeItems.length} completados</p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving || !isReady}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <RoutineChecklist
                        items={activeItems}
                        checkedIds={checkedIds}
                        onToggle={(id) => isReady && handleToggle(id)}
                        readOnly={!isReady}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground px-1">Notas (só para ti)</label>
                        <Textarea
                            value={notes}
                            disabled={!isReady}
                            onChange={(e) => {
                                setNotes(e.target.value);
                                isReady && autoSave(checkedIds, e.target.value);
                            }}
                            placeholder="Observações do dia…"
                            className="min-h-[80px]"
                        />
                    </div>
                </>
            )}
        </section>
    );
}

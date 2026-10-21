import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { todayLocal } from "@/lib/timezone";
import { useRoutineItems } from "@/hooks/useRoutineItems";
import { useRoutineLogs } from "@/hooks/useRoutineLogs";
import { RoutineChecklist } from "@/components/routine/RoutineChecklist";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pt } from "date-fns/locale";

export default function RoutineDay() {
    const { date } = useParams<{ date: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { activeItems, loading: itemsLoading } = useRoutineItems();
    const { logs, fetchMonth, upsertLog, getLogForDay, loading: logsLoading, isReady, canWrite } = useRoutineLogs();

    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const day = date ?? todayLocal();

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
        if (!canWrite) return;
        setSaving(true);
        clearTimeout(debounceRef.current);
        await upsertLog(day, checkedIds, activeItems.length, notes);
        toast({ title: "Rotina salva ✓" });
        setSaving(false);
    }, [day, checkedIds, activeItems, notes, upsertLog, toast, canWrite]);

    const done = checkedIds.filter(id => activeItems.some(i => i.id === id)).length;
    const loading = itemsLoading || logsLoading;
    const dayLabel = format(new Date(day + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: pt });

    return (
        <section className="ink-primary space-y-4 animate-fade-in">
            <ScreenHeader
                title="Rotina do dia"
                subtitle={`${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} · ${done}/${activeItems.length}`}
                onBack={() => navigate("/plano?tab=rotina")}
                action={
                    <Button size="icon" aria-label="Guardar" className="h-10 w-10 shrink-0 rounded-full [background:#0B1324] hover:[background:#0B1324] hover:opacity-90 text-white dark:[background:hsl(var(--foreground))] dark:text-background" onClick={handleSave} disabled={saving || !canWrite}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                }
            />

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <RoutineChecklist
                        items={activeItems}
                        checkedIds={checkedIds}
                        onToggle={(id) => canWrite && handleToggle(id)}
                        readOnly={!canWrite}
                    />

                    <div className="space-y-2">
                        <label className="px-1 text-[15px] font-semibold text-foreground">Notas <span className="font-normal text-muted-foreground">· só para ti</span></label>
                        <Textarea
                            value={notes}
                            disabled={!isReady}
                            onChange={(e) => {
                                setNotes(e.target.value);
                                isReady && autoSave(checkedIds, e.target.value);
                            }}
                            placeholder="Observações do dia…"
                            className="min-h-[90px] rounded-[16px] border-[#ECE8E3] bg-white dark:border-border dark:bg-card"
                        />
                    </div>
                </>
            )}
        </section>
    );
}

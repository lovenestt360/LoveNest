import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRoutineItems, type RoutineItem } from "@/hooks/useRoutineItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, ArrowUp, ArrowDown, Trash2, Loader2 } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { cn } from "@/lib/utils";

export default function RoutineManage() {
    const navigate = useNavigate();
    const { items, loading, addItem, updateItem, deleteItem, swapPositions } = useRoutineItems();

    const [newTitle, setNewTitle] = useState("");
    const [newEmoji, setNewEmoji] = useState("");
    const [adding, setAdding] = useState(false);

    const handleAdd = useCallback(async () => {
        if (!newTitle.trim()) return;
        setAdding(true);
        await addItem(newTitle.trim(), newEmoji.trim() || undefined);
        setNewTitle("");
        setNewEmoji("");
        setAdding(false);
    }, [newTitle, newEmoji, addItem]);

    const handleMoveUp = useCallback((item: RoutineItem, idx: number) => {
        if (idx === 0) return;
        swapPositions(item.id, items[idx - 1].id);
    }, [items, swapPositions]);

    const handleMoveDown = useCallback((item: RoutineItem, idx: number) => {
        if (idx === items.length - 1) return;
        swapPositions(item.id, items[idx + 1].id);
    }, [items, swapPositions]);

    return (
        <section className="ink-primary space-y-4 animate-fade-in">
            <ScreenHeader title="Gerir hábitos" subtitle="A tua rotina diária" onBack={() => navigate("/plano?tab=rotina")} />

            {/* Add new */}
            <div className="glass-card space-y-3 p-4">
                <p className="text-[15px] font-semibold">Adicionar hábito</p>
                <div className="flex gap-2">
                    <Input
                        value={newEmoji}
                        onChange={(e) => setNewEmoji(e.target.value)}
                        placeholder="😀"
                        className="w-14 text-center text-lg h-11 rounded-[14px] border-[#ECE8E3] bg-[#F7F5F2] dark:border-border dark:bg-muted"
                        maxLength={2}
                    />
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Beber 2L de água"
                        className="flex-1 h-11 rounded-[14px] border-[#ECE8E3] bg-[#F7F5F2] dark:border-border dark:bg-muted"
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                    />
                    <Button size="icon" className="h-11 w-11 shrink-0 rounded-[14px] [background:#0B1324] hover:[background:#0B1324] hover:opacity-90 text-white dark:[background:hsl(var(--foreground))] dark:text-background" onClick={handleAdd} disabled={!newTitle.trim() || adding} aria-label="Adicionar">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : items.length === 0 ? (
                <div className="glass-card p-8 text-center">
                    <p className="text-[15px] font-semibold text-foreground">Ainda sem hábitos</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Escreve o primeiro em cima.</p>
                </div>
            ) : (
                <div className="glass-card divide-y divide-[#ECE8E3] overflow-hidden dark:divide-border">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3.5",
                                !item.active && "opacity-50"
                            )}
                        >
                            {/* Emoji */}
                            <span className="text-lg w-7 text-center shrink-0">{item.emoji || "📌"}</span>

                            {/* Title */}
                            <span className="flex-1 text-[14px] font-semibold">{item.title}</span>

                            {/* Active toggle */}
                            <Switch
                                checked={item.active}
                                onCheckedChange={(v) => updateItem(item.id, { active: v })}
                            />

                            {/* Reorder */}
                            <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => handleMoveUp(item, idx)} disabled={idx === 0}
                            >
                                <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => handleMoveDown(item, idx)} disabled={idx === items.length - 1}
                            >
                                <ArrowDown className="h-3.5 w-3.5" />
                            </Button>

                            {/* Delete */}
                            <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => { if (confirm("Apagar este hábito?")) deleteItem(item.id); }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRoutineItems, type RoutineItem } from "@/hooks/useRoutineItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, ArrowUp, ArrowDown, Trash2, Loader2 } from "lucide-react";
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
        <section className="space-y-4 pb-24">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/rotina")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-semibold">Gerir hábitos</h1>
            </div>

            {/* Add new */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
                <p className="text-sm font-medium">Adicionar hábito</p>
                <div className="flex gap-2">
                    <Input
                        value={newEmoji}
                        onChange={(e) => setNewEmoji(e.target.value)}
                        placeholder="😀"
                        className="w-14 text-center text-lg"
                        maxLength={2}
                    />
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Beber 2L de água"
                        className="flex-1"
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                    />
                    <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleAdd} disabled={!newTitle.trim() || adding}>
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
                <div className="rounded-2xl border bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum hábito ainda. Adiciona acima!</p>
                </div>
            ) : (
                <div className="rounded-2xl border bg-card divide-y">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3",
                                !item.active && "opacity-50"
                            )}
                        >
                            {/* Emoji */}
                            <span className="text-lg w-7 text-center shrink-0">{item.emoji || "📌"}</span>

                            {/* Title */}
                            <span className="flex-1 text-sm font-medium">{item.title}</span>

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

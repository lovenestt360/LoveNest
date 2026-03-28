import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRoutineItems, type RoutineItem } from "@/hooks/useRoutineItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, ArrowUp, ArrowDown, Trash2, Loader2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
    GlassModal, 
    GlassModalContent, 
    GlassModalHeader, 
    GlassModalTitle, 
    GlassModalDescription 
} from "@/components/ui/GlassModal";

export default function RoutineManage() {
    const navigate = useNavigate();
    const { items, loading, addItem, updateItem, deleteItem, swapPositions } = useRoutineItems();

    const [newTitle, setNewTitle] = useState("");
    const [newEmoji, setNewEmoji] = useState("");
    const [adding, setAdding] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleAdd = useCallback(async () => {
        if (!newTitle.trim()) return;
        setAdding(true);
        await addItem(newTitle.trim(), newEmoji.trim() || undefined);
        setNewTitle("");
        setNewEmoji("");
        setAdding(false);
        setIsAddModalOpen(false);
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
        <section className="space-y-6 pb-24 px-4 pt-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-slate-100/50" onClick={() => navigate("/plano?tab=rotina")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Hábitos</h1>
                </div>
                <Button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-10 px-6 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                    <Plus className="mr-1.5 h-4 w-4" /> NOVO
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-[2.5rem] border border-slate-100 bg-white/40 backdrop-blur-xl p-12 text-center space-y-4 opacity-40 grayscale">
                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="font-bold text-slate-500">Nenhum hábito ainda</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-4 p-5 rounded-[2.2rem] bg-white shadow-sm border border-slate-50 transition-all",
                                !item.active && "opacity-50 grayscale"
                            )}
                        >
                            {/* Emoji */}
                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shrink-0">
                                {item.emoji || "📌"}
                            </div>
 
                            {/* Title */}
                            <span className="flex-1 font-bold text-slate-900">{item.title}</span>
 
                            <div className="flex items-center gap-1">
                                {/* Active toggle */}
                                <Switch
                                    checked={item.active}
                                    onCheckedChange={(v) => updateItem(item.id, { active: v })}
                                />
    
                                {/* Reorder (Compact) */}
                                <div className="flex flex-col gap-1 ml-2">
                                    <button
                                        onClick={() => handleMoveUp(item, idx)} disabled={idx === 0}
                                        className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center disabled:opacity-30"
                                    >
                                        <ArrowUp className="h-3 w-3 text-slate-400" />
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(item, idx)} disabled={idx === items.length - 1}
                                        className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center disabled:opacity-30"
                                    >
                                        <ArrowDown className="h-3 w-3 text-slate-400" />
                                    </button>
                                </div>
    
                                {/* Delete */}
                                <Button
                                    variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-500 rounded-full ml-1"
                                    onClick={() => { if (confirm("Apagar este hábito?")) deleteItem(item.id); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL ADICIONAR HÁBITO */}
            <GlassModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <GlassModalContent className="p-8 space-y-8">
                    <GlassModalHeader>
                        <GlassModalTitle>Novo Hábito</GlassModalTitle>
                        <GlassModalDescription>O que queres tornar rotina?</GlassModalDescription>
                    </GlassModalHeader>

                    <div className="space-y-6">
                        <div className="flex gap-3">
                            <Input
                                value={newEmoji}
                                onChange={(e) => setNewEmoji(e.target.value)}
                                placeholder="😀"
                                className="h-16 w-16 text-center text-2xl rounded-2xl border-none bg-slate-100/50 focus-visible:ring-0"
                                maxLength={2}
                            />
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Beber água, meditar..."
                                className="flex-1 h-16 rounded-[2rem] border-none bg-slate-100/50 text-lg font-bold focus-visible:ring-0 placeholder:text-slate-200 px-6"
                                onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleAdd} 
                        disabled={!newTitle.trim() || adding}
                        className="w-full h-18 py-6 rounded-[2.5rem] bg-slate-900 text-white font-black text-lg transition-all active:scale-[0.98] shadow-2xl shadow-slate-200"
                    >
                        {adding ? <Loader2 className="h-6 w-6 animate-spin" /> : "ADICIONAR HÁBITO ✨"}
                    </Button>
                </GlassModalContent>
            </GlassModal>
        </section>
    );
}

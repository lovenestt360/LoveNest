import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFastingReturn } from "./useFasting";
import { Abstention, AbstentionCategory, Priority } from "./types";
import { useToast } from "@/hooks/use-toast";

interface Props {
    data: UseFastingReturn;
}

const CATEGORIES: { value: AbstentionCategory; label: string; emoji: string; color: string }[] = [
    { value: "alimentar", label: "Alimentar", emoji: "🥗", color: "bg-orange-500/10 border-orange-500/30" },
    { value: "comportamental", label: "Comportamental", emoji: "🧠", color: "bg-purple-500/10 border-purple-500/30" },
    { value: "digital", label: "Digital", emoji: "📱", color: "bg-blue-500/10 border-blue-500/30" },
];

const PRIORITIES: { value: Priority; label: string; cls: string }[] = [
    { value: "alta", label: "Alta", cls: "text-red-600" },
    { value: "media", label: "Média", cls: "text-yellow-600" },
    { value: "baixa", label: "Baixa", cls: "text-muted-foreground" },
];

const SUGGESTIONS: Record<AbstentionCategory, string[]> = {
    alimentar: ["Doces", "Refrigerantes", "Fritos", "Carne", "Fast food", "Álcool", "Café", "Snacks"],
    comportamental: ["Discussões", "Palavrões", "Pornografia", "Fofoca", "Críticas desnecessárias", "Mentiras"],
    digital: ["TikTok", "Instagram", "Séries/Netflix", "Jogos", "YouTube (lazer)", "WhatsApp (lazer)"],
};

export function FastingAbstentions({ data }: Props) {
    const { abstentions, saveAbstentions, profile } = data;
    const { toast } = useToast();

    const [list, setList] = useState<Omit<Abstention, "id" | "user_id" | "profile_id" | "created_at">[]>(
        abstentions.map(a => ({
            category: a.category, label: a.label, priority: a.priority,
            note: a.note, sort_order: a.sort_order,
        }))
    );
    const [newLabel, setNewLabel] = useState("");
    const [newCategory, setNewCategory] = useState<AbstentionCategory>("alimentar");
    const [newPriority, setNewPriority] = useState<Priority>("media");
    const [expanded, setExpanded] = useState<AbstentionCategory | null>("alimentar");
    const [saving, setSaving] = useState(false);

    if (!profile) return (
        <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Cria um plano primeiro.</p>
        </div>
    );

    const addItem = () => {
        if (!newLabel.trim()) return;
        setList(prev => [...prev, {
            category: newCategory, label: newLabel.trim(),
            priority: newPriority, note: null, sort_order: prev.length,
        }]);
        setNewLabel("");
    };

    const addSuggestion = (cat: AbstentionCategory, label: string) => {
        if (list.some(i => i.label === label && i.category === cat)) return;
        setList(prev => [...prev, { category: cat, label, priority: "media", note: null, sort_order: prev.length }]);
    };

    const remove = (idx: number) => setList(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        setSaving(true);
        await saveAbstentions(list);
        setSaving(false);
        toast({ title: "Abstenções guardadas ✓" });
    };

    return (
        <div className="space-y-4">
            {/* Add new */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adicionar abstenção</p>
                <div className="flex gap-2">
                    <Input
                        placeholder="Ex: Doces, TikTok…"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addItem()}
                        className="flex-1"
                    />
                    <Select value={newCategory} onValueChange={v => setNewCategory(v as AbstentionCategory)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={newPriority} onValueChange={v => setNewPriority(v as Priority)}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={addItem} size="icon" disabled={!newLabel.trim()}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Categories */}
            {CATEGORIES.map(cat => {
                const items = list.filter(i => i.category === cat.value);
                const suggs = SUGGESTIONS[cat.value].filter(s => !list.some(i => i.label === s && i.category === cat.value));
                const isOpen = expanded === cat.value;

                return (
                    <div key={cat.value} className={cn("glass-card rounded-2xl border", cat.color)}>
                        <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : cat.value)}
                            className="flex w-full items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-2">
                                <span>{cat.emoji}</span>
                                <span className="font-bold text-sm">{cat.label}</span>
                                <span className="text-xs text-muted-foreground">({items.length})</span>
                            </div>
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {isOpen && (
                            <div className="px-4 pb-4 space-y-2">
                                {items.map((item, globalIdx) => {
                                    const idx = list.findIndex(i => i === item);
                                    return (
                                        <div key={idx} className="flex items-center justify-between rounded-xl bg-background/50 border border-border/50 px-3 py-2">
                                            <div>
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className={cn("text-xs", PRIORITIES.find(p => p.value === item.priority)?.cls)}>
                                                    Prioridade: {PRIORITIES.find(p => p.value === item.priority)?.label}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => remove(idx)}>
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    );
                                })}

                                {suggs.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground mb-1.5">Sugestões:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {suggs.slice(0, 6).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => addSuggestion(cat.value, s)}
                                                    className="rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                                                >
                                                    + {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar abstenções
            </Button>
        </div>
    );
}

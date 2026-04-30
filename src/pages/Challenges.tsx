import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, CheckCircle, Plus, Trophy, Flame, Gift, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { id: "romantico", label: "💕 Romântico" },
    { id: "aventura", label: "🌍 Aventura" },
    { id: "comunicacao", label: "💬 Comunicação" },
    { id: "diversao", label: "🎲 Diversão" },
    { id: "crescimento", label: "🌱 Crescimento" },
];

export default function Challenges() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [houseId, setHouseId] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // AI generation
    const [showGenerator, setShowGenerator] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("romantico");
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

    useEffect(() => {
        loadChallenges();
    }, [user]);

    const loadChallenges = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data: member } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
            if (!member) return;
            setHouseId(member.couple_space_id);

            const { data: chData } = await supabase
                .from("couple_challenges")
                .select("*")
                .eq("couple_space_id", member.couple_space_id)
                .order("is_completed", { ascending: true })
                .order("created_at", { ascending: false });

            setChallenges(chData || []);
        } catch (error) {
            console.error("Erro a carregar desafios", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !houseId) return;

        try {
            const { error } = await supabase.from("couple_challenges").insert({
                couple_space_id: houseId,
                title: newTitle,
                description: newDesc,
                is_completed: false
            });
            if (error) throw error;

            toast({ title: "Desafio Criado!", description: "Preparem-se para este desafio 👫" });
            setNewTitle("");
            setNewDesc("");
            setIsAdding(false);
            loadChallenges();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleComplete = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from("couple_challenges").update({
                is_completed: !currentStatus,
                completed_at: !currentStatus ? new Date().toISOString() : null
            }).eq("id", id);

            if (error) throw error;
            loadChallenges();
            if (!currentStatus) {
                setShowSuccessOverlay(true);
                setTimeout(() => setShowSuccessOverlay(false), 2500);
                toast({ title: "Desafio Concluído! 🎉", description: "Continuem a colecionar memórias!", className: "bg-green-500 text-white" });
            }
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleGenerateChallenges = async () => {
        try {
            setGenerating(true);
            setAiSuggestions([]);

            const { data, error } = await supabase.functions.invoke("generate-challenges", {
                body: { category: selectedCategory }
            });

            if (error) throw error;

            if (data?.challenges && data.challenges.length > 0) {
                setAiSuggestions(data.challenges);
            } else {
                toast({ title: "Sem sugestões", description: "Não foi possível gerar desafios. Tenta novamente.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Erro ao gerar", description: error.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handleAddAiChallenge = async (suggestion: { title: string; description: string }) => {
        if (!houseId) return;
        try {
            const { error } = await supabase.from("couple_challenges").insert({
                couple_space_id: houseId,
                title: suggestion.title,
                description: suggestion.description,
                is_completed: false
            });
            if (error) throw error;

            setAiSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
            toast({ title: "Desafio Adicionado! ✨", description: suggestion.title });
            loadChallenges();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleAddAllAiChallenges = async () => {
        if (!houseId || aiSuggestions.length === 0) return;
        try {
            const inserts = aiSuggestions.map(s => ({
                couple_space_id: houseId,
                title: s.title,
                description: s.description,
                is_completed: false
            }));
            const { error } = await supabase.from("couple_challenges").insert(inserts);
            if (error) throw error;

            toast({ title: "Todos Adicionados! 🎉", description: `${aiSuggestions.length} desafios criados.` });
            setAiSuggestions([]);
            setShowGenerator(false);
            loadChallenges();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const completedCount = challenges.filter(c => c.is_completed).length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="px-4 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-[#f0f0f0] flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-[#717171]">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                        Desafios <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </h1>
                </div>
            </header>

            <main className="p-4 space-y-4 max-w-md mx-auto">
                {/* Stats */}
                <div className="bg-white border border-[#f0f0f0] rounded-2xl p-5 text-center shadow-sm">
                    <Trophy className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                    <h2 className="text-3xl font-bold text-foreground">{completedCount}</h2>
                    <p className="text-[12px] text-[#717171] mt-0.5">Desafios concluídos</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {isAdding ? null : (
                        <>
                            <Button onClick={() => setIsAdding(true)} className="flex-1 h-12 rounded-2xl gap-2 shadow-sm" variant="secondary">
                                <Plus className="w-5 h-5" /> Criar Manual
                            </Button>
                            <Button onClick={() => setShowGenerator(!showGenerator)} className="flex-1 h-12 rounded-2xl gap-2 shadow-sm" variant={showGenerator ? "default" : "outline"}>
                                <Sparkles className="w-5 h-5" /> Gerar com IA
                            </Button>
                        </>
                    )}
                </div>

                {/* Manual Add Flow */}
                {isAdding && (
                    <form onSubmit={handleAddChallenge} className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
                        <h3 className="font-bold">Criar Novo Desafio</h3>
                        <Input placeholder="Título (ex: Cozinhar juntos)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus className="bg-muted border-none" />
                        <Textarea placeholder="Descrição (Opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-muted border-none resize-none" rows={3} />
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>Cancelar</Button>
                            <Button type="submit" className="flex-1" disabled={!newTitle.trim()}>Criar Desafio</Button>
                        </div>
                    </form>
                )}

                {/* AI Generator Panel */}
                {showGenerator && (
                    <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-3xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-foreground">Gerador de Desafios IA</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Escolhe uma categoria e a IA sugere 5 desafios únicos para vocês!</p>

                        {/* Category Selector */}
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${selectedCategory === cat.id
                                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                            : 'bg-card border-border hover:bg-muted text-foreground'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <Button
                            onClick={handleGenerateChallenges}
                            disabled={generating}
                            className="w-full h-12 rounded-2xl gap-2 font-bold"
                        >
                            {generating ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> A gerar desafios...</>
                            ) : (
                                <><Sparkles className="w-5 h-5" /> Gerar 5 Desafios</>
                            )}
                        </Button>

                        {/* AI Suggestions */}
                        {aiSuggestions.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-foreground">Sugestões da IA:</p>
                                    <Button size="sm" variant="default" className="text-xs rounded-xl" onClick={handleAddAllAiChallenges}>
                                        Adicionar Todos
                                    </Button>
                                </div>
                                {aiSuggestions.map((s, i) => (
                                    <div key={i} className="bg-card border rounded-2xl p-4 flex justify-between items-start gap-3 shadow-sm">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-foreground">{s.title}</h4>
                                            {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                                        </div>
                                        <Button size="sm" variant="outline" className="shrink-0 rounded-xl text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => handleAddAiChallenge(s)}>
                                            <Plus className="w-3 h-3 mr-1" /> Usar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#c0c0c0]" />
                    </div>
                ) : challenges.length === 0 ? (
                    <div className="text-center p-10 bg-white border border-[#f0f0f0] rounded-2xl shadow-sm space-y-2">
                        <Gift className="w-9 h-9 text-[#c0c0c0] mx-auto" />
                        <p className="font-semibold text-foreground">Sem desafios ativos</p>
                        <p className="text-[12px] text-[#717171]">Criem desafios ou usem a IA para gerar sugestões</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {challenges.map((c, idx) => (
                            <div key={c.id} className={cn(
                                "bg-white border border-[#f0f0f0] rounded-2xl p-4 relative overflow-hidden shadow-sm transition-all",
                                c.is_completed ? 'opacity-55' : ''
                            )}>
                                {c.is_completed && <div className="absolute top-3 right-3"><CheckCircle className="w-4 h-4 text-green-500" /></div>}

                                <h4 className={`font-semibold text-base mb-0.5 pr-6 ${c.is_completed ? 'line-through text-[#717171]' : 'text-foreground'}`}>{c.title}</h4>
                                {c.description && <p className="text-[12px] text-[#717171] mb-3">{c.description}</p>}

                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-[11px] text-[#aaa]">
                                        {c.is_completed ? `Concluído ${format(new Date(c.completed_at), "d MMM", { locale: pt })}` : `Criado ${format(new Date(c.created_at), "d MMM", { locale: pt })}`}
                                    </span>
                                    {!c.is_completed ? (
                                        <Button size="sm" onClick={() => handleComplete(c.id, c.is_completed)} className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold px-4 h-8 border-0">
                                            Feito!
                                        </Button>
                                    ) : (
                                        <button onClick={() => handleComplete(c.id, c.is_completed)} className="text-[11px] text-[#aaa] underline underline-offset-2">
                                            Desfazer
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Success Overlay */}
            {showSuccessOverlay && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="text-center space-y-4 animate-bounce-in">
                        <div className="bg-green-500/20 p-6 rounded-full inline-block shadow-glow">
                            <CheckCircle className="w-20 h-20 text-green-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-foreground font-italy tracking-tight">Missão concluída ✨</h2>
                            <p className="text-sm text-muted-foreground font-medium italic">Continuem a crescer juntos, um desafio de cada vez.</p>
                        </div>
                        <div className="flex justify-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Sparkles key={i} className={cn("w-4 h-4 text-yellow-500 animate-pulse", i % 2 === 0 ? "animation-delay-200" : "animation-delay-500")} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

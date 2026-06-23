import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, CheckCircle, Plus, Trophy, Flame, Gift, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useBiblioteca, type Book } from "@/hooks/useBiblioteca";
import { useProfile } from "@/hooks/useProfile";
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
    { id: "livros", label: "📚 Livros" },
];

// Sugestões de desafios de leitura geradas a partir dos livros reais do
// casal (títulos e progresso verdadeiros) — sem IA, sem chamada de rede,
// já que os dados já vêm de useBiblioteca().
function generateBookSuggestions(
    books: Book[],
    ownedBookIds: Set<string>,
    myProgressByBook: Map<string, number>
): { title: string; description: string }[] {
    const accessible = books.filter(b => b.is_free || ownedBookIds.has(b.id));
    const unfinished = accessible
        .filter(b => (myProgressByBook.get(b.id) ?? 0) < 100)
        .sort((a, b) => (myProgressByBook.get(b.id) ?? 0) - (myProgressByBook.get(a.id) ?? 0))
        .slice(0, 3);

    const suggestions: { title: string; description: string }[] = [];

    if (accessible.length === 0) {
        suggestions.push({
            title: "Escolham o vosso primeiro livro",
            description: "Visitem a Biblioteca e escolham uma leitura para começarem juntos.",
        });
    } else {
        for (const book of unfinished) {
            const progress = myProgressByBook.get(book.id) ?? 0;
            suggestions.push({
                title: `Terminem de ler "${book.title}"`,
                description: progress > 0 ? `Já leram ${progress}% — falta pouco!` : "Comecem a ler juntos.",
            });
        }
    }

    suggestions.push({
        title: "Partilhem uma reflexão de leitura",
        description: "Depois de um capítulo, escrevam uma reflexão na Biblioteca para o vosso par ler.",
    });

    return suggestions;
}

export default function Challenges() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { books, ownedBookIds, myProgressByBook } = useBiblioteca();
    const { profile, loading: profileLoading } = useProfile();

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

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from("couple_challenges").delete().eq("id", id);
            if (error) throw error;
            loadChallenges();
            toast({ title: "Desafio removido", description: "O desafio foi apagado da lista." });
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
        setGenerating(true);
        setAiSuggestions([]);

        if (selectedCategory === "livros") {
            setAiSuggestions(generateBookSuggestions(books, ownedBookIds, myProgressByBook));
            setGenerating(false);
            return;
        }

        try {
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

    if (!profileLoading && profile?.usage_mode === "solo") {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-muted-foreground">
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
                <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                    <Trophy className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                    <h2 className="text-3xl font-bold text-foreground">{completedCount}</h2>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Desafios concluídos</p>
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
                    <form onSubmit={handleAddChallenge} className="bg-card border border-border rounded-2xl shadow-sm animate-in slide-in-from-top-2 overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-[15px]">Novo Desafio</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <Input placeholder="Título (ex: Cozinhar juntos)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus className="h-11 rounded-xl bg-muted border-border text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400" />
                            <Textarea placeholder="Descrição (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="rounded-xl bg-muted border-border resize-none text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400" rows={2} />
                            <div className="flex gap-2 pt-1">
                                <button type="button" className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground active:scale-[0.98] transition-all" onClick={() => setIsAdding(false)}>Cancelar</button>
                                <button type="submit" disabled={!newTitle.trim()} className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all">Criar Desafio</button>
                            </div>
                        </div>
                    </form>
                )}

                {/* AI Generator Panel */}
                {showGenerator && (
                    <div className="bg-card border border-border rounded-2xl shadow-sm animate-in slide-in-from-top-2 overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-rose-500" />
                            <h3 className="font-semibold text-[15px]">Gerador de Desafios IA</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-[13px] text-muted-foreground">Escolhe uma categoria e a IA sugere 5 desafios únicos para vocês!</p>

                            {/* Category Selector */}
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedCategory === cat.id
                                                ? 'bg-rose-500 text-white border-rose-500'
                                                : 'bg-card border-border text-muted-foreground active:scale-95'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleGenerateChallenges}
                                disabled={generating}
                                className="w-full h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
                            >
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> A gerar...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Gerar 5 Desafios</>
                                )}
                            </button>

                            {/* AI Suggestions */}
                            {aiSuggestions.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[12px] font-semibold text-muted-foreground">Sugestões:</p>
                                        <button className="text-[12px] font-semibold text-rose-500 active:opacity-70" onClick={handleAddAllAiChallenges}>
                                            Adicionar todos
                                        </button>
                                    </div>
                                    {aiSuggestions.map((s, i) => (
                                        <div key={i} className="bg-muted border border-border rounded-xl p-3 flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-foreground">{s.title}</p>
                                                {s.description && <p className="text-[12px] text-muted-foreground mt-0.5">{s.description}</p>}
                                            </div>
                                            <button className="shrink-0 text-[12px] font-semibold text-rose-500 active:opacity-70 px-2" onClick={() => handleAddAiChallenge(s)}>
                                                + Usar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                ) : challenges.length === 0 ? (
                    <div className="text-center p-10 bg-card border border-border rounded-2xl shadow-sm space-y-2">
                        <Gift className="w-9 h-9 text-muted-foreground/50 mx-auto" />
                        <p className="font-semibold text-foreground">Sem desafios ativos</p>
                        <p className="text-[12px] text-muted-foreground">Criem desafios ou usem a IA para gerar sugestões</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {challenges.map((c, idx) => (
                            <div key={c.id} className={cn(
                                "bg-card border border-border rounded-2xl p-4 relative overflow-hidden shadow-sm transition-all",
                                c.is_completed ? 'opacity-55' : ''
                            )}>
                                {c.is_completed && <div className="absolute top-3 right-3"><CheckCircle className="w-4 h-4 text-green-500" /></div>}

                                <h4 className={`font-semibold text-base mb-0.5 pr-6 ${c.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{c.title}</h4>
                                {c.description && <p className="text-[12px] text-muted-foreground mb-3">{c.description}</p>}

                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-[11px] text-muted-foreground/65">
                                        {c.is_completed ? `Concluído ${format(new Date(c.completed_at), "d MMM", { locale: pt })}` : `Criado ${format(new Date(c.created_at), "d MMM", { locale: pt })}`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 active:bg-red-50 dark:active:bg-red-950/30 active:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        {!c.is_completed ? (
                                            <Button size="sm" onClick={() => handleComplete(c.id, c.is_completed)} className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold px-4 h-8 border-0">
                                                Feito!
                                            </Button>
                                        ) : (
                                            <button onClick={() => handleComplete(c.id, c.is_completed)} className="text-[11px] text-muted-foreground/65 underline underline-offset-2">
                                                Desfazer
                                            </button>
                                        )}
                                    </div>
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

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, CheckCircle, Plus, Trophy, Flame, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

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

    useEffect(() => {
        loadChallenges();
    }, [user]);

    const loadChallenges = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data: member } = await supabase.from("house_members").select("house_id").eq("user_id", user.id).maybeSingle();
            if (!member) return;
            setHouseId(member.house_id);

            const { data: chData } = await supabase
                .from("couple_challenges")
                .select("*")
                .eq("house_id", member.house_id)
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
                house_id: houseId,
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
                toast({ title: "Desafio Concluído! 🎉", description: "Continuem a colecionar memórias!", className: "bg-green-500 text-white" });
            }
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const completedCount = challenges.filter(c => c.is_completed).length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Desafios LoveNest <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                        </h1>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-md mx-auto">
                {/* Stats */}
                <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 text-center shadow-sm">
                    <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h2 className="text-3xl font-black text-primary">{completedCount}</h2>
                    <p className="text-sm font-bold uppercase tracking-widest text-primary/70">Desafios Concluídos</p>
                </div>

                {/* Add Flow */}
                {isAdding ? (
                    <form onSubmit={handleAddChallenge} className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
                        <h3 className="font-bold">Criar Novo Desafio</h3>
                        <Input placeholder="Título (ex: Cozinhar juntos)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus className="bg-muted border-none" />
                        <Textarea placeholder="Descrição (Opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-muted border-none resize-none" rows={3} />
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>Cancelar</Button>
                            <Button type="submit" className="flex-1" disabled={!newTitle.trim()}>Criar Desafio</Button>
                        </div>
                    </form>
                ) : (
                    <Button onClick={() => setIsAdding(true)} className="w-full h-12 rounded-2xl gap-2 shadow-sm" variant="secondary">
                        <Plus className="w-5 h-5" /> Criar Novo Desafio
                    </Button>
                )}

                {/* List */}
                {loading ? (
                    <div className="text-center p-8 animate-pulse font-bold text-muted-foreground tracking-widest text-sm">A CARREGAR...</div>
                ) : challenges.length === 0 ? (
                    <div className="text-center p-10 bg-card border rounded-3xl shadow-sm space-y-3">
                        <Gift className="w-10 h-10 text-muted-foreground mx-auto" />
                        <h3 className="font-bold">Sem Desafios Ativos</h3>
                        <p className="text-sm text-muted-foreground">Criem desafios divertidos para apimentar a relação e colecionar momentos!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {challenges.map((c) => (
                            <div key={c.id} className={`bg-card border rounded-2xl p-5 relative overflow-hidden transition-all shadow-sm ${c.is_completed ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                {c.is_completed && <div className="absolute top-0 right-0 p-3 bg-green-500/10 rounded-bl-2xl"><CheckCircle className="w-5 h-5 text-green-500" /></div>}

                                <h4 className={`font-bold text-lg mb-1 pr-10 ${c.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{c.title}</h4>
                                {c.description && <p className="text-sm text-muted-foreground mb-4">{c.description}</p>}

                                <div className="flex items-center justify-between mt-2 text-xs">
                                    <span className="text-muted-foreground">
                                        {c.is_completed ? `Concluído em ${format(new Date(c.completed_at), "d MMM", { locale: pt })}` : `Criado em ${format(new Date(c.created_at), "d MMM", { locale: pt })}`}
                                    </span>
                                    {!c.is_completed ? (
                                        <Button size="sm" onClick={() => handleComplete(c.id, c.is_completed)} className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold px-4">
                                            Feito!
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="ghost" onClick={() => handleComplete(c.id, c.is_completed)} className="text-[10px] text-muted-foreground underline underline-offset-2">
                                            Desfazer
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

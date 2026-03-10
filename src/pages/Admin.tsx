import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Check, X, FileText, Users, Home, Megaphone, Activity, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "houses" | "announcements">("overview");
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [houses, setHouses] = useState<any[]>([]);
    const [usersCount, setUsersCount] = useState<number>(0);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    // Announcement form
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [sending, setSending] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // 1. Subscriptions
            const { data: subsData } = await supabase
                .from("subscriptions")
                .select(`
                    *,
                    houses (
                        house_name,
                        partner1_name,
                        partner2_name,
                        is_suspended
                    )
                `)
                .order("created_at", { ascending: false });

            setSubscriptions(subsData || []);

            // 2. Houses
            const { data: housesData } = await supabase
                .from("houses")
                .select(`*`)
                .order("created_at", { ascending: false });

            setHouses(housesData || []);

            // 3. Users count
            const { count: usersCountVal } = await supabase
                .from("profiles")
                .select("*", { count: 'exact', head: true });
            setUsersCount(usersCountVal || 0);

            // 4. Announcements
            const { data: annData } = await supabase
                .from("admin_announcements")
                .select("*")
                .order("created_at", { ascending: false });
            setAnnouncements(annData || []);

        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveSub = async (id: string) => {
        try {
            const { error } = await supabase.from("subscriptions").update({ paid: true }).eq("id", id);
            if (error) throw error;
            toast({ title: "Sucesso", description: "Subscrição aprovada!" });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleToggleSuspension = async (houseId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from("houses").update({ is_suspended: !currentStatus }).eq("id", houseId);
            if (error) throw error;
            toast({ title: "Sucesso", description: `Casa ${!currentStatus ? 'suspensa' : 'ativada'} com sucesso.` });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        try {
            setSending(true);
            const { error } = await supabase.from("admin_announcements").insert({
                title: newTitle,
                content: newContent,
                active: true
            });
            if (error) throw error;
            toast({ title: "Anúncio enviado!", description: "Todos os utilizadores verão esta mensagem." });
            setNewTitle("");
            setNewContent("");
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const handleToggleAnnouncement = async (id: string, activeStatus: boolean) => {
        try {
            const { error } = await supabase.from("admin_announcements").update({ active: !activeStatus }).eq("id", id);
            if (error) throw error;
            toast({ title: "Atualizado", description: "O estado do anúncio foi alterado." });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    }

    if (loading && subscriptions.length === 0) {
        return <div className="flex justify-center items-center h-screen animate-pulse">A carregar dashboard admin...</div>;
    }

    const pendingSubs = subscriptions.filter(s => !s.paid);
    const activeSubs = subscriptions.filter(s => s.paid);

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="p-4 space-y-6 max-w-md mx-auto">
                <header className="mb-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                        <ShieldCheck className="w-6 h-6 outline-none" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none mb-1">Painel Admin</h1>
                        <p className="text-sm text-muted-foreground">LoveNest SaaS Management</p>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="flex bg-muted p-1 rounded-xl">
                    <button onClick={() => setTab("overview")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "overview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Overview</button>
                    <button onClick={() => setTab("houses")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "houses" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Casas</button>
                    <button onClick={() => setTab("announcements")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === "announcements" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Avisos</button>
                </div>

                {/* OVERVIEW TAB */}
                {tab === "overview" && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <Home className="w-6 h-6 text-primary mb-2" />
                                <span className="text-2xl font-bold">{houses.length}</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Casas</span>
                            </div>
                            <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <Users className="w-6 h-6 text-blue-500 mb-2" />
                                <span className="text-2xl font-bold">{usersCount}</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Utilizadores</span>
                            </div>
                            <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <Activity className="w-6 h-6 text-green-500 mb-2" />
                                <span className="text-2xl font-bold">{activeSubs.length}</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Planos Ativos</span>
                            </div>
                            <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <FileText className="w-6 h-6 text-yellow-500 mb-2" />
                                <span className="text-2xl font-bold">{pendingSubs.length}</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pendentes</span>
                            </div>
                        </div>

                        {/* Pending Subscriptions widget */}
                        <div>
                            <h2 className="text-lg font-bold mb-3 flex items-center justify-between">
                                Aguardam Pagamento
                                {pendingSubs.length > 0 && <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{pendingSubs.length}</span>}
                            </h2>
                            <div className="space-y-3">
                                {pendingSubs.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhuma subscrição pendente.</p>}
                                {pendingSubs.map((sub) => (
                                    <div key={sub.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold">{sub.houses?.house_name || "Casa sem nome"}</h3>
                                                <p className="text-xs text-muted-foreground">{sub.houses?.partner1_name} & {sub.houses?.partner2_name}</p>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-md">Pendente</span>
                                        </div>
                                        <div className="text-xs bg-muted p-2 rounded flex justify-between">
                                            <span><b>{sub.plan}</b></span>
                                            <span>{sub.payment_method}</span>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <a href={sub.payment_proof_url} target="_blank" rel="noreferrer" className="flex-1 flex justify-center items-center gap-1 py-1.5 border rounded-lg hover:bg-muted text-xs font-medium">
                                                <FileText className="w-3.5 h-3.5" /> Comp.
                                            </a>
                                            <button onClick={() => handleApproveSub(sub.id)} className="flex-1 flex justify-center items-center gap-1 py-1.5 bg-primary text-primary-foreground rounded-lg active:scale-95 text-xs font-medium">
                                                <Check className="w-3.5 h-3.5" /> Aprovar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* HOUSES TAB */}
                {tab === "houses" && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-bold flex items-center gap-2">Gestão de Casas</h2>
                        <div className="space-y-3">
                            {houses.map(house => (
                                <div key={house.id} className={`bg-card border rounded-xl p-4 shadow-sm transition-all ${house.is_suspended ? 'border-destructive/50 opacity-80 bg-destructive/5' : ''}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold flex items-center gap-2">
                                            {house.house_name || "Casa Setup"}
                                            {house.is_suspended && <AlertTriangle className="w-4 h-4 text-destructive" />}
                                        </h3>
                                        <button
                                            onClick={() => handleToggleSuspension(house.id, house.is_suspended)}
                                            className={`text-xs px-2 py-1 rounded font-bold uppercase ${house.is_suspended ? 'bg-primary/20 text-primary' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}
                                        >
                                            {house.is_suspended ? 'Ativar' : 'Suspender'}
                                        </button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{house.partner1_name || '?'} & {house.partner2_name || '?'}</p>
                                    <p className="text-xs text-muted-foreground mt-2 font-mono truncate opacity-60">ID: {house.id}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ANNOUNCEMENTS TAB */}
                {tab === "announcements" && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3">
                            <h2 className="font-bold flex items-center gap-2 text-primary">
                                <Megaphone className="w-5 h-5" /> Enviar Aviso Global
                            </h2>
                            <p className="text-xs text-muted-foreground">Esta mensagem aparecerá no ecrã Home de todas as casas ativas.</p>

                            <div className="space-y-2">
                                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título (ex: Promoção Dia dos Namorados!)" className="bg-background" />
                                <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Conteúdo da mensagem..." className="bg-background resize-none h-20" />
                            </div>

                            <Button onClick={handleCreateAnnouncement} disabled={sending || !newTitle || !newContent} className="w-full gap-2">
                                {sending ? 'A enviar...' : <><Send className="w-4 h-4" /> Disparar Mensagem</>}
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Histórico de Avisos</h3>
                            {announcements.map(ann => (
                                <div key={ann.id} className={`border rounded-xl p-3 text-sm ${ann.active ? 'bg-card' : 'bg-muted opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <b className="truncate pr-2">{ann.title}</b>
                                        <button onClick={() => handleToggleAnnouncement(ann.id, ann.active)} className="text-xs text-primary font-medium underline shrink-0">
                                            {ann.active ? 'Desativar' : 'Ativar'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{ann.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

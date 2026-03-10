import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck, Check, X, FileText, Users, Home,
    Megaphone, Activity, AlertTriangle, Send, LogOut, Image as ImageIcon,
    CreditCard, Tag, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "houses" | "announcements" | "plans" | "users">("overview");
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [houses, setHouses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Announcement form
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);

    // Plan form
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanPrice, setNewPlanPrice] = useState("");
    const [newPlanFeatures, setNewPlanFeatures] = useState("");
    const [creatingPlan, setCreatingPlan] = useState(false);

    const { toast } = useToast();
    const navigate = useNavigate();

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

            // 3. Users profiles
            const { data: usersData } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });
            setUsers(usersData || []);

            // 4. Announcements
            const { data: annData } = await supabase
                .from("admin_announcements")
                .select("*")
                .order("created_at", { ascending: false });
            setAnnouncements(annData || []);

            // 5. Plans
            const { data: plansData } = await supabase
                .from("subscription_plans")
                .select("*")
                .order("created_at", { ascending: false });
            setPlans(plansData || []);

        } catch (error: any) {
            toast({ title: "Erro de Gestão", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("lovenest_admin_token");
        navigate("/admin-login");
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
            setSendingMsg(true);
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
            setSendingMsg(false);
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

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setCreatingPlan(true);
            const featureArray = newPlanFeatures.split(",").map(f => f.trim()).filter(f => f.length > 0);
            const { error } = await supabase.from("subscription_plans").insert({
                name: newPlanName,
                price: newPlanPrice,
                features: featureArray,
                is_active: true
            });
            if (error) throw error;
            toast({ title: "Plano Criado", description: "Novo plano de subscrição adicionado." });
            setNewPlanName("");
            setNewPlanPrice("");
            setNewPlanFeatures("");
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setCreatingPlan(false);
        }
    };

    const handleTogglePlan = async (id: string, activeStatus: boolean) => {
        try {
            const { error } = await supabase.from("subscription_plans").update({ is_active: !activeStatus }).eq("id", id);
            if (error) throw error;
            toast({ title: "Sucesso", description: `Plano ${!activeStatus ? 'ativado' : 'desativado'}.` });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    if (loading && subscriptions.length === 0) {
        return <div className="flex justify-center items-center h-screen animate-pulse bg-background text-foreground tracking-widest font-bold">CARREGANDO SISTEMA...</div>;
    }

    const pendingSubs = subscriptions.filter(s => !s.paid);
    const activeSubs = subscriptions.filter(s => s.paid);

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-muted/30">
            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <img src={selectedImage} alt="Comprovativo" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
                        <Button variant="secondary" className="mt-4" onClick={() => setSelectedImage(null)}>Fechar Visualização</Button>
                    </div>
                </div>
            )}

            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-card border-r flex flex-col h-auto md:h-screen shrink-0">
                <div className="p-6 border-b flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                        <ShieldCheck className="w-6 h-6 outline-none" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-foreground leading-tight">Painel Admin</h1>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">LoveNest SaaS</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
                    <Button variant={tab === "overview" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("overview")}>
                        <Activity className="w-4 h-4" /> <span className="hidden md:inline">Overview</span>
                    </Button>
                    <Button variant={tab === "houses" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("houses")}>
                        <Home className="w-4 h-4" /> <span className="hidden md:inline">Casas ({houses.length})</span>
                    </Button>
                    <Button variant={tab === "users" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("users")}>
                        <Users className="w-4 h-4" /> <span className="hidden md:inline">Utilizadores ({users.length})</span>
                    </Button>
                    <Button variant={tab === "plans" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("plans")}>
                        <Tag className="w-4 h-4" /> <span className="hidden md:inline">Planos</span>
                    </Button>
                    <Button variant={tab === "announcements" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("announcements")}>
                        <Megaphone className="w-4 h-4" /> <span className="hidden md:inline">Avisos</span>
                    </Button>
                </nav>

                <div className="p-4 border-t">
                    <Button variant="destructive" className="w-full justify-start gap-3" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Terminar Sessão</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background relative">

                {/* OVERVIEW TAB */}
                {tab === "overview" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold">Dashboard</h2>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Home className="w-6 h-6 text-primary mb-4" />
                                <span className="text-3xl font-black">{houses.length}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Total Casas</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Users className="w-6 h-6 text-blue-500 mb-4" />
                                <span className="text-3xl font-black">{users.length}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Utilizadores</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left border-green-500/20">
                                <Activity className="w-6 h-6 text-green-500 mb-4" />
                                <span className="text-3xl font-black">{activeSubs.length}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Planos Ativos</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left border-yellow-500/20 bg-yellow-500/5">
                                <FileText className="w-6 h-6 text-yellow-500 mb-4" />
                                <span className="text-3xl font-black">{pendingSubs.length}</span>
                                <span className="text-sm text-yellow-600/70 font-bold uppercase tracking-wider mt-1">Pendentes</span>
                            </div>
                        </div>

                        {/* Pending Subscriptions */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                Aguardam Pagamento
                                {pendingSubs.length > 0 && <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{pendingSubs.length}</span>}
                            </h3>
                            <div className="space-y-3">
                                {pendingSubs.length === 0 && <p className="text-sm text-muted-foreground bg-card p-4 rounded-xl border border-dashed">Nenhuma subscrição pendente de aprovação.</p>}
                                {pendingSubs.map((sub) => (
                                    <div key={sub.id} className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg">{sub.houses?.house_name || "Casa sem nome"}</h4>
                                                <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-md">Pendente</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Casal: {sub.houses?.partner1_name} & {sub.houses?.partner2_name}</p>
                                            <p className="text-sm font-medium mt-1">Plano Solicitado: <span className="text-primary">{sub.plan}</span></p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Método de Pagamento: {sub.payment_method}</p>
                                        </div>
                                        <div className="flex w-full md:w-auto gap-2">
                                            {sub.payment_proof_url ? (
                                                <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => setSelectedImage(sub.payment_proof_url)}>
                                                    <ImageIcon className="w-4 h-4 mr-2" /> Comprovativo
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" disabled className="flex-1 md:flex-none">Sem Anexo</Button>
                                            )}
                                            <Button size="sm" className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveSub(sub.id)}>
                                                <Check className="w-4 h-4 mr-1" /> Aprovar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* HOUSES TAB */}
                {tab === "houses" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Home className="w-6 h-6 text-primary" /> Gestão de Casas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {houses.map((house) => {
                                const sub = subscriptions.find(s => s.house_id === house.id);
                                return (
                                    <div key={house.id} className="bg-card border rounded-2xl p-5 relative shadow-sm hover:shadow-md transition-shadow">
                                        {house.is_suspended && (
                                            <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-1 rounded-md flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Suspensa
                                            </div>
                                        )}
                                        <h3 className="font-bold text-lg mb-1 pr-20 truncate">{house.house_name || "Casa sem Nome"}</h3>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                {house.initials || "LN"}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{house.partner1_name || "Parceiro 1"} & {house.partner2_name || "Parceiro 2"}</p>
                                        </div>

                                        <div className="bg-muted/50 p-3 rounded-lg mb-4 text-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-muted-foreground">Plano:</span>
                                                <span className="font-bold truncate max-w-[120px]">{sub?.plan || "Sem plano"}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Estado:</span>
                                                <span className={sub?.paid ? "text-green-500 font-bold" : "text-yellow-500 font-bold"}>{sub?.paid ? "Ativo" : "Pendente"}</span>
                                            </div>
                                        </div>

                                        <Button
                                            variant={house.is_suspended ? "default" : "destructive"}
                                            className="w-full text-xs font-bold"
                                            onClick={() => handleToggleSuspension(house.id, house.is_suspended)}
                                        >
                                            {house.is_suspended ? "ATIVAR CASA" : "SUSPENDER CONTA"}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {tab === "users" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Todos os Utilizadores</h2>
                        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="p-4 font-bold text-muted-foreground">Nome (Display)</th>
                                            <th className="p-4 font-bold text-muted-foreground">Data Registo</th>
                                            <th className="p-4 font-bold text-muted-foreground">ID Interno</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-4 font-medium">{u.display_name || "Sem Nome"}</td>
                                                <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('pt-PT')}</td>
                                                <td className="p-4 text-xs font-mono text-muted-foreground/60">{u.id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* PLANS TAB */}
                {tab === "plans" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6 text-primary" /> Gestão de Planos</h2>

                        <form onSubmit={handleCreatePlan} className="bg-primary/5 border border-primary/20 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-primary" /> Criar Novo Plano
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-1 block">Nome do Plano</label>
                                    <Input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="Ex: Premium Anual" required className="bg-background" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-1 block">Preço</label>
                                    <Input value={newPlanPrice} onChange={e => setNewPlanPrice(e.target.value)} placeholder="Ex: 5000 MZN / Ano" required className="bg-background" />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="text-sm font-bold text-muted-foreground mb-1 block">Funcionalidades (separadas por vírgula)</label>
                                <Textarea value={newPlanFeatures} onChange={e => setNewPlanFeatures(e.target.value)} placeholder="Ex: Rotinas, Chat Ilimitado, Suporte 24h" required className="bg-background" />
                            </div>
                            <Button type="submit" disabled={creatingPlan} className="w-full md:w-auto">
                                {creatingPlan ? "A criar..." : "Adicionar Plano"}
                            </Button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plans.map((p) => (
                                <div key={p.id} className="bg-card border rounded-2xl p-5 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-xl font-bold text-primary">{p.name}</h4>
                                            <p className="text-2xl font-black">{p.price}</p>
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${p.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                            {p.is_active ? 'Visível' : 'Oculto'}
                                        </span>
                                    </div>
                                    <ul className="space-y-2 mb-6 text-sm text-foreground/80 flex-1">
                                        {p.features?.map((f: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> {f}</li>
                                        ))}
                                    </ul>
                                    <Button variant={p.is_active ? "outline" : "default"} className="w-full" onClick={() => handleTogglePlan(p.id, p.is_active)}>
                                        {p.is_active ? "Desativar Plano" : "Ativar Plano"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ANNOUNCEMENTS TAB */}
                {tab === "announcements" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Central de Avisos</h2>

                        <div className="bg-gradient-to-br from-amber-500/10 to-primary/5 border border-primary/20 rounded-3xl p-6 shadow-sm">
                            <h3 className="font-bold mb-2 text-lg text-foreground flex items-center gap-2">
                                <Send className="w-5 h-5" /> Enviar Aviso Global
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">Esta mensagem aparecerá como um banner no ecrã principal (Home) de todas as casas ativas da plataforma.</p>

                            <div className="space-y-4">
                                <Input
                                    placeholder="Título (ex: Nova Atualização Disponível!)"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="bg-background/80 font-bold border-primary/20"
                                />
                                <Textarea
                                    placeholder="Conteúdo da mensagem..."
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="bg-background/80 min-h-[100px] border-primary/20"
                                />
                                <Button className="w-full md:w-auto h-12 text-md font-bold" onClick={handleCreateAnnouncement} disabled={sendingMsg || !newTitle || !newContent}>
                                    {sendingMsg ? "A enviar..." : <><Send className="w-4 h-4 mr-2" /> Disparar Mensagem Global</>}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">Histórico de Avisos Emitidos</h3>
                            <div className="space-y-3">
                                {announcements.map((ann) => (
                                    <div key={ann.id} className={`bg-card border rounded-2xl p-5 shadow-sm transition-opacity ${!ann.active && 'opacity-60 grayscale'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg">{ann.title}</h4>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${ann.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                {ann.active ? 'Em Exibição' : 'Arquivado'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground mb-4 whitespace-pre-wrap">{ann.content}</p>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground">{new Date(ann.created_at).toLocaleString()}</span>
                                            <Button size="sm" variant={ann.active ? "outline" : "secondary"} onClick={() => handleToggleAnnouncement(ann.id, ann.active)}>
                                                {ann.active ? "Remover do Ecrã" : "Voltar a Exibir"}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {announcements.length === 0 && <p className="text-sm text-muted-foreground italic bg-card p-4 rounded-xl border border-dashed">Nenhum aviso emitido ainda.</p>}
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

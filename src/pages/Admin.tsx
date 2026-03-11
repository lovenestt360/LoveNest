import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck, Check, X, FileText, Users, Home,
    Megaphone, Activity, AlertTriangle, Send, LogOut, Image as ImageIcon,
    CreditCard, Tag, Plus, Trash2, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "houses" | "announcements" | "plans" | "users" | "settings">("overview");
    const [payments, setPayments] = useState<any[]>([]);
    const [houses, setHouses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [paymentSettings, setPaymentSettings] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Announcement form
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);

    // Plan form
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanPrice, setNewPlanPrice] = useState("");
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [creatingPlan, setCreatingPlan] = useState(false);

    // Settings form
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        mpesa_number: "",
        emola_number: "",
        mkesh_number: "",
        account_name: "",
        whatsapp_number: "",
        whatsapp_message_template: ""
    });

    // Manual Plan Assignment
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedHouse, setSelectedHouse] = useState<any>(null);
    const [selectedPlanForAssign, setSelectedPlanForAssign] = useState("");
    const [assignTrialDays, setAssignTrialDays] = useState("0");
    const [assigningPlan, setAssigningPlan] = useState(false);

    const ALL_FEATURES = [
        { id: "home", label: "Home" },
        { id: "chat", label: "Chat" },
        { id: "tasks", label: "Tarefas" },
        { id: "mood", label: "Humor" },
        { id: "memories", label: "Memórias" },
        { id: "agenda", label: "Agenda" },
        { id: "prayer", label: "Oração" },
        { id: "fasting", label: "Jejum" },
        { id: "cycle", label: "Ciclo" },
        { id: "conflicts", label: "Conflitos" },
        { id: "routine", label: "Rotinas" },
        { id: "wallpapers", label: "Wallpapers" },
        { id: "stats", label: "Estatísticas" },
        { id: "time_capsules", label: "Cápsulas" },
        { id: "challenges", label: "Desafios" }
    ];

    const { toast } = useToast();
    const navigate = useNavigate();

    const adminToken = localStorage.getItem("lovenest_admin_token");
    const adminClient = useMemo(() => {
        if (!adminToken) return supabase;
        return createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            {
                global: {
                    headers: { 'x-admin-id': adminToken }
                }
            }
        );
    }, [adminToken]);

    useEffect(() => {
        fetchAllData();
    }, [adminClient]);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // 1. Payments
            const { data: paymentsData } = await adminClient
                .from("payments")
                .select(`
                    *,
                    couple_spaces (
                        house_name,
                        partner1_name,
                        partner2_name,
                        is_suspended,
                        subscription_status
                    )
                `)
                .order("created_at", { ascending: false });
            setPayments(paymentsData || []);

            // 2. Houses
            const { data: housesData } = await adminClient
                .from("couple_spaces")
                .select(`*`)
                .order("created_at", { ascending: false });
            setHouses(housesData || []);

            // 3. Users profiles
            const { data: usersData } = await adminClient
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });
            setUsers(usersData || []);

            // 4. Announcements
            const { data: annData } = await adminClient
                .from("admin_announcements")
                .select("*")
                .order("created_at", { ascending: false });
            setAnnouncements(annData || []);

            // 5. Plans
            const { data: plansData } = await adminClient
                .from("subscription_plans")
                .select("*")
                .order("created_at", { ascending: false });
            setPlans(plansData || []);

            // 6. Payment Settings
            const { data: psData } = await adminClient
                .from("payment_settings")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (psData) {
                setPaymentSettings(psData);
                setSettingsForm({
                    mpesa_number: psData.mpesa_number || "",
                    emola_number: psData.emola_number || "",
                    mkesh_number: psData.mkesh_number || "",
                    account_name: psData.account_name || "",
                    whatsapp_number: psData.whatsapp_number || "",
                    whatsapp_message_template: psData.whatsapp_message_template || ""
                });
            }

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

    const handleApprovePayment = async (paymentId: string, houseId: string, planName: string) => {
        try {
            // Update payment status
            const { error: pErr } = await adminClient.from("payments").update({ status: 'approved' }).eq("id", paymentId);
            if (pErr) throw pErr;

            // Update house subscription
            const { error: hErr } = await adminClient.from("couple_spaces").update({ subscription_status: 'active' }).eq("id", houseId);
            if (hErr) throw hErr;

            toast({ title: "Sucesso", description: "Pagamento aprovado e plano ativo!" });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleToggleSuspension = async (houseId: string, currentStatus: boolean) => {
        try {
            const { error } = await adminClient.from("couple_spaces").update({ is_suspended: !currentStatus }).eq("id", houseId);
            if (error) throw error;
            toast({ title: "Sucesso", description: `Casa ${!currentStatus ? 'suspensa' : 'ativada'} com sucesso.` });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleAssignPlan = async () => {
        if (!selectedHouse || !selectedPlanForAssign) return;
        try {
            setAssigningPlan(true);
            const planDetails = plans.find(p => p.name === selectedPlanForAssign);

            // 1. Update House Status
            const updates: any = {
                subscription_status: 'active'
            };

            const trialDays = parseInt(assignTrialDays);
            if (trialDays > 0) {
                const now = new Date();
                const future = new Date();
                future.setDate(now.getDate() + trialDays);
                updates.trial_started_at = now.toISOString();
                updates.trial_ends_at = future.toISOString();
                updates.trial_used = true;
            }

            const { error: hErr } = await adminClient.from("couple_spaces").update(updates).eq("id", selectedHouse.id);
            if (hErr) throw hErr;

            toast({ title: "Plano Atribuído!", description: `A casa agora tem acesso ao plano ${selectedPlanForAssign}.` });
            setAssignModalOpen(false);
            setSelectedHouse(null);
            setSelectedPlanForAssign("");
            setAssignTrialDays("0");
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setAssigningPlan(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        try {
            setSendingMsg(true);
            const { error } = await adminClient.from("admin_announcements").insert({
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
            const { error } = await adminClient.from("admin_announcements").update({ active: !activeStatus }).eq("id", id);
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
            const { error } = await adminClient.from("subscription_plans").insert({
                name: newPlanName,
                price: newPlanPrice,
                features: selectedFeatures,
                is_active: true
            });
            if (error) throw error;
            toast({ title: "Plano Criado", description: "Novo plano de subscrição adicionado." });
            setNewPlanName("");
            setNewPlanPrice("");
            setSelectedFeatures([]);
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setCreatingPlan(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingSettings(true);
            const { error } = await adminClient.from("payment_settings").upsert({
                id: paymentSettings?.id || 'd16ba2d0-0f2c-497d-acf6-c6bd2a8d5469', // Upsert using explicit ID or fallback
                ...settingsForm,
                updated_at: new Date().toISOString()
            });
            if (error) throw error;
            toast({ title: "Configurações Guardadas", description: "As configurações foram atualizadas com sucesso." });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleTogglePlan = async (id: string, activeStatus: boolean) => {
        try {
            const { error } = await adminClient.from("subscription_plans").update({ is_active: !activeStatus }).eq("id", id);
            if (error) throw error;
            toast({ title: "Sucesso", description: `Plano ${!activeStatus ? 'ativado' : 'desativado'}.` });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("Tens a certeza que queres eliminar este plano? Esta ação não pode ser desfeita.")) return;
        try {
            const { error } = await adminClient.from("subscription_plans").delete().eq("id", id);
            if (error) throw error;
            toast({ title: "Eliminado", description: "Plano eliminado com sucesso." });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    if (loading && payments.length === 0) {
        return <div className="flex justify-center items-center h-screen animate-pulse bg-background text-foreground tracking-widest font-bold">CARREGANDO SISTEMA...</div>;
    }

    const pendingPayments = payments.filter(p => p.status === 'pending');
    const activeHouses = houses.filter(h => h.subscription_status === 'active');

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-muted/30">
            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <img src={selectedImage} alt="Comprovativo" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
                        <Button variant="secondary" className="mt-4" onClick={() => setSelectedImage(null)}>Fechar Visualização</Button>
                    </div>
                </div>
            )}

            {/* Manual Assignment Modal */}
            {assignModalOpen && selectedHouse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border">
                        <div className="p-6 border-b flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-lg">Atribuir Plano Manualmente</h3>
                            <Button variant="ghost" size="icon" onClick={() => setAssignModalOpen(false)}><X className="w-5 h-5" /></Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm font-bold text-muted-foreground mb-1">Casa Selecionada:</p>
                                <p className="font-bold">{selectedHouse.house_name} ({selectedHouse.partner1_name} & {selectedHouse.partner2_name})</p>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-muted-foreground mb-1 block">Escolher Plano</label>
                                <select
                                    className="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm"
                                    value={selectedPlanForAssign}
                                    onChange={(e) => setSelectedPlanForAssign(e.target.value)}
                                >
                                    <option value="">-- Selecione --</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.name}>{p.name} ({p.price})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-muted-foreground mb-1 block">Renovar Trial (Opcional, em dias)</label>
                                <Input type="number" min="0" value={assignTrialDays} onChange={(e) => setAssignTrialDays(e.target.value)} />
                                <p className="text-xs text-muted-foreground mt-1">Coloca 0 para não alterar o período de Trial atual.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancelar</Button>
                            <Button className="font-bold" disabled={!selectedPlanForAssign || assigningPlan} onClick={handleAssignPlan}>
                                {assigningPlan ? "A atribuir..." : "Confirmar Atribuição"}
                            </Button>
                        </div>
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
                    <Button variant={tab === "settings" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("settings")}>
                        <Settings className="w-4 h-4" /> <span className="hidden md:inline">Configurações</span>
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
                                <span className="text-3xl font-black">{activeHouses.length}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Casas Ativas</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left border-yellow-500/20 bg-yellow-500/5">
                                <FileText className="w-6 h-6 text-yellow-500 mb-4" />
                                <span className="text-3xl font-black">{pendingPayments.length}</span>
                                <span className="text-sm text-yellow-600/70 font-bold uppercase tracking-wider mt-1">Pendentes</span>
                            </div>
                        </div>

                        {/* Pending Subscriptions */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                Aguardam Pagamento
                                {pendingPayments.length > 0 && <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{pendingPayments.length}</span>}
                            </h3>
                            <div className="space-y-3">
                                {pendingPayments.length === 0 && <p className="text-sm text-muted-foreground bg-card p-4 rounded-xl border border-dashed">Nenhuma subscrição pendente de aprovação.</p>}
                                {pendingPayments.map((payment) => (
                                    <div key={payment.id} className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg">{payment.houses?.house_name || "Casa sem nome"}</h4>
                                                <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-md">Pendente</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Casal: {payment.houses?.partner1_name} & {payment.houses?.partner2_name}</p>
                                            <p className="text-sm font-medium mt-1">Plano Solicitado: <span className="text-primary">{payment.plan_name}</span></p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Método de Pagamento: {payment.method}</p>
                                        </div>
                                        <div className="flex w-full md:w-auto gap-2">
                                            {payment.proof_url ? (
                                                <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => setSelectedImage(payment.proof_url)}>
                                                    <ImageIcon className="w-4 h-4 mr-2" /> Comprovativo
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" disabled className="flex-1 md:flex-none">Sem Anexo</Button>
                                            )}
                                            <Button size="sm" className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprovePayment(payment.id, payment.house_id, payment.plan_name)}>
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
                                const activePayment = payments.find(p => p.house_id === house.id && p.status === 'approved');
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
                                                <span className="text-muted-foreground">Plano Atual:</span>
                                                <span className="font-bold truncate max-w-[120px]">{activePayment?.plan_name || "Trial / Sem Plano"}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-muted-foreground">Estado:</span>
                                                <span className={house.subscription_status === 'active' ? "text-green-500 font-bold uppercase text-[10px]" : "text-yellow-500 font-bold uppercase text-[10px]"}>{house.subscription_status}</span>
                                            </div>
                                            {house.trial_started_at && (
                                                <div className="border-t pt-2 mt-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground">Trial:</span>
                                                        <span className={new Date(house.trial_ends_at) > new Date() ? "text-green-500 font-bold" : "text-destructive font-bold"}>
                                                            {new Date(house.trial_ends_at) > new Date() ? "Ativo" : "Expirado"}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground mt-1 text-right">
                                                        Termina: {new Date(house.trial_ends_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="w-full text-xs font-bold bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                                                onClick={() => {
                                                    setSelectedHouse(house);
                                                    setAssignModalOpen(true);
                                                }}
                                            >
                                                EDITAR PLANO
                                            </Button>
                                            <Button
                                                variant={house.is_suspended ? "default" : "destructive"}
                                                size="icon"
                                                className="shrink-0"
                                                onClick={() => handleToggleSuspension(house.id, house.is_suspended)}
                                            >
                                                {house.is_suspended ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                            </Button>
                                        </div>
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
                            <div className="mb-6">
                                <label className="text-sm font-bold text-muted-foreground mb-2 block">Funcionalidades do Plano</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {ALL_FEATURES.map(feature => {
                                        const isSelected = selectedFeatures.includes(feature.id);
                                        return (
                                            <div
                                                key={feature.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedFeatures(prev => prev.filter(f => f !== feature.id));
                                                    } else {
                                                        setSelectedFeatures(prev => [...prev, feature.id]);
                                                    }
                                                }}
                                                className={`cursor-pointer rounded-xl border p-2 flex items-center justify-between text-xs font-bold transition-all ${isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted'}`}
                                            >
                                                <span>{feature.label}</span>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                        );
                                    })}
                                </div>
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
                                    <div className="flex gap-2">
                                        <Button variant={p.is_active ? "outline" : "default"} className="w-full" onClick={() => handleTogglePlan(p.id, p.is_active)}>
                                            {p.is_active ? "Desativar" : "Ativar"}
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDeletePlan(p.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
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

                {/* SETTINGS TAB */}
                {tab === "settings" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> Configurações de Pagamento</h2>

                        <form onSubmit={handleSaveSettings} className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">

                            <h3 className="font-bold mb-4 text-primary">Contas de Recebimento</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Número M-Pesa</label>
                                    <Input value={settingsForm.mpesa_number} onChange={e => setSettingsForm({ ...settingsForm, mpesa_number: e.target.value })} placeholder="Ex: 841234567" className="bg-background" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Número e-Mola</label>
                                    <Input value={settingsForm.emola_number} onChange={e => setSettingsForm({ ...settingsForm, emola_number: e.target.value })} placeholder="Ex: 861234567" className="bg-background" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Número mKesh</label>
                                    <Input value={settingsForm.mkesh_number} onChange={e => setSettingsForm({ ...settingsForm, mkesh_number: e.target.value })} placeholder="Ex: 821234567" className="bg-background" />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Nome Presente nas Contas</label>
                                    <Input value={settingsForm.account_name} onChange={e => setSettingsForm({ ...settingsForm, account_name: e.target.value })} placeholder="Ex: João Silva" required className="bg-background" />
                                </div>
                            </div>

                            <div className="h-px w-full bg-border mb-8"></div>

                            <h3 className="font-bold mb-4 text-green-600">Configurações WhatsApp</h3>
                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Número de WhatsApp (com indicativo)</label>
                                    <Input value={settingsForm.whatsapp_number} onChange={e => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })} placeholder="Ex: 258841234567" required className="bg-background" />
                                    <p className="text-xs text-muted-foreground mt-1">O número para onde os casais enviam o comprovativo.</p>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Mensagem Automática</label>
                                    <Textarea
                                        value={settingsForm.whatsapp_message_template}
                                        onChange={e => setSettingsForm({ ...settingsForm, whatsapp_message_template: e.target.value })}
                                        className="bg-background min-h-[150px] font-mono text-sm"
                                    />
                                    <div className="mt-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                                        <strong>Variavéis dinâmicas disponíveis:</strong><br />
                                        <code className="bg-background px-1 py-0.5 rounded mr-1">&#123;user_name&#125;</code>
                                        <code className="bg-background px-1 py-0.5 rounded mr-1">&#123;user_email&#125;</code>
                                        <code className="bg-background px-1 py-0.5 rounded mr-1">&#123;house_name&#125;</code>
                                        <code className="bg-background px-1 py-0.5 rounded mr-1">&#123;plan_name&#125;</code>
                                        <code className="bg-background px-1 py-0.5 rounded">&#123;plan_price&#125;</code>
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full md:w-auto h-12 text-md font-bold" disabled={savingSettings}>
                                {savingSettings ? "A Guardar..." : "Salvar Configurações"}
                            </Button>
                        </form>
                    </div>
                )}

            </main>
        </div>
    );
}

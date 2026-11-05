// V12.1-BACKEND-DEPLOY-SYNC
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck, Check, X, FileText, Users, User, Home, Hash, FileImage, FileQuestion,
    Megaphone, Activity, AlertTriangle, Send, LogOut, Image as ImageIcon,
    CreditCard, Tag, Plus, Trash2, Settings, Flame, Trophy,
    Sparkles, Calendar, Coins, Target, TrendingUp, Search, RefreshCw, Smartphone, Upload, Library, Edit2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/reui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getReceiptSignedUrl } from "@/lib/receiptStorage";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { invalidateFreeModeCache } from "@/hooks/useFreeMode";
import AdminBiblioteca from "./admin/AdminBiblioteca";
import FeaturesControl from "./admin/Features";
import { TodayView, CouplesView } from "@/features/admin/TodayCouples";
import { PaymentsView, type PaymentsTab } from "@/features/admin/Payments";
import { useAuth } from "@/features/auth/AuthContext";

function FreeModeToggle({ adminClient, adminUserId }: { adminClient: any; adminUserId: string | null }) {
    const [freeMode, setFreeMode] = useState(false);
    const [loadingFM, setLoadingFM] = useState(true);
    const [togglingFM, setTogglingFM] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        adminClient.from("app_settings").select("value").eq("key", "free_mode").maybeSingle()
            .then(({ data, error }: any) => {
                if (!error) {
                    setFreeMode(data?.value === "true");
                }
                setLoadingFM(false);
            });
    }, [adminClient]);

    const handleToggle = async (checked: boolean) => {
        try {
            setTogglingFM(true);
            const { error: fcmError } = await adminClient.from("app_settings" as any).upsert({ 
                key: "free_mode",
                value: checked ? "true" : "false", 
                updated_at: new Date().toISOString() 
            }, { onConflict: 'key' });
            
            if (fcmError) throw fcmError;

            // Log the action
            await adminClient.from("free_mode_logs").insert({
                admin_id: adminUserId || "unknown",
                action: checked ? "activated" : "deactivated"
            });

            invalidateFreeModeCache();
            setFreeMode(checked);
            toast({ title: checked ? "Modo gratuito ligado" : "Modo gratuito desligado", description: checked ? "Todas as funções ficam abertas para todos." : "O acesso volta a depender do plano de cada casa." });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setTogglingFM(false);
        }
    };

    if (loadingFM) return <div className="h-[84px] animate-pulse rounded-[20px] border border-[#ECE8E3] bg-white dark:border-border dark:bg-card" />;

    return (
        <div className="rounded-[20px] border border-[#ECE8E3] bg-white p-4 dark:border-border dark:bg-card">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[15px] font-bold">Modo gratuito</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#7A7F8C]">
                        {freeMode
                            ? "Ligado: todas as funções estão abertas para todos e ninguém paga. Os planos ficam escondidos."
                            : "Desligado: cada casa tem acesso conforme o seu plano."}
                    </p>
                </div>
                <button role="switch" aria-checked={freeMode} aria-label="Modo gratuito" disabled={togglingFM} onClick={() => handleToggle(!freeMode)}
                    className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-60", freeMode ? "bg-[#0B1324] dark:bg-foreground" : "bg-[#D9D5CF] dark:bg-muted")}>
                    <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left]", freeMode ? "left-[19px]" : "left-[3px]")} />
                </button>
            </div>
        </div>
    );
}

export default function Admin() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"today" | "couples" | "payhistory" | "features" | "announcements" | "plans" | "settings" | "wrapped" | "pwa" | "verifications" | "biblioteca" | "payments">("today");
    const [coupleFocus, setCoupleFocus] = useState<string | null>(null);
    const { user: authUser } = useAuth();
    const [verifications, setVerifications] = useState<any[]>([]);
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

    // Feature tiers
    const [featureTiers, setFeatureTiers] = useState<any[]>([]);

    // LoveWrapped generation
    const [generatingWrapped, setGeneratingWrapped] = useState(false);
    const [clearingWrapped, setClearingWrapped] = useState(false);
    const [wrappedMonth, setWrappedMonth] = useState(new Date().getMonth() || 12);
    const [wrappedYear, setWrappedYear] = useState(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const [pwaSettings, setPwaSettings] = useState<any>(null);
    const [savingPwa, setSavingPwa] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState<"android" | "ios" | null>(null);

    const { toast } = useToast();
    const navigate = useNavigate();

    // A autorização de escrita já não depende de um header x-admin-id
    // controlado pelo cliente — is_admin() agora verifica auth.uid() do
    // lado do servidor, por isso o cliente normal (com a sessão real do
    // Supabase Auth) já chega para todas as chamadas admin.
    const [adminUserId, setAdminUserId] = useState<string | null>(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAdminUserId(data.user?.id ?? null));
    }, []);
    const adminClient = supabase;

    useEffect(() => {
        fetchAllData();
    }, [adminClient]);

    const fetchAllData = async () => {
        setLoading(true);
        console.log("Admin: Iniciando carregamento de dados...");
        
        try {
            // 1. Pagamentos
            const { data: paymentsData } = await adminClient
                .from("payments" as any)
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

            // 2. Casas
            const { data: housesData } = await adminClient
                .from("couple_spaces")
                .select("*")
                .order("created_at", { ascending: false });

            const { data: membersData } = await adminClient
                .from("members")
                .select("user_id, couple_space_id");

            if (housesData && membersData) {
                housesData.forEach((h: any) => {
                    h.members = membersData
                        .filter((m: any) => m.couple_space_id === h.id)
                        .map((m: any) => ({ user_id: m.user_id }));
                });
            }
            setHouses(housesData || []);

            // 3. Perfis
            const { data: usersData } = await adminClient
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });
            setUsers(usersData || []);

            // 4. Anúncios
            const { data: annData } = await adminClient
                .from("admin_announcements")
                .select("*")
                .order("created_at", { ascending: false });
            setAnnouncements(annData || []);

            // 5. Planos
            const { data: plansData } = await adminClient
                .from("subscription_plans")
                .select("*")
                .order("created_at", { ascending: false });
            setPlans(plansData || []);

            // 6. Configurações de Pagamento
            const { data: psData } = await adminClient.from("payment_settings").select("*").limit(1).maybeSingle();
            if (psData) {
                setPaymentSettings(psData);
            }


            // 8. PWA Settings (Garded against missing table)
            try {
                const { data: pwaData, error: pError } = await adminClient
                    .from("pwa_tutorial_settings" as any)
                    .select("*")
                    .maybeSingle();
                
                if (pError) console.warn("Admin: PWA table error (might be missing)", pError);
                if (pwaData) setPwaSettings(pwaData);
            } catch (e) {
                console.warn("Admin: PWA fetch exception", e);
            }

            // 9. Verificações
            const { data: verData } = await adminClient
                .from("identity_verifications")
                .select("*")
                .order("created_at", { ascending: false });
            setVerifications(verData || []);

            // 11. Feature Tiers
            const { data: ftData } = await adminClient
                .from("feature_tiers" as any)
                .select("*")
                .order("min_tier", { ascending: true });
            setFeatureTiers(ftData || []);

        } catch (error: any) {
            console.error("Admin: Erro crítico ao carregar dados", error);
            toast({ 
                title: "Erro de Carregamento", 
                description: error.message || "Não foi possível sincronizar todos os dados.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/admin-login");
    };

    const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

    const handleOpenReceipt = async (ref: string) => {
        try {
            const signedUrl = await getReceiptSignedUrl(ref);
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        } catch (error: any) {
            toast({ title: "Erro ao abrir comprovativo", description: error.message, variant: "destructive" });
        }
    };

    const handleApprovePayment = async (paymentId: string, houseId: string, planName: string) => {
        setProcessingPaymentId(paymentId);
        try {
            // Encontrar o plan_id correspondente ao nome do plano (se existir)
            const matchedPlan = plans.find(
                p => p.name?.toLowerCase() === planName?.toLowerCase()
            );

            // Aprova o pagamento e ativa a subscrição da casa num único RPC —
            // couple_spaces.subscription_status/plan_id/tier_level deixaram
            // de ser editáveis por UPDATE direto desde a migration de
            // segurança de hoje; ver admin_approve_payment.
            const { error } = await adminClient.rpc("admin_approve_payment" as any, {
                p_payment_id: paymentId,
                p_plan_id: matchedPlan?.id ?? null,
                p_tier_level: matchedPlan?.tier_level ?? null,
            });
            if (error) throw error;

            toast({
                title: "Pagamento Aprovado",
                description: matchedPlan
                    ? `Plano "${matchedPlan.name}" ativado para a casa.`
                    : "Subscrição ativada.",
            });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setProcessingPaymentId(null);
        }
    };

    const handleToggleHouseVerification = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await adminClient.rpc("admin_set_verified" as any, { p_couple_space_id: id, p_verified: !currentStatus });
            if (error) throw error;
            toast({ title: !currentStatus ? "Casa Verificada!" : "Selo Removido", description: "O estado de confiança da casa foi atualizado." });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
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

    const handleSavePwaSettings = async () => {
        if (!pwaSettings) return;
        try {
            setSavingPwa(true);
            const { error } = await adminClient.from("pwa_tutorial_settings" as any).update({
                android_video_url: pwaSettings.android_video_url,
                ios_video_url: pwaSettings.ios_video_url,
                is_enabled: pwaSettings.is_enabled
            }).eq("id", pwaSettings.id);
            if (error) throw error;
            toast({ title: "Configurações PWA salvas" });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSavingPwa(false);
        }
    };

    const handleUploadPwaVideo = async (file: File, platform: "android" | "ios") => {
        if (!pwaSettings) {
            toast({ title: "Erro", description: "Configurações não carregadas. Tente recarregar a página.", variant: "destructive" });
            return;
        }
        
        try {
            setUploadingVideo(platform);
            const fileExt = file.name.split('.').pop();
            const fileName = `pwa-tutorial-${platform}-${Date.now()}.${fileExt}`;
            const filePath = `tutorials/${fileName}`;

            const { error: uploadError } = await adminClient.storage
                .from("pwa-tutorials")
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = adminClient.storage
                .from("pwa-tutorials")
                .getPublicUrl(filePath);

            const updatedSettings = {
                ...pwaSettings,
                [platform === "android" ? "android_video_url" : "ios_video_url"]: publicUrl
            };
            
            setPwaSettings(updatedSettings);
            
            // Auto save
            const { error: updateError } = await adminClient.from("pwa_tutorial_settings" as any).update({
                android_video_url: updatedSettings.android_video_url,
                ios_video_url: updatedSettings.ios_video_url
            }).eq("id", pwaSettings.id);

            if (updateError) throw updateError;
            
            toast({ title: "Vídeo enviado com sucesso!" });
        } catch (error: any) {
            toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
        } finally {
            setUploadingVideo(null);
        }
    };

    const handleGenerateWrapped = async () => {
        try {
            setGeneratingWrapped(true);
            const { data, error } = await adminClient.functions.invoke('generate-love-wrapped', {
                body: { month: wrappedMonth, year: wrappedYear }
            });

            console.log("LoveWrapped Debug Response:", { data, error });

            if (error) throw error;
            
            const processedCount = data.processed ?? data.generated ?? 0;
            const totalCount = data.total_spaces ?? processedCount;

            const firstError = data.failures?.[0]?.error;

            toast({
                title: data.failures?.length > 0 ? "Geração Concluída com Alertas" : "Sucesso!",
                description: data.failures?.length > 0 
                    ? `Falha em ${data.failures.length} casas. Erro: ${firstError || "Desconhecido"}`
                    : `Processados: ${processedCount} de ${totalCount} casas.`,
                variant: data.failures?.length > 0 ? "destructive" : "default"
            });
        } catch (error: any) {
            toast({ title: "Erro na Geração", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingWrapped(false);
        }
    };

    const handleClearWrapped = async () => {
        try {
            setClearingWrapped(true);
            const { error } = await adminClient
                .from("love_wrapped")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000"); // Deleta todos

            if (error) throw error;
            toast({ title: "Limpeza Concluída", description: "Todos os registos de LoveWrapped foram removidos." });
        } catch (error: any) {
            toast({ title: "Erro na Limpeza", description: error.message, variant: "destructive" });
        } finally {
            setClearingWrapped(false);
        }
    };

    const handleApproveVerification = async (verId: string, userId: string) => {
        try {
            const { error: vErr } = await adminClient.from("identity_verifications").update({ status: 'verified' }).eq("id", verId);
            if (vErr) throw vErr;

            const { error: pErr } = await adminClient.from("profiles").update({ verification_status: 'verified' }).eq("user_id", userId);
            if (pErr) throw pErr;

            toast({ title: "Utilizador Verificado" });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleRejectVerification = async (verId: string, userId: string, notes: string) => {
        try {
            const { error: vErr } = await adminClient.from("identity_verifications").update({ status: 'rejected', admin_notes: notes }).eq("id", verId);
            if (vErr) throw vErr;

            const { error: pErr } = await adminClient.from("profiles").update({ verification_status: 'rejected' }).eq("user_id", userId);
            if (pErr) throw pErr;

            toast({ title: "Verificação Recusada" });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    if (loading && payments.length === 0) {
        return <div className="flex justify-center items-center h-screen animate-pulse bg-background text-foreground tracking-widest font-bold">CARREGANDO SISTEMA...</div>;
    }

    const pendingPayments = payments.filter(p => p.status === 'pending');

    return (
        <div className="admin-scope flex flex-col md:flex-row h-screen overflow-hidden bg-muted/30">
            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <img src={selectedImage} alt="Comprovativo" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
                        <Button variant="secondary" className="mt-4" onClick={() => setSelectedImage(null)}>Fechar Visualização</Button>
                    </div>
                </div>
            )}

            {/* Clear Wrapped Confirmation */}
            <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Limpar Todos os LoveWrapped?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isto irá apagar TODOS os LoveWrapped gerados. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setShowClearConfirm(false); handleClearWrapped(); }} className="bg-destructive hover:bg-destructive/90 rounded-full">
                            Sim, limpar tudo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Sidebar Navigation */}
            <aside className="flex h-auto w-full shrink-0 flex-col border-r border-[#ECE8E3] bg-white text-[#0B1324] dark:border-border dark:bg-card dark:text-foreground md:h-screen md:w-60">
                <div className="flex items-center gap-2.5 border-b border-[#ECE8E3] px-5 py-5 dark:border-border">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#0B1324] text-white dark:bg-foreground dark:text-background">
                        <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <div>
                        <p className="text-[15px] font-bold leading-tight tracking-[-0.01em]">Painel</p>
                        <p className="text-[12px] text-[#7A7F8C]">LoveNest</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
                    {(() => {
                        const item = (key: string, label: string, Icon: any, onClick: () => void, badge?: number, sub = false) => (
                            <button key={key} onClick={onClick}
                                className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-semibold transition-colors md:w-full",
                                    sub ? "h-8 md:pl-9 text-[13px]" : "h-10",
                                    (tab === key || NAV_GROUP[tab] === key) ? "bg-[#F2F0ED] text-[#0B1324] dark:bg-muted dark:text-foreground" : "text-[#4A5060] hover:bg-[#F7F5F2] dark:text-muted-foreground dark:hover:bg-muted")}>
                                {!sub && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
                                <span className={cn(!sub && "hidden md:inline", sub && "whitespace-nowrap")}>{label}</span>
                                {!!badge && <span className="ml-auto rounded-full bg-[#0B1324] px-1.5 text-[11px] font-bold leading-[18px] text-white dark:bg-foreground dark:text-background">{badge}</span>}
                            </button>
                        );
                        const NAV_GROUP: Record<string, string> = { verifications: "couples", payhistory: "payments", plans: "payments", settings: "payments", announcements: "biblioteca", wrapped: "biblioteca", pwa: "biblioteca" };
                        const week = 7 * 86_400_000;
                        const endingSoon = houses.filter(h => h.subscription_status === "active" && h.subscription_ends_at && new Date(h.subscription_ends_at).getTime() > Date.now() && new Date(h.subscription_ends_at).getTime() - Date.now() < week).length;
                        const pendingVer = verifications.filter(v => v.status === "pending").length;
                        return (
                            <>
                                {item("today", "Hoje", Activity, () => setTab("today"), pendingPayments.length + pendingVer + endingSoon)}
                                {item("couples", "Casais", Users, () => { setCoupleFocus(null); setTab("couples"); })}
                                {item("payments", "Pagamentos", CreditCard, () => setTab("payments"), pendingPayments.length)}
                                {item("features", "Funções", Hash, () => setTab("features"))}
                                {item("biblioteca", "Conteúdo", Library, () => setTab("biblioteca"))}
                            </>
                        );
                    })()}
                </nav>

                <div className="border-t border-[#ECE8E3] p-3 dark:border-border">
                    <button onClick={handleLogout}
                        className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold text-[#4A5060] transition-colors hover:bg-[#F7F5F2] dark:text-muted-foreground dark:hover:bg-muted">
                        <LogOut className="h-4 w-4" strokeWidth={1.8} /> <span className="hidden md:inline">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background relative">

                {(() => {
                    const groups: Record<string, [string, string][]> = {
                        couples: [["couples", "Casais"], ["verifications", `Verificações${verifications.filter(v => v.status === "pending").length ? ` (${verifications.filter(v => v.status === "pending").length})` : ""}`]],
                        biblioteca: [["biblioteca", "Biblioteca"], ["announcements", "Avisos"], ["wrapped", "LoveWrapped"], ["pwa", "Tutorial PWA"]],
                    };
                    const g = groups[tab] ? tab : ({ verifications: "couples", announcements: "biblioteca", wrapped: "biblioteca", pwa: "biblioteca" } as Record<string, string>)[tab];
                    if (!g) return null;
                    return (
                        <div className="mx-auto mb-4 max-w-5xl">
                            {g === "biblioteca" && <h2 className="mb-3 text-[24px] font-bold tracking-[-0.025em]">Conteúdo</h2>}
                            <div className="inline-flex flex-wrap rounded-xl bg-[#F2F0ED] p-[3px] dark:bg-muted">
                                {groups[g].map(([k, l]) => (
                                    <button key={k} onClick={() => { if (k === "couples") setCoupleFocus(null); setTab(k as typeof tab); }}
                                        className={cn("h-8 rounded-[9px] px-3 text-[13px] font-semibold", tab === k ? "bg-white text-[#0B1324] shadow-sm dark:bg-card dark:text-foreground" : "text-[#7A7F8C]")}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })()}
                {tab === "features" && <FeaturesControl embedded />}
                {tab === "today" && (
                    <TodayView
                        data={{ houses, users, payments, verifications, plans }}
                        adminName={(users.find((u: any) => u.user_id === authUser?.id)?.display_name || "").split(" ")[0]}
                        onOpenReceipt={handleOpenReceipt}
                        onApprove={handleApprovePayment}
                        onReview={() => setTab("verifications")}
                        onOpenCouple={(id) => { setCoupleFocus(id); setTab("couples"); }}
                        onAnnounce={() => setTab("announcements")}
                    />
                )}
                {(tab === "payments" || tab === "payhistory" || tab === "plans" || tab === "settings") && (() => {
                    const toView: Record<string, PaymentsTab> = { payments: "pending", payhistory: "history", plans: "plans", settings: "accounts" };
                    const toAdmin: Record<PaymentsTab, typeof tab> = { pending: "payments", history: "payhistory", plans: "plans", accounts: "settings" };
                    return (
                        <PaymentsView
                            data={{ houses, users, payments, plans }}
                            paymentSettings={paymentSettings}
                            featureTiers={featureTiers}
                            tab={toView[tab]}
                            onTab={(t) => setTab(toAdmin[t])}
                            freeModeSlot={<FreeModeToggle adminClient={adminClient} adminUserId={adminUserId} />}
                            onOpenReceipt={handleOpenReceipt}
                            onApprove={handleApprovePayment}
                            onChanged={fetchAllData}
                        />
                    );
                })()}
                {tab === "couples" && (
                    <CouplesView key={coupleFocus ?? "all"} data={{ houses, users, payments, verifications, plans }} initialId={coupleFocus} onChanged={fetchAllData} />
                )}

                {/* ANNOUNCEMENTS TAB */}
                {tab === "announcements" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Central de Avisos</h2>

                        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 shadow-sm">
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

                {/* LOVEWRAPPED TAB */}
                {tab === "wrapped" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-primary" /> Gestão LoveWrapped <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full font-mono text-primary border border-primary/20">v1.5.1</span>
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">Gera e gere os resumos mensais de atividade dos casais.</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-3xl p-8 shadow-sm">
                            <div className="max-w-md mx-auto text-center space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">Gerar Resumo Mensal</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Esta ação irá processar as estatísticas (mensagens, memórias, desafios, etc.) de todos os casais para o mês selecionado.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Mês</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
                                            <Select value={String(wrappedMonth)} onValueChange={(v) => setWrappedMonth(parseInt(v))}>
                                                <SelectTrigger className="h-11 pl-10 rounded-xl font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <SelectItem key={i + 1} value={String(i + 1)}>
                                                            {new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(new Date(2024, i))}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Ano</label>
                                        <Input 
                                            type="number" 
                                            value={wrappedYear}
                                            onChange={(e) => setWrappedYear(parseInt(e.target.value))}
                                            className="h-11 rounded-xl bg-background font-medium"
                                        />
                                    </div>
                                </div>

                                <Button 
                                    className="w-full h-12 text-md font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    onClick={handleGenerateWrapped}
                                    disabled={generatingWrapped}
                                >
                                    {generatingWrapped ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            A Processar...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-primary fill-primary" />
                                            Disparar Geração Global
                                        </span>
                                    )}
                                </Button>

                                <Button 
                                    variant="outline"
                                    className="w-full h-11 text-sm font-bold rounded-xl border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all mt-2"
                                    onClick={() => setShowClearConfirm(true)}
                                    disabled={clearingWrapped || generatingWrapped}
                                >
                                    {clearingWrapped ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                            A Limpar...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" />
                                            Limpar Registos de Teste
                                        </span>
                                    )}
                                </Button>

                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                    Atenção: A geração pode demorar dependendo do número de casais ativos.
                                </p>
                            </div>
                        </div>

                        {/* Recent Generations Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card rounded-2xl p-6 border-blue-500/10">
                                <h4 className="font-bold flex items-center gap-2 mb-4">
                                    <Activity className="w-4 h-4 text-blue-500" /> Como Funciona
                                </h4>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                        Calcula o total de mensagens e fotos enviadas no período.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                        Verifica os desafios concluídos e o streak atual do casal.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                        Os dados ficam disponíveis imediatamente na página /wrapped dos utilizadores.
                                    </li>
                                </ul>
                            </div>
                            <div className="glass-card rounded-2xl p-6 border-orange-400/10">
                                <h4 className="font-bold flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-4 h-4 text-orange-500" /> Notas de Segurança
                                </h4>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                        A função é idempotente (não gera duplicados para o mesmo par mês/ano/casal).
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                        Podes regerar um mês se os dados estiverem desatualizados.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {tab === "verifications" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                                Verificação de Identidade
                            </h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
                                    <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {verifications.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <p className="text-muted-foreground italic">Nenhuma submissão de verificação encontrada.</p>
                                </div>
                            ) : (() => {
                                // Grouping logic
                                const houseGroups: any[] = [];
                                const processedVerIds = new Set();

                                // 1. Group by known houses
                                (houses || []).forEach(h => {
                                    const houseMembers = h.members || [];
                                    const houseSubmissions = verifications.filter(v => 
                                        houseMembers.some((m: any) => m.user_id === v.user_id)
                                    );

                                    if (houseSubmissions.length > 0) {
                                        houseGroups.push({
                                            id: h.id,
                                            name: h.house_name || "Casa Sem Nome",
                                            members: houseMembers,
                                            submissions: houseSubmissions,
                                            is_verified: h.is_verified || false
                                        });
                                        houseSubmissions.forEach(v => processedVerIds.add(v.id));
                                    }
                                });

                                // 2. Add verifications with no detected house
                                const orphaned = verifications.filter(v => !processedVerIds.has(v.id));
                                orphaned.forEach(ov => {
                                    houseGroups.push({
                                        id: 'orphan-' + ov.id,
                                        name: 'Sem Casa Detectada',
                                        members: [{ user_id: ov.user_id }],
                                        submissions: [ov],
                                        isOrphan: true
                                    });
                                });

                                return houseGroups.map((group) => (
                                    <div key={group.id} className="bg-card border-2 rounded-3xl p-6 shadow-md flex flex-col gap-6 transition-all overflow-hidden relative">
                                        
                                        {/* HOUSE HEADER */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                    <Home className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                                        {group.name}
                                                        {group.isOrphan && <Badge size="sm" variant="warning-light">Avulso</Badge>}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                                                        <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                                            <Hash className="w-3 h-3" /> ID DA CASA: <span className="text-primary/70">{group.isOrphan ? 'N/A' : group.id.slice(0, 13)}</span>
                                                        </p>
                                                        <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> MEMBROS: <span className="text-primary/70">{group.members.length}/2</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Status da Casa</p>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        (group.submissions.every((s: any) => s.status === 'verified') && group.members.length === group.submissions.length) || group.is_verified
                                                            ? "text-emerald-600"
                                                            : "text-orange-500"
                                                    )}>
                                                        {(group.submissions.every((s: any) => s.status === 'verified') && group.members.length === group.submissions.length) || group.is_verified
                                                            ? "CASA VERIFICADA" : "VERIFICAÇÃO PENDENTE"}
                                                    </span>
                                                </div>

                                                {/* SEAL ACTION BUTTON */}
                                                {!group.isOrphan && (
                                                    <div className="flex items-center">
                                                        {group.is_verified ? (
                                                            <button 
                                                                onClick={() => handleToggleHouseVerification(group.id, true)}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success text-success-foreground text-[10px] font-black shadow-lg shadow-success/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5" /> Selo Ativo
                                                            </button>
                                                        ) : (
                                                            (() => {
                                                                const bothVerified = group.submissions.length === 2 && group.submissions.every((s: any) => s.status === 'verified');
                                                                if (bothVerified) {
                                                                    return (
                                                                        <Button 
                                                                            size="sm" 
                                                                            className="h-10 bg-primary/20 hover:bg-primary/30 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest"
                                                                            onClick={() => handleToggleHouseVerification(group.id, false)}
                                                                        >
                                                                            ENVIAR SELO
                                                                        </Button>
                                                                    );
                                                                }
                                                                return null;
                                                            })()
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* MEMBERS GRID */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                                            {/* Vertical divider on desktop */}
                                            <div className="hidden lg:block absolute left-1/2 top-4 bottom-4 w-px bg-border/50 border-dashed border-l" />

                                            {/* Render 2 slots if possible, or just the submissions for orphans */}
                                            {(group.members.length === 0 ? group.submissions : group.members).map((member: any, idx: number) => {
                                                const userId = member.user_id;
                                                const submission = group.submissions.find((s: any) => s.user_id === userId);
                                                const profile = users.find(u => u.id === userId);

                                                return (
                                                    <div key={userId || idx} className="space-y-4 relative">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="text-[10px] font-black text-white bg-primary px-2 py-0.5 rounded shadow-sm uppercase tracking-tighter">
                                                                Membro {idx + 1}
                                                            </div>
                                                            {userId && <span className="text-[9px] font-mono text-muted-foreground opacity-50">UID: {userId.slice(0, 8)}</span>}
                                                        </div>

                                                        {submission ? (
                                                            <div className="space-y-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted shadow-inner border">
                                                                        {profile?.avatar_url ? (
                                                                            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <div className="h-full w-full flex items-center justify-center text-xl font-bold bg-primary/10 text-primary uppercase">
                                                                                {(profile?.display_name || submission.full_name || "?").charAt(0)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-bold text-lg leading-tight">{submission.full_name}</h4>
                                                                            <Badge
                                                                                size="sm"
                                                                                variant={submission.status === 'pending' ? "info-light" : submission.status === 'verified' ? "success-light" : "destructive-light"}
                                                                            >
                                                                                {submission.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground font-medium">@{profile?.display_name || "utilizador"} • Submetido a {new Date(submission.created_at).toLocaleDateString()}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-2xl border border-dashed text-xs">
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5 opacity-70 tracking-widest">Documento</p>
                                                                        <p className="font-bold text-primary">{submission.document_type || 'BI'} • {submission.age} anos</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-0.5 opacity-70 tracking-widest">Nº Documento</p>
                                                                        <p className="font-mono font-bold tracking-tighter">{submission.id_number}</p>
                                                                    </div>
                                                                </div>

                                                                {/* DOCUMENTS PREVIEW */}
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">Imagens do Documento</p>
                                                                    <div className="flex gap-2">
                                                                        <Button size="sm" variant="outline" className="flex-1 text-[10px] h-9 border-2" onClick={async () => {
                                                                            const { data } = await adminClient.storage.from('identity-documents').createSignedUrl(submission.document_url, 60);
                                                                            if (data) setSelectedImage(data.signedUrl);
                                                                        }}>
                                                                            <FileImage className="w-3 h-3 mr-1.5" /> Frente
                                                                        </Button>
                                                                        {submission.document_back_url ? (
                                                                            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-9 border-2" onClick={async () => {
                                                                                const { data } = await adminClient.storage.from('identity-documents').createSignedUrl(submission.document_back_url, 60);
                                                                                if (data) setSelectedImage(data.signedUrl);
                                                                            }}>
                                                                                <FileImage className="w-3 h-3 mr-1.5" /> Verso
                                                                            </Button>
                                                                        ) : (
                                                                            <div className="flex-1 text-[9px] font-bold text-muted-foreground border border-dashed rounded-lg flex items-center justify-center opacity-50 uppercase">Face Única</div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* ACTIONS */}
                                                                {submission.status === 'pending' && (
                                                                    <div className="flex gap-2 pt-2">
                                                                        <Button variant="outline" size="sm" className="flex-1 text-[10px] border-red-500/20 text-red-600 hover:bg-red-50" onClick={() => handleRejectVerification(submission.id, submission.user_id, "Documento Inválido")}>
                                                                            Recusar
                                                                        </Button>
                                                                        <Button size="sm" className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApproveVerification(submission.id, submission.user_id)}>
                                                                            Aprovar
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="h-[220px] rounded-3xl border border-dashed bg-muted/5 flex flex-col items-center justify-center text-center p-6 transition-all border-muted-foreground/20">
                                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 opacity-30">
                                                                    <FileQuestion className="w-6 h-6" />
                                                                </div>
                                                                <h4 className="font-bold text-muted-foreground/60 text-sm">{profile?.display_name || "Membro " + (idx + 1)}</h4>
                                                                <p className="text-[10px] font-medium text-muted-foreground/40 mt-1 uppercase tracking-widest">Aguardando submissão</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            })()}
                        </div>
                    </div>
                )}

                {tab === "pwa" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-card rounded-3xl p-8 space-y-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Tutorial de Instalação PWA</h2>
                                <p className="text-muted-foreground">Configure os vídeos e a visibilidade do tutorial de instalação.</p>
                            </div>
                            {!pwaSettings && !loading && (
                                <Button variant="outline" size="sm" onClick={fetchAllData} className="gap-2">
                                    <RefreshCw className="w-4 h-4" /> Recarregar
                                </Button>
                            )}
                        </div>

                        {!pwaSettings && !loading ? (
                            <div className="p-8 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div className="max-w-md mx-auto">
                                    <p className="font-bold text-lg">Configurações não encontradas</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Parece que a tabela ainda não foi criada no Supabase. 
                                        Por favor, executa o script SQL em <strong>'supabase/migrations/20260319_pwa_tutorial.sql'</strong> no teu Editor SQL do Supabase.
                                    </p>
                                    <div className="pt-6">
                                        <Button onClick={async () => {
                                            toast({ title: "Tentando inicializar..." });
                                            const { data, error } = await adminClient.from("pwa_tutorial_settings" as any).insert({ android_video_url: '', ios_video_url: '', is_enabled: true }).select();
                                            if (data) fetchAllData();
                                            else toast({ title: "Falha", description: "Erro ao criar: " + error?.message, variant: "destructive" });
                                        }} className="rounded-full px-8">
                                            Inicializar Tabela Automático
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : pwaSettings && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                            <Smartphone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">Tutorial Adaptativo Ativo</p>
                                            <p className="text-sm text-muted-foreground">O modal aparecerá automaticamente para quem ainda não instalou.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-xs font-bold", pwaSettings.is_enabled ? "text-green-500" : "text-muted-foreground")}>
                                            {pwaSettings.is_enabled ? "LIGADO" : "DESLIGADO"}
                                        </span>
                                        <Switch 
                                            checked={pwaSettings.is_enabled} 
                                            onCheckedChange={(checked) => setPwaSettings({ ...pwaSettings, is_enabled: checked })} 
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Android Section */}
                                    <div className="glass-card p-6 rounded-3xl space-y-4 shadow-sm border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="flex items-center gap-2 font-black text-emerald-600">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold">AN</div>
                                                ANDROID
                                            </Label>
                                            {pwaSettings.android_video_url && (
                                                <Badge size="sm" variant="success-light">VÍDEO ATIVO</Badge>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <Input 
                                                placeholder="Cola o link do vídeo aqui..." 
                                                value={pwaSettings.android_video_url || ""} 
                                                onChange={(e) => setPwaSettings({ ...pwaSettings, android_video_url: e.target.value })}
                                                className="h-12 rounded-xl bg-background/50"
                                            />
                                            <div className="relative">
                                                <Button 
                                                    variant="secondary" 
                                                    className="w-full h-12 rounded-xl gap-2 font-bold relative overflow-hidden"
                                                    disabled={uploadingVideo === "android"}
                                                    asChild
                                                >
                                                    <label className="cursor-pointer">
                                                        {uploadingVideo === "android" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        Subir Vídeo Android
                                                        <input 
                                                            type="file" 
                                                            accept="video/*" 
                                                            hidden 
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadPwaVideo(file, "android");
                                                            }} 
                                                        />
                                                    </label>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* iOS Section */}
                                    <div className="glass-card p-6 rounded-3xl space-y-4 shadow-sm border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="flex items-center gap-2 font-black text-blue-600">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold">IOS</div>
                                                IPHONE (iOS)
                                            </Label>
                                            {pwaSettings.ios_video_url && (
                                                <Badge size="sm" variant="info-light">VÍDEO ATIVO</Badge>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <Input 
                                                placeholder="Cola o link do vídeo aqui..." 
                                                value={pwaSettings.ios_video_url || ""} 
                                                onChange={(e) => setPwaSettings({ ...pwaSettings, ios_video_url: e.target.value })}
                                                className="h-12 rounded-xl bg-background/50"
                                            />
                                            <div className="relative">
                                                <Button 
                                                    variant="secondary" 
                                                    className="w-full h-12 rounded-xl gap-2 font-bold relative overflow-hidden"
                                                    disabled={uploadingVideo === "ios"}
                                                    asChild
                                                >
                                                    <label className="cursor-pointer">
                                                        {uploadingVideo === "ios" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        Subir Vídeo iPhone
                                                        <input 
                                                            type="file" 
                                                            accept="video/*" 
                                                            hidden 
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadPwaVideo(file, "ios");
                                                            }} 
                                                        />
                                                    </label>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-center">
                                    <Button 
                                        onClick={handleSavePwaSettings} 
                                        disabled={savingPwa} 
                                        className="min-w-[280px] h-14 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        {savingPwa ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        Guardar Configurações
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* BIBLIOTECA TAB */}
                {tab === "biblioteca" && <AdminBiblioteca adminClient={adminClient} />}
            </main>
        </div>
    );
}

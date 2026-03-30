import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck, Check, X, FileText, Users, User, Home, Hash, FileImage, FileQuestion,
    Megaphone, Activity, AlertTriangle, Send, LogOut, Image as ImageIcon,
    CreditCard, Tag, Plus, Trash2, Settings, Flame, Trophy, ToggleLeft, ToggleRight,
    Sparkles, Calendar, Coins, Target, TrendingUp, Search, RefreshCw, Smartphone, Upload
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { invalidateFreeModeCache } from "@/hooks/useFreeMode";

function FreeModeToggle({ adminClient, adminToken }: { adminClient: any; adminToken: string | null }) {
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
                admin_id: adminToken || "unknown",
                action: checked ? "activated" : "deactivated"
            });

            invalidateFreeModeCache();
            setFreeMode(checked);
            toast({ title: checked ? "Free Mode Ativado" : "Free Mode Desativado", description: checked ? "Todas as funcionalidades estão agora gratuitas." : "O sistema de subscrições foi reativado." });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setTogglingFM(false);
        }
    };

    if (loadingFM) return <div className="glass-card rounded-2xl p-6 animate-pulse h-24" />;

    return (
        <div className={`border-2 rounded-3xl p-6 shadow-sm transition-all ${freeMode ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${freeMode ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {freeMode ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Free Mode</h3>
                        <p className="text-sm text-muted-foreground">
                            {freeMode ? "A app está totalmente gratuita. Subscrições desativadas." : "O sistema de monetização está ativo."}
                        </p>
                    </div>
                </div>
                <Switch checked={freeMode} onCheckedChange={handleToggle} disabled={togglingFM} />
            </div>
            {freeMode && (
                <p className="text-xs text-primary font-medium mt-3 bg-primary/10 p-2 rounded-lg">
                    ⚡ Todas as funcionalidades premium estão desbloqueadas para todos os utilizadores. A infraestrutura de pagamentos mantém-se intacta.
                </p>
            )}
        </div>
    );
}

export default function Admin() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "houses" | "announcements" | "plans" | "users" | "settings" | "streaks" | "points" | "wrapped" | "pwa" | "verifications" | "feature_flags">("overview");
    const [verifications, setVerifications] = useState<any[]>([]);
    const [streaks, setStreaks] = useState<any[]>([]);
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

    // Plan editing
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [editPlanName, setEditPlanName] = useState("");
    const [editPlanPrice, setEditPlanPrice] = useState("");
    const [editPlanFeatures, setEditPlanFeatures] = useState<string[]>([]);
    const [savingPlanEdit, setSavingPlanEdit] = useState(false);

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

    // LoveWrapped generation
    const [generatingWrapped, setGeneratingWrapped] = useState(false);
    const [clearingWrapped, setClearingWrapped] = useState(false);
    const [wrappedMonth, setWrappedMonth] = useState(new Date().getMonth() || 12);
    const [wrappedYear, setWrappedYear] = useState(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
    const [searchHouse, setSearchHouse] = useState("");
    const [allFeatureFlags, setAllFeatureFlags] = useState<any[]>([]);
    const [fetchingFlags, setFetchingFlags] = useState(false);

    const [pwaSettings, setPwaSettings] = useState<any>(null);
    const [savingPwa, setSavingPwa] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState<"android" | "ios" | null>(null);

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
        setLoading(true);
        console.log("Admin: Iniciando carregamento de dados...");
        
        try {
            // 1. Pagamentos
            const { data: paymentsData } = await adminClient
                .from("subscription_payments" as any)
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

            // 6. Configurações de Pagamento (app_settings ou payment_settings)
            // Nota: O código original usava app_settings e payment_settings de forma inconsistente.
            // Vou tentar buscar de app_settings primeiro, depois de payment_settings.
            const { data: settingsData } = await adminClient.from("app_settings").select("*");
            if (settingsData && settingsData.length > 0) {
                const form: any = { ...settingsForm };
                settingsData.forEach(s => {
                    if (form.hasOwnProperty(s.key)) {
                        form[s.key] = s.value;
                    }
                });
                setSettingsForm(form);
            } else {
                // Fallback para payment_settings
                const { data: psData } = await adminClient.from("payment_settings").select("*").limit(1).maybeSingle();
                if (psData) {
                    setSettingsForm({
                        mpesa_number: psData.mpesa_number || "",
                        emola_number: psData.emola_number || "",
                        mkesh_number: psData.mkesh_number || "",
                        account_name: psData.account_name || "",
                        whatsapp_number: psData.whatsapp_number || "",
                        whatsapp_message_template: psData.whatsapp_message_template || ""
                    });
                }
            }

            // 7. Streaks
            const { data: streaksData } = await adminClient
                .from("love_streaks")
                .select("*")
                .order("current_streak", { ascending: false });
            setStreaks(streaksData || []);

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

            // 10. Feature Flags
            fetchFeatureFlags();

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

    const handleToggleHouseVerification = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await adminClient.from("couple_spaces").update({ is_verified: !currentStatus }).eq("id", id);
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

    const openEditPlan = (plan: any) => {
        setEditingPlan(plan);
        setEditPlanName(plan.name);
        setEditPlanPrice(plan.price);
        setEditPlanFeatures(plan.features || []);
    };

    const handleSavePlanEdit = async () => {
        if (!editingPlan || !editPlanName.trim() || !editPlanPrice.trim()) return;
        try {
            setSavingPlanEdit(true);
            const { error } = await adminClient.from("subscription_plans").update({
                name: editPlanName,
                price: editPlanPrice,
                features: editPlanFeatures
            }).eq("id", editingPlan.id);
            if (error) throw error;
            toast({ title: "Plano Atualizado", description: "As alterações foram guardadas." });
            setEditingPlan(null);
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSavingPlanEdit(false);
        }
    };

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
        if (!window.confirm("⚠️ ATENÇÃO: Isto irá APAGAR TODOS os LoveWrapped gerados até agora. Tem a certeza?")) {
            return;
        }

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

            toast({ title: "Utilizador Verificado ✅" });
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

            toast({ title: "Verificação Recusada ⚠️" });
            fetchAllData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const fetchFeatureFlags = async () => {
        try {
            setFetchingFlags(true);
            const { data, error } = await adminClient.from("feature_flags").select("*").order("key");
            if (error) throw error;
            setAllFeatureFlags(data || []);
        } catch (error: any) {
            console.error("Error fetching flags:", error);
        } finally {
            setFetchingFlags(false);
        }
    };

    const handleToggleFeature = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await adminClient.from("feature_flags" as any).update({ enabled: !currentStatus } as any).eq("id", id);
            if (error) throw error;
            toast({ title: "Sucesso", description: "Estado da funcionalidade atualizado." });
            fetchFeatureFlags();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleCreateFeatureFlag = async (key: string, scope: string, targetId?: string) => {
        try {
            const { error } = await adminClient.from("feature_flags" as any).insert({
                key,
                scope,
                target_id: targetId || null,
                enabled: true
            } as any);
            if (error) throw error;
            toast({ title: "Flag Criada", description: `Funcionalidade ${key} adicionada ao escopo ${scope}.` });
            fetchFeatureFlags();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    if (loading && payments.length === 0) {
        return <div className="flex justify-center items-center h-screen animate-pulse bg-background text-foreground tracking-widest font-bold">CARREGANDO SISTEMA...</div>;
    }

    const pendingPayments = payments.filter(p => p.status === 'pending');
    const activeHouses = houses.filter(h => h.subscription_status === 'active');

    const filteredHouses = houses.filter(h => 
        (h.house_name?.toLowerCase().includes(searchHouse.toLowerCase())) ||
        (h.partner1_name?.toLowerCase().includes(searchHouse.toLowerCase())) ||
        (h.partner2_name?.toLowerCase().includes(searchHouse.toLowerCase()))
    );

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
                    <Button variant={tab === "verifications" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("verifications")}>
                        <ShieldCheck className="w-4 h-4" /> <span className="hidden md:inline">Verificações ({verifications.filter(v => v.status === 'pending').length})</span>
                    </Button>
                    <Button variant={tab === "pwa" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("pwa")}>
                        <Smartphone className="w-4 h-4" /> <span className="hidden md:inline">Tutorial PWA</span>
                    </Button>
                    <Button variant={tab === "streaks" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("streaks")}>
                        <Flame className="w-4 h-4" /> <span className="hidden md:inline">Streaks</span>
                    </Button>
                    <Button variant={tab === "points" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("points")}>
                        <Coins className="w-4 h-4" /> <span className="hidden md:inline">Pontos</span>
                    </Button>
                    <Button variant={tab === "wrapped" ? "secondary" : "ghost"} className="justify-start gap-3 w-full" onClick={() => setTab("wrapped")}>
                        <Sparkles className="w-4 h-4" /> <span className="hidden md:inline">LoveWrapped</span>
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 w-full" onClick={() => navigate("/admin/features")}>
                        <Hash className="w-4 h-4" /> <span className="hidden md:inline">Feature Control</span>
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold">Dashboard</h2>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 gap-2 font-bold bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                                onClick={fetchAllData}
                                disabled={loading}
                            >
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                                {loading ? "A atualizar..." : "Forçar Atualização"}
                            </Button>
                        </div>

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
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left border-purple-500/20 bg-purple-500/5">
                                <Flame className="w-6 h-6 text-purple-500 mb-4" />
                                <span className="text-3xl font-black">{streaks.length}</span>
                                <span className="text-sm text-purple-600/70 font-bold uppercase tracking-wider mt-1">Streaks</span>
                            </div>
                        </div>

                        {/* Pending Subscriptions */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                Aguardam Pagamento
                                {pendingPayments.length > 0 && <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{pendingPayments.length}</span>}
                            </h3>
                            <div className="space-y-3">
                                {pendingPayments.map((payment) => (
                                    <div key={payment.id} className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg">{payment.couple_spaces?.house_name || "Casa sem nome"}</h4>
                                                <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-md">Pendente</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Casal: {payment.couple_spaces?.partner1_name} & {payment.couple_spaces?.partner2_name}</p>
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
                                            <Button size="sm" className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprovePayment(payment.id, payment.couple_space_id, payment.plan_name)}>
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
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2"><Home className="w-6 h-6 text-primary" /> Gestão de Casas</h2>
                            
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Procurar casa ou casal..." 
                                    className="pl-10 h-10 rounded-xl"
                                    value={searchHouse}
                                    onChange={(e) => setSearchHouse(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="p-4 font-bold text-muted-foreground">Casa / Iniciais</th>
                                            <th className="p-4 font-bold text-muted-foreground">Parceiros</th>
                                            <th className="p-4 font-bold text-muted-foreground">Plano / Estado</th>
                                            <th className="p-4 font-bold text-muted-foreground">Trial / Expiração</th>
                                            <th className="p-4 font-bold text-muted-foreground text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredHouses.map((house) => {
                                            const activePayment = payments.find(p => p.couple_space_id === house.id && p.status === 'approved');
                                            const isTrialExpired = house.trial_ends_at && new Date(house.trial_ends_at) < new Date();
                                            
                                            // Age gap detection (if both ages exist)
                                            const p1Age = house.partner1_age;
                                            const p2Age = house.partner2_age;
                                            const ageGap = (p1Age && p2Age) ? Math.abs(p1Age - p2Age) : null;
                                            const isAgeGapSignificant = ageGap !== null && ageGap >= 10; // Example: significant if gap is 10+ years

                                            const verificationStatus = verifications.find(v => v.couple_space_id === house.id);
                                            
                                            return (
                                                <tr key={house.id} className={cn("hover:bg-muted/30 transition-colors", house.is_suspended && "bg-destructive/[0.02] opacity-80")}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                {house.initials || "LN"}
                                                            </div>
                                                            <span className="font-bold truncate max-w-[150px]">{house.house_name || "Sem Nome"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-muted-foreground whitespace-nowrap font-medium flex items-center gap-2">
                                                                {house.partner1_name || "P1"} & {house.partner2_name || "P2"}
                                                            </p>
                                                            <div className="flex gap-1.5 overflow-hidden">
                                                                {house.members?.map((m: any, idx: number) => {
                                                                    const profile = users.find(u => u.id === m.user_id);
                                                                    const isV = profile?.verification_status === 'verified';
                                                                    return (
                                                                        <div key={m.user_id} className={cn(
                                                                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0",
                                                                            isV ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground/60"
                                                                        )}>
                                                                            {isV ? <ShieldCheck className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                                                                            {profile?.display_name?.split(' ')[0] || `P${idx+1}`}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs truncate max-w-[120px]">{activePayment?.plan_name || "Trial / Sem Plano"}</span>
                                                            <span className={cn(
                                                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md w-fit",
                                                                house.subscription_status === 'active' ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                                                            )}>
                                                                {house.subscription_status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {house.trial_started_at ? (
                                                            <div className="flex flex-col">
                                                                <span className={cn(
                                                                    "text-xs font-bold",
                                                                    !isTrialExpired ? "text-green-500" : "text-destructive"
                                                                )}>
                                                                    {(!isTrialExpired) ? "Ativo" : "Expirado"}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">Termina: {new Date(house.trial_ends_at).toLocaleDateString()}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            {/* House Verification Badge / Action */}
                                                            {house.is_verified ? (
                                                                <button 
                                                                    onClick={() => handleToggleHouseVerification(house.id, true)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                                                >
                                                                    <Sparkles className="w-3.5 h-3.5" /> Verificada
                                                                </button>
                                                            ) : (
                                                                (() => {
                                                                    const bothVerified = house.members?.length === 2 && house.members.every((m: any) => {
                                                                        const p = users.find(u => u.id === m.user_id);
                                                                        return (p as any)?.verification_status === 'verified';
                                                                    });
                                                                    if (bothVerified) {
                                                                        return (
                                                                            <Button 
                                                                                size="sm" 
                                                                                className="h-8 bg-primary/20 hover:bg-primary/30 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest"
                                                                                onClick={() => handleToggleHouseVerification(house.id, false)}
                                                                            >
                                                                                VERIFICAR CASA
                                                                            </Button>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()
                                                            )}

                                                            {house.is_suspended && (
                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-destructive mr-2 uppercase">
                                                                    <AlertTriangle className="w-3 h-3" /> Suspensa
                                                                </div>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-[10px] font-bold"
                                                                onClick={() => {
                                                                    setSelectedHouse(house);
                                                                    setAssignModalOpen(true);
                                                                }}
                                                            >
                                                                PLANO
                                                            </Button>
                                                            <Button
                                                                variant={house.is_suspended ? "default" : "destructive"}
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleToggleSuspension(house.id, house.is_suspended)}
                                                            >
                                                                {house.is_suspended ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredHouses.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-muted-foreground italic">Nenhuma casa encontrada...</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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

                        {/* Edit Plan Modal */}
                        {editingPlan && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                                <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border">
                                    <div className="p-6 border-b flex justify-between items-center bg-muted/30">
                                        <h3 className="font-bold text-lg">Editar Plano</h3>
                                        <Button variant="ghost" size="icon" onClick={() => setEditingPlan(null)}><X className="w-5 h-5" /></Button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="text-sm font-bold text-muted-foreground mb-1 block">Nome do Plano</label>
                                            <Input value={editPlanName} onChange={e => setEditPlanName(e.target.value)} className="bg-background" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-muted-foreground mb-1 block">Preço</label>
                                            <Input value={editPlanPrice} onChange={e => setEditPlanPrice(e.target.value)} className="bg-background" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Funcionalidades</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {ALL_FEATURES.map(feature => {
                                                    const isSelected = editPlanFeatures.includes(feature.id);
                                                    return (
                                                        <div
                                                            key={feature.id}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setEditPlanFeatures(prev => prev.filter(f => f !== feature.id));
                                                                } else {
                                                                    setEditPlanFeatures(prev => [...prev, feature.id]);
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
                                    </div>
                                    <div className="p-4 bg-muted/30 border-t flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancelar</Button>
                                        <Button className="font-bold" disabled={savingPlanEdit || !editPlanName.trim() || !editPlanPrice.trim()} onClick={handleSavePlanEdit}>
                                            {savingPlanEdit ? "A guardar..." : "Guardar Alterações"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        <Button variant="outline" className="flex-1" onClick={() => openEditPlan(p)}>
                                            ✏️ Editar
                                        </Button>
                                        <Button variant={p.is_active ? "outline" : "default"} className="flex-1" onClick={() => handleTogglePlan(p.id, p.is_active)}>
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
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> Configurações</h2>

                        {/* FREE MODE TOGGLE */}
                        <FreeModeToggle adminClient={adminClient} adminToken={adminToken} />

                        <h3 className="text-xl font-bold text-muted-foreground">Configurações de Pagamento</h3>
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

                {/* STREAKS TAB */}
                {tab === "streaks" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Flame className="w-6 h-6 text-orange-500" /> LoveStreak - Ranking Global</h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Flame className="w-6 h-6 text-orange-500 mb-4" />
                                <span className="text-3xl font-black">{streaks.filter(s => s.current_streak > 0).length}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Streaks Ativos</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Trophy className="w-6 h-6 text-amber-500 mb-4" />
                                <span className="text-3xl font-black">{streaks.length > 0 ? Math.max(...streaks.map(s => s.current_streak)) : 0}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Maior Streak</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Trophy className="w-6 h-6 text-primary mb-4" />
                                <span className="text-3xl font-black">{streaks.length > 0 ? Math.max(...streaks.map(s => s.best_streak)) : 0}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Recorde Absoluto</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Users className="w-6 h-6 text-blue-500 mb-4" />
                                <span className="text-3xl font-black">{streaks.length}</span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Total Casais</span>
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="p-4 font-bold text-muted-foreground">#</th>
                                            <th className="p-4 font-bold text-muted-foreground">Casa</th>
                                            <th className="p-4 font-bold text-muted-foreground">Streak Atual</th>
                                            <th className="p-4 font-bold text-muted-foreground">Melhor Streak</th>
                                            <th className="p-4 font-bold text-muted-foreground">Nível</th>
                                            <th className="p-4 font-bold text-muted-foreground">Shields</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(streaks || []).map((s, i) => {
                                            const house = houses?.find(h => h.id === s.couple_space_id);
                                            const medals = ["🥇", "🥈", "🥉"];
                                            return (
                                                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="p-4 font-bold">{i < 3 ? medals[i] : i + 1}</td>
                                                    <td className="p-4 font-medium">{house?.house_name || "LoveNest"}</td>
                                                    <td className="p-4">
                                                        <span className="font-bold text-orange-500 flex items-center gap-1">
                                                            <Flame className="w-4 h-4" /> {s.current_streak}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium">{s.best_streak}</td>
                                                    <td className="p-4 text-xs font-bold">{s.level_title}</td>
                                                    <td className="p-4 text-xs">{s.shield_remaining}/5 🛡️</td>
                                                </tr>
                                            );
                                        })}
                                        {streaks.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum streak registado ainda.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* POINTS TAB */}
                {tab === "points" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Coins className="w-6 h-6 text-primary" /> LovePoints - Ranking Global</h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Coins className="w-6 h-6 text-primary mb-4" />
                                <span className="text-3xl font-black">
                                    {streaks.reduce((acc, s) => acc + (s.total_points || 0), 0)}
                                </span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Total de Pontos</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <TrendingUp className="w-6 h-6 text-green-500 mb-4" />
                                <span className="text-3xl font-black">
                                    {streaks.length > 0 ? Math.round(streaks.reduce((acc, s) => acc + (s.total_points || 0), 0) / streaks.length) : 0}
                                </span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Média / Casal</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Trophy className="w-6 h-6 text-primary mb-4" />
                                <span className="text-3xl font-black">
                                    {streaks.length > 0 ? Math.max(...streaks.map(s => s.total_points || 0)) : 0}
                                </span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Recorde Pontos</span>
                            </div>
                            <div className="glass-card rounded-2xl p-6 flex flex-col text-left">
                                <Target className="w-6 h-6 text-blue-500 mb-4" />
                                <span className="text-3xl font-black">
                                    {streaks.filter(s => (s.total_points || 0) > 100).length}
                                </span>
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Casais +100 Pts</span>
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="p-4 font-bold text-muted-foreground">#</th>
                                            <th className="p-4 font-bold text-muted-foreground">Casa</th>
                                            <th className="p-4 font-bold text-muted-foreground">Pontos Totais</th>
                                            <th className="p-4 font-bold text-muted-foreground">Nível Atual</th>
                                            <th className="p-4 font-bold text-muted-foreground">Melhor Streak</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {[...(streaks || [])]
                                            .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                                            .map((s, i) => {
                                                const house = houses?.find(h => h.id === s.couple_space_id);
                                                const medals = ["🥇", "🥈", "🥉"];
                                                return (
                                                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="p-4 font-bold">{i < 3 ? medals[i] : i + 1}</td>
                                                        <td className="p-4 font-medium">{house?.house_name || "LoveNest"}</td>
                                                        <td className="p-4">
                                                            <span className="font-bold text-primary flex items-center gap-1">
                                                                <Coins className="w-4 h-4" /> {s.total_points || 0}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-xs font-bold">{s.level_title}</td>
                                                        <td className="p-4 text-xs font-medium text-muted-foreground">{s.best_streak} Dias</td>
                                                    </tr>
                                                );
                                            })}
                                        {streaks.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum registo de pontos disponível.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <select 
                                                className="w-full h-11 pl-10 pr-4 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
                                                value={wrappedMonth}
                                                onChange={(e) => setWrappedMonth(parseInt(e.target.value))}
                                            >
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        {new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(new Date(2024, i))}
                                                    </option>
                                                ))}
                                            </select>
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
                                            <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                                            Disparar Geração Global
                                        </span>
                                    )}
                                </Button>

                                <Button 
                                    variant="outline"
                                    className="w-full h-11 text-sm font-bold rounded-xl border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all mt-2"
                                    onClick={handleClearWrapped}
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
                            <div className="glass-card rounded-2xl p-6 border-amber-500/10">
                                <h4 className="font-bold flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-4 h-4 text-amber-500" /> Notas de Segurança
                                </h4>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        A função é idempotente (não gera duplicados para o mesmo par mês/ano/casal).
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
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
                                    <div key={group.id} className="bg-card border-2 rounded-[2rem] p-6 shadow-md flex flex-col gap-6 transition-all overflow-hidden relative">
                                        
                                        {/* HOUSE HEADER */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                    <Home className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                                        {group.name}
                                                        {group.isOrphan && <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">Avulso</span>}
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
                                                            : "text-amber-500"
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
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
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
                                                                            <span className={cn(
                                                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                                                submission.status === 'pending' ? "bg-blue-100 text-blue-700" :
                                                                                submission.status === 'verified' ? "bg-emerald-100 text-emerald-700" :
                                                                                "bg-amber-100 text-amber-700"
                                                                            )}>
                                                                                {submission.status}
                                                                            </span>
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
                    <div className="glass-card rounded-[2.5rem] p-8 space-y-8">
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
                            <div className="p-8 border-2 border-dashed border-primary/20 rounded-[2rem] bg-primary/5 text-center space-y-4">
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
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">VÍDEO ATIVO</span>
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
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">VÍDEO ATIVO</span>
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
            </main>
        </div>
    );
}

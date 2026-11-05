// V12.1-BACKEND-DEPLOY-SYNC
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Users, Hash, Activity, LogOut, CreditCard, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReceiptSignedUrl } from "@/lib/receiptStorage";

import { invalidateFreeModeCache } from "@/hooks/useFreeMode";
import AdminBiblioteca from "./admin/AdminBiblioteca";
import FeaturesControl from "./admin/Features";
import { TodayView, CouplesView } from "@/features/admin/TodayCouples";
import { PaymentsView, type PaymentsTab } from "@/features/admin/Payments";
import { AnnouncementsTab, WrappedTab, PwaTab } from "@/features/admin/Content";
import { VerificationsView } from "@/features/admin/Verifications";
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
    const [featureTiers, setFeatureTiers] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [houses, setHouses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [paymentSettings, setPaymentSettings] = useState<any>(null);



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

    if (loading && payments.length === 0) {
        return <div className="flex h-screen items-center justify-center bg-[#F7F5F2] text-[13.5px] font-medium text-[#7A7F8C] dark:bg-background">A carregar o painel…</div>;
    }

    const pendingPayments = payments.filter(p => p.status === 'pending');

    return (
        <div className="admin-scope flex h-screen flex-col overflow-hidden bg-[#F7F5F2] text-[#0B1324] dark:bg-background dark:text-foreground md:flex-row">
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

                {tab === "announcements" && <div className="mx-auto max-w-5xl"><AnnouncementsTab /></div>}
                {tab === "wrapped" && <div className="mx-auto max-w-5xl"><WrappedTab /></div>}
                {tab === "pwa" && <div className="mx-auto max-w-5xl"><PwaTab /></div>}

                {tab === "verifications" && (
                    <VerificationsView houses={houses} users={users} verifications={verifications} onChanged={fetchAllData} />
                )}

                {/* BIBLIOTECA TAB */}
                {tab === "biblioteca" && <div className="mx-auto max-w-5xl"><AdminBiblioteca /></div>}
            </main>
        </div>
    );
}

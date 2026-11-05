import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, UploadCloud, CreditCard, MessageCircle, Shield, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useFreeMode } from "@/hooks/useFreeMode";
import { useReceiptUpload } from "@/hooks/useReceiptUpload";
import { ScreenHeader } from "@/components/ScreenHeader";
import { hasActivePaidSubscription } from "@/lib/subscriptionAccess";
import { ConfirmPlan, PaymentReturn, PlanChooser, sortPlans } from "@/features/subscription/EpayFlow";


const EPAY_PENDING_KEY = "ln_epay_pending";
const readPending = () => { try { return localStorage.getItem(EPAY_PENDING_KEY); } catch { return null; } };
const writePending = (id: string | null) => {
    try { if (id) localStorage.setItem(EPAY_PENDING_KEY, id); else localStorage.removeItem(EPAY_PENDING_KEY); } catch { /* sem armazenamento */ }
};

export default function Subscription() {
    const [loading, setLoading] = useState(true);
    const [house, setHouse] = useState<any>(null);
    const [pendingPayment, setPendingPayment] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);

    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [view, setView] = useState<"plans" | "confirm" | "manual">("plans");
    const [paying, setPaying] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [returnId, setReturnId] = useState<string | null>(() => searchParams.get("pagamento") ?? readPending());
    const [selectedMethod, setSelectedMethod] = useState<any>(null);

    const [paymentSettings, setPaymentSettings] = useState<any>(null);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const receipt = useReceiptUpload();
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");


    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    // Feedback em tempo real: antes o pagador tinha de recarregar a página
    // à mão para saber se o pagamento foi aprovado/rejeitado. Mesmo padrão
    // de canal Realtime já usado em useLocationSharing.ts/useUserSettings.ts.
    useEffect(() => {
        if (!house?.id || !pendingPayment?.id) return;
        const channel = supabase
            .channel(`payments-rt-${house.id}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "payments", filter: `couple_space_id=eq.${house.id}` },
                (payload: any) => {
                    const row = payload.new;
                    if (!row || row.id !== pendingPayment.id) return;
                    if (row.status === "approved") {
                        toast({ title: "Pagamento aprovado!", description: "A vossa subscrição já está ativa." });
                        loadData();
                    } else if (row.status === "rejected") {
                        toast({
                            title: "Pagamento rejeitado",
                            description: row.admin_notes || "Contacta o suporte para mais informações.",
                            variant: "destructive",
                        });
                        setPendingPayment(null);
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [house?.id, pendingPayment?.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserEmail(user.email || "");

            // Com o Modo gratuito ligado, só o admin vê os planos (para testar o pagamento).
            const { data: adminRow } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
            setIsAdmin(!!adminRow);

            const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
            setUserName(profile?.display_name || user.user_metadata?.full_name || "Utilizador");

            const { data: activePlans } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (activePlans && activePlans.length > 0) {
                const sorted = sortPlans(activePlans as any[]);
                setPlans(sorted);
                setSelectedPlan(sorted.find((x: any) => x.billing_type === "annual") ?? sorted[0]);
            }

            const { data: psData } = await (supabase as any).from("payment_settings").select("*").limit(1).maybeSingle();
            if (psData) {
                setPaymentSettings(psData);
                const methods = [];
                const accountName = psData.account_name || "LoveNest";
                if (psData.mpesa_number) methods.push({ id: "M-Pesa", name: "M-Pesa", instructions: `Envia o valor para: ${psData.mpesa_number} (Nome: ${accountName})` });
                if (psData.emola_number) methods.push({ id: "e-Mola", name: "e-Mola", instructions: `Envia o valor para: ${psData.emola_number} (Nome: ${accountName})` });
                if (psData.mkesh_number) methods.push({ id: "mKesh", name: "mKesh", instructions: `Envia o valor para: ${psData.mkesh_number} (Nome: ${accountName})` });
                setPaymentMethods(methods);
                if (methods.length > 0) setSelectedMethod(methods[0]);
            }

            const { data: members } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).single();
            if (members) {
                const { data: houseData } = await supabase.from("couple_spaces").select("*").eq("id", members.couple_space_id).single();
                setHouse(houseData);

                if (houseData?.subscription_status !== 'active') {
                    const { data: paymentData } = await supabase
                        .from("payments")
                        .select("*")
                        .eq("couple_space_id", members.couple_space_id)
                        .eq("status", "pending")
                        .neq("provider", "epay")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (paymentData) setPendingPayment(paymentData);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Ao voltar do checkout. Num telemóvel com a app instalada, o regresso pode abrir noutra
    // janela: por isso a app também retoma quando volta a ficar visível.
    useEffect(() => {
        if (searchParams.get("cancelado")) {
            writePending(null);
            setReturnId(null);
            setSearchParams({}, { replace: true });
            return;
        }
        const onVisible = () => {
            if (document.visibilityState === "visible") setReturnId(cur => cur ?? readPending());
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [searchParams, setSearchParams]);

    const leaveReturn = useCallback(() => {
        writePending(null);
        setReturnId(null);
        setSearchParams({}, { replace: true });
        loadData();
    }, [setSearchParams]);

    const handleReturnFailed = useCallback((message?: string) => {
        toast({ title: "Pagamento não concluído", description: message ?? "Podem tentar outra vez.", variant: "destructive" });
        setView("plans");
        leaveReturn();
    }, [leaveReturn, toast]);

    const handleReturnDone = useCallback(() => writePending(null), []);

    const handlePay = async () => {
        if (!selectedPlan) return;
        setPaying(true);
        const { data, error } = await supabase.functions.invoke("epay", { body: { action: "create", plan_id: selectedPlan.id } });
        if (error || !data?.payment_url) {
            setPaying(false);
            toast({ title: "Não foi possível iniciar o pagamento", description: "Tenta outra vez daqui a pouco.", variant: "destructive" });
            return;
        }
        writePending(data.payment_id);
        window.location.href = data.payment_url;
    };

    const handleSubscribe = async () => {
        if (!selectedPlan) {
            toast({ title: "Falta Plano", description: "Por favor escolhe um plano.", variant: "destructive" });
            return;
        }
        if (!receipt.proofRef) {
            toast({ title: "Falta comprovativo", description: "Por favor envia o comprovativo de pagamento.", variant: "destructive" });
            return;
        }

        try {
            setSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            if (!house) throw new Error("Sem casa associada.");

            const { data: inserted, error: paymentError } = await supabase.from("payments").insert({
                couple_space_id: house.id,
                plan_name: selectedPlan.name,
                amount: selectedPlan.price,
                method: selectedMethod?.name || '',
                proof_url: receipt.proofRef,
                status: 'pending'
            }).select().single();
            if (paymentError) throw paymentError;

            // Update state directly — avoids loadData() flash (loading=true → full page reload effect)
            setPendingPayment(inserted);
            receipt.reset();
            toast({ title: "Comprovativo enviado!", description: "Aguarda a aprovação do admin." });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleWhatsApp = () => {
        if (!pendingPayment || !house || !paymentSettings) return;
        let msg = paymentSettings.whatsapp_message_template || "Olá, acabei de pagar o plano LoveNest. Segue o comprovativo.";
        msg = msg.replace("{user_name}", userName).replace("{user_email}", userEmail)
            .replace("{house_name}", house.house_name || 'Sem Nome')
            .replace("{plan_name}", pendingPayment.plan_name)
            .replace("{plan_price}", pendingPayment.amount);
        const number = paymentSettings.whatsapp_number;
        if (!number) return;
        window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const { freeMode } = useFreeMode();

    if (returnId) {
        return (
            <div className="ink-primary animate-fade-in">
                <PaymentReturn
                    paymentId={returnId}
                    onFailed={handleReturnFailed}
                    onLeave={leaveReturn}
                    onDone={handleReturnDone}
                    onHome={() => navigate("/")}
                    onStart={() => navigate("/historia")}
                />
            </div>
        );
    }

    if (loading) {
        return <div className="flex items-center justify-center py-24 text-[14px] font-medium text-muted-foreground animate-pulse">A carregar planos…</div>;
    }

    if (freeMode && !isAdmin) {
        return (
            <div className="ink-primary animate-fade-in">
                <ScreenHeader title="Subscrição" subtitle="Plano LoveNest" className="mb-5" />
                <main>
                    <div className="glass-card p-8 text-center animate-in zoom-in-95">
                        <CheckCircle className="w-12 h-12 text-primary mx-auto mb-5" strokeWidth={1.5} />
                        <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.02em]">Modo gratuito ativo</h2>
                        <p className="text-[14px] text-muted-foreground leading-relaxed">O LoveNest está em modo de acesso total. Podes desfrutar de todas as funcionalidades premium sem qualquer custo.</p>
                        <Button className="mt-6 h-12 w-full rounded-[16px] font-semibold" onClick={() => navigate("/")}>Voltar à Home</Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="ink-primary animate-fade-in">
            <ScreenHeader title="Subscrição" subtitle="Plano LoveNest" className="mb-5" />

            <main>
                {hasActivePaidSubscription(house) ? (
                    <div className="animate-in zoom-in-95">
                        <div className="glass-card p-8 text-center">
                            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-5" strokeWidth={1.5} />
                            <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.02em]">Estatuto Premium</h2>
                            <p className="text-[14px] text-muted-foreground leading-relaxed">
                                A tua casa <strong className="text-foreground">{house.house_name}</strong> tem subscrição ativa. Explora todas as funcionalidades sem limites.
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
                                <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
                                Acesso total garantido
                            </div>
                        </div>
                    </div>
                ) : pendingPayment ? (
                    <div className="animate-in zoom-in-95">
                        <div className="glass-card p-8 text-center">
                            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-5" strokeWidth={1.5} />
                            <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.02em]">Em análise</h2>
                            <p className="text-[14px] text-muted-foreground leading-relaxed">
                                Recebemos o teu comprovativo. A nossa equipa está a verificar o pagamento.
                            </p>

                            <div className="mt-5 mb-6 space-y-2 rounded-[18px] border border-[#ECE8E3] bg-[#F7F5F2] p-4 text-left dark:border-border dark:bg-muted">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Plano</span>
                                    <span className="font-bold text-foreground">{pendingPayment.plan_name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Valor</span>
                                    <span className="font-bold text-primary">{pendingPayment.amount}</span>
                                </div>
                            </div>

                            {paymentSettings?.whatsapp_number && (
                                <>
                                    <Button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 h-14 font-bold text-[15px] rounded-2xl shadow-lg">
                                        <MessageCircle className="w-5 h-5" strokeWidth={1.5} /> Acelerar via WhatsApp
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">Avisa o suporte para acelerar a ativação.</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    view === "confirm" && selectedPlan ? (
                        <ConfirmPlan plan={selectedPlan} house={house} paying={paying} onBack={() => setView("plans")} onPay={handlePay} />
                    ) : view === "manual" ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2.5">
                                <button type="button" onClick={() => setView("plans")} aria-label="Voltar aos planos"
                                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#F2F0ED] dark:bg-muted">
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <div>
                                    <h2 className="text-[20px] font-bold tracking-[-0.025em]">Enviar comprovativo</h2>
                                    <p className="text-[12.5px] text-muted-foreground">{selectedPlan?.name} · {selectedPlan?.price}</p>
                                </div>
                            </div>

                            {/* Payment Method */}
                            {paymentMethods.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-[15px] font-semibold">Método de pagamento</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {paymentMethods.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => setSelectedMethod(m)}
                                                className={`h-11 px-2 rounded-[14px] border text-center transition-colors font-semibold text-sm ${selectedMethod?.id === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-[#ECE8E3] hover:border-[#D5D1CB] dark:bg-card dark:border-border'}`}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedMethod && (
                                        <div className="flex items-start gap-3 rounded-[18px] border border-[#ECE8E3] bg-[#F7F5F2] p-4 dark:border-border dark:bg-muted">
                                            <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                                            <p className="text-[13px] font-medium text-foreground leading-relaxed">{selectedMethod.instructions}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Upload Proof */}
                            <div className="space-y-3">
                                <h3 className="text-[15px] font-semibold">Comprovativo de pagamento</h3>

                                {receipt.file ? (
                                    <div className="border-2 border-primary bg-primary/5 rounded-2xl overflow-hidden">
                                        {receipt.preview ? (
                                            <img
                                                src={receipt.preview}
                                                alt="Comprovativo"
                                                className="w-full max-h-52 object-contain bg-black/5"
                                            />
                                        ) : (
                                            <div className="p-5 flex items-center gap-3">
                                                <CheckCircle className="w-6 h-6 text-primary shrink-0" strokeWidth={1.5} />
                                                <p className="text-sm font-bold text-foreground truncate flex-1">{receipt.file.name}</p>
                                            </div>
                                        )}
                                        <div className="p-3 border-t border-primary/20 flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold flex items-center gap-1.5 flex-1 truncate">
                                                {receipt.uploading ? (
                                                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /> <span className="text-primary">A enviar...</span></>
                                                ) : receipt.proofRef ? (
                                                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <span className="text-emerald-600 truncate">{receipt.file.name}</span></>
                                                ) : (
                                                    <span className="text-destructive">Falha ao enviar — tenta de novo</span>
                                                )}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={receipt.uploading}
                                                className="text-xs text-muted-foreground underline shrink-0 disabled:opacity-40"
                                                onClick={receipt.reset}
                                            >
                                                Alterar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Input como overlay directo — sem display:none, sem delegação JS.
                                       O input cobre toda a área táctil com opacity:0, o browser
                                       trata o toque como gesto directo e abre o seletor nativo. */
                                    <div className="relative border-2 border-dashed border-border rounded-2xl hover:bg-muted/40 transition-colors">
                                        <div className="p-8 text-center space-y-3 pointer-events-none select-none">
                                            <UploadCloud className="w-9 h-9 mx-auto text-muted-foreground" strokeWidth={1.5} />
                                            <div>
                                                <p className="text-sm font-bold text-foreground">Toca para selecionar a foto</p>
                                                <p className="text-xs text-muted-foreground mt-1">Galeria, câmara ou PDF</p>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file || !house) return;
                                                receipt.select(file, (f) => {
                                                    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
                                                    return `${house.id}_${Date.now()}.${ext}`;
                                                });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                opacity: 0,
                                                cursor: 'pointer',
                                                fontSize: '0',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <Button
                                className="w-full h-[52px] rounded-[18px] font-semibold text-[15px] shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] active:scale-[0.99] transition-transform"
                                onClick={handleSubscribe}
                                disabled={submitting || receipt.uploading || !plans.length || !receipt.proofRef}
                            >
                                {submitting ? "A enviar..." : `Confirmar Pagamento — ${selectedPlan?.price || ''}`}
                            </Button>

                            <p className="text-center text-[11px] text-muted-foreground pb-2">
                                Após a validação pelo admin, a tua subscrição é ativada automaticamente.
                            </p>
                        </div>
                    ) : (
                        <PlanChooser
                            plans={plans}
                            selected={selectedPlan}
                            onSelect={setSelectedPlan}
                            onContinue={() => setView("confirm")}
                            onManual={() => setView("manual")}
                            canManual={paymentMethods.length > 0}
                        />
                    )
                )}
            </main>
        </div>
    );
}

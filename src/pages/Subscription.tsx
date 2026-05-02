import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, UploadCloud, CreditCard, MessageCircle, Sparkles, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useFreeMode } from "@/hooks/useFreeMode";

export default function Subscription() {
    const [loading, setLoading] = useState(true);
    const [house, setHouse] = useState<any>(null);
    const [pendingPayment, setPendingPayment] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);

    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState<any>(null);

    const [paymentSettings, setPaymentSettings] = useState<any>(null);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

    const [uploading, setUploading] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");

    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserEmail(user.email || "");

            const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
            setUserName(profile?.display_name || user.user_metadata?.full_name || "Utilizador");

            const { data: activePlans } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (activePlans && activePlans.length > 0) {
                setPlans(activePlans);
                setSelectedPlan(activePlans[0]);
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

    const handleSubscribe = async () => {
        if (!selectedPlan) {
            toast({ title: "Falta Plano", description: "Por favor escolhe um plano.", variant: "destructive" });
            return;
        }
        if (!receiptFile) {
            toast({ title: "Falta comprovativo", description: "Por favor envia o comprovativo de pagamento.", variant: "destructive" });
            return;
        }

        try {
            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            if (!house) throw new Error("Sem casa associada.");

            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `${house.id}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, receiptFile);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
            const { error: paymentError } = await supabase.from("payments").insert({
                couple_space_id: house.id,
                plan_name: selectedPlan.name,
                amount: selectedPlan.price,
                method: selectedMethod.name,
                proof_url: publicUrlData.publicUrl,
                status: 'pending'
            });
            if (paymentError) throw paymentError;

            toast({ title: "Sucesso!", description: "Comprovativo enviado. Aguarda a aprovação do admin." });
            loadData();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleWhatsApp = () => {
        if (!pendingPayment || !house || !paymentSettings) return;
        let msg = paymentSettings.whatsapp_message_template || "Olá, acabei de pagar o plano LoveNest. Segue o comprovativo.";
        msg = msg.replace("{user_name}", userName).replace("{user_email}", userEmail)
            .replace("{house_name}", house.house_name || 'Sem Nome')
            .replace("{plan_name}", pendingPayment.plan_name)
            .replace("{plan_price}", pendingPayment.amount);
        const number = paymentSettings.whatsapp_number || "258841234567";
        window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, "_blank");
    };

    const { freeMode } = useFreeMode();

    if (loading) {
        return <div className="flex justify-center items-center h-screen animate-pulse font-bold tracking-widest text-muted-foreground">A carregar planos...</div>;
    }

    if (freeMode) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <header className="px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Subscrição LoveNest</h1>
                </header>
                <main className="p-4 max-w-md mx-auto">
                    <div className="glass-card p-8 text-center animate-in zoom-in-95">
                        <CheckCircle className="w-12 h-12 text-primary mx-auto mb-5" strokeWidth={1.5} />
                        <h2 className="text-2xl font-bold mb-2 tracking-tight">Modo Gratuito Ativo</h2>
                        <p className="text-[14px] text-muted-foreground leading-relaxed">O LoveNest está em modo de acesso total. Podes desfrutar de todas as funcionalidades premium sem qualquer custo.</p>
                        <Button className="mt-6 w-full rounded-2xl font-semibold h-12" onClick={() => navigate("/")}>Voltar à Home</Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <header className="px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Subscrição LoveNest</h1>
            </header>

            <main className="max-w-md mx-auto">
                {house?.subscription_status === 'active' ? (
                    <div className="p-4 animate-in zoom-in-95">
                        <div className="glass-card p-8 text-center">
                            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-5" strokeWidth={1.5} />
                            <h2 className="text-2xl font-bold mb-2 tracking-tight">Estatuto Premium</h2>
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
                    <div className="p-4 animate-in zoom-in-95">
                        <div className="glass-card p-8 text-center">
                            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-5" strokeWidth={1.5} />
                            <h2 className="text-2xl font-bold mb-2 tracking-tight">Em Análise</h2>
                            <p className="text-[14px] text-muted-foreground leading-relaxed">
                                Recebemos o teu comprovativo. A nossa equipa está a verificar o pagamento.
                            </p>

                            <div className="mt-5 mb-6 bg-muted/60 rounded-2xl p-4 text-left space-y-2 border">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Plano</span>
                                    <span className="font-bold text-foreground">{pendingPayment.plan_name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Valor</span>
                                    <span className="font-bold text-primary">{pendingPayment.amount}</span>
                                </div>
                            </div>

                            <Button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 h-14 font-bold text-[15px] rounded-2xl shadow-lg">
                                <MessageCircle className="w-5 h-5" strokeWidth={1.5} /> Acelerar via WhatsApp
                            </Button>
                            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">Avisa o suporte para acelerar a ativação.</p>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4">
                        {/* Hero */}
                        <div className="px-4 pt-6 pb-2 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-4">
                                <Sparkles className="w-3 h-3" strokeWidth={2} />
                                Acesso ilimitado para dois
                            </div>
                            <h2 className="text-2xl font-black tracking-tight mb-2">Escolhe o teu Plano</h2>
                            <p className="text-[13px] text-muted-foreground leading-relaxed">Investe na vossa relação. Cancela quando quiseres.</p>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Plans */}
                            {plans.length === 0 ? (
                                <div className="glass-card p-6 text-center">
                                    <p className="text-muted-foreground text-sm italic">Nenhum plano disponível no momento.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {plans.map((p, index) => {
                                        const isSelected = selectedPlan?.id === p.id;
                                        const isPopular = index === 1;
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedPlan(p)}
                                                className={`relative rounded-2xl p-5 cursor-pointer transition-all border-2 ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'}`}
                                            >
                                                {isPopular && (
                                                    <div className="absolute -top-2.5 left-5">
                                                        <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                                            Mais Popular
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 pr-2">
                                                        <h4 className="font-bold text-base mb-0.5">{p.name}</h4>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                            {p.billing_type === 'one_time' ? 'Pagamento Único' : p.billing_type || 'Mensal'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xl font-black text-primary leading-none">{p.price}</p>
                                                    </div>
                                                </div>

                                                {p.features?.length > 0 && (
                                                    <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                                                        {p.features.map((feat: string, i: number) => (
                                                            <li key={i} className="flex gap-2 items-start text-[12px] text-muted-foreground">
                                                                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                                                                {feat}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {isSelected && (
                                                    <div className="absolute top-4 right-4">
                                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                            <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Payment Method */}
                            {paymentMethods.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-base">Método de Pagamento</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {paymentMethods.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => setSelectedMethod(m)}
                                                className={`py-3 px-2 rounded-xl border-2 text-center transition-all font-bold text-sm ${selectedMethod?.id === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'}`}
                                            >
                                                {m.name}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedMethod && (
                                        <div className="bg-muted/60 border rounded-2xl p-4 flex items-start gap-3">
                                            <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                                            <p className="text-[13px] font-medium text-foreground leading-relaxed">{selectedMethod.instructions}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Upload Proof */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-base">Comprovativo de Pagamento</h3>
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 transition-colors cursor-pointer ${receiptFile ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                                    onClick={() => document.getElementById('receipt')?.click()}
                                >
                                    <UploadCloud className={`w-9 h-9 mx-auto ${receiptFile ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            {receiptFile ? receiptFile.name : "Clica para anexar o comprovativo"}
                                        </p>
                                        {!receiptFile && <p className="text-xs text-muted-foreground mt-1">Imagens ou PDF suportados</p>}
                                    </div>
                                    <input id="receipt" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                                        if (e.target.files?.[0]) setReceiptFile(e.target.files[0]);
                                    }} />
                                </div>
                            </div>

                            {/* Trust indicators */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                    { icon: Shield, label: "Seguro" },
                                    { icon: CheckCircle, label: "Garantido" },
                                    { icon: Sparkles, label: "Acesso total" },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/40">
                                        <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                                        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Submit */}
                            <Button
                                className="w-full h-14 rounded-2xl font-bold text-[16px] shadow-lg active:scale-95 transition-transform"
                                onClick={handleSubscribe}
                                disabled={uploading || !plans.length}
                            >
                                {uploading ? "A enviar..." : `Confirmar Pagamento — ${selectedPlan?.price || ''}`}
                            </Button>

                            <p className="text-center text-[11px] text-muted-foreground pb-2">
                                Após a validação pelo admin, a tua subscrição é ativada automaticamente.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

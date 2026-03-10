import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, UploadCloud, CreditCard, Tag, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const METHODS = [
    { id: "M-Pesa", name: "M-Pesa", instructions: "Envia o valor para: 84 123 4567 (Nome: LoveNest)" },
    { id: "e-Mola", name: "e-Mola", instructions: "Envia o valor para: 86 123 4567 (Nome: LoveNest)" },
    { id: "mKesh", name: "mKesh", instructions: "Envia o valor para: 82 123 4567 (Nome: LoveNest)" }
];

export default function Subscription() {
    const [loading, setLoading] = useState(true);
    const [house, setHouse] = useState<any>(null);
    const [pendingPayment, setPendingPayment] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);

    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState(METHODS[0]);

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

            const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
            setUserName(profile?.display_name || user.user_metadata?.full_name || "Utilizador");

            // Fetch Active Plans
            const { data: activePlans } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (activePlans && activePlans.length > 0) {
                setPlans(activePlans);
                setSelectedPlan(activePlans[0]);
            }

            // Get house details
            const { data: members } = await supabase
                .from("house_members")
                .select("house_id")
                .eq("user_id", user.id)
                .single();

            if (members) {
                const { data: houseData } = await supabase
                    .from("houses")
                    .select("*")
                    .eq("id", members.house_id)
                    .single();

                setHouse(houseData);

                if (houseData?.subscription_status !== 'active') {
                    // Check if there is a pending payment
                    const { data: paymentData } = await supabase
                        .from("payments")
                        .select("*")
                        .eq("house_id", members.house_id)
                        .eq("status", "pending")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (paymentData) {
                        setPendingPayment(paymentData);
                    }
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

            // Upload receipt
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `${house.id}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("receipts")
                .upload(filePath, receiptFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from("receipts")
                .getPublicUrl(filePath);

            // Create Payment record
            const { error: paymentError } = await supabase
                .from("payments")
                .insert({
                    house_id: house.id,
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
        if (!pendingPayment || !house) return;
        const msg = `Olá, acabei de pagar o plano LoveNest.\n\nNome: ${userName}\nEmail: ${userEmail}\nCasa: ${house.house_name || 'Sem Nome'}\nPlano: ${pendingPayment.plan_name}\nValor: ${pendingPayment.amount}\n\nSegue o comprovativo para activação.`;
        const encodedMsg = encodeURIComponent(msg);
        window.open(`https://wa.me/258841234567?text=${encodedMsg}`, "_blank");
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen animate-pulse font-bold tracking-widest text-muted-foreground">A carregar planos...</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold tracking-tight text-foreground drop-shadow-sm">Subscrição LoveNest</h1>
            </header>

            <main className="p-4 space-y-6 max-w-md mx-auto">
                {house?.subscription_status === 'active' ? (
                    <div className="bg-card border rounded-3xl p-8 shadow-md text-center animate-in zoom-in-95">
                        <div className="mx-auto w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">Estatuto Premium!</h2>
                        <p className="text-foreground/80 leading-relaxed font-medium">A tua casa <strong className="text-primary">{house.house_name}</strong> tem subscrição ativa. Explora todas as features sem limites!</p>
                    </div>
                ) : pendingPayment ? (
                    <div className="bg-card border rounded-3xl p-8 shadow-md text-center animate-in zoom-in-95">
                        <div className="mx-auto w-20 h-20 bg-yellow-500/10 text-yellow-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <UploadCloud className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">Em Análise</h2>
                        <p className="text-foreground/80 leading-relaxed font-medium">Recebemos o teu comprovativo. A nossa equipa está a verificar o pagamento e a ativação será feita em breve.</p>

                        <div className="mt-4 mb-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted p-3 rounded-xl border flex flex-col items-center">
                            <span>Plano: <span className="text-primary">{pendingPayment.plan_name}</span></span>
                            <span>Valor: {pendingPayment.amount}</span>
                        </div>

                        <Button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 h-14 font-bold text-md rounded-2xl shadow-lg">
                            <MessageCircle className="w-5 h-5" /> Acelerar Ativação via WhatsApp
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-3">Clica acima para enviares mensagem ao suporte avisando que já efetuaste o pagamento, para não precisares de esperar.</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4">

                        {/* Plans Selection */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> Escolhe o teu Plano</h3>
                            {plans.length === 0 ? (
                                <p className="text-muted-foreground text-sm italic">Nenhum plano disponível no momento.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {plans.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedPlan(p)}
                                            className={`border-2 rounded-2xl p-5 cursor-pointer transition-all ${selectedPlan?.id === p.id ? 'border-primary bg-primary/5 shadow-sm scale-[1.02]' : 'border-border bg-card hover:border-primary/30'}`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xl font-bold">{p.name}</h4>
                                                {selectedPlan?.id === p.id && <CheckCircle className="w-5 h-5 text-primary" />}
                                            </div>
                                            <p className="text-2xl font-black text-primary mb-1">{p.price}</p>
                                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-3">{p.billing_type === 'one_time' ? 'Pagamento Único' : p.billing_type}</p>
                                            <ul className="space-y-1">
                                                {p.features?.map((feat: string, i: number) => (
                                                    <li key={i} className="flex gap-2 items-start text-xs text-muted-foreground font-medium">
                                                        <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" /> {feat}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Método de Pagamento</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {METHODS.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMethod(m)}
                                        className={`p-3 rounded-xl border text-center transition-all ${selectedMethod.id === m.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-card-foreground border-border hover:border-primary/50'}`}
                                    >
                                        <span className="font-bold text-sm">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="bg-muted border rounded-xl p-4 flex items-start gap-3">
                                <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-foreground">
                                    {selectedMethod.instructions}
                                </p>
                            </div>
                        </div>

                        {/* Upload Proof */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Comprovativo</h3>
                            <div className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 transition-colors cursor-pointer ${receiptFile ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`} onClick={() => document.getElementById('receipt')?.click()}>
                                <UploadCloud className={`w-10 h-10 mx-auto ${receiptFile ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div>
                                    <p className="text-sm text-foreground font-bold">
                                        {receiptFile ? receiptFile.name : "Clica para anexar o comprovativo"}
                                    </p>
                                    {!receiptFile && <p className="text-xs text-muted-foreground mt-1">Imagens ou PDF suportados.</p>}
                                </div>
                                <input id="receipt" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                                    if (e.target.files?.[0]) setReceiptFile(e.target.files[0]);
                                }} />
                            </div>
                        </div>

                        {/* Submit */}
                        <Button
                            className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
                            onClick={handleSubscribe}
                            disabled={uploading || !plans.length}
                        >
                            {uploading ? "A enviar e processar..." : "Confirmar e Enviar"}
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}

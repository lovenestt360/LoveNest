import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, UploadCloud, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const PLANS = [
    {
        id: "lovenest_lifetime",
        name: "LoveNest Lifetime",
        price: "499 MT",
        features: [
            "Acesso vitalício para 2 pessoas",
            "Chat privado e seguro",
            "Gestão de tarefas do casal",
            "Acompanhamento de humor",
            "Suporte prioritário"
        ]
    }
];

const METHODS = [
    { id: "M-Pesa", name: "M-Pesa", instructions: "Envia o valor para: 84 123 4567 (Nome: LoveNest)" },
    { id: "e-Mola", name: "e-Mola", instructions: "Envia o valor para: 86 123 4567 (Nome: LoveNest)" },
    { id: "mKesh", name: "mKesh", instructions: "Envia o valor para: 82 123 4567 (Nome: LoveNest)" }
];

export default function Subscription() {
    const [loading, setLoading] = useState(true);
    const [sub, setSub] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState(METHODS[0]);
    const [uploading, setUploading] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get house_id
            const { data: members } = await supabase
                .from("house_members")
                .select("house_id")
                .eq("user_id", user.id)
                .single();

            if (!members) {
                setLoading(false);
                return;
            }

            const { data: subscription } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("house_id", members.house_id)
                .maybeSingle();

            if (subscription) {
                setSub(subscription);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!receiptFile) {
            toast({ title: "Falta comprovativo", description: "Por favor envia o comprovativo de pagamento.", variant: "destructive" });
            return;
        }

        try {
            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: members } = await supabase
                .from("house_members")
                .select("house_id")
                .eq("user_id", user.id)
                .single();

            if (!members) throw new Error("Sem casa associada.");

            // Upload receipt
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `${members.house_id}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("receipts")
                .upload(filePath, receiptFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from("receipts")
                .getPublicUrl(filePath);

            // Save subscription
            const { error: subError } = await supabase
                .from("subscriptions")
                .insert({
                    house_id: members.house_id,
                    plan: PLANS[0].name,
                    payment_method: selectedMethod.name,
                    payment_proof_url: publicUrlData.publicUrl,
                    paid: false
                });

            if (subError) throw subError;

            toast({ title: "Sucesso!", description: "Comprovativo enviado. Aguarda a aprovação do admin." });
            checkSubscription();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">A carregar...</div>;
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
                {sub ? (
                    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4 text-center">
                        {sub.paid ? (
                            <>
                                <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold">Plano Ativo!</h2>
                                <p className="text-muted-foreground">A tua subscrição {sub.plan} está ativa. Aproveita o LoveNest com o teu par.</p>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto w-16 h-16 bg-yellow-500/10 text-yellow-600 rounded-full flex items-center justify-center">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold">Em Análise</h2>
                                <p className="text-muted-foreground">Recebemos o teu comprovativo. A nossa equipa está a verificar o pagamento.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
                            <h2 className="text-2xl font-bold text-primary">{PLANS[0].name}</h2>
                            <p className="text-3xl font-black">{PLANS[0].price}</p>
                            <ul className="space-y-2 mt-4">
                                {PLANS[0].features.map((feat, i) => (
                                    <li key={i} className="flex gap-2 items-center text-sm text-muted-foreground">
                                        <CheckCircle className="w-4 h-4 text-primary" /> {feat}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Método de Pagamento</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {METHODS.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMethod(m)}
                                        className={`p-3 rounded-xl border text-center transition-all ${selectedMethod.id === m.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border hover:border-primary/50'}`}
                                    >
                                        <span className="font-medium text-sm">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm bg-muted p-3 rounded-lg text-muted-foreground">
                                {selectedMethod.instructions}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Comprovativo</h3>
                            <div className="border border-dashed rounded-2xl p-6 text-center space-y-2 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => document.getElementById('receipt')?.click()}>
                                <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground" />
                                <p className="text-sm text-foreground font-medium">
                                    {receiptFile ? receiptFile.name : "Clica para carregar o comprovativo"}
                                </p>
                                <input id="receipt" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                                    if (e.target.files?.[0]) setReceiptFile(e.target.files[0]);
                                }} />
                            </div>
                        </div>

                        <button
                            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-70 flex justify-center items-center gap-2"
                            onClick={handleSubscribe}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <span className="animate-pulse">A enviar...</span>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" /> Enviar Pagamento
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

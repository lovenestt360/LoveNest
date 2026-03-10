import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Check, X, FileText } from "lucide-react";

export default function Admin() {
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);

            // We assume the user viewing this has RLS bypass or an admin policy, 
            // otherwise this returns empty or errors.
            const { data, error } = await supabase
                .from("subscriptions")
                .select(`
          *,
          houses (
            house_name,
            partner1_name,
            partner2_name
          )
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setSubscriptions(data || []);
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const { error } = await supabase
                .from("subscriptions")
                .update({ paid: true })
                .eq("id", id);

            if (error) throw error;
            toast({ title: "Sucesso", description: "Subscrição aprovada!" });
            fetchSubscriptions();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">A carregar admin...</div>;
    }

    const pending = subscriptions.filter(s => !s.paid);
    const active = subscriptions.filter(s => s.paid);

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="p-4 space-y-6 max-w-md mx-auto">
                <header className="mb-4 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin - Painel de Subscrições</h1>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            Por Aprovar <span className="bg-destructive text-destructive-foreground text-sm px-2 py-0.5 rounded-full">{pending.length}</span>
                        </h2>
                        <div className="space-y-4">
                            {pending.length === 0 && <p className="text-muted-foreground">Nenhuma subscrição pendente.</p>}
                            {pending.map((sub) => (
                                <div key={sub.id} className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{sub.houses?.house_name || "Casa sem nome"}</h3>
                                            <p className="text-sm text-muted-foreground">{sub.houses?.partner1_name} & {sub.houses?.partner2_name}</p>
                                        </div>
                                        <span className="text-sm font-medium bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-md">Pendente</span>
                                    </div>

                                    <div className="text-sm bg-muted p-3 rounded-lg flex justify-between items-center">
                                        <span>Plano: <b>{sub.plan}</b></span>
                                        <span>Método: <b>{sub.payment_method}</b></span>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <a href={sub.payment_proof_url} target="_blank" rel="noreferrer" className="flex-1 flex justify-center items-center gap-2 py-2 border rounded-xl hover:bg-muted transition-colors text-sm font-medium">
                                            <FileText className="w-4 h-4" /> Ver Comprovativo
                                        </a>
                                        <button onClick={() => handleApprove(sub.id)} className="flex-1 flex justify-center items-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl active:scale-95 transition-transform text-sm font-medium">
                                            <Check className="w-4 h-4" /> Aprovar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            Ativas <span className="bg-primary/20 text-primary text-sm px-2 py-0.5 rounded-full">{active.length}</span>
                        </h2>
                        <div className="space-y-4">
                            {active.length === 0 && <p className="text-muted-foreground">Nenhuma subscrição ativa.</p>}
                            {active.map((sub) => (
                                <div key={sub.id} className="bg-card border rounded-2xl p-5 shadow-sm opacity-80">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{sub.houses?.house_name || "Casa sem nome"}</h3>
                                            <p className="text-sm text-muted-foreground">{sub.houses?.partner1_name} & {sub.houses?.partner2_name}</p>
                                        </div>
                                        <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">Ativa</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-2">
                                        Aprovada. Plano: {sub.plan}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

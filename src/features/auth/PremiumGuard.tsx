import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Paywall from "@/components/Paywall";

export function PremiumGuard({ requiredFeature }: { requiredFeature?: string }) {
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [missingFeature, setMissingFeature] = useState(false);

    useEffect(() => {
        const checkPremium = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: member } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
                if (!member) return;

                const { data: house } = await supabase.from("couple_spaces").select("subscription_status, trial_used, trial_ends_at").eq("id", member.couple_space_id).maybeSingle();
                if (house) {
                    let hasAccess = false;
                    let featureMissing = false;

                    if (house.trial_used && house.trial_ends_at) {
                        const endsAt = new Date(house.trial_ends_at);
                        if (endsAt > new Date()) {
                            // Free trial gives access to all features
                            hasAccess = true;
                        }
                    }

                    if (!hasAccess && house.subscription_status === 'active') {
                        if (requiredFeature) {
                            // Find active payment
                            const { data: payment } = await supabase.from("payments").select("plan_name").eq("couple_space_id", member.couple_space_id).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
                            if (payment) {
                                const { data: plan } = await supabase.from("subscription_plans").select("features").eq("name", payment.plan_name).maybeSingle();
                                if (plan && plan.features && plan.features.includes(requiredFeature)) {
                                    hasAccess = true;
                                } else {
                                    featureMissing = true;
                                }
                            }
                        } else {
                            hasAccess = true;
                        }
                    }

                    setIsPremium(hasAccess);
                    setMissingFeature(featureMissing);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        checkPremium();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-4">A verificar passe premium...</p>
                </div>
            </div>
        );
    }

    if (!isPremium) {
        if (missingFeature) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background p-6 text-center animate-in fade-in">
                    <div className="bg-card w-full max-w-sm rounded-3xl p-8 border shadow-sm">
                        <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                            <span className="font-bold text-2xl">!</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Funcionalidade Bloqueada</h2>
                        <p className="text-muted-foreground text-sm mb-6">O teu plano atual não inclui o acesso a esta funcionalidade. Faz upgrade para abrires o cadeado!</p>
                        <button onClick={() => window.location.href = '/subscricao'} className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl active:scale-95 transition-transform">
                            Ver Planos LoveNest
                        </button>
                    </div>
                </div>
            );
        }
        return <Paywall />;
    }

    return <Outlet />;
}

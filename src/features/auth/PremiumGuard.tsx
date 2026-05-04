import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFreeMode } from "@/hooks/useFreeMode";
import Paywall from "@/components/Paywall";

export function PremiumGuard({ requiredFeature }: { requiredFeature?: string }) {
    const { freeMode, loading: freeModeLoading } = useFreeMode();
    const [loading, setLoading] = useState(true);
    const [access, setAccess] = useState<"allow" | "paywall" | "upgrade">("paywall");

    useEffect(() => {
        if (freeModeLoading) return;
        if (freeMode) {
            setAccess("allow");
            setLoading(false);
            return;
        }

        const checkPremium = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: member } = await supabase
                    .from("members")
                    .select("couple_space_id")
                    .eq("user_id", user.id)
                    .maybeSingle();
                if (!member) return;

                // If no specific feature required, just check premium status
                if (!requiredFeature) {
                    const { data: house } = await supabase
                        .from("couple_spaces")
                        .select("subscription_status, trial_used, trial_ends_at")
                        .eq("id", member.couple_space_id)
                        .maybeSingle();
                    if (!house) return;

                    const trialActive = house.trial_used && house.trial_ends_at && new Date(house.trial_ends_at) > new Date();
                    const subscribed = house.subscription_status === "active";
                    setAccess(trialActive || subscribed ? "allow" : "paywall");
                    return;
                }

                // Check if this feature is a premium feature (exists in ANY active plan)
                const { data: allPlans } = await supabase
                    .from("subscription_plans")
                    .select("features")
                    .eq("is_active", true);

                const isPremiumFeature = allPlans?.some(
                    (p: any) => Array.isArray(p.features) && p.features.includes(requiredFeature)
                ) ?? false;

                // Feature not in any plan → it's free
                if (!isPremiumFeature) {
                    setAccess("allow");
                    return;
                }

                // Feature is premium — check if user has access
                const { data: house } = await supabase
                    .from("couple_spaces")
                    .select("subscription_status, trial_used, trial_ends_at")
                    .eq("id", member.couple_space_id)
                    .maybeSingle();
                if (!house) return;

                // Trial active → allow all premium features
                const trialActive = house.trial_used && house.trial_ends_at && new Date(house.trial_ends_at) > new Date();
                if (trialActive) {
                    setAccess("allow");
                    return;
                }

                // No subscription → paywall
                if (house.subscription_status !== "active") {
                    setAccess("paywall");
                    return;
                }

                // Subscription active → check if their plan includes this feature
                const { data: payment } = await supabase
                    .from("payments")
                    .select("plan_name")
                    .eq("couple_space_id", member.couple_space_id)
                    .eq("status", "approved")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!payment) {
                    setAccess("paywall");
                    return;
                }

                const { data: plan } = await supabase
                    .from("subscription_plans")
                    .select("features")
                    .eq("name", payment.plan_name)
                    .maybeSingle();

                if (plan?.features?.includes(requiredFeature)) {
                    setAccess("allow");
                } else {
                    // Has subscription but this feature is in a higher plan
                    setAccess("upgrade");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        checkPremium();
    }, [freeMode, freeModeLoading, requiredFeature]);

    if (loading || freeModeLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-4">A verificar acesso...</p>
                </div>
            </div>
        );
    }

    if (access === "upgrade") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background p-6 text-center animate-in fade-in">
                <div className="bg-card w-full max-w-sm rounded-3xl p-8 border shadow-sm">
                    <div className="mx-auto w-14 h-14 flex items-center justify-center mb-4 text-2xl font-black text-primary">
                        ⬆
                    </div>
                    <h2 className="text-xl font-bold mb-2">Funcionalidade Bloqueada</h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        O teu plano atual não inclui o acesso a esta funcionalidade. Faz upgrade para abrires o cadeado!
                    </p>
                    <button
                        onClick={() => window.location.href = "/subscricao"}
                        className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl active:scale-95 transition-transform"
                    >
                        Ver Planos LoveNest
                    </button>
                </div>
            </div>
        );
    }

    if (access === "paywall") {
        return <Paywall />;
    }

    return <Outlet />;
}

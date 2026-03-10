import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Paywall from "@/components/Paywall";

export function PremiumGuard() {
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        const checkPremium = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: member } = await supabase.from("house_members").select("house_id").eq("user_id", user.id).maybeSingle();
                if (!member) return;

                const { data: house } = await supabase.from("houses").select("subscription_status, trial_used, trial_ends_at").eq("id", member.house_id).maybeSingle();
                if (house) {
                    if (house.subscription_status === 'active') {
                        setIsPremium(true);
                    } else if (house.trial_used && house.trial_ends_at) {
                        const endsAt = new Date(house.trial_ends_at);
                        if (endsAt > new Date()) {
                            setIsPremium(true);
                        }
                    }
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
        return <Paywall />;
    }

    return <Outlet />;
}

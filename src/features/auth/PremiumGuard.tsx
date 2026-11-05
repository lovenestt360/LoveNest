import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFreeMode } from "@/hooks/useFreeMode";
import Paywall from "@/components/Paywall";
import { hasActivePaidSubscription } from "@/lib/subscriptionAccess";
import { useFeatureAccess } from "@/features/feature-access/FeatureAccessContext";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";

// Tier levels — must match subscription_plans.tier_level in DB
// 0 = Free, 1 = Plus, 2 = Pro, 3 = Max
// Trial active = 999 (all access)

export function PremiumGuard({ requiredFeature }: { requiredFeature?: string }) {
    const { freeMode, loading: freeModeLoading } = useFreeMode();
    const { isEnabled, isTesting, loading: flagsLoading } = useFeatureAccess();
    const [loading, setLoading] = useState(true);
    const [access, setAccess] = useState<"allow" | "paywall" | "upgrade">("paywall");

    useEffect(() => {
        if (freeModeLoading) return;
        if (freeMode) {
            setAccess("allow");
            setLoading(false);
            return;
        }

        const check = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: member } = await supabase
                    .from("members")
                    .select("couple_space_id")
                    .eq("user_id", user.id)
                    .maybeSingle();
                if (!member) return;

                const { data: house } = await supabase
                    .from("couple_spaces")
                    .select("*")
                    .eq("id", member.couple_space_id)
                    .maybeSingle();
                if (!house) return;

                // ── Determine user's effective tier ──────────────────────
                let userTier = 0;

                const trialActive =
                    house.trial_used &&
                    house.trial_ends_at &&
                    new Date(house.trial_ends_at) > new Date();

                if (trialActive) {
                    userTier = 999; // trial = unrestricted
                } else if (hasActivePaidSubscription(house as any)) {
                    userTier = house.tier_level ?? 1;
                }

                // ── No specific feature → generic premium check ───────────
                if (!requiredFeature) {
                    setAccess(userTier > 0 ? "allow" : "paywall");
                    return;
                }

                // ── Get feature's minimum tier from DB ───────────────────
                const { data: ft } = await (supabase as any)
                    .from("feature_tiers")
                    .select("min_tier")
                    .eq("feature_id", requiredFeature)
                    .maybeSingle();

                // Feature not in feature_tiers table → treat as free (tier 0)
                const minTier: number = ft?.min_tier ?? 0;

                if (minTier === 0 || userTier >= minTier) {
                    setAccess("allow");
                } else {
                    // User has some plan but not a high enough tier
                    setAccess(userTier > 0 ? "upgrade" : "paywall");
                }
            } catch (e) {
                console.error("PremiumGuard error:", e);
                // On error, allow access to avoid blocking users
                setAccess("allow");
            } finally {
                setLoading(false);
            }
        };

        check();
    }, [freeMode, freeModeLoading, requiredFeature]);

    // Funções (painel admin): desligada = "Em breve"; em teste nesta casa = entra sem olhar ao plano.
    if (requiredFeature && !flagsLoading) {
        if (!isEnabled(requiredFeature)) return <ComingSoon />;
        if (isTesting(requiredFeature)) return <Outlet />;
    }

    if (loading || freeModeLoading || flagsLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-4">
                        A verificar acesso...
                    </p>
                </div>
            </div>
        );
    }

    if (access === "upgrade") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background p-6 text-center animate-in fade-in">
                <div className="bg-card w-full max-w-sm rounded-3xl p-8 border shadow-sm space-y-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
                    </div>
                    <h2 className="text-xl font-bold">Plano Superior Necessário</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Esta funcionalidade requer um plano superior ao teu. Faz upgrade para desbloqueares o acesso.
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
        return <Paywall feature={requiredFeature} />;
    }

    return <Outlet />;
}

/** Função desligada no painel: aparece "Em breve" em vez de abrir. */
function ComingSoon() {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center animate-in fade-in">
            <img src={faisca} alt="" className="w-[110px] animate-[ln-bob_3.6s_ease-in-out_infinite]" />
            <h2 className="mt-2 text-[21px] font-bold tracking-[-0.025em] text-foreground">Em breve</h2>
            <p className="mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-muted-foreground">
                Estamos a preparar esta parte da app. Voltem daqui a pouco.
            </p>
            <button
                onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/"))}
                className="mt-5 h-11 rounded-2xl bg-[#0B1324] px-6 text-[14px] font-semibold text-white dark:bg-foreground dark:text-background"
            >
                Voltar
            </button>
        </div>
    );
}

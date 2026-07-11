import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { browserTimezone } from "@/lib/timezone";

export interface Profile {
    user_id: string;
    display_name: string | null;
    gender: string | null;
    country: string | null;
    country_code: string | null;
    language_preference: string | null;
    religion: string | null;
    usage_mode: "solo" | "couple" | null;
    primary_goal: string | null;
    onboarding_completed: boolean;
    timezone: string | null;
}

const SELECT_FIELDS = "user_id, display_name, gender, country, country_code, language_preference, religion, usage_mode, primary_goal, onboarding_completed, timezone";

export function useProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    // Garante que o auto-update de timezone corre só uma vez por sessão
    const tzUpdatedRef = useRef(false);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }
        // AuthContext cria a linha em "profiles" de forma assíncrona (fire-and-forget)
        // logo após o login/signup. Para um utilizador mesmo acabado de criar, esta
        // consulta pode chegar antes desse insert terminar — sem retry, "profile"
        // ficaria permanentemente null e o onboarding seria saltado por engano.
        for (let attempt = 0; attempt < 4; attempt++) {
            const { data } = await supabase
                .from("profiles")
                .select(SELECT_FIELDS)
                .eq("user_id", user.id)
                .maybeSingle();
            if (data) {
                const p = data as Profile;
                setProfile(p);
                setLoading(false);

                // Actualizar timezone silenciosamente se diferir do browser.
                // Corre apenas uma vez por sessão para não criar loops.
                if (!tzUpdatedRef.current) {
                    tzUpdatedRef.current = true;
                    const btz = browserTimezone();
                    if (p.timezone !== btz) {
                        supabase
                            .from("profiles")
                            .update({ timezone: btz } as any)
                            .eq("user_id", user.id)
                            .then(() => setProfile(prev => prev ? { ...prev, timezone: btz } : prev));
                    }
                }
                return;
            }
            if (attempt < 3) await new Promise(r => setTimeout(r, 400));
        }
        setProfile(null);
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchProfile();

        if (!user?.id) return;

        const channel = supabase
            .channel(`profile-rt-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `user_id=eq.${user.id}`,
            }, () => fetchProfile())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchProfile]);

    const update = useCallback(async (patch: Partial<Profile>) => {
        if (!user) return;
        setProfile(prev => (prev ? { ...prev, ...patch } : prev));
        const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
        if (error) {
            await fetchProfile();
            throw error;
        }
    }, [user?.id, fetchProfile]);

    const completeOnboarding = useCallback(async () => {
        await update({ onboarding_completed: true } as Partial<Profile>);
        await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("user_id", user!.id);
    }, [update, user]);

    return { profile, loading, refresh: fetchProfile, update, completeOnboarding };
}

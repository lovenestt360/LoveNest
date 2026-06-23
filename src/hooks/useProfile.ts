import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

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
}

const SELECT_FIELDS = "user_id, display_name, gender, country, country_code, language_preference, religion, usage_mode, primary_goal, onboarding_completed";

export function useProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }
        const { data } = await supabase
            .from("profiles")
            .select(SELECT_FIELDS)
            .eq("user_id", user.id)
            .maybeSingle();
        setProfile((data as Profile) ?? null);
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchProfile();
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

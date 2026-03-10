import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/features/auth/AuthContext";

export function useRelationshipStreak() {
    const { user } = useAuth();
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const checkStreak = async () => {
            try {
                // Get house_id
                const { data: member } = await supabase.from("house_members").select("house_id").eq("user_id", user.id).maybeSingle();
                if (!member) return;

                const houseId = member.house_id;

                // Get House
                const { data: house } = await supabase.from("houses").select("streak_count, last_streak_date").eq("id", houseId).maybeSingle();
                if (!house) return;

                const todayStr = format(new Date(), "yyyy-MM-dd");
                let currentStreak = house.streak_count || 0;
                let lastDateStr = house.last_streak_date;

                if (!lastDateStr) {
                    // First time ever opening
                    currentStreak = 1;
                    await supabase.from("houses").update({ streak_count: currentStreak, last_streak_date: todayStr }).eq("id", houseId);
                } else if (lastDateStr !== todayStr) {
                    // It's a new day, check if it was yesterday
                    const diff = differenceInDays(new Date(todayStr + "T00:00:00"), new Date(lastDateStr + "T00:00:00"));

                    if (diff === 1) {
                        // Opened yesterday, keep streak
                        currentStreak += 1;
                    } else if (diff > 1) {
                        // Broke the streak
                        currentStreak = 1;
                    }

                    // Update DB with recent streak
                    await supabase.from("houses").update({ streak_count: currentStreak, last_streak_date: todayStr }).eq("id", houseId);
                }

                setStreak(currentStreak);
            } catch (error) {
                console.error("Streak check failed:", error);
            } finally {
                setLoading(false);
            }
        };

        checkStreak();
    }, [user]);

    return { streak, loading };
}

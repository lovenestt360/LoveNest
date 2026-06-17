import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

export interface ReadingStats {
    totalMinutes: number;
    booksCompleted: number;
    booksStarted: number;
    chaptersCompleted: number;
    readingDays: number;
    avgCompletion: number;
}

export function useReadingStats(userId: string | undefined) {
    const spaceId = useCoupleSpaceId();
    const [stats, setStats] = useState<ReadingStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!spaceId || !userId) return;
        setLoading(true);

        const { data } = await supabase.rpc("get_reading_stats" as any, {
            p_couple_space_id: spaceId,
            p_user_id: userId,
        });

        const row = (data as any)?.[0];
        if (row) {
            setStats({
                totalMinutes: row.total_minutes ?? 0,
                booksCompleted: row.books_completed ?? 0,
                booksStarted: row.books_started ?? 0,
                chaptersCompleted: row.chapters_completed ?? 0,
                readingDays: row.reading_days ?? 0,
                avgCompletion: Number(row.avg_completion) || 0,
            });
        }
        setLoading(false);
    }, [spaceId, userId]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    return { stats, loading, refetch: fetchStats };
}

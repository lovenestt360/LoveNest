import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

export interface ReadingProgress {
    progress_percent: number;
    location: string | null;
    updated_at: string;
    total_minutes_read: number;
}

export function useReadingProgress(bookId: string | undefined) {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const [myProgress, setMyProgress] = useState<ReadingProgress | null>(null);
    const [partnerProgress, setPartnerProgress] = useState<ReadingProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const myProgressRef = useRef<ReadingProgress | null>(null);

    const fetchProgress = useCallback(async () => {
        if (!bookId || !spaceId || !user) return;
        setLoading(true);

        const { data } = await supabase
            .from("book_reading_progress" as any)
            .select("user_id, progress_percent, location, updated_at, total_minutes_read")
            .eq("book_id", bookId)
            .eq("couple_space_id", spaceId);

        let mine: ReadingProgress | null = null;
        let partner: ReadingProgress | null = null;
        for (const row of (data ?? []) as { user_id: string; progress_percent: number; location: string | null; updated_at: string; total_minutes_read: number }[]) {
            const entry = { progress_percent: row.progress_percent, location: row.location, updated_at: row.updated_at, total_minutes_read: row.total_minutes_read ?? 0 };
            if (row.user_id === user.id) mine = entry;
            else partner = entry;
        }
        setMyProgress(mine);
        myProgressRef.current = mine;
        setPartnerProgress(partner);
        setLoading(false);
    }, [bookId, spaceId, user]);

    useEffect(() => { fetchProgress(); }, [fetchProgress]);

    const saveProgress = useCallback(async (percent: number, location: string, minutesDelta = 0) => {
        if (!bookId || !spaceId || !user) return;
        const clamped = Math.max(0, Math.min(100, Math.round(percent)));
        const totalMinutesRead = (myProgressRef.current?.total_minutes_read ?? 0) + Math.max(0, minutesDelta);

        const payload = {
            couple_space_id: spaceId,
            book_id: bookId,
            user_id: user.id,
            progress_percent: clamped,
            location,
            total_minutes_read: totalMinutesRead,
            completed_at: clamped >= 100 ? new Date().toISOString() : null,
        };

        await supabase.from("book_reading_progress" as any).upsert(payload, { onConflict: "book_id,user_id" });
        const updated = { progress_percent: clamped, location, updated_at: new Date().toISOString(), total_minutes_read: totalMinutesRead };
        setMyProgress(updated);
        myProgressRef.current = updated;
    }, [bookId, spaceId, user]);

    return { myProgress, partnerProgress, loading, saveProgress, refetch: fetchProgress };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { notifyPartner } from "@/lib/notifyPartner";

export interface BookReflection {
    id: string;
    chapter_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

export function useBookReflections(bookId: string | undefined) {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const [reflections, setReflections] = useState<BookReflection[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReflections = useCallback(async () => {
        if (!bookId || !spaceId) return;
        setLoading(true);

        const { data } = await supabase
            .from("book_reflections" as any)
            .select("id, chapter_id, user_id, content, created_at")
            .eq("book_id", bookId)
            .eq("couple_space_id", spaceId)
            .order("created_at", { ascending: false });

        setReflections((data ?? []) as unknown as BookReflection[]);
        setLoading(false);
    }, [bookId, spaceId]);

    useEffect(() => { fetchReflections(); }, [fetchReflections]);

    const addReflection = useCallback(async (content: string, chapterId: string, bookTitle?: string) => {
        if (!bookId || !spaceId || !user || !content.trim()) return;

        await supabase.from("book_reflections" as any).insert({
            couple_space_id: spaceId,
            book_id: bookId,
            chapter_id: chapterId,
            user_id: user.id,
            content: content.trim(),
        });
        fetchReflections();

        notifyPartner({
            couple_space_id: spaceId,
            title: "Nova reflexão partilhada",
            body: bookTitle ? `O teu par escreveu uma reflexão sobre "${bookTitle}".` : "O teu par escreveu uma nova reflexão de leitura.",
            url: `/biblioteca/${bookId}/reflexoes`,
            type: "biblioteca",
        }).catch(() => {});
    }, [bookId, spaceId, user, fetchReflections]);

    return { reflections, loading, addReflection, refetch: fetchReflections };
}

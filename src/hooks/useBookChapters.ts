import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookChapter {
    id: string;
    book_id: string;
    title: string;
    content: string;
    order_index: number;
    status: "draft" | "published";
}

export function useBookChapters(bookId: string | undefined) {
    const [chapters, setChapters] = useState<BookChapter[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChapters = useCallback(async () => {
        if (!bookId) return;
        setLoading(true);

        const { data } = await supabase
            .from("book_chapters" as any)
            .select("id, book_id, title, content, order_index, status")
            .eq("book_id", bookId)
            .eq("status", "published")
            .order("order_index");

        setChapters((data ?? []) as unknown as BookChapter[]);
        setLoading(false);
    }, [bookId]);

    useEffect(() => { fetchChapters(); }, [fetchChapters]);

    return { chapters, loading, refetch: fetchChapters };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export interface BookStats {
    avgRating: number;
    ratingsCount: number;
    favoritesCount: number;
}

export function useBookStats(bookId: string | undefined) {
    const { user } = useAuth();
    const [stats, setStats] = useState<BookStats | null>(null);
    const [myRating, setMyRating] = useState<number | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!bookId || !user) return;
        setLoading(true);

        const [statsRes, ratingRes, favoriteRes] = await Promise.all([
            supabase.rpc("get_book_stats" as any, { p_book_id: bookId }),
            supabase.from("book_ratings" as any).select("rating").eq("book_id", bookId).eq("user_id", user.id).maybeSingle(),
            supabase.from("book_favorites" as any).select("id").eq("book_id", bookId).eq("user_id", user.id).maybeSingle(),
        ]);

        const row = (statsRes.data as any)?.[0];
        if (row) {
            setStats({
                avgRating: Number(row.avg_rating) || 0,
                ratingsCount: row.ratings_count ?? 0,
                favoritesCount: row.favorites_count ?? 0,
            });
        }
        setMyRating((ratingRes.data as any)?.rating ?? null);
        setIsFavorite(!!favoriteRes.data);
        setLoading(false);
    }, [bookId, user]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        if (!bookId) return;
        const key = `book-viewed-${bookId}`;
        if (sessionStorage.getItem(key)) return;
        // Só marca como "vista" depois do pedido ter sucesso — se a chamada
        // falhar (rede instável, app interrompida), a próxima visita tenta
        // novamente em vez de ficar presa em 0 vistas para sempre.
        (async () => {
            const { error } = await supabase.rpc("fn_increment_book_views" as any, { p_book_id: bookId });
            if (!error) {
                sessionStorage.setItem(key, "1");
            } else {
                console.warn("Falha ao registar vista do livro:", error.message);
            }
        })();
    }, [bookId]);

    const rate = useCallback(async (rating: number) => {
        if (!bookId || !user) return;
        await supabase.from("book_ratings" as any).upsert(
            { book_id: bookId, user_id: user.id, rating },
            { onConflict: "book_id,user_id" }
        );
        setMyRating(rating);
        fetchStats();
    }, [bookId, user, fetchStats]);

    const toggleFavorite = useCallback(async () => {
        if (!bookId || !user) return;
        if (isFavorite) {
            await supabase.from("book_favorites" as any).delete().eq("book_id", bookId).eq("user_id", user.id);
            setIsFavorite(false);
        } else {
            await supabase.from("book_favorites" as any).insert({ book_id: bookId, user_id: user.id });
            setIsFavorite(true);
        }
        fetchStats();
    }, [bookId, user, isFavorite, fetchStats]);

    return { stats, myRating, isFavorite, loading, rate, toggleFavorite };
}

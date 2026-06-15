import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

export interface BookCategory {
    id: string;
    name: string;
    slug: string;
    sort_order: number;
}

export interface Book {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    cover_url: string | null;
    file_path: string | null;
    file_type: "pdf" | "epub" | null;
    is_free: boolean;
    price: number;
    currency: string;
    category_id: string | null;
    is_published: boolean;
    sort_order: number;
}

export interface LibrarySettings {
    id: string;
    grid_columns: number;
    banner_enabled: boolean;
    banner_image_url: string | null;
    banner_title: string | null;
    banner_subtitle: string | null;
    banner_link_book_id: string | null;
}

export interface RejectedPurchase {
    id: string;
    admin_notes: string | null;
}

export function useBiblioteca() {
    const spaceId = useCoupleSpaceId();
    const [books, setBooks] = useState<Book[]>([]);
    const [categories, setCategories] = useState<BookCategory[]>([]);
    const [settings, setSettings] = useState<LibrarySettings | null>(null);
    const [ownedBookIds, setOwnedBookIds] = useState<Set<string>>(new Set());
    const [pendingBookIds, setPendingBookIds] = useState<Set<string>>(new Set());
    const [rejectedPurchases, setRejectedPurchases] = useState<Map<string, RejectedPurchase>>(new Map());
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        // Aguarda o couple_space_id resolver — evita um instante em que
        // ownedBookIds fica vazio e canRead falha para livros já comprados.
        if (!spaceId) return;

        setLoading(true);

        const [booksRes, categoriesRes, settingsRes, purchasesRes] = await Promise.all([
            supabase.from("books" as any).select("*").eq("is_published", true).order("sort_order"),
            supabase.from("book_categories" as any).select("*").order("sort_order"),
            supabase.from("library_settings" as any).select("*").maybeSingle(),
            supabase.from("book_purchases" as any).select("id, book_id, status, admin_notes").eq("couple_space_id", spaceId),
        ]);

        if (booksRes.data) setBooks(booksRes.data as unknown as Book[]);
        if (categoriesRes.data) setCategories(categoriesRes.data as unknown as BookCategory[]);
        if (settingsRes.data) setSettings(settingsRes.data as unknown as LibrarySettings);

        const owned = new Set<string>();
        const pending = new Set<string>();
        const rejected = new Map<string, RejectedPurchase>();
        for (const p of (purchasesRes.data ?? []) as { id: string; book_id: string; status: string; admin_notes: string | null }[]) {
            if (p.status === "approved") owned.add(p.book_id);
            else if (p.status === "pending") pending.add(p.book_id);
            else if (p.status === "rejected") rejected.set(p.book_id, { id: p.id, admin_notes: p.admin_notes });
        }
        setOwnedBookIds(owned);
        setPendingBookIds(pending);
        setRejectedPurchases(rejected);

        setLoading(false);
    }, [spaceId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return { books, categories, settings, ownedBookIds, pendingBookIds, rejectedPurchases, loading, refetch: fetchAll };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
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
    file_type: "pdf" | "epub" | "lovenest" | null;
    is_free: boolean;
    price: number;
    currency: string;
    category_id: string | null;
    status: "published" | "draft" | "archived";
    tags: string[];
    is_recommended: boolean;
    is_featured: boolean;
    estimated_minutes: number | null;
    page_count: number | null;
    chapter_count: number | null;
    views_count: number;
    sort_order: number;
    created_at: string;
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
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const [books, setBooks] = useState<Book[]>([]);
    const [categories, setCategories] = useState<BookCategory[]>([]);
    const [settings, setSettings] = useState<LibrarySettings | null>(null);
    const [ownedBookIds, setOwnedBookIds] = useState<Set<string>>(new Set());
    const [pendingBookIds, setPendingBookIds] = useState<Set<string>>(new Set());
    const [rejectedPurchases, setRejectedPurchases] = useState<Map<string, RejectedPurchase>>(new Map());
    const [myProgressByBook, setMyProgressByBook] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        // Aguarda o couple_space_id resolver — evita um instante em que
        // ownedBookIds fica vazio e canRead falha para livros já comprados.
        if (!spaceId || !user) return;

        setLoading(true);

        const [booksRes, categoriesRes, settingsRes, purchasesRes, progressRes] = await Promise.all([
            supabase.from("books" as any).select("*").eq("status", "published").order("sort_order"),
            supabase.from("book_categories" as any).select("*").order("sort_order"),
            supabase.from("library_settings" as any).select("*").maybeSingle(),
            supabase.from("book_purchases" as any).select("id, book_id, status, admin_notes").eq("couple_space_id", spaceId),
            supabase.from("book_reading_progress" as any).select("book_id, progress_percent").eq("couple_space_id", spaceId).eq("user_id", user.id),
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

        const progress = new Map<string, number>();
        for (const p of (progressRes.data ?? []) as { book_id: string; progress_percent: number }[]) {
            progress.set(p.book_id, p.progress_percent);
        }
        setMyProgressByBook(progress);

        setLoading(false);
    }, [spaceId, user]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return { books, categories, settings, ownedBookIds, pendingBookIds, rejectedPurchases, myProgressByBook, loading, refetch: fetchAll };
}

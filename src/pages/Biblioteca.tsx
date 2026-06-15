import { useMemo, useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { HeroBanner } from "@/features/biblioteca/HeroBanner";
import { CategoryFilterBar } from "@/features/biblioteca/CategoryFilterBar";
import { BookGrid } from "@/features/biblioteca/BookGrid";

export default function Biblioteca() {
    const { books, categories, settings, ownedBookIds, pendingBookIds, loading } = useBiblioteca();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const filteredBooks = useMemo(() => {
        if (!activeCategory) return books;
        return books.filter(b => b.category_id === activeCategory);
    }, [books, activeCategory]);

    return (
        <section className="space-y-5 pb-24 animate-fade-in max-w-lg mx-auto">
            <header className="flex items-center justify-between px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-sm z-40 border-b border-border">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Biblioteca</h1>
                    <p className="text-[12px] text-muted-foreground">
                        {books.length} livro{books.length !== 1 ? "s" : ""} disponíve{books.length !== 1 ? "is" : "l"}
                    </p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center">
                    <Library className="w-[18px] h-[18px] text-rose-400" strokeWidth={1.5} />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                </div>
            ) : books.length === 0 ? (
                <div className="mx-4 bg-card border border-border rounded-2xl p-10 text-center shadow-sm space-y-2">
                    <Library className="w-8 h-8 mx-auto text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-foreground">Ainda sem livros</p>
                    <p className="text-[12px] text-muted-foreground">Em breve teremos novidades por aqui</p>
                </div>
            ) : (
                <>
                    {settings && <HeroBanner settings={settings} />}

                    {categories.length > 0 && (
                        <CategoryFilterBar
                            categories={categories}
                            active={activeCategory}
                            onChange={setActiveCategory}
                        />
                    )}

                    {filteredBooks.length === 0 ? (
                        <div className="mx-4 bg-card border border-border rounded-2xl p-10 text-center shadow-sm space-y-2">
                            <p className="text-sm font-semibold text-foreground">Nenhum livro nesta categoria</p>
                            <p className="text-[12px] text-muted-foreground">Experimenta outra categoria</p>
                        </div>
                    ) : (
                        <BookGrid
                            books={filteredBooks}
                            columns={settings?.grid_columns ?? 2}
                            ownedBookIds={ownedBookIds}
                            pendingBookIds={pendingBookIds}
                        />
                    )}
                </>
            )}
        </section>
    );
}

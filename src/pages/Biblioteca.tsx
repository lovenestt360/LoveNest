import { useMemo, useState } from "react";
import { Library } from "lucide-react";
import { useBiblioteca } from "@/hooks/useBiblioteca";
import { HeroCarousel } from "@/features/biblioteca/HeroCarousel";
import { ContinueReadingCard } from "@/features/biblioteca/ContinueReadingCard";
import { BookRow } from "@/features/biblioteca/BookRow";
import { CategoryFilterBar } from "@/features/biblioteca/CategoryFilterBar";
import { BookGrid } from "@/features/biblioteca/BookGrid";
import { BibliotecaSkeleton } from "@/features/biblioteca/BibliotecaSkeleton";
import { ReadingStatsCard } from "@/features/biblioteca/ReadingStatsCard";

const TRENDING_LIMIT = 10;

export default function Biblioteca() {
    const { books, categories, settings, ownedBookIds, pendingBookIds, myProgressByBook, loading } = useBiblioteca();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const continueReading = useMemo(() => {
        return books
            .map(book => ({ book, progress: myProgressByBook.get(book.id) }))
            .filter((entry): entry is { book: typeof books[number]; progress: number } =>
                entry.progress !== undefined && entry.progress > 0 && entry.progress < 100
            );
    }, [books, myProgressByBook]);

    const owned = useMemo(() => books.filter(b => ownedBookIds.has(b.id) && !b.is_free), [books, ownedBookIds]);
    const free = useMemo(() => books.filter(b => b.is_free), [books]);
    const recommended = useMemo(() => books.filter(b => b.is_recommended), [books]);
    const trending = useMemo(
        () => [...books].filter(b => b.views_count > 0).sort((a, b) => b.views_count - a.views_count).slice(0, TRENDING_LIMIT),
        [books]
    );
    const byCategory = useMemo(
        () => categories
            .map(category => ({ category, books: books.filter(b => b.category_id === category.id) }))
            .filter(c => c.books.length > 0),
        [categories, books]
    );

    const filteredBooks = useMemo(() => {
        if (!activeCategory) return books;
        return books.filter(b => b.category_id === activeCategory);
    }, [books, activeCategory]);

    const rowProps = { ownedBookIds, pendingBookIds, myProgressByBook };

    return (
        <section className="space-y-6 pb-24 animate-fade-in max-w-lg mx-auto">
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
                <BibliotecaSkeleton />
            ) : books.length === 0 ? (
                <div className="mx-4 bg-card border border-border rounded-2xl p-10 text-center shadow-sm space-y-2">
                    <Library className="w-8 h-8 mx-auto text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-foreground">Ainda sem livros</p>
                    <p className="text-[12px] text-muted-foreground">Em breve teremos novidades por aqui</p>
                </div>
            ) : (
                <>
                    <HeroCarousel settings={settings} books={books} />

                    <ReadingStatsCard />

                    {continueReading.length > 0 && (
                        <div className="space-y-3 animate-fade-in">
                            <h2 className="px-4 text-[15px] font-bold tracking-tight text-foreground">Continua de onde paraste</h2>
                            <div className="flex gap-3 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
                                {continueReading.map(({ book, progress }) => (
                                    <ContinueReadingCard key={book.id} book={book} progress={progress} />
                                ))}
                            </div>
                        </div>
                    )}

                    <BookRow title="Comprados" books={owned} {...rowProps} />
                    <BookRow title="Gratuitos" books={free} {...rowProps} />
                    {byCategory.map(({ category, books: catBooks }) => (
                        <BookRow key={category.id} title={category.name} books={catBooks} {...rowProps} />
                    ))}
                    <BookRow title="Recomendados" books={recommended} {...rowProps} />
                    <BookRow title="Tendências" books={trending} {...rowProps} />

                    <div className="space-y-3 pt-2">
                        <h2 className="px-4 text-[15px] font-bold tracking-tight text-foreground">Todos os livros</h2>

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
                                myProgressByBook={myProgressByBook}
                            />
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

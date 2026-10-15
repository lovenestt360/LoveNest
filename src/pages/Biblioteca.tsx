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
import { SURFACE, SectionTitle } from "@/features/home/components/HomeSections";
import { cn } from "@/lib/utils";

const TRENDING_LIMIT = 10;

export default function Biblioteca() {
    const { books, categories, settings, banners, ownedBookIds, pendingBookIds, myProgressByBook, loading } = useBiblioteca();
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
        <section className="animate-fade-in">
            <header className="flex items-end justify-between px-1 pt-0.5">
                <div>
                    <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground">Biblioteca</h1>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {books.length} livro{books.length !== 1 ? "s" : ""} disponíve{books.length !== 1 ? "is" : "l"}
                    </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ECE8E3] bg-white dark:border-border dark:bg-card">
                    <Library className="h-[18px] w-[18px] text-rose-500" strokeWidth={1.9} />
                </span>
            </header>

            {loading ? (
                <div className="mt-5"><BibliotecaSkeleton /></div>
            ) : books.length === 0 ? (
                <div className={cn(SURFACE, "mt-5 space-y-2 rounded-[20px] p-10 text-center")}>
                    <Library className="mx-auto h-8 w-8 text-[#C9C4BD]" strokeWidth={1.6} />
                    <p className="text-[15px] font-semibold text-foreground">Ainda sem livros</p>
                    <p className="text-[13px] text-muted-foreground">Em breve teremos novidades por aqui</p>
                </div>
            ) : (
                <>
                    <div className="mt-5">
                        <HeroCarousel settings={settings} books={books} banners={banners} />
                    </div>

                    <ReadingStatsCard />

                    {continueReading.length > 0 && (
                        <div className="animate-fade-in">
                            <SectionTitle title="Continua de onde paraste" />
                            <div className="-mx-4 -mb-4 flex gap-3 overflow-x-auto px-4 pb-5 [&::-webkit-scrollbar]:hidden">
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

                    <SectionTitle title="Todos os livros" />

                    {categories.length > 0 && (
                        <CategoryFilterBar
                            categories={categories}
                            active={activeCategory}
                            onChange={setActiveCategory}
                        />
                    )}

                    {filteredBooks.length === 0 ? (
                        <div className={cn(SURFACE, "mt-3 space-y-1 rounded-[20px] p-10 text-center")}>
                            <p className="text-[15px] font-semibold text-foreground">Nenhum livro nesta categoria</p>
                            <p className="text-[13px] text-muted-foreground">Experimenta outra categoria</p>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <BookGrid
                                books={filteredBooks}
                                columns={settings?.grid_columns ?? 2}
                                ownedBookIds={ownedBookIds}
                                pendingBookIds={pendingBookIds}
                                myProgressByBook={myProgressByBook}
                            />
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

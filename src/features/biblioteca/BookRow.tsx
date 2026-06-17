import { BookCard } from "./BookCard";
import type { Book } from "@/hooks/useBiblioteca";

export function BookRow({ title, books, ownedBookIds, pendingBookIds, myProgressByBook }: {
    title: string;
    books: Book[];
    ownedBookIds: Set<string>;
    pendingBookIds: Set<string>;
    myProgressByBook?: Map<string, number>;
}) {
    if (books.length === 0) return null;

    return (
        <div className="space-y-3 animate-fade-in">
            <h2 className="px-4 text-[15px] font-bold tracking-tight text-foreground">{title}</h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
                {books.map(book => (
                    <div key={book.id} className="w-[120px] shrink-0">
                        <BookCard
                            book={book}
                            owned={ownedBookIds.has(book.id)}
                            pending={pendingBookIds.has(book.id)}
                            progress={myProgressByBook?.get(book.id)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

import { BookCard } from "./BookCard";
import { SectionTitle } from "@/features/home/components/HomeSections";
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
        <div className="animate-fade-in">
            <SectionTitle title={title} />
            <div className="-mx-4 -mb-4 flex gap-3 overflow-x-auto px-4 pb-5 [&::-webkit-scrollbar]:hidden">
                {books.map(book => (
                    <div key={book.id} className="w-[118px] shrink-0">
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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Book, LibrarySettings } from "@/hooks/useBiblioteca";

interface Slide {
    key: string;
    label: string;
    title: string;
    subtitle?: string;
    image: string | null;
    onClick?: () => void;
}

export function HeroCarousel({ settings, books }: { settings: LibrarySettings | null; books: Book[] }) {
    const navigate = useNavigate();
    const [index, setIndex] = useState(0);

    const slides = useMemo<Slide[]>(() => {
        const list: Slide[] = [];

        if (settings?.banner_enabled && settings.banner_image_url) {
            list.push({
                key: "promo",
                label: "Promoção",
                title: settings.banner_title ?? "",
                subtitle: settings.banner_subtitle ?? undefined,
                image: settings.banner_image_url,
                onClick: settings.banner_link_book_id
                    ? () => navigate(`/biblioteca/${settings.banner_link_book_id}`)
                    : undefined,
            });
        }

        const newest = [...books].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        if (newest) {
            list.push({
                key: "new", label: "Novidade", title: newest.title, subtitle: newest.author ?? undefined,
                image: newest.cover_url, onClick: () => navigate(`/biblioteca/${newest.id}`),
            });
        }

        const mostRead = [...books].sort((a, b) => b.views_count - a.views_count)[0];
        if (mostRead && mostRead.views_count > 0 && mostRead.id !== newest?.id) {
            list.push({
                key: "trending", label: "Mais lido", title: mostRead.title, subtitle: mostRead.author ?? undefined,
                image: mostRead.cover_url, onClick: () => navigate(`/biblioteca/${mostRead.id}`),
            });
        }

        const recommended = books.find(b => b.is_recommended);
        if (recommended) {
            list.push({
                key: "rec", label: "Recomendado", title: recommended.title, subtitle: recommended.author ?? undefined,
                image: recommended.cover_url, onClick: () => navigate(`/biblioteca/${recommended.id}`),
            });
        }

        return list;
    }, [settings, books, navigate]);

    useEffect(() => {
        if (index >= slides.length) setIndex(0);
    }, [slides.length, index]);

    useEffect(() => {
        if (slides.length < 2) return;
        const timer = setInterval(() => setIndex(i => (i + 1) % slides.length), 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    if (slides.length === 0) return null;
    const slide = slides[index] ?? slides[0];

    return (
        <div className="px-4">
            <button
                type="button"
                onClick={slide.onClick}
                disabled={!slide.onClick}
                className={cn(
                    "block w-full relative aspect-[16/7] rounded-3xl overflow-hidden shadow-sm active:scale-[0.99] transition-transform bg-muted",
                    !slide.onClick && "cursor-default"
                )}
            >
                {slide.image && (
                    <img key={slide.key} src={slide.image} alt={slide.title} className="w-full h-full object-cover animate-fade-in" />
                )}
                <div key={slide.key} className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col items-start justify-end p-4 text-left animate-fade-in">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-rose-300 mb-1">{slide.label}</span>
                    {slide.title && <p className="text-white font-bold text-lg leading-tight line-clamp-1">{slide.title}</p>}
                    {slide.subtitle && <p className="text-white/80 text-[12px] mt-0.5 line-clamp-1">{slide.subtitle}</p>}
                </div>
            </button>

            {slides.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                    {slides.map((s, i) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setIndex(i)}
                            className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-rose-500" : "w-1.5 bg-muted")}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

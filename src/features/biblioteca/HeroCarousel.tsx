import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Book, LibraryBanner, LibrarySettings } from "@/hooks/useBiblioteca";

interface Slide {
    key: string;
    label: string;
    title: string;
    subtitle?: string;
    image: string | null;
    onClick?: () => void;
}

export function HeroCarousel({ settings, books, banners = [] }: { settings: LibrarySettings | null; books: Book[]; banners?: LibraryBanner[] }) {
    const navigate = useNavigate();
    const [index, setIndex] = useState(0);

    const slides = useMemo<Slide[]>(() => {
        const list: Slide[] = [];

        // Banners da tabela library_banners (múltiplos)
        for (const b of banners) {
            if (b.image_url) {
                list.push({
                    key: `banner-${b.id}`,
                    label: "Promoção",
                    title: b.title ?? "",
                    subtitle: b.subtitle ?? undefined,
                    image: b.image_url,
                    onClick: b.link_book_id
                        ? () => navigate(`/biblioteca/${b.link_book_id}`)
                        : undefined,
                });
            }
        }

        // Fallback: banner legado da library_settings (se ainda existir)
        if (banners.length === 0 && settings?.banner_enabled && settings.banner_image_url) {
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

        // Só mostra "Novidade" se o livro foi adicionado nos últimos 14 dias
        const newest = [...books].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
        if (newest && Date.now() - new Date(newest.created_at).getTime() < FOURTEEN_DAYS_MS) {
            list.push({
                key: "new", label: "Novidade", title: newest.title, subtitle: newest.author ?? undefined,
                image: newest.cover_url, onClick: () => navigate(`/biblioteca/${newest.id}`),
            });
        }

        const recommended = books.find(b => b.is_recommended);
        if (recommended) {
            list.push({
                key: "rec", label: "Recomendado", title: recommended.title, subtitle: recommended.author ?? undefined,
                image: recommended.cover_url, onClick: () => navigate(`/biblioteca/${recommended.id}`),
            });
        }

        // Nunca deixar o topo vazio: sem anúncios, novidades nem recomendados,
        // mostra um livro em destaque (o marcado como destaque ou o mais visto).
        if (list.length === 0 && books.length > 0) {
            const featured =
                books.find(b => b.is_featured) ??
                [...books].sort((a, b) => b.views_count - a.views_count)[0];
            list.push({
                key: "featured", label: "Em destaque", title: featured.title, subtitle: featured.author ?? undefined,
                image: featured.cover_url, onClick: () => navigate(`/biblioteca/${featured.id}`),
            });
        }

        return list;
    }, [settings, books, banners, navigate]);

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
        <div>
            <button
                type="button"
                onClick={slide.onClick}
                disabled={!slide.onClick}
                className={cn(
                    "block w-full relative aspect-[16/7] rounded-[24px] overflow-hidden border border-[#ECE8E3] bg-[#F4F2EF] shadow-[0_10px_28px_-14px_rgba(11,19,36,0.3)] active:scale-[0.99] transition-transform dark:border-border dark:bg-muted",
                    !slide.onClick && "cursor-default"
                )}
            >
                {slide.image && (
                    <img key={`img-${slide.key}`} src={slide.image} alt={slide.title} className="w-full h-full object-cover animate-fade-in" />
                )}
                <div key={`overlay-${slide.key}`} className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col items-start justify-end p-4 text-left animate-fade-in">
                    <span className="mb-1.5 rounded-full bg-white/95 px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em] text-rose-600">{slide.label}</span>
                    {slide.title && <p className="text-white font-semibold text-[18px] leading-tight tracking-[-0.01em] line-clamp-1">{slide.title}</p>}
                    {slide.subtitle && <p className="text-white/80 text-[12px] mt-0.5 line-clamp-1">{slide.subtitle}</p>}
                </div>
            </button>

            {slides.length > 1 && (
                <div className="mt-2.5 flex items-center justify-center gap-1.5">
                    {slides.map((s, i) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Destaque ${i + 1}`}
                            className={cn("h-1.5 rounded-full transition-[width,background-color]", i === index ? "w-5 bg-[#0B1324] dark:bg-foreground" : "w-1.5 bg-[#E2DED8] dark:bg-muted")}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

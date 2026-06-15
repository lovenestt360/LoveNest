import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LibrarySettings } from "@/hooks/useBiblioteca";

export function HeroBanner({ settings }: { settings: LibrarySettings }) {
    const navigate = useNavigate();

    if (!settings.banner_enabled || !settings.banner_image_url) return null;

    const handleClick = () => {
        if (settings.banner_link_book_id) {
            navigate(`/biblioteca/${settings.banner_link_book_id}`);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                "block w-full px-4",
                !settings.banner_link_book_id && "cursor-default"
            )}
        >
            <div className="relative w-full aspect-[16/7] rounded-3xl overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
                <img
                    src={settings.banner_image_url}
                    alt={settings.banner_title ?? "Destaque da Biblioteca"}
                    className="w-full h-full object-cover"
                />
                {(settings.banner_title || settings.banner_subtitle) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col items-start justify-end p-4 text-left">
                        {settings.banner_title && (
                            <p className="text-white font-bold text-lg leading-tight">{settings.banner_title}</p>
                        )}
                        {settings.banner_subtitle && (
                            <p className="text-white/80 text-[12px] mt-0.5">{settings.banner_subtitle}</p>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}

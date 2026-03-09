import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleSpaceId } from "./useCoupleSpaceId";

export function useSharedWallpaper() {
    const spaceId = useCoupleSpaceId();
    const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
    const [wallpaperOpacity, setWallpaperOpacity] = useState(0.3);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!spaceId) {
            setLoading(false);
            return;
        }

        const fetchWallpaper = async () => {
            const { data } = await supabase
                .from("couple_spaces")
                .select("chat_wallpaper_url, chat_wallpaper_opacity")
                .eq("id", spaceId)
                .single();

            if (data) {
                setWallpaperUrl(data.chat_wallpaper_url);
                setWallpaperOpacity(Number(data.chat_wallpaper_opacity) ?? 0.3);
            }
            setLoading(false);
        };

        fetchWallpaper();

        const channel = supabase
            .channel(`space_wallpaper_${spaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "couple_spaces",
                    filter: `id=eq.${spaceId}`,
                },
                (payload) => {
                    setWallpaperUrl(payload.new.chat_wallpaper_url);
                    setWallpaperOpacity(Number(payload.new.chat_wallpaper_opacity) ?? 0.3);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [spaceId]);

    const updateWallpaper = async (url: string | null, opacity: number) => {
        if (!spaceId) return;

        // Optimistic update
        setWallpaperUrl(url);
        setWallpaperOpacity(opacity);

        await supabase
            .from("couple_spaces")
            .update({
                chat_wallpaper_url: url,
                chat_wallpaper_opacity: opacity,
            })
            .eq("id", spaceId);
    };

    return { wallpaperUrl, wallpaperOpacity, loading, updateWallpaper };
}

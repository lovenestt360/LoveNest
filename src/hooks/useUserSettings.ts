import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";

export interface WallpaperSettings {
    url: string | null;
    opacity: number;
}

const DEFAULTS: WallpaperSettings = {
    url: null,
    opacity: 0.30,
};

// Cast to bypass generated types (new columns not in types.ts)
const db = supabase as any;

export function useUserSettings() {
    const { user } = useAuth();
    const spaceId = useCoupleSpaceId();
    const [settings, setSettings] = useState<WallpaperSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [timestamp, setTimestamp] = useState(Date.now());

    // Fetch from couple_spaces
    const fetchSettings = useCallback(async () => {
        if (!spaceId) return;
        setLoading(true);
        try {
            const { data, error } = await db
                .from("couple_spaces")
                .select("chat_wallpaper_url, chat_wallpaper_opacity")
                .eq("id", spaceId)
                .single();
            if (!error && data) {
                setSettings({
                    url: data.chat_wallpaper_url ?? null,
                    opacity: typeof data.chat_wallpaper_opacity === "number" ? data.chat_wallpaper_opacity : DEFAULTS.opacity,
                });
            }
        } catch (e) {
            console.error("[wallpaper] fetch:", e);
        }
        setLoading(false);
    }, [spaceId]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // Update timestamp when URL changes to busting cache
    useEffect(() => {
        if (settings.url) setTimestamp(Date.now());
    }, [settings.url]);

    // Realtime: sync when partner changes wallpaper
    useEffect(() => {
        if (!spaceId) return;
        const channel = supabase
            .channel("wallpaper-sync")
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "couple_spaces",
                filter: `id=eq.${spaceId}`,
            }, (payload: any) => {
                const d = payload.new;
                if (d) {
                    setSettings({
                        url: d.chat_wallpaper_url ?? null,
                        opacity: typeof d.chat_wallpaper_opacity === "number" ? d.chat_wallpaper_opacity : DEFAULTS.opacity,
                    });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [spaceId]);

    // Update couple_spaces
    const updateSettings = useCallback(async (updates: Partial<WallpaperSettings>) => {
        if (!spaceId) return;
        const payload: Record<string, any> = {};
        if (updates.url !== undefined) payload.chat_wallpaper_url = updates.url;
        if (updates.opacity !== undefined) payload.chat_wallpaper_opacity = updates.opacity;
        setSettings(prev => ({ ...prev, ...updates }));
        try {
            await db.from("couple_spaces").update(payload).eq("id", spaceId);
        } catch (e) {
            console.error("[wallpaper] update:", e);
        }
    }, [spaceId]);

    // Upload to avatars bucket (confirmed to exist)
    const uploadWallpaper = useCallback(async (file: File): Promise<string | null> => {
        if (!user || !spaceId) return null;
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/wallpapers/wp_${Date.now()}.${ext}`;
        try {
            const { error } = await supabase.storage.from("avatars").upload(path, file, {
                cacheControl: "3600",
                upsert: true,
            });
            if (error) {
                console.error("[wallpaper] upload:", error);
                return null;
            }
            const { data } = supabase.storage.from("avatars").getPublicUrl(path);
            return data?.publicUrl ?? null;
        } catch (e) {
            console.error("[wallpaper] upload exception:", e);
            return null;
        }
    }, [user, spaceId]);

    const removeWallpaper = useCallback(() => {
        updateSettings({ url: null });
    }, [updateSettings]);

    return {
        wallpaperUrl: settings.url ? `${settings.url}${settings.url.includes("?") ? "&" : "?"}v=${timestamp}` : null,
        wallpaperOpacity: settings.opacity,
        updateSettings,
        uploadWallpaper,
        removeWallpaper,
        loading,
    };
}

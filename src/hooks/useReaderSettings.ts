import { useEffect, useState } from "react";

export type ReaderFont = "inter" | "georgia" | "merriweather" | "robotoSlab";
export type ReaderSpacing = "compact" | "normal" | "relaxed";
export type ReaderMargin = "small" | "medium" | "large";
export type ReaderTheme = "light" | "dark" | "sepia";
export type ReaderFlow = "paginated" | "scrolled";

export interface ReaderSettings {
    fontSizeIndex: number;
    font: ReaderFont;
    spacing: ReaderSpacing;
    margin: ReaderMargin;
    theme: ReaderTheme;
    flow: ReaderFlow;
}

export const FONT_SIZE_STEPS = [90, 100, 115, 130];

export const FONT_FAMILY_MAP: Record<ReaderFont, string> = {
    inter: "Inter, ui-sans-serif, system-ui, sans-serif",
    georgia: "Georgia, 'Times New Roman', serif",
    merriweather: "Merriweather, Georgia, serif",
    robotoSlab: "'Roboto Slab', Georgia, serif",
};

export const SPACING_MAP: Record<ReaderSpacing, string> = {
    compact: "1.3",
    normal: "1.6",
    relaxed: "2",
};

export const MARGIN_MAP: Record<ReaderMargin, string> = {
    small: "10px",
    medium: "30px",
    large: "60px",
};

export const THEME_COLORS: Record<ReaderTheme, { bg: string; fg: string }> = {
    light: { bg: "#ffffff", fg: "#1a1a1a" },
    dark: { bg: "#1a1a1a", fg: "#e8e8e8" },
    sepia: { bg: "#f4ecd8", fg: "#4a3a28" },
};

const DEFAULT_SETTINGS: ReaderSettings = {
    fontSizeIndex: 1,
    font: "inter",
    spacing: "normal",
    margin: "medium",
    theme: "light",
    flow: "paginated",
};

const STORAGE_KEY = "reader-settings";

export function useReaderSettings() {
    const [settings, setSettings] = useState<ReaderSettings>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const update = (patch: Partial<ReaderSettings>) => setSettings(s => ({ ...s, ...patch }));

    return { settings, update };
}

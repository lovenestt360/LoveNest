import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
    FONT_SIZE_STEPS,
    type ReaderSettings, type ReaderFont, type ReaderSpacing, type ReaderMargin, type ReaderTheme, type ReaderFlow,
} from "@/hooks/useReaderSettings";

const FONT_OPTIONS: { value: ReaderFont; label: string }[] = [
    { value: "inter", label: "Inter" },
    { value: "georgia", label: "Georgia" },
    { value: "merriweather", label: "Merriweather" },
    { value: "robotoSlab", label: "Roboto Slab" },
];

const SPACING_OPTIONS: { value: ReaderSpacing; label: string }[] = [
    { value: "compact", label: "Compacto" },
    { value: "normal", label: "Normal" },
    { value: "relaxed", label: "Confortável" },
];

const MARGIN_OPTIONS: { value: ReaderMargin; label: string }[] = [
    { value: "small", label: "Pequena" },
    { value: "medium", label: "Média" },
    { value: "large", label: "Grande" },
];

const THEME_OPTIONS: { value: ReaderTheme; label: string }[] = [
    { value: "light", label: "Claro" },
    { value: "dark", label: "Escuro" },
    { value: "sepia", label: "Sépia" },
];

const FLOW_OPTIONS: { value: ReaderFlow; label: string }[] = [
    { value: "paginated", label: "Paginado" },
    { value: "scrolled", label: "Scroll contínuo" },
];

function OptionGroup<T extends string>({ label, options, value, onChange, disabled }: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <p className="text-[12px] font-bold text-muted-foreground">{label}</p>
            <div className="flex gap-2 flex-wrap">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors active:scale-95 disabled:opacity-30",
                            value === opt.value ? "bg-rose-500 text-white border-rose-500" : "bg-card text-muted-foreground border-border"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function ReaderSettingsSheet({ open, onOpenChange, settings, onChange, mode }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ReaderSettings;
    onChange: (patch: Partial<ReaderSettings>) => void;
    mode: "epub" | "pdf";
}) {
    const isEpub = mode === "epub";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                <SheetHeader className="text-left mb-4">
                    <SheetTitle>Definições de leitura</SheetTitle>
                </SheetHeader>

                <div className="space-y-5 pb-6">
                    <div className="space-y-2">
                        <p className="text-[12px] font-bold text-muted-foreground">Tamanho da letra</p>
                        <div className="flex gap-2">
                            {FONT_SIZE_STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={!isEpub}
                                    onClick={() => onChange({ fontSizeIndex: i })}
                                    style={{ fontSize: `${12 + i * 2}px` }}
                                    className={cn(
                                        "flex-1 h-10 rounded-xl font-bold border transition-colors active:scale-95 disabled:opacity-30",
                                        settings.fontSizeIndex === i ? "bg-rose-500 text-white border-rose-500" : "bg-card text-muted-foreground border-border"
                                    )}
                                >
                                    Aa
                                </button>
                            ))}
                        </div>
                    </div>

                    <OptionGroup label="Fonte" options={FONT_OPTIONS} value={settings.font} onChange={v => onChange({ font: v })} disabled={!isEpub} />
                    <OptionGroup label="Espaçamento" options={SPACING_OPTIONS} value={settings.spacing} onChange={v => onChange({ spacing: v })} disabled={!isEpub} />
                    <OptionGroup label="Margens" options={MARGIN_OPTIONS} value={settings.margin} onChange={v => onChange({ margin: v })} disabled={!isEpub} />
                    <OptionGroup label="Tema" options={THEME_OPTIONS} value={settings.theme} onChange={v => onChange({ theme: v })} />
                    <OptionGroup label="Modo de leitura" options={FLOW_OPTIONS} value={settings.flow} onChange={v => onChange({ flow: v })} disabled={!isEpub} />

                    {!isEpub && (
                        <p className="text-[11px] text-muted-foreground italic">
                            Fonte, espaçamento, margens e modo de leitura só se aplicam a livros em EPUB — este ficheiro é um PDF.
                        </p>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

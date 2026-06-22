import { useState } from "react";

export const GENERAL_CHAPTER_ID = "general";

export interface ChapterPrompt {
    chapterId: string;
    title: string;
}

export interface ChapterReaderHandle {
    openManualReflection: () => void;
}

export function ChapterReflectionPrompt({ prompt, onDismiss, onSubmit, showIntro }: {
    prompt: ChapterPrompt;
    onDismiss: () => void;
    onSubmit: (content: string) => Promise<void>;
    showIntro?: boolean;
}) {
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setSaving(true);
        await onSubmit(text);
        setSaving(false);
    };

    return (
        <div className="absolute inset-0 z-20 bg-black/50 flex items-end" onClick={onDismiss}>
            <div
                className="w-full bg-card rounded-t-3xl p-5 space-y-3 animate-in slide-in-from-bottom-4"
                onClick={e => e.stopPropagation()}
            >
                {showIntro && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed bg-muted/60 rounded-2xl p-3">
                        Sempre que terminares um capítulo podes escrever aqui o que aprendeste, para partilhar com o teu par.
                    </p>
                )}
                <p className="text-[14px] font-bold text-foreground">
                    O que aprendeste em "{prompt.title}"?
                </p>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Escreve a tua reflexão para partilhar com o teu par..."
                    className="w-full min-h-24 rounded-2xl border border-border bg-background p-3 text-[13px] text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="flex-1 h-11 rounded-2xl font-bold text-[13px] text-muted-foreground bg-muted active:scale-95 transition-all"
                    >
                        Agora não
                    </button>
                    <button
                        type="button"
                        disabled={!text.trim() || saving}
                        onClick={handleSubmit}
                        className="flex-1 h-11 rounded-2xl font-bold text-[13px] text-white bg-rose-500 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? "A guardar..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

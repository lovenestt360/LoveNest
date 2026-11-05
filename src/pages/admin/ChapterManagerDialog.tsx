import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ArrowUp, ArrowDown, Bold, Italic, Image as ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN, Confirm, GHOST, INPUT, MUTED, Segmented, Spinner, Toggle } from "@/features/admin/ui";
import { ChapterContent, countChapterWords } from "@/features/biblioteca/reader/ChapterContent";
import type { ReaderSettings } from "@/hooks/useReaderSettings";

interface AdminChapter {
    id: string;
    title: string;
    content: string;
    order_index: number;
    status: "draft" | "published";
}

const PREVIEW_SETTINGS: ReaderSettings = {
    fontSizeIndex: 1, font: "inter", spacing: "normal", margin: "medium", theme: "light", flow: "scrolled",
};

export function ChapterManagerDialog({ open, onOpenChange, adminClient, bookId, bookTitle, onChanged }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    adminClient: any;
    bookId: string;
    bookTitle: string;
    onChanged: () => void;
}) {
    const { toast } = useToast();
    const [chapters, setChapters] = useState<AdminChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [view, setView] = useState<"editor" | "preview">("editor");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const fetchChapters = async () => {
        setLoading(true);
        const { data } = await adminClient
            .from("book_chapters" as any)
            .select("id, title, content, order_index, status")
            .eq("book_id", bookId)
            .order("order_index");
        const list = (data ?? []) as AdminChapter[];
        setChapters(list);
        setSelectedId(prev => (prev && list.some(c => c.id === prev) ? prev : list[0]?.id ?? null));
        setLoading(false);
    };

    useEffect(() => {
        if (open) fetchChapters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, bookId]);

    const selected = chapters.find(c => c.id === selectedId) ?? null;

    const persistChapter = async (chapter: AdminChapter) => {
        const { error } = await adminClient.from("book_chapters" as any).update({
            title: chapter.title,
            content: chapter.content,
            word_count: countChapterWords(chapter.content),
        }).eq("id", chapter.id);
        if (error) throw error;
    };

    const scheduleSave = (chapter: AdminChapter) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus("idle");
        saveTimerRef.current = setTimeout(async () => {
            setSaveStatus("saving");
            try {
                await persistChapter(chapter);
                setSaveStatus("saved");
            } catch (err: any) {
                setSaveStatus("idle");
                toast({ variant: "destructive", title: "O capítulo não foi guardado", description: err.message });
            }
        }, 1000);
    };

    const updateSelected = (patch: Partial<AdminChapter>) => {
        if (!selected) return;
        const updated = { ...selected, ...patch };
        setChapters(prev => prev.map(c => (c.id === selected.id ? updated : c)));
        scheduleSave(updated);
    };

    const handleSelectChapter = (id: string) => {
        setSelectedId(id);
        setSaveStatus("idle");
    };

    const handleSaveNow = async () => {
        if (!selected) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus("saving");
        try {
            await persistChapter(selected);
            setSaveStatus("saved");
            toast({ title: "Capítulo guardado" });
        } catch (err: any) {
            setSaveStatus("idle");
            toast({ variant: "destructive", title: "Erro ao guardar capítulo", description: err.message });
        }
    };

    const handleAddChapter = async () => {
        const nextOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.order_index)) + 1 : 0;
        const { data, error } = await adminClient
            .from("book_chapters" as any)
            .insert({ book_id: bookId, title: `Capítulo ${chapters.length + 1}`, content: "", order_index: nextOrder, status: "draft" })
            .select("id, title, content, order_index, status")
            .single();
        if (error) { toast({ variant: "destructive", title: "Não foi possível criar o capítulo", description: error.message }); return; }
        setChapters(prev => [...prev, data as AdminChapter]);
        handleSelectChapter((data as AdminChapter).id);
        onChanged();
    };

    const handleDelete = async (id: string) => {
        const { error } = await adminClient.from("book_chapters" as any).delete().eq("id", id);
        if (error) { toast({ variant: "destructive", title: "Não foi possível apagar", description: error.message }); return; }
        setChapters(prev => prev.filter(c => c.id !== id));
        if (selectedId === id) setSelectedId(null);
        onChanged();
    };

    const handleToggleStatus = async () => {
        if (!selected) return;
        const nextStatus = selected.status === "published" ? "draft" : "published";
        setChapters(prev => prev.map(c => (c.id === selected.id ? { ...c, status: nextStatus } : c)));
        await adminClient.from("book_chapters" as any).update({ status: nextStatus }).eq("id", selected.id);
        onChanged();
    };

    const moveChapter = async (id: string, direction: -1 | 1) => {
        const sorted = [...chapters].sort((a, b) => a.order_index - b.order_index);
        const idx = sorted.findIndex(c => c.id === id);
        const swapIdx = idx + direction;
        if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
        const a = sorted[idx];
        const b = sorted[swapIdx];
        setChapters(prev => prev.map(c => {
            if (c.id === a.id) return { ...c, order_index: b.order_index };
            if (c.id === b.id) return { ...c, order_index: a.order_index };
            return c;
        }));
        await Promise.all([
            adminClient.from("book_chapters" as any).update({ order_index: b.order_index }).eq("id", a.id),
            adminClient.from("book_chapters" as any).update({ order_index: a.order_index }).eq("id", b.id),
        ]);
    };

    const applyToolbarAction = (action: "bold" | "italic") => {
        const el = textareaRef.current;
        if (!el || !selected) return;
        const marker = action === "bold" ? "**" : "_";
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const value = selected.content;
        const text = end > start ? value.slice(start, end) : "texto";
        const newValue = value.slice(0, start) + marker + text + marker + value.slice(end);
        updateSelected({ content: newValue });
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + marker.length, start + marker.length + text.length);
        });
    };

    const handleUploadImage = async (file: File) => {
        if (!selected) return;
        setUploadingImage(true);
        try {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `chapters/${bookId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const { error } = await adminClient.storage.from("book-covers").upload(path, file, { upsert: true });
            if (error) throw error;
            const { data } = adminClient.storage.from("book-covers").getPublicUrl(path);
            const el = textareaRef.current;
            const insertion = `\n![Imagem](${data.publicUrl})\n`;
            const start = el?.selectionStart ?? selected.content.length;
            const newValue = selected.content.slice(0, start) + insertion + selected.content.slice(start);
            updateSelected({ content: newValue });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Não foi possível enviar a imagem", description: err.message });
        } finally {
            setUploadingImage(false);
        }
    };

    const sortedChapters = [...chapters].sort((a, b) => a.order_index - b.order_index);
    const words = selected ? countChapterWords(selected.content) : 0;

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B1324]/35 p-3 md:p-6" onClick={() => onOpenChange(false)}>
            <div role="dialog" aria-modal="true" aria-label={`Capítulos de ${bookTitle}`}
                className="flex h-full max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] bg-white text-[#0B1324] dark:bg-card dark:text-foreground"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 border-b border-[#ECE8E3] px-[18px] py-3.5 dark:border-border">
                    <div className="min-w-0">
                        <p className="truncate text-[17px] font-bold tracking-[-0.02em]">Capítulos</p>
                        <p className={cn("truncate text-[12.5px]", MUTED)}>{bookTitle}</p>
                    </div>
                    <button onClick={() => onOpenChange(false)} aria-label="Fechar" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#7A7F8C] dark:bg-muted"><X className="h-3.5 w-3.5" /></button>
                </div>

                {loading ? <Spinner /> : (
                    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_1fr]">
                        <div className="flex max-h-[30vh] flex-col gap-1 overflow-y-auto border-b border-[#ECE8E3] p-3 dark:border-border md:max-h-none md:border-b-0 md:border-r">
                            <button className={cn(BTN, "mb-1 inline-flex items-center justify-center gap-1.5")} onClick={handleAddChapter}><Plus className="h-4 w-4" /> Capítulo</button>
                            {sortedChapters.map((c, i) => (
                                <div key={c.id} onClick={() => handleSelectChapter(c.id)}
                                    className={cn("cursor-pointer rounded-xl px-2.5 py-2 transition-colors", c.id === selectedId ? "bg-[#F2F0ED] dark:bg-muted" : "hover:bg-[#F7F5F2] dark:hover:bg-muted/60")}>
                                    <p className="line-clamp-1 text-[13px] font-semibold">{i + 1}. {c.title}</p>
                                    <div className="mt-0.5 flex items-center justify-between">
                                        <span className={cn("text-[11.5px] font-semibold", c.status === "published" ? "text-[#1E7A44]" : MUTED)}>
                                            {c.status === "published" ? "Publicado" : "Rascunho"}
                                        </span>
                                        <span className="flex items-center">
                                            <button type="button" aria-label="Subir" onClick={e => { e.stopPropagation(); moveChapter(c.id, -1); }} disabled={i === 0} className="p-1 text-[#7A7F8C] disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                                            <button type="button" aria-label="Descer" onClick={e => { e.stopPropagation(); moveChapter(c.id, 1); }} disabled={i === sortedChapters.length - 1} className="p-1 text-[#7A7F8C] disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {sortedChapters.length === 0 && <p className={cn("py-4 text-center text-[12.5px]", MUTED)}>Ainda sem capítulos.</p>}
                        </div>

                        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
                            {!selected ? (
                                <p className={cn("m-auto text-[13.5px]", MUTED)}>Escolhe ou cria um capítulo.</p>
                            ) : (
                                <div className="flex flex-1 flex-col gap-3">
                                    <input className={cn(INPUT, "text-[15px] font-semibold")} value={selected.title} onChange={e => updateSelected({ title: e.target.value })} />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="flex items-center gap-2 text-[13px] font-semibold">
                                            <Toggle on={selected.status === "published"} onChange={() => handleToggleStatus()} label="Publicado" />
                                            {selected.status === "published" ? "Publicado" : "Rascunho"}
                                        </label>
                                        <span className={cn("text-[12.5px]", MUTED)}>· {words} {words === 1 ? "palavra" : "palavras"}</span>
                                        <span className={cn("ml-auto text-[12.5px]", MUTED)}>
                                            {saveStatus === "saving" ? "A guardar…" : saveStatus === "saved" ? "Guardado" : ""}
                                        </span>
                                        <button type="button" className={GHOST} disabled={saveStatus === "saving"} onClick={handleSaveNow}>Guardar</button>
                                        <button type="button" className={cn(GHOST, "text-[#B91C1C]")} onClick={() => setConfirmDelete(true)}>Apagar</button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Segmented<"editor" | "preview"> value={view} onChange={setView} options={[["editor", "Escrever"], ["preview", "Ver como o leitor"]]} />
                                        {view === "editor" && (
                                            <span className="flex gap-1">
                                                <button type="button" aria-label="Negrito" className={cn(GHOST, "w-[34px] px-0")} onClick={() => applyToolbarAction("bold")}><Bold className="mx-auto h-3.5 w-3.5" /></button>
                                                <button type="button" aria-label="Itálico" className={cn(GHOST, "w-[34px] px-0")} onClick={() => applyToolbarAction("italic")}><Italic className="mx-auto h-3.5 w-3.5" /></button>
                                                <label aria-label="Imagem" className={cn(GHOST, "inline-flex w-[34px] cursor-pointer items-center justify-center px-0", uploadingImage && "pointer-events-none opacity-60")}>
                                                    {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                                                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); e.currentTarget.value = ""; }} />
                                                </label>
                                            </span>
                                        )}
                                    </div>
                                    {view === "editor" ? (
                                        <textarea ref={textareaRef} value={selected.content} onChange={e => updateSelected({ content: e.target.value })}
                                            className="min-h-[320px] w-full flex-1 resize-none rounded-[14px] border border-[#ECE8E3] bg-white p-3.5 text-[14px] leading-relaxed outline-none focus:border-[#0B1324] dark:border-border dark:bg-card"
                                            placeholder="Escreve o capítulo. **negrito**, _itálico_ e imagens pelo botão acima." />
                                    ) : (
                                        <div className="min-h-[320px] flex-1 overflow-y-auto rounded-[14px] border border-[#ECE8E3] dark:border-border">
                                            <ChapterContent content={selected.content} settings={PREVIEW_SETTINGS} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {confirmDelete && selected && (
                <Confirm title="Apagar este capítulo?" action="Apagar de vez" busy={false}
                    onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); handleDelete(selected.id); }}>
                    «{selected.title}» sai do livro para sempre.
                </Confirm>
            )}
        </div>
    );
}

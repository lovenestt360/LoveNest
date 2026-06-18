import { useEffect, useRef, useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, Bold, Italic, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
    const [chapters, setChapters] = useState<AdminChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const scheduleSave = (chapter: AdminChapter) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            adminClient.from("book_chapters" as any).update({
                title: chapter.title,
                content: chapter.content,
                word_count: countChapterWords(chapter.content),
            }).eq("id", chapter.id);
        }, 1000);
    };

    const updateSelected = (patch: Partial<AdminChapter>) => {
        if (!selected) return;
        const updated = { ...selected, ...patch };
        setChapters(prev => prev.map(c => (c.id === selected.id ? updated : c)));
        scheduleSave(updated);
    };

    const handleAddChapter = async () => {
        const nextOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.order_index)) + 1 : 0;
        const { data, error } = await adminClient
            .from("book_chapters" as any)
            .insert({ book_id: bookId, title: `Capítulo ${chapters.length + 1}`, content: "", order_index: nextOrder, status: "draft" })
            .select("id, title, content, order_index, status")
            .single();
        if (!error && data) {
            setChapters(prev => [...prev, data as AdminChapter]);
            setSelectedId((data as AdminChapter).id);
        }
        onChanged();
    };

    const handleDelete = async (id: string) => {
        await adminClient.from("book_chapters" as any).delete().eq("id", id);
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
        } catch {
            // falha silenciosa — admin pode tentar novamente
        } finally {
            setUploadingImage(false);
        }
    };

    const sortedChapters = [...chapters].sort((a, b) => a.order_index - b.order_index);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Capítulos — {bookTitle}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 flex-1 overflow-hidden">
                        <div className="flex flex-col gap-2 overflow-y-auto border-r border-border pr-3">
                            <Button size="sm" variant="secondary" className="gap-1.5" onClick={handleAddChapter}>
                                <Plus className="w-3.5 h-3.5" /> Capítulo
                            </Button>
                            {sortedChapters.map((c, i) => (
                                <div
                                    key={c.id}
                                    className={cn(
                                        "rounded-xl border p-2 cursor-pointer transition-colors",
                                        c.id === selectedId ? "border-primary bg-primary/5" : "border-border"
                                    )}
                                    onClick={() => setSelectedId(c.id)}
                                >
                                    <p className="text-[12px] font-bold line-clamp-1">{i + 1}. {c.title}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                            c.status === "published" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                                        )}>
                                            {c.status === "published" ? "Publicado" : "Rascunho"}
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); moveChapter(c.id, -1); }} disabled={i === 0} className="p-1 disabled:opacity-30">
                                                <ArrowUp className="w-3 h-3" />
                                            </button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); moveChapter(c.id, 1); }} disabled={i === sortedChapters.length - 1} className="p-1 disabled:opacity-30">
                                                <ArrowDown className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {sortedChapters.length === 0 && (
                                <p className="text-[11px] text-muted-foreground italic text-center py-4">Sem capítulos ainda.</p>
                            )}
                        </div>

                        <div className="flex flex-col overflow-y-auto pl-1">
                            {!selected ? (
                                <p className="text-sm text-muted-foreground italic m-auto">Seleciona ou cria um capítulo.</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            value={selected.title}
                                            onChange={(e) => updateSelected({ title: e.target.value })}
                                            className="font-bold"
                                        />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Eliminar capítulo?</AlertDialogTitle>
                                                    <AlertDialogDescription>"{selected.title}" será removido permanentemente.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(selected.id)}>Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Switch checked={selected.status === "published"} onCheckedChange={() => handleToggleStatus()} />
                                        <span className="text-[12px] font-bold">{selected.status === "published" ? "Publicado" : "Rascunho"}</span>
                                    </label>

                                    <Tabs defaultValue="editor">
                                        <TabsList>
                                            <TabsTrigger value="editor">Editor</TabsTrigger>
                                            <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="editor" className="space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <Button type="button" variant="secondary" size="sm" onClick={() => applyToolbarAction("bold")}>
                                                    <Bold className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button type="button" variant="secondary" size="sm" onClick={() => applyToolbarAction("italic")}>
                                                    <Italic className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button type="button" variant="secondary" size="sm" disabled={uploadingImage} asChild>
                                                    <label className="cursor-pointer flex items-center gap-1.5">
                                                        {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                                        <input type="file" accept="image/*" hidden onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleUploadImage(file);
                                                        }} />
                                                    </label>
                                                </Button>
                                            </div>
                                            <textarea
                                                ref={textareaRef}
                                                value={selected.content}
                                                onChange={(e) => updateSelected({ content: e.target.value })}
                                                className="w-full min-h-[320px] rounded-2xl border border-border bg-background p-3 text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                placeholder="Escreve o conteúdo do capítulo... usa **negrito**, _itálico_ e imagens via o botão acima."
                                            />
                                        </TabsContent>
                                        <TabsContent value="preview" className="rounded-2xl border border-border overflow-y-auto max-h-[400px]">
                                            <ChapterContent content={selected.content} settings={PREVIEW_SETTINGS} />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

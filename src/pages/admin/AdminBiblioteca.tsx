import { useEffect, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { BookText, FileText, Image as ImageIcon, Layers, Loader2, Plus, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getReceiptSignedUrl } from "@/lib/receiptStorage";
import {
    BTN, CARD, Chips, Confirm, GHOST, INPUT, LABEL, MUTED, Modal, RED, ROW, Segmented, Spinner, TEXTAREA, Toggle,
} from "@/features/admin/ui";
import { ChapterManagerDialog } from "./ChapterManagerDialog";

/* Biblioteca no painel admin: livros, pedidos de compra, categorias e a montra (banners). */

type BookCategory = { id: string; name: string; slug: string; sort_order: number };

type Book = {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    cover_url: string | null;
    file_path: string | null;
    file_type: "pdf" | "epub" | "lovenest" | null;
    is_free: boolean;
    price: number;
    currency: string;
    category_id: string | null;
    status: "published" | "draft" | "archived";
    tags: string[];
    is_recommended: boolean;
    is_featured: boolean;
    estimated_minutes: number | null;
    page_count: number | null;
    chapter_count: number | null;
    sort_order: number;
};

type LibrarySettings = { id: string; grid_columns: number };

type LibraryBanner = {
    id: string;
    sort_order: number;
    enabled: boolean;
    image_url: string | null;
    title: string | null;
    subtitle: string | null;
    link_book_id: string | null;
    _isNew?: boolean;
};

type BookPurchase = {
    id: string;
    couple_space_id: string;
    book_id: string;
    status: string;
    amount: string | null;
    method: string | null;
    proof_url: string | null;
    created_at: string;
    books?: { title: string; cover_url: string | null } | null;
    couple_spaces?: { house_name: string | null; partner1_name: string | null; partner2_name: string | null } | null;
};

type SubTab = "books" | "purchases" | "categories" | "showcase";

function slugify(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const STATUS: [Book["status"], string][] = [["published", "Publicado"], ["draft", "Rascunho"], ["archived", "Arquivado"]];

function Cover({ url, title, className }: { url: string | null | undefined; title?: string; className?: string }) {
    return url
        ? <img src={url} alt={title ?? ""} className={cn("h-[72px] w-12 shrink-0 rounded-[8px] border border-[#ECE8E3] object-cover dark:border-border", className)} />
        : <span className={cn("flex h-[72px] w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#F7F5F2] text-[#9AA0AB] dark:bg-muted", className)}><BookText className="h-4 w-4" strokeWidth={1.7} /></span>;
}

// ── Raiz ───────────────────────────────────────────────────────────────

export default function AdminBiblioteca() {
    const { toast } = useToast();
    const [tab, setTab] = useState<SubTab>("books");
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<LibrarySettings | null>(null);
    const [categories, setCategories] = useState<BookCategory[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [purchases, setPurchases] = useState<BookPurchase[]>([]);
    const [banners, setBanners] = useState<LibraryBanner[]>([]);

    const fetchAll = async () => {
        const db = supabase as any;
        const [s, c, b, p, bn] = await Promise.all([
            db.from("library_settings").select("id, grid_columns").maybeSingle(),
            db.from("book_categories").select("*").order("sort_order"),
            db.from("books").select("*").order("sort_order"),
            db.from("book_purchases")
                .select("*, books(title, cover_url), couple_spaces(house_name, partner1_name, partner2_name)")
                .eq("status", "pending")
                .order("created_at", { ascending: false }),
            db.from("library_banners").select("*").order("sort_order"),
        ]);
        if (s.error || c.error || b.error || p.error) {
            toast({ variant: "destructive", title: "Erro a carregar a Biblioteca", description: (s.error || c.error || b.error || p.error).message });
        }
        setSettings(s.data ?? null);
        setCategories(c.data ?? []);
        setBooks(b.data ?? []);
        setPurchases(p.data ?? []);
        setBanners(bn.data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <Segmented<SubTab> value={tab} onChange={setTab} options={[
                ["books", `Livros (${books.length})`],
                ["purchases", `Pedidos de compra${purchases.length ? ` (${purchases.length})` : ""}`],
                ["categories", "Categorias"],
                ["showcase", "Montra"],
            ]} />
            <div className="mt-4">
                {loading ? <Spinner /> : (
                    <>
                        {tab === "books" && <BooksPanel books={books} categories={categories} onChanged={fetchAll} />}
                        {tab === "purchases" && <PurchasesPanel purchases={purchases} onChanged={fetchAll} />}
                        {tab === "categories" && <CategoriesPanel categories={categories} books={books} onChanged={fetchAll} />}
                        {tab === "showcase" && <ShowcasePanel settings={settings} books={books} banners={banners} onSaved={fetchAll} />}
                    </>
                )}
            </div>
        </div>
    );
}

// ── Livros ─────────────────────────────────────────────────────────────

type BookForm = {
    title: string; author: string; description: string; category_id: string | null;
    is_free: boolean; price: string; status: Book["status"]; tags: string;
    is_recommended: boolean; is_featured: boolean;
    estimated_minutes: string; page_count: string; chapter_count: string; sort_order: string;
    cover_url: string | null; file_path: string | null; file_type: Book["file_type"];
};

const EMPTY: BookForm = {
    title: "", author: "", description: "", category_id: null,
    is_free: false, price: "0", status: "published", tags: "",
    is_recommended: false, is_featured: false,
    estimated_minutes: "", page_count: "", chapter_count: "", sort_order: "0",
    cover_url: null, file_path: null, file_type: null,
};

function BooksPanel({ books, categories, onChanged }: { books: Book[]; categories: BookCategory[]; onChanged: () => void }) {
    const { toast } = useToast();
    const db = supabase as any;
    const [editing, setEditing] = useState<string | "new" | null>(null);
    const [form, setForm] = useState<BookForm>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<"cover" | "file" | null>(null);
    const [chapters, setChapters] = useState(false);
    const [notify, setNotify] = useState<"launch" | "price" | null>(null);
    const [deleting, setDeleting] = useState<Book | null>(null);
    const [busy, setBusy] = useState(false);
    const editingId = editing && editing !== "new" ? editing : null;
    const set = (patch: Partial<BookForm>) => setForm(f => ({ ...f, ...patch }));

    // LoveNest Book: capítulos e tempo são mantidos por trigger; mostra o valor atual sem o tornar editável.
    useEffect(() => {
        if (!editingId || form.file_type !== "lovenest") return;
        const b = books.find(x => x.id === editingId);
        if (!b) return;
        const count = b.chapter_count != null ? String(b.chapter_count) : "0";
        const mins = b.estimated_minutes != null ? String(b.estimated_minutes) : "";
        setForm(f => (count !== f.chapter_count || mins !== f.estimated_minutes ? { ...f, chapter_count: count, estimated_minutes: mins } : f));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [books, editingId, form.file_type]);

    const categoryName = (id: string | null) => categories.find(c => c.id === id)?.name ?? "Sem categoria";

    const open = (b: Book | null) => {
        setForm(b ? {
            title: b.title, author: b.author ?? "", description: b.description ?? "", category_id: b.category_id,
            is_free: b.is_free, price: String(b.price ?? 0), status: b.status, tags: (b.tags ?? []).join(", "),
            is_recommended: b.is_recommended, is_featured: b.is_featured,
            estimated_minutes: b.estimated_minutes != null ? String(b.estimated_minutes) : "",
            page_count: b.page_count != null ? String(b.page_count) : "",
            chapter_count: b.chapter_count != null ? String(b.chapter_count) : "",
            sort_order: String(b.sort_order ?? 0),
            cover_url: b.cover_url, file_path: b.file_path, file_type: b.file_type,
        } : EMPTY);
        setEditing(b ? b.id : "new");
    };

    const uploadCover = async (file: File) => {
        setUploading("cover");
        const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
        const { error } = await supabase.storage.from("book-covers").upload(path, file, { upsert: true });
        if (error) toast({ variant: "destructive", title: "Não foi possível enviar a capa", description: error.message });
        else set({ cover_url: supabase.storage.from("book-covers").getPublicUrl(path).data.publicUrl });
        setUploading(null);
    };

    const uploadFile = async (file: File) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext !== "pdf" && ext !== "epub") { toast({ variant: "destructive", title: "Só PDF ou EPUB" }); return; }
        setUploading("file");
        const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error } = await supabase.storage.from("book-files").upload(path, file, { upsert: true });
        if (error) toast({ variant: "destructive", title: "Não foi possível enviar o ficheiro", description: error.message });
        else set({ file_path: path, file_type: ext });
        setUploading(null);
    };

    const save = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        const payload: Record<string, unknown> = {
            title: form.title.trim(),
            author: form.author.trim() || null,
            description: form.description.trim() || null,
            category_id: form.category_id,
            is_free: form.is_free,
            price: form.is_free ? 0 : Number(form.price) || 0,
            currency: "MZN",
            status: form.status,
            tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
            is_recommended: form.is_recommended,
            is_featured: form.is_featured,
            estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
            page_count: form.page_count ? Number(form.page_count) : null,
            sort_order: Number(form.sort_order) || 0,
            cover_url: form.cover_url,
            file_path: form.file_path,
            file_type: form.file_type,
        };
        // LoveNest Book: chapter_count e estimated_minutes vêm dos capítulos publicados (trigger).
        if (form.file_type !== "lovenest") payload.chapter_count = form.chapter_count ? Number(form.chapter_count) : null;
        else delete payload.estimated_minutes;

        const { data, error } = editingId
            ? await db.from("books").update(payload).eq("id", editingId).select("id").single()
            : await db.from("books").insert(payload).select("id").single();
        setSaving(false);
        if (error) { toast({ variant: "destructive", title: "Não foi possível guardar", description: error.message }); return; }
        toast({ title: editingId ? "Livro guardado" : "Livro criado" });
        // Um livro novo fica aberto, para poder juntar capítulos ou avisar os casais.
        if (!editingId && data?.id) setEditing(data.id);
        else setEditing(null);
        onChanged();
    };

    const sendNotify = async () => {
        if (!editingId || !notify) return;
        setBusy(true);
        const title = notify === "launch" ? "Novo livro disponível" : "Preço atualizado";
        const body = notify === "launch" ? form.title : `${form.title} · ${form.is_free ? "Grátis" : `${form.price} MZN`}`;
        const { data, error } = await supabase.functions.invoke("send-push", {
            body: { title, body, url: `/biblioteca/${editingId}`, type: "biblioteca", broadcast: true },
        });
        setBusy(false);
        setNotify(null);
        if (error) toast({ variant: "destructive", title: "A notificação não saiu", description: error.message });
        else toast({ title: "Notificação enviada", description: `${data?.sent ?? 0} ${data?.sent === 1 ? "aparelho" : "aparelhos"}.` });
    };

    const remove = async () => {
        if (!deleting) return;
        setBusy(true);
        const { error } = await db.from("books").delete().eq("id", deleting.id);
        setBusy(false);
        if (error) { toast({ variant: "destructive", title: "Não foi possível apagar", description: error.message }); return; }
        toast({ title: "Livro apagado" });
        if (editingId === deleting.id) setEditing(null);
        setDeleting(null);
        onChanged();
    };

    const pill = "rounded-full bg-[#F7F5F2] px-2 py-0.5 text-[11.5px] font-semibold text-[#4A5060] dark:bg-muted dark:text-muted-foreground";

    return (
        <>
            <div className="flex justify-end">
                <button className={cn(BTN, "inline-flex items-center gap-1.5")} onClick={() => open(null)}><Plus className="h-4 w-4" /> Novo livro</button>
            </div>
            <div className={cn(CARD, "mt-3")}>
                {books.length === 0 && <p className={cn("px-4 py-6 text-[13.5px]", MUTED)}>Ainda não há livros.</p>}
                {books.map(b => (
                    <div key={b.id} className={ROW}>
                        <Cover url={b.cover_url} title={b.title} />
                        <div className="min-w-[180px] flex-1">
                            <p className="line-clamp-1 text-[14px] font-semibold">{b.title}</p>
                            <p className={cn("text-[12.5px]", MUTED)}>{[b.author, categoryName(b.category_id)].filter(Boolean).join(" · ")}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                <span className={pill}>{b.is_free ? "Grátis" : `${Number(b.price)} ${b.currency}`}</span>
                                {b.status !== "published" && <span className={cn(pill, "bg-[#FEF5E7] text-[#B45309]")}>{b.status === "draft" ? "Rascunho" : "Arquivado"}</span>}
                                {b.is_featured && <span className={pill}>Destaque</span>}
                                {b.is_recommended && <span className={pill}>Recomendado</span>}
                                {b.file_type && <span className={pill}>{b.file_type === "lovenest" ? "LoveNest Book" : b.file_type.toUpperCase()}</span>}
                            </div>
                        </div>
                        <button className={GHOST} onClick={() => open(b)}>Editar</button>
                        <button className={cn(GHOST, "text-[#B91C1C]")} onClick={() => setDeleting(b)}>Apagar</button>
                    </div>
                ))}
            </div>

            {editing && (
                <Modal wide title={editingId ? "Editar livro" : "Novo livro"} onClose={() => !saving && setEditing(null)}>
                    <div className="mt-4 space-y-4">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <Cover url={form.cover_url} className="h-[108px] w-[72px]" />
                                <label className={cn(GHOST, "inline-flex h-8 cursor-pointer items-center gap-1 px-3 text-[12.5px]", uploading === "cover" && "pointer-events-none opacity-60")}>
                                    {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />} Capa
                                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.currentTarget.value = ""; }} />
                                </label>
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                                <div>
                                    <label className={LABEL}>Título</label>
                                    <input className={INPUT} value={form.title} onChange={e => set({ title: e.target.value })} />
                                </div>
                                <div>
                                    <label className={LABEL}>Autor</label>
                                    <input className={INPUT} value={form.author} onChange={e => set({ author: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL}>Descrição</label>
                            <textarea rows={3} className={TEXTAREA} value={form.description} onChange={e => set({ description: e.target.value })} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={LABEL}>Categoria</label>
                                <select className={INPUT} value={form.category_id ?? ""} onChange={e => set({ category_id: e.target.value || null })}>
                                    <option value="">Sem categoria</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL}>Preço (MZN)</label>
                                <div className="flex items-center gap-3">
                                    <input className={INPUT} type="number" min="0" step="1" value={form.price} disabled={form.is_free} onChange={e => set({ price: e.target.value })} />
                                    <label className="flex shrink-0 items-center gap-2 text-[13px] font-semibold"><Toggle on={form.is_free} onChange={v => set({ is_free: v })} label="Grátis" /> Grátis</label>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL}>Estado</label>
                            <Chips<Book["status"]> value={form.status} onChange={v => set({ status: v })} options={STATUS} />
                        </div>
                        <div className="flex flex-wrap gap-5">
                            <label className="flex items-center gap-2 text-[13.5px] font-semibold"><Toggle on={form.is_featured} onChange={v => set({ is_featured: v })} label="Destaque" /> Destaque</label>
                            <label className="flex items-center gap-2 text-[13.5px] font-semibold"><Toggle on={form.is_recommended} onChange={v => set({ is_recommended: v })} label="Recomendado" /> Recomendado</label>
                        </div>

                        <div>
                            <label className={LABEL}>Formato</label>
                            <Chips<"none" | "pdf" | "epub" | "lovenest"> value={form.file_type ?? "none"}
                                onChange={v => set({ file_type: v === "none" ? null : v, ...(v === "lovenest" ? { file_path: null } : {}) })}
                                options={[["lovenest", "LoveNest Book"], ["pdf", "PDF"], ["epub", "EPUB"], ["none", "Por definir"]]} />
                            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                                {form.file_type === "lovenest" ? (
                                    <>
                                        <button type="button" className={cn(GHOST, "inline-flex items-center gap-1.5")} disabled={!editingId} onClick={() => setChapters(true)}>
                                            <Layers className="h-4 w-4" strokeWidth={1.8} /> Capítulos ({form.chapter_count || 0})
                                        </button>
                                        {!editingId && <span className={cn("text-[12.5px]", MUTED)}>Guarda o livro primeiro.</span>}
                                    </>
                                ) : (
                                    <>
                                        <label className={cn(GHOST, "inline-flex cursor-pointer items-center gap-1.5", uploading === "file" && "pointer-events-none opacity-60")}>
                                            {uploading === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" strokeWidth={1.8} />}
                                            {form.file_path ? "Trocar ficheiro" : "Enviar PDF ou EPUB"}
                                            <input type="file" accept=".pdf,.epub" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = ""; }} />
                                        </label>
                                        {form.file_path && <span className={cn("text-[12.5px]", MUTED)}>{form.file_type?.toUpperCase()} carregado</span>}
                                    </>
                                )}
                            </div>
                        </div>

                        <details className="rounded-[14px] border border-[#ECE8E3] px-3.5 py-2.5 dark:border-border">
                            <summary className="cursor-pointer text-[13px] font-semibold text-[#4A5060] dark:text-muted-foreground">Mais detalhes</summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={LABEL}>Etiquetas (separadas por vírgula)</label>
                                    <input className={INPUT} value={form.tags} onChange={e => set({ tags: e.target.value })} placeholder="romance, casal" />
                                </div>
                                <div>
                                    <label className={LABEL}>Ordem na lista</label>
                                    <input className={INPUT} type="number" value={form.sort_order} onChange={e => set({ sort_order: e.target.value })} />
                                </div>
                                <div>
                                    <label className={LABEL}>Tempo de leitura (min)</label>
                                    {form.file_type === "lovenest"
                                        ? <p className={cn(INPUT, "flex items-center bg-[#F7F5F2] dark:bg-muted")}>{form.estimated_minutes || 0} · automático</p>
                                        : <input className={INPUT} type="number" min="0" value={form.estimated_minutes} onChange={e => set({ estimated_minutes: e.target.value })} />}
                                </div>
                                {form.file_type === "pdf" && (
                                    <div>
                                        <label className={LABEL}>Páginas</label>
                                        <input className={INPUT} type="number" min="0" value={form.page_count} onChange={e => set({ page_count: e.target.value })} />
                                    </div>
                                )}
                                {form.file_type === "epub" && (
                                    <div>
                                        <label className={LABEL}>Capítulos</label>
                                        <input className={INPUT} type="number" min="0" value={form.chapter_count} onChange={e => set({ chapter_count: e.target.value })} />
                                    </div>
                                )}
                            </div>
                        </details>

                        {editingId && (
                            <div className="rounded-[14px] bg-[#F7F5F2] px-3.5 py-3 dark:bg-muted">
                                <p className="text-[13.5px] font-semibold">Avisar os casais</p>
                                <p className={cn("mt-0.5 text-[12.5px]", MUTED)}>Notificação para todos com as notificações ligadas.</p>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    <button type="button" className={cn(GHOST, "bg-white dark:bg-card")} onClick={() => setNotify("launch")}>Livro novo</button>
                                    <button type="button" className={cn(GHOST, "bg-white dark:bg-card")} onClick={() => setNotify("price")}>Preço mudou</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => setEditing(null)} disabled={saving} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Fechar</button>
                        <button type="button" onClick={save} disabled={saving || !form.title.trim()} className={cn(BTN, "h-11 flex-1 rounded-[14px]")}>
                            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : editingId ? "Guardar" : "Criar livro"}
                        </button>
                    </div>
                </Modal>
            )}

            {editingId && form.file_type === "lovenest" && (
                <ChapterManagerDialog open={chapters} onOpenChange={setChapters} adminClient={supabase}
                    bookId={editingId} bookTitle={form.title || "Livro"} onChanged={onChanged} />
            )}

            {notify && (
                <Confirm danger={false} title={notify === "launch" ? "Avisar do livro novo?" : "Avisar da mudança de preço?"}
                    action="Enviar" busy={busy} onCancel={() => setNotify(null)} onConfirm={sendNotify}>
                    Todos os casais com notificações recebem: «{notify === "launch" ? `Novo livro disponível · ${form.title}` : `Preço atualizado · ${form.title}`}».
                </Confirm>
            )}

            {deleting && (
                <Confirm title="Apagar este livro?" action="Apagar de vez" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}>
                    «{deleting.title}» sai da Biblioteca para sempre. Para só o esconder, muda o estado para Arquivado.
                </Confirm>
            )}
        </>
    );
}

// ── Pedidos de compra ──────────────────────────────────────────────────

function PurchasesPanel({ purchases, onChanged }: { purchases: BookPurchase[]; onChanged: () => void }) {
    const { toast } = useToast();
    const db = supabase as any;
    const [busy, setBusy] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<BookPurchase | null>(null);
    const [note, setNote] = useState("");

    const who = (p: BookPurchase) =>
        p.couple_spaces?.house_name?.trim() || [p.couple_spaces?.partner1_name, p.couple_spaces?.partner2_name].filter(Boolean).join(" & ") || "Casa sem nome";

    const openReceipt = async (ref: string) => {
        try { window.open(await getReceiptSignedUrl(ref), "_blank", "noopener,noreferrer"); }
        catch (e: any) { toast({ variant: "destructive", title: "Não foi possível abrir o comprovativo", description: e.message }); }
    };

    const setStatus = async (p: BookPurchase, status: "approved" | "rejected") => {
        setBusy(p.id);
        const { error } = await db.from("book_purchases").update(status === "approved" ? { status } : { status, admin_notes: note.trim() || null }).eq("id", p.id);
        setBusy(null);
        if (error) { toast({ variant: "destructive", title: "Não foi possível", description: error.message }); return; }
        toast({ title: status === "approved" ? "Compra aprovada: o livro já abre para o casal" : "Compra rejeitada" });
        setRejecting(null); setNote("");
        onChanged();
    };

    if (purchases.length === 0) {
        return <div className={cn(CARD, "px-4 py-8 text-center text-[13.5px]", MUTED)}>Nenhum pedido à espera. Quando um casal pagar um livro, aparece aqui.</div>;
    }
    return (
        <>
            <div className={CARD}>
                {purchases.map(p => (
                    <div key={p.id} className={ROW}>
                        <Cover url={p.books?.cover_url} title={p.books?.title} />
                        <div className="min-w-[180px] flex-1">
                            <p className="truncate text-[14px] font-semibold">{p.books?.title ?? "Livro"}</p>
                            <p className={cn("text-[12.5px]", MUTED)}>{who(p)} · <b className="font-semibold text-[#0B1324] dark:text-foreground">{p.amount}</b>{p.method ? ` · ${p.method}` : ""} · {format(new Date(p.created_at), "d MMM, HH:mm", { locale: pt })}</p>
                        </div>
                        <div className="flex gap-1.5">
                            {p.proof_url && <button className={GHOST} onClick={() => openReceipt(p.proof_url!)}>Comprovativo</button>}
                            <button className={GHOST} disabled={busy === p.id} onClick={() => { setNote(""); setRejecting(p); }}>Rejeitar</button>
                            <button className={BTN} disabled={busy === p.id} onClick={() => setStatus(p, "approved")}>
                                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {rejecting && (
                <Modal title="Rejeitar compra?" subtitle={`${rejecting.books?.title ?? "Livro"} · ${who(rejecting)}`} onClose={() => !busy && setRejecting(null)}>
                    <label className={cn(LABEL, "mt-4")}>Porquê (o casal vê esta nota)</label>
                    <textarea rows={3} className={TEXTAREA} value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: o valor do comprovativo não corresponde ao preço" />
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => setRejecting(null)} disabled={!!busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
                        <button onClick={() => setStatus(rejecting, "rejected")} disabled={!!busy} className={cn(BTN, RED, "h-11 flex-1 rounded-[14px]")}>
                            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Rejeitar"}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ── Categorias ─────────────────────────────────────────────────────────

function CategoriesPanel({ categories, books, onChanged }: { categories: BookCategory[]; books: Book[]; onChanged: () => void }) {
    const { toast } = useToast();
    const db = supabase as any;
    const [editing, setEditing] = useState<BookCategory | "new" | null>(null);
    const [name, setName] = useState("");
    const [order, setOrder] = useState("0");
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState<BookCategory | null>(null);

    const open = (c: BookCategory | null) => {
        setName(c?.name ?? "");
        setOrder(String(c?.sort_order ?? categories.length));
        setEditing(c ?? "new");
    };

    const save = async () => {
        if (!name.trim()) return;
        setBusy(true);
        const payload = { name: name.trim(), slug: slugify(name), sort_order: Number(order) || 0 };
        const { error } = editing && editing !== "new"
            ? await db.from("book_categories").update(payload).eq("id", editing.id)
            : await db.from("book_categories").insert(payload);
        setBusy(false);
        if (error) { toast({ variant: "destructive", title: "Não foi possível guardar", description: error.message }); return; }
        toast({ title: editing === "new" ? "Categoria criada" : "Categoria guardada" });
        setEditing(null);
        onChanged();
    };

    const remove = async () => {
        if (!deleting) return;
        setBusy(true);
        const { error } = await db.from("book_categories").delete().eq("id", deleting.id);
        setBusy(false);
        if (error) { toast({ variant: "destructive", title: "Não foi possível apagar", description: error.message }); return; }
        toast({ title: "Categoria apagada" });
        setDeleting(null);
        onChanged();
    };

    const count = (id: string) => books.filter(b => b.category_id === id).length;

    return (
        <>
            <div className="flex justify-end">
                <button className={cn(BTN, "inline-flex items-center gap-1.5")} onClick={() => open(null)}><Plus className="h-4 w-4" /> Nova categoria</button>
            </div>
            <div className={cn(CARD, "mt-3 max-w-2xl")}>
                {categories.length === 0 && <p className={cn("px-4 py-6 text-[13.5px]", MUTED)}>Ainda não há categorias.</p>}
                {categories.map(c => (
                    <div key={c.id} className={ROW}>
                        <span className={cn("w-6 text-center text-[12.5px] tabular-nums", MUTED)}>{c.sort_order}</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold">{c.name}</p>
                            <p className={cn("text-[12.5px]", MUTED)}>{count(c.id)} {count(c.id) === 1 ? "livro" : "livros"}</p>
                        </div>
                        <button className={GHOST} onClick={() => open(c)}>Editar</button>
                        <button className={cn(GHOST, "text-[#B91C1C]")} onClick={() => setDeleting(c)}>Apagar</button>
                    </div>
                ))}
            </div>

            {editing && (
                <Modal title={editing === "new" ? "Nova categoria" : "Editar categoria"} onClose={() => !busy && setEditing(null)}>
                    <div className="mt-4 grid grid-cols-[1fr_96px] gap-3">
                        <div>
                            <label className={LABEL}>Nome</label>
                            <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Romance" />
                        </div>
                        <div>
                            <label className={LABEL}>Ordem</label>
                            <input className={INPUT} type="number" value={order} onChange={e => setOrder(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => setEditing(null)} disabled={busy} className={cn(GHOST, "h-11 flex-1 rounded-[14px]")}>Cancelar</button>
                        <button onClick={save} disabled={busy || !name.trim()} className={cn(BTN, "h-11 flex-1 rounded-[14px]")}>
                            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Guardar"}
                        </button>
                    </div>
                </Modal>
            )}

            {deleting && (
                <Confirm title="Apagar esta categoria?" action="Apagar" busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove}>
                    «{deleting.name}» sai da Biblioteca. {count(deleting.id) > 0 ? `Os ${count(deleting.id)} livros dela ficam sem categoria.` : ""}
                </Confirm>
            )}
        </>
    );
}

// ── Montra (grelha e banners) ──────────────────────────────────────────

function ShowcasePanel({ settings, books, banners: initial, onSaved }: {
    settings: LibrarySettings | null; books: Book[]; banners: LibraryBanner[]; onSaved: () => void;
}) {
    const { toast } = useToast();
    const db = supabase as any;
    const [columns, setColumns] = useState("2");
    const [banners, setBanners] = useState<LibraryBanner[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [uploading, setUploading] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (settings) setColumns(String(settings.grid_columns ?? 2)); }, [settings]);
    useEffect(() => { setBanners(initial); setDeletedIds([]); }, [initial]);

    const update = (i: number, patch: Partial<LibraryBanner>) => setBanners(prev => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));
    const add = () => setBanners(prev => [...prev, { id: crypto.randomUUID(), sort_order: prev.length, enabled: true, image_url: null, title: null, subtitle: null, link_book_id: null, _isNew: true }]);
    const drop = (i: number) => {
        const b = banners[i];
        if (!b._isNew) setDeletedIds(prev => [...prev, b.id]);
        setBanners(prev => prev.filter((_, j) => j !== i));
    };

    const uploadImage = async (i: number, file: File) => {
        setUploading(i);
        const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
        const { error } = await supabase.storage.from("library-banners").upload(path, file, { upsert: true });
        if (error) toast({ variant: "destructive", title: "Não foi possível enviar a imagem", description: error.message });
        else update(i, { image_url: supabase.storage.from("library-banners").getPublicUrl(path).data.publicUrl });
        setUploading(null);
    };

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const { error: e1 } = await db.from("library_settings").update({ grid_columns: Number(columns) }).eq("id", settings.id);
            if (e1) throw e1;
            if (deletedIds.length) {
                const { error } = await db.from("library_banners").delete().in("id", deletedIds);
                if (error) throw error;
            }
            for (let i = 0; i < banners.length; i++) {
                const b = banners[i];
                const payload = { sort_order: i, enabled: b.enabled, image_url: b.image_url, title: b.title || null, subtitle: b.subtitle || null, link_book_id: b.link_book_id || null };
                const { error } = b._isNew
                    ? await db.from("library_banners").insert(payload)
                    : await db.from("library_banners").update(payload).eq("id", b.id);
                if (error) throw error;
            }
            toast({ title: "Montra guardada" });
            onSaved();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Não foi possível guardar", description: e.message });
        } finally {
            setSaving(false);
        }
    };

    if (!settings) return <div className={cn(CARD, "px-4 py-8 text-center text-[13.5px]", MUTED)}>As definições da Biblioteca não existem na base de dados.</div>;

    return (
        <div className="max-w-2xl space-y-3">
            <div className={cn(CARD, "p-4")}>
                <p className="text-[15px] font-bold">Livros por linha</p>
                <p className={cn("mt-1 text-[13px]", MUTED)}>Quantas capas aparecem lado a lado na Biblioteca.</p>
                <div className="mt-3"><Chips value={columns} onChange={setColumns} options={[["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]]} /></div>
            </div>

            <div className={cn(CARD, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[15px] font-bold">Banners no topo</p>
                        <p className={cn("mt-1 text-[13px]", MUTED)}>Passam em carrossel no topo da Biblioteca. Tocar abre o livro escolhido.</p>
                    </div>
                    <button className={cn(GHOST, "inline-flex items-center gap-1")} onClick={add}><Plus className="h-4 w-4" /> Banner</button>
                </div>
                {banners.length === 0 && <p className={cn("mt-3 text-[13px]", MUTED)}>Sem banners.</p>}
                <div className="mt-3 space-y-3">
                    {banners.map((b, i) => (
                        <div key={b.id} className="rounded-[14px] border border-[#ECE8E3] p-3 dark:border-border">
                            <div className="flex items-center gap-3">
                                {b.image_url
                                    ? <img src={b.image_url} alt="" className="h-14 w-28 shrink-0 rounded-[10px] object-cover" />
                                    : <span className="flex h-14 w-28 shrink-0 items-center justify-center rounded-[10px] bg-[#F7F5F2] text-[#9AA0AB] dark:bg-muted"><ImageIcon className="h-4 w-4" strokeWidth={1.7} /></span>}
                                <label className={cn(GHOST, "inline-flex cursor-pointer items-center gap-1.5", uploading === i && "pointer-events-none opacity-60")}>
                                    {uploading === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.8} />} Imagem
                                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(i, f); e.currentTarget.value = ""; }} />
                                </label>
                                <span className="ml-auto"><Toggle on={b.enabled} onChange={v => update(i, { enabled: v })} label="Banner visível" /></span>
                            </div>
                            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                                <input className={INPUT} value={b.title ?? ""} onChange={e => update(i, { title: e.target.value })} placeholder="Título" />
                                <input className={INPUT} value={b.subtitle ?? ""} onChange={e => update(i, { subtitle: e.target.value })} placeholder="Subtítulo" />
                                <select className={cn(INPUT, "sm:col-span-2")} value={b.link_book_id ?? ""} onChange={e => update(i, { link_book_id: e.target.value || null })}>
                                    <option value="">Ao tocar: não abre nenhum livro</option>
                                    {books.map(bk => <option key={bk.id} value={bk.id}>Ao tocar: abre «{bk.title}»</option>)}
                                </select>
                            </div>
                            <button className={cn(GHOST, "mt-2.5 h-8 text-[12.5px] text-[#B91C1C]")} onClick={() => drop(i)}>Tirar este banner</button>
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={save} disabled={saving} className={cn(BTN, "h-11 rounded-[14px] px-6")}>
                {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Guardar montra"}
            </button>
        </div>
    );
}

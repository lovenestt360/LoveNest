import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
    Library, Plus, Trash2, Pencil, Upload, RefreshCw, Check, X,
    Image as ImageIcon, FileText, LayoutGrid, ShoppingBag, BookText, Layers,
} from "lucide-react";
import { ChapterManagerDialog } from "./ChapterManagerDialog";

// ── Types ───────────────────────────────────────────────────────────────

type BookCategory = {
    id: string;
    name: string;
    slug: string;
    sort_order: number;
};

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

type LibrarySettings = {
    id: string;
    grid_columns: number;
    banner_enabled: boolean;
    banner_image_url: string | null;
    banner_title: string | null;
    banner_subtitle: string | null;
    banner_link_book_id: string | null;
};

type BookPurchase = {
    id: string;
    couple_space_id: string;
    book_id: string;
    status: string;
    amount: string | null;
    method: string | null;
    proof_url: string | null;
    admin_notes: string | null;
    created_at: string;
    books?: { title: string; cover_url: string | null } | null;
    couple_spaces?: { house_name: string | null; partner1_name: string | null; partner2_name: string | null } | null;
};

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// ── Root component ─────────────────────────────────────────────────────

export default function AdminBiblioteca({ adminClient }: { adminClient: any }) {
    const { toast } = useToast();
    const [subTab, setSubTab] = useState<"settings" | "categories" | "books" | "purchases">("settings");
    const [loading, setLoading] = useState(true);

    const [settings, setSettings] = useState<LibrarySettings | null>(null);
    const [categories, setCategories] = useState<BookCategory[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [purchases, setPurchases] = useState<BookPurchase[]>([]);

    const fetchAll = async () => {
        setLoading(true);
        const [settingsRes, categoriesRes, booksRes, purchasesRes] = await Promise.all([
            adminClient.from("library_settings" as any).select("*").maybeSingle(),
            adminClient.from("book_categories" as any).select("*").order("sort_order"),
            adminClient.from("books" as any).select("*").order("sort_order"),
            adminClient.from("book_purchases" as any)
                .select("*, books(title, cover_url), couple_spaces(house_name, partner1_name, partner2_name)")
                .eq("status", "pending")
                .order("created_at", { ascending: false }),
        ]);

        if (settingsRes.data) setSettings(settingsRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (booksRes.data) setBooks(booksRes.data);
        if (purchasesRes.data) setPurchases(purchasesRes.data);

        if (settingsRes.error || categoriesRes.error || booksRes.error || purchasesRes.error) {
            toast({ variant: "destructive", title: "Erro ao carregar Biblioteca", description: "Verifica se a migration da Biblioteca foi aplicada." });
        }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [adminClient]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Library className="w-6 h-6 text-primary" /> Biblioteca
                </h2>
                <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                    Atualizar
                </Button>
            </div>

            <Tabs value={subTab} onValueChange={(v) => setSubTab(v as typeof subTab)}>
                <TabsList className="h-auto flex-wrap">
                    <TabsTrigger value="settings">Definições</TabsTrigger>
                    <TabsTrigger value="categories">Categorias ({categories.length})</TabsTrigger>
                    <TabsTrigger value="books">Livros ({books.length})</TabsTrigger>
                    <TabsTrigger value="purchases">
                        Pedidos de Compra{purchases.length > 0 ? ` (${purchases.length})` : ""}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="pt-6">
                    <SettingsPanel adminClient={adminClient} settings={settings} books={books} onSaved={fetchAll} />
                </TabsContent>

                <TabsContent value="categories" className="pt-6">
                    <CategoriesPanel adminClient={adminClient} categories={categories} onChanged={fetchAll} />
                </TabsContent>

                <TabsContent value="books" className="pt-6">
                    <BooksPanel adminClient={adminClient} books={books} categories={categories} onChanged={fetchAll} />
                </TabsContent>

                <TabsContent value="purchases" className="pt-6">
                    <PurchasesPanel adminClient={adminClient} purchases={purchases} onChanged={fetchAll} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ── 1. Definições da Biblioteca ────────────────────────────────────────

function SettingsPanel({ adminClient, settings, books, onSaved }: {
    adminClient: any;
    settings: LibrarySettings | null;
    books: Book[];
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const [gridColumns, setGridColumns] = useState("2");
    const [bannerEnabled, setBannerEnabled] = useState(false);
    const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
    const [bannerTitle, setBannerTitle] = useState("");
    const [bannerSubtitle, setBannerSubtitle] = useState("");
    const [bannerLinkBookId, setBannerLinkBookId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    useEffect(() => {
        if (!settings) return;
        setGridColumns(String(settings.grid_columns ?? 2));
        setBannerEnabled(!!settings.banner_enabled);
        setBannerImageUrl(settings.banner_image_url ?? null);
        setBannerTitle(settings.banner_title ?? "");
        setBannerSubtitle(settings.banner_subtitle ?? "");
        setBannerLinkBookId(settings.banner_link_book_id ?? null);
    }, [settings]);

    const handleUploadBanner = async (file: File) => {
        if (!settings) return;
        setUploadingBanner(true);
        try {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const { error: uploadError } = await adminClient.storage.from("library-banners").upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data } = adminClient.storage.from("library-banners").getPublicUrl(path);
            setBannerImageUrl(data.publicUrl);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao enviar banner", description: err.message });
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const { error } = await adminClient.from("library_settings" as any).update({
                grid_columns: Number(gridColumns),
                banner_enabled: bannerEnabled,
                banner_image_url: bannerImageUrl,
                banner_title: bannerTitle || null,
                banner_subtitle: bannerSubtitle || null,
                banner_link_book_id: bannerLinkBookId,
            }).eq("id", settings.id);
            if (error) throw error;
            toast({ title: "Definições guardadas" });
            onSaved();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao guardar", description: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (!settings) {
        return <p className="text-muted-foreground italic">A carregar definições...</p>;
    }

    return (
        <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-primary" /> Layout da grelha
                </h3>
                <p className="text-sm text-muted-foreground mb-3">Número de colunas usado na grelha de livros da Biblioteca.</p>
                <div className="max-w-[160px]">
                    <Select value={gridColumns} onValueChange={setGridColumns}>
                        <SelectTrigger className="bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 coluna</SelectItem>
                            <SelectItem value="2">2 colunas</SelectItem>
                            <SelectItem value="3">3 colunas</SelectItem>
                            <SelectItem value="4">4 colunas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-lg font-bold">Banner em destaque</h3>
                        <p className="text-sm text-muted-foreground">Mostra um banner no topo da Biblioteca.</p>
                    </div>
                    <Switch checked={bannerEnabled} onCheckedChange={setBannerEnabled} />
                </div>

                {bannerEnabled && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            {bannerImageUrl ? (
                                <img src={bannerImageUrl} alt="Banner" className="w-40 h-20 object-cover rounded-xl border" />
                            ) : (
                                <div className="w-40 h-20 rounded-xl border bg-muted flex items-center justify-center text-muted-foreground">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                            )}
                            <Button variant="secondary" className="gap-2" disabled={uploadingBanner} asChild>
                                <label className="cursor-pointer">
                                    {uploadingBanner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    Carregar imagem
                                    <input type="file" accept="image/*" hidden onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadBanner(file);
                                    }} />
                                </label>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-bold text-muted-foreground mb-1 block">Título do banner</Label>
                                <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} placeholder="Ex: Novidade da semana" className="bg-background" />
                            </div>
                            <div>
                                <Label className="text-sm font-bold text-muted-foreground mb-1 block">Subtítulo</Label>
                                <Input value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} placeholder="Ex: Descobre a nossa nova edição" className="bg-background" />
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Livro em destaque (ao clicar no banner)</Label>
                            <Select value={bannerLinkBookId ?? "none"} onValueChange={(v) => setBannerLinkBookId(v === "none" ? null : v)}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Nenhum" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {books.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar Definições
                </Button>
            </div>
        </div>
    );
}

// ── 2. Categorias ─────────────────────────────────────────────────────

function CategoriesPanel({ adminClient, categories, onChanged }: {
    adminClient: any;
    categories: BookCategory[];
    onChanged: () => void;
}) {
    const { toast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [sortOrder, setSortOrder] = useState("0");
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setSortOrder("0");
    };

    const startEdit = (cat: BookCategory) => {
        setEditingId(cat.id);
        setName(cat.name);
        setSortOrder(String(cat.sort_order));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const payload = { name: name.trim(), slug: slugify(name), sort_order: Number(sortOrder) || 0 };
            if (editingId) {
                const { error } = await adminClient.from("book_categories" as any).update(payload).eq("id", editingId);
                if (error) throw error;
                toast({ title: "Categoria atualizada" });
            } else {
                const { error } = await adminClient.from("book_categories" as any).insert(payload);
                if (error) throw error;
                toast({ title: "Categoria criada" });
            }
            resetForm();
            onChanged();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao guardar categoria", description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await adminClient.from("book_categories" as any).delete().eq("id", id);
            if (error) throw error;
            toast({ title: "Categoria eliminada" });
            if (editingId === id) resetForm();
            onChanged();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao eliminar", description: err.message });
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-primary/5 border border-primary/20 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                    {editingId ? "Editar Categoria" : "Nova Categoria"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4 mb-4">
                    <div>
                        <Label className="text-sm font-bold text-muted-foreground mb-1 block">Nome</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Romance" required className="bg-background" />
                    </div>
                    <div>
                        <Label className="text-sm font-bold text-muted-foreground mb-1 block">Ordem</Label>
                        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-background" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="submit" disabled={saving} className="gap-2">
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : (editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                        {editingId ? "Guardar" : "Criar"}
                    </Button>
                    {editingId && (
                        <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                    )}
                </div>
            </form>

            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                {categories.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground italic">Nenhuma categoria criada.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-bold text-muted-foreground">Nome</th>
                                <th className="p-4 font-bold text-muted-foreground">Slug</th>
                                <th className="p-4 font-bold text-muted-foreground">Ordem</th>
                                <th className="p-4 font-bold text-muted-foreground text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 font-medium">{cat.name}</td>
                                    <td className="p-4 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                                    <td className="p-4 text-muted-foreground">{cat.sort_order}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Eliminar categoria?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            "{cat.name}" será removida. Livros nesta categoria ficam sem categoria.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(cat.id)}>Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ── 3. Livros ──────────────────────────────────────────────────────────

type BookFormState = {
    title: string;
    author: string;
    description: string;
    category_id: string | null;
    is_free: boolean;
    price: string;
    status: "published" | "draft" | "archived";
    tags: string;
    is_recommended: boolean;
    is_featured: boolean;
    estimated_minutes: string;
    page_count: string;
    chapter_count: string;
    sort_order: string;
    cover_url: string | null;
    file_path: string | null;
    file_type: "pdf" | "epub" | "lovenest" | null;
};

const EMPTY_BOOK_FORM: BookFormState = {
    title: "", author: "", description: "", category_id: null,
    is_free: false, price: "0", status: "published", tags: "",
    is_recommended: false, is_featured: false,
    estimated_minutes: "", page_count: "", chapter_count: "", sort_order: "0",
    cover_url: null, file_path: null, file_type: null,
};

function tagsToText(tags: string[]): string {
    return tags.join(", ");
}

function textToTags(text: string): string[] {
    return text.split(",").map(t => t.trim()).filter(Boolean);
}

function BooksPanel({ adminClient, books, categories, onChanged }: {
    adminClient: any;
    books: Book[];
    categories: BookCategory[];
    onChanged: () => void;
}) {
    const { toast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<BookFormState>(EMPTY_BOOK_FORM);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [chapterManagerOpen, setChapterManagerOpen] = useState(false);

    // Para LoveNest Book, chapter_count é mantido por trigger na BD — sincroniza
    // o valor mostrado sempre que a lista de livros é atualizada (ex: ao publicar
    // um capítulo no gestor), sem nunca o tornar editável/submetível.
    useEffect(() => {
        if (!editingId || form.file_type !== "lovenest") return;
        const latest = books.find(b => b.id === editingId);
        const latestCount = latest?.chapter_count != null ? String(latest.chapter_count) : "0";
        if (latest && latestCount !== form.chapter_count) {
            setForm(f => ({ ...f, chapter_count: latestCount }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [books, editingId, form.file_type]);

    const categoryName = (id: string | null) => categories.find(c => c.id === id)?.name ?? "Sem categoria";

    const startCreate = () => {
        setEditingId(null);
        setForm(EMPTY_BOOK_FORM);
        setShowForm(true);
    };

    const startEdit = (book: Book) => {
        setEditingId(book.id);
        setForm({
            title: book.title,
            author: book.author ?? "",
            description: book.description ?? "",
            category_id: book.category_id,
            is_free: book.is_free,
            price: String(book.price ?? 0),
            status: book.status,
            tags: tagsToText(book.tags ?? []),
            is_recommended: book.is_recommended,
            is_featured: book.is_featured,
            estimated_minutes: book.estimated_minutes != null ? String(book.estimated_minutes) : "",
            page_count: book.page_count != null ? String(book.page_count) : "",
            chapter_count: book.chapter_count != null ? String(book.chapter_count) : "",
            sort_order: String(book.sort_order ?? 0),
            cover_url: book.cover_url,
            file_path: book.file_path,
            file_type: book.file_type,
        });
        setShowForm(true);
    };

    const handleUploadCover = async (file: File) => {
        setUploadingCover(true);
        try {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const { error } = await adminClient.storage.from("book-covers").upload(path, file, { upsert: true });
            if (error) throw error;
            const { data } = adminClient.storage.from("book-covers").getPublicUrl(path);
            setForm(f => ({ ...f, cover_url: data.publicUrl }));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao enviar capa", description: err.message });
        } finally {
            setUploadingCover(false);
        }
    };

    const handleUploadBookFile = async (file: File) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext !== "pdf" && ext !== "epub") {
            toast({ variant: "destructive", title: "Formato inválido", description: "Apenas ficheiros PDF ou EPUB são suportados." });
            return;
        }
        setUploadingFile(true);
        try {
            const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const { error } = await adminClient.storage.from("book-files").upload(path, file, { upsert: true });
            if (error) throw error;
            setForm(f => ({ ...f, file_path: path, file_type: ext as "pdf" | "epub" }));
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao enviar ficheiro", description: err.message });
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                author: form.author.trim() || null,
                description: form.description.trim() || null,
                category_id: form.category_id,
                is_free: form.is_free,
                price: form.is_free ? 0 : Number(form.price) || 0,
                currency: "MZN",
                status: form.status,
                tags: textToTags(form.tags),
                is_recommended: form.is_recommended,
                is_featured: form.is_featured,
                estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
                page_count: form.page_count ? Number(form.page_count) : null,
                sort_order: Number(form.sort_order) || 0,
                cover_url: form.cover_url,
                file_path: form.file_path,
                file_type: form.file_type,
            };
            // Para LoveNest Book, chapter_count é mantido automaticamente por
            // trigger a partir dos capítulos publicados — nunca o sobrescrever
            // aqui, ou desfaz-se o valor real sempre que o livro é guardado.
            if (form.file_type !== "lovenest") {
                payload.chapter_count = form.chapter_count ? Number(form.chapter_count) : null;
            }
            if (editingId) {
                const { error } = await adminClient.from("books" as any).update(payload).eq("id", editingId);
                if (error) throw error;
                toast({ title: "Livro atualizado" });
            } else {
                const { error } = await adminClient.from("books" as any).insert(payload);
                if (error) throw error;
                toast({ title: "Livro criado" });
            }
            setShowForm(false);
            setEditingId(null);
            setForm(EMPTY_BOOK_FORM);
            onChanged();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao guardar livro", description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await adminClient.from("books" as any).delete().eq("id", id);
            if (error) throw error;
            toast({ title: "Livro eliminado" });
            if (editingId === id) { setShowForm(false); setEditingId(null); setForm(EMPTY_BOOK_FORM); }
            onChanged();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao eliminar", description: err.message });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {!showForm && (
                    <Button onClick={startCreate} className="gap-2">
                        <Plus className="w-4 h-4" /> Novo Livro
                    </Button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-primary/5 border border-primary/20 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        {editingId ? "Editar Livro" : "Novo Livro"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Título</Label>
                            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required className="bg-background" />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Autor</Label>
                            <Input value={form.author} onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))} className="bg-background" />
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-bold text-muted-foreground mb-1 block">Descrição</Label>
                        <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background min-h-24" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Categoria</Label>
                            <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm(f => ({ ...f, category_id: v === "none" ? null : v }))}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Sem categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem categoria</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Preço (MZN)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                                disabled={form.is_free}
                                className="bg-background disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Estado</Label>
                            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as BookFormState["status"] }))}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="published">Publicado</SelectItem>
                                    <SelectItem value="draft">Rascunho</SelectItem>
                                    <SelectItem value="archived">Arquivado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-bold text-muted-foreground mb-1 block">Tags (separadas por vírgula)</Label>
                        <Input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Ex: romance, autoajuda, casal" className="bg-background" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Tempo estimado (min)</Label>
                            <Input type="number" min="0" value={form.estimated_minutes} onChange={(e) => setForm(f => ({ ...f, estimated_minutes: e.target.value }))} className="bg-background" />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Páginas (PDF)</Label>
                            <Input type="number" min="0" value={form.page_count} onChange={(e) => setForm(f => ({ ...f, page_count: e.target.value }))} className="bg-background" />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Capítulos (EPUB)</Label>
                            {form.file_type === "lovenest" ? (
                                <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-muted-foreground text-sm">
                                    {form.chapter_count || 0} (automático)
                                </div>
                            ) : (
                                <Input type="number" min="0" value={form.chapter_count} onChange={(e) => setForm(f => ({ ...f, chapter_count: e.target.value }))} className="bg-background" />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={form.is_free} onCheckedChange={(v) => setForm(f => ({ ...f, is_free: v }))} />
                            <span className="text-sm font-bold">Livro gratuito</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={form.is_recommended} onCheckedChange={(v) => setForm(f => ({ ...f, is_recommended: v }))} />
                            <span className="text-sm font-bold">Recomendado</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={form.is_featured} onCheckedChange={(v) => setForm(f => ({ ...f, is_featured: v }))} />
                            <span className="text-sm font-bold">Destaque</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Ordem</Label>
                            <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))} className="bg-background" />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-muted-foreground mb-1 block">Tipo de livro</Label>
                            <Select
                                value={form.file_type ?? "none"}
                                onValueChange={(v) => setForm(f => ({
                                    ...f,
                                    file_type: v === "none" ? null : (v as BookFormState["file_type"]),
                                    ...(v === "lovenest" ? { file_path: null } : {}),
                                }))}
                            >
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Por definir" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Por definir</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="epub">EPUB</SelectItem>
                                    <SelectItem value="lovenest">LoveNest Book</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Cover upload */}
                        <div className="flex items-center gap-4">
                            {form.cover_url ? (
                                <img src={form.cover_url} alt="Capa" className="w-16 h-24 object-cover rounded-lg border" />
                            ) : (
                                <div className="w-16 h-24 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                            )}
                            <Button variant="secondary" className="gap-2" disabled={uploadingCover} asChild>
                                <label className="cursor-pointer">
                                    {uploadingCover ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    Capa
                                    <input type="file" accept="image/*" hidden onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadCover(file);
                                    }} />
                                </label>
                            </Button>
                        </div>

                        {/* Book file upload (PDF/EPUB) ou gestor de capítulos (LoveNest Book) */}
                        {form.file_type === "lovenest" ? (
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-24 rounded-lg border bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="gap-2"
                                        disabled={!editingId}
                                        onClick={() => setChapterManagerOpen(true)}
                                    >
                                        <Layers className="w-4 h-4" /> Gerir Capítulos
                                    </Button>
                                    {!editingId && (
                                        <span className="text-[11px] text-muted-foreground italic">Guarda o livro primeiro para adicionar capítulos.</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-16 h-24 rounded-lg border flex items-center justify-center shrink-0",
                                    form.file_path ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Button variant="secondary" className="gap-2" disabled={uploadingFile} asChild>
                                        <label className="cursor-pointer">
                                            {uploadingFile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            Ficheiro (PDF/EPUB)
                                            <input type="file" accept=".pdf,.epub" hidden onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleUploadBookFile(file);
                                            }} />
                                        </label>
                                    </Button>
                                    {form.file_type && (
                                        <span className="text-xs font-bold uppercase text-muted-foreground">{form.file_type} carregado</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {editingId && form.file_type === "lovenest" && (
                        <ChapterManagerDialog
                            open={chapterManagerOpen}
                            onOpenChange={setChapterManagerOpen}
                            adminClient={adminClient}
                            bookId={editingId}
                            bookTitle={form.title || "Livro"}
                            onChanged={onChanged}
                        />
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button type="submit" disabled={saving} className="gap-2">
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : (editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                            {editingId ? "Guardar Alterações" : "Criar Livro"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_BOOK_FORM); }}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.length === 0 ? (
                    <div className="col-span-full bg-card border rounded-2xl p-8 text-center text-muted-foreground italic">
                        Nenhum livro criado.
                    </div>
                ) : books.map(book => (
                    <div key={book.id} className="bg-card border rounded-2xl p-4 shadow-sm flex gap-3">
                        {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-lg border shrink-0" />
                        ) : (
                            <div className="w-16 h-24 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                <BookText className="w-5 h-5" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                            <p className="font-bold text-sm leading-snug line-clamp-2">{book.title}</p>
                            {book.author && <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                                    book.is_free ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                                )}>
                                    {book.is_free ? "Grátis" : `${Number(book.price).toFixed(2)} ${book.currency}`}
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    {categoryName(book.category_id)}
                                </span>
                                {book.status !== "published" && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                                        {book.status === "draft" ? "Rascunho" : "Arquivado"}
                                    </span>
                                )}
                                {book.is_recommended && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600">
                                        Recomendado
                                    </span>
                                )}
                                {book.is_featured && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600">
                                        Destaque
                                    </span>
                                )}
                                {book.file_type && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                        {book.file_type}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 mt-auto pt-2">
                                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => startEdit(book)}>
                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Eliminar livro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                "{book.title}" será removido permanentemente da Biblioteca.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(book.id)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── 4. Pedidos de Compra ──────────────────────────────────────────────

function PurchasesPanel({ adminClient, purchases, onChanged }: {
    adminClient: any;
    purchases: BookPurchase[];
    onChanged: () => void;
}) {
    const { toast } = useToast();
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const { error } = await adminClient.from("book_purchases" as any).update({ status: "approved" }).eq("id", id);
            if (error) throw error;
            toast({ title: "Compra aprovada" });
            onChanged();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao aprovar", description: err.message });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            const { error } = await adminClient.from("book_purchases" as any).update({
                status: "rejected",
                admin_notes: notes[id] || null,
            }).eq("id", id);
            if (error) throw error;
            toast({ title: "Compra rejeitada" });
            onChanged();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao rejeitar", description: err.message });
        } finally {
            setProcessingId(null);
        }
    };

    if (purchases.length === 0) {
        return (
            <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <ShoppingBag className="w-8 h-8 opacity-40" />
                Nenhum pedido de compra pendente.
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {purchases.map(p => (
                <div key={p.id} className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
                    {p.books?.cover_url ? (
                        <img src={p.books.cover_url} alt={p.books?.title ?? ""} className="w-16 h-24 object-cover rounded-lg border shrink-0" />
                    ) : (
                        <div className="w-16 h-24 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <BookText className="w-5 h-5" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                        <div>
                            <p className="font-bold text-sm">{p.books?.title ?? "Livro"}</p>
                            <p className="text-xs text-muted-foreground">
                                {p.couple_spaces?.house_name || "Casa sem nome"} — {p.couple_spaces?.partner1_name || "P1"} & {p.couple_spaces?.partner2_name || "P2"}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">{p.amount}</span>
                            {p.method && <span className="font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{p.method}</span>}
                            <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 font-bold uppercase">Pendente</span>
                        </div>

                        {p.proof_url && (
                            <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-block">
                                <img src={p.proof_url} alt="Comprovativo" className="h-32 rounded-lg border object-cover" />
                            </a>
                        )}

                        <div className="flex flex-col md:flex-row gap-2 pt-1">
                            <Textarea
                                placeholder="Nota (opcional, mostrada em caso de rejeição)"
                                value={notes[p.id] || ""}
                                onChange={(e) => setNotes(n => ({ ...n, [p.id]: e.target.value }))}
                                className="bg-background min-h-[40px] flex-1"
                            />
                            <div className="flex gap-2 shrink-0">
                                <Button onClick={() => handleApprove(p.id)} disabled={processingId === p.id} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                    {processingId === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Aprovar
                                </Button>
                                <Button onClick={() => handleReject(p.id)} disabled={processingId === p.id} variant="destructive" className="gap-2">
                                    {processingId === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    Rejeitar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

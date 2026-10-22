import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, MoreHorizontal, Edit2, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import type { Photo } from "@/pages/Memories";

interface Props {
  photos: Photo[];
  startId: string;
  onClose: () => void;
  onDeleted: () => void;
}

// Galeria em ecrã inteiro: só a foto, deslizar para o lado para as outras.
// Um toque mostra ou esconde os botões.
export function MemoryDetail({ photos, startId, onClose, onDeleted }: Props) {
  const startIndex = Math.max(0, photos.findIndex(p => p.id === startId));
  const [index, setIndex] = useState(startIndex);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [chrome, setChrome] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const requested = useRef(new Set<string>());

  const photo = photos[Math.min(index, photos.length - 1)];

  // Abre já na foto tocada
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assina a foto visível e as vizinhas
  useEffect(() => {
    const wanted = photos.slice(Math.max(0, index - 1), index + 2).filter(p => !requested.current.has(p.id));
    if (wanted.length === 0) return;
    wanted.forEach(p => requested.current.add(p.id));
    supabase.storage.from("memories")
      .createSignedUrls(wanted.map(p => p.file_path), 3600)
      .then(({ data }) => {
        if (!data) return;
        setUrls(prev => {
          const next = { ...prev };
          data.forEach((d, i) => { if (d.signedUrl) next[wanted[i].id] = d.signedUrl; });
          return next;
        });
      });
  }, [index, photos]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el || i < 0 || i >= photos.length) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (menuOpen || deleteConfirm || editMode) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const handleDelete = async () => {
    await supabase.storage.from("memories").remove([photo.file_path]);
    await supabase.from("photos").delete().eq("id", photo.id);
    toast({ title: "Memória apagada" });
    onDeleted();
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    await supabase
      .from("photos")
      .update({ caption: editCaption.trim() || null, taken_on: editDate || null })
      .eq("id", photo.id);
    setSaving(false);
    setEditMode(false);
  };

  if (!photo) return null;
  const url = urls[photo.id];

  // No body, para não ficar presa dentro do conteúdo da página (animações com transform).
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[70] bg-black animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Memória"
      >
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((p, i) => (
            <div
              key={p.id}
              className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center"
              onClick={() => setChrome(c => !c)}
            >
              {urls[p.id] && Math.abs(i - index) <= 1 ? (
                <img
                  src={urls[p.id]}
                  alt={p.caption ?? "Memória"}
                  draggable={false}
                  className="max-h-full max-w-full select-none object-contain"
                />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              )}
            </div>
          ))}
        </div>

        {/* Botões por cima da foto */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-4 pb-8 pt-[max(env(safe-area-inset-top,0px),1rem)] transition-opacity duration-200",
            chrome ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm", chrome && "pointer-events-auto")}
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          {photos.length > 1 && (
            <span className="text-[13px] font-semibold tabular-nums text-white/85">
              {index + 1} / {photos.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm", chrome && "pointer-events-auto")}
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* ── Action menu ─────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[80]" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <button
              type="button"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-muted transition-colors text-left"
              onClick={() => {
                setEditCaption(photo.caption ?? "");
                setEditDate(photo.taken_on ?? "");
                setMenuOpen(false);
                setEditMode(true);
              }}
            >
              <Edit2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Editar memória</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left mt-1"
              onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }}
            >
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span className="text-sm font-medium text-rose-500">Eliminar memória</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center w-full px-4 py-3 mt-2 rounded-2xl bg-muted text-sm font-medium text-muted-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end">
          <div className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <p className="text-center text-base font-bold text-foreground">Eliminar esta memória?</p>
            <p className="text-center text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full h-12 rounded-2xl bg-rose-600 text-white font-semibold text-sm mt-2"
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="w-full h-12 rounded-2xl bg-muted text-foreground font-semibold text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Edit mode ───────────────────────────────────────────── */}
      {editMode && (
        <div className="fixed inset-0 z-[80] bg-card flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-5 py-4 pt-[max(env(safe-area-inset-top,0px),1rem)] border-b border-border shrink-0">
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground"
              onClick={() => setEditMode(false)}
            >
              Cancelar
            </button>
            <h2 className="text-sm font-bold text-foreground">Editar memória</h2>
            <button
              type="button"
              className="text-sm font-semibold text-[#0B1324] disabled:opacity-40 dark:text-foreground"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? "A guardar..." : "Guardar"}
            </button>
          </div>
          {url && (
            <div className="relative h-44 shrink-0 overflow-hidden">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}
          <div className="p-5 space-y-3">
            <div className="bg-muted rounded-2xl divide-y divide-border/50">
              <div className="px-4 py-3 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Legenda</p>
                <Textarea
                  rows={3}
                  placeholder="Descreve este momento..."
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="resize-none border-none bg-transparent focus-visible:ring-0 p-0 text-sm placeholder:text-muted-foreground/50"
                  maxLength={300}
                />
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Data do momento</p>
                <input
                  type="date"
                  className="bg-transparent border-none outline-none text-sm text-foreground text-right"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

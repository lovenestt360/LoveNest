import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { X, MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import type { Photo } from "@/pages/Memories";

interface Reaction {
  id: string;
  user_id: string;
  reaction: string;
}

const REACTIONS = [
  { key: "heart",   emoji: "❤️" },
  { key: "teary",   emoji: "🥹" },
  { key: "love",    emoji: "😍" },
  { key: "sparkle", emoji: "✨" },
  { key: "pray",    emoji: "🙏" },
] as const;
type ReactionKey = typeof REACTIONS[number]["key"];

interface Props {
  photo: Photo;
  spaceId: string;
  userId: string;
  originRect?: DOMRect | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function MemoryDetail({ photo: initial, spaceId, userId, originRect, onClose, onDeleted }: Props) {
  const [photo, setPhoto] = useState<Photo>(initial);
  const [url, setUrl] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editCaption, setEditCaption] = useState(initial.caption ?? "");
  const [editDate, setEditDate] = useState(initial.taken_on ?? "");
  const [saving, setSaving] = useState(false);

  // Clip-path animation state
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, []);

  useEffect(() => { setPhoto(initial); }, [initial]);

  useEffect(() => {
    supabase.storage.from("memories").createSignedUrl(photo.file_path, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [photo.file_path]);

  const loadReactions = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("photo_reactions")
        .select("id, user_id, reaction")
        .eq("photo_id", photo.id);
      if (data) setReactions(data as Reaction[]);
    } catch { /* table may not exist yet */ }
  }, [photo.id]);

  useEffect(() => { loadReactions(); }, [loadReactions]);

  useEffect(() => {
    const ch = supabase
      .channel(`mem-reactions-${photo.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "photo_reactions" as any,
        filter: `photo_id=eq.${photo.id}`,
      }, () => loadReactions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [photo.id, loadReactions]);

  const handleClose = () => {
    if (originRect) {
      setClosing(true);
      setEntered(false);
      setTimeout(() => onClose(), 360);
    } else {
      onClose();
    }
  };

  const toggleReaction = async (key: ReactionKey) => {
    const existing = reactions.find(r => r.user_id === userId && r.reaction === key);
    if (existing) {
      await (supabase as any).from("photo_reactions").delete().eq("id", existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data } = await (supabase as any)
        .from("photo_reactions")
        .insert({ photo_id: photo.id, couple_space_id: spaceId, user_id: userId, reaction: key })
        .select("id, user_id, reaction")
        .single();
      if (data) setReactions(prev => [...prev, data as Reaction]);
    }
  };

  const handleDelete = async () => {
    await supabase.storage.from("memories").remove([photo.file_path]);
    await supabase.from("photos").delete().eq("id", photo.id);
    toast({ title: "Memória apagada" });
    onDeleted();
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const { data } = await supabase
      .from("photos")
      .update({ caption: editCaption.trim() || null, taken_on: editDate || null })
      .eq("id", photo.id)
      .select()
      .single();
    if (data) setPhoto(data as Photo);
    setSaving(false);
    setEditMode(false);
  };

  // Date helpers
  const photoDate = photo.taken_on
    ? new Date(photo.taken_on + "T12:00:00")
    : new Date(photo.created_at);

  const dateFormatted = format(photoDate, "d 'de' MMMM 'de' yyyy", { locale: pt });
  const dayOfWeek = format(photoDate, "EEEE", { locale: pt });

  const diffDays = Math.floor((Date.now() - photoDate.getTime()) / 86_400_000);
  const relativeStr = (() => {
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    const years = Math.floor(diffDays / 365);
    const months = Math.floor(diffDays / 30);
    const weeks = Math.floor(diffDays / 7);
    if (years >= 1) return years === 1 ? "Há exatamente 1 ano" : `Há ${years} anos`;
    if (months >= 1) return months === 1 ? "Há 1 mês" : `Há ${months} meses`;
    if (weeks >= 1) return weeks === 1 ? "Há 1 semana" : `Há ${weeks} semanas`;
    return `Há ${diffDays} dias`;
  })();

  const savedDays = Math.floor((Date.now() - new Date(photo.created_at).getTime()) / 86_400_000);
  const savedStr = savedDays === 0 ? "Guardada hoje"
    : savedDays === 1 ? "Guardada ontem"
    : `Guardada há ${savedDays} dias`;

  // Clip-path animation
  const getClipPath = () => {
    if (!originRect) return undefined;
    if (entered && !closing) return "inset(0% 0% 0% 0% round 0px)";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = Math.max(0, (originRect.top / vh) * 100);
    const left = Math.max(0, (originRect.left / vw) * 100);
    const bottom = Math.max(0, ((vh - originRect.bottom) / vh) * 100);
    const right = Math.max(0, ((vw - originRect.right) / vw) * 100);
    return `inset(${top.toFixed(1)}% ${right.toFixed(1)}% ${bottom.toFixed(1)}% ${left.toFixed(1)}% round 12px)`;
  };

  const overlayStyle = originRect ? {
    clipPath: getClipPath(),
    transition: "clip-path 0.36s cubic-bezier(0.4, 0, 0.2, 1)",
  } : {};

  return (
    <>
      {/* ── Full-screen overlay ─────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-black",
          !originRect && "animate-in fade-in duration-200"
        )}
        style={overlayStyle}
        role="dialog"
        aria-modal="true"
      >
        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top,0px),1rem)]">
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Image with blurred fill */}
        <div className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center">
          {url && (
            <img
              src={url}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60 pointer-events-none"
            />
          )}
          {url ? (
            <img
              src={url}
              alt={photo.caption ?? "Memória"}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.55))",
              }}
              className="relative z-10 block"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
          )}
        </div>

        {/* Info panel */}
        <div className="bg-card rounded-t-[2rem] px-5 pt-4 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] shrink-0 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
          <p className="text-base font-bold text-foreground leading-snug mb-0.5 line-clamp-2">
            {photo.caption || "Sem legenda"}
          </p>
          <p className="text-xs text-muted-foreground capitalize mb-0.5">
            {dayOfWeek}, {dateFormatted}
          </p>
          <p className="text-[11px] font-semibold text-rose-400 mb-4">{relativeStr}</p>

          {/* Reactions */}
          <div className="flex gap-1.5 flex-wrap">
            {REACTIONS.map(({ key, emoji }) => {
              const count = reactions.filter(r => r.reaction === key).length;
              const mine = reactions.some(r => r.user_id === userId && r.reaction === key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleReaction(key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-all duration-150 border",
                    mine
                      ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                      : "bg-muted border-border"
                  )}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold text-foreground leading-none">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Emotional footnote */}
          <p className="text-[10px] text-muted-foreground/45 mt-3 pt-3 border-t border-border/40 leading-relaxed">
            {savedStr} · Este momento faz parte da vossa história
          </p>
        </div>
      </div>

      {/* ── Action menu ─────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)}>
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
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
          <div className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <p className="text-center text-base font-bold text-foreground">Eliminar esta memória?</p>
            <p className="text-center text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm mt-2"
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
        <div className="fixed inset-0 z-[60] bg-card flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
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
              className="text-sm font-semibold text-rose-500 disabled:opacity-40"
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
    </>
  );
}

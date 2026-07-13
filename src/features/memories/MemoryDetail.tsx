import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import {
  X, MoreHorizontal, MessageCircle, Send,
  Edit2, Trash2, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import type { Photo } from "@/pages/Memories";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

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
  onClose: () => void;
  onDeleted: () => void;
}

export function MemoryDetail({ photo: initial, spaceId, userId, onClose, onDeleted }: Props) {
  const [photo, setPhoto] = useState<Photo>(initial);
  const [url, setUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editCaption, setEditCaption] = useState(initial.caption ?? "");
  const [editDate, setEditDate] = useState(initial.taken_on ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPhoto(initial); }, [initial]);

  useEffect(() => {
    supabase.storage.from("memories").createSignedUrl(photo.file_path, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [photo.file_path]);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("photo_comments")
      .select("id, user_id, content, created_at")
      .eq("photo_id", photo.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data as Comment[]);
  }, [photo.id]);

  const loadReactions = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("photo_reactions")
        .select("id, user_id, reaction")
        .eq("photo_id", photo.id);
      if (data) setReactions(data as Reaction[]);
    } catch { /* table may not exist yet */ }
  }, [photo.id]);

  useEffect(() => {
    loadComments();
    loadReactions();
  }, [loadComments, loadReactions]);

  // Separate Realtime channels so a failed table doesn't break the other
  useEffect(() => {
    const ch = supabase
      .channel(`mem-comments-${photo.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "photo_comments",
        filter: `photo_id=eq.${photo.id}`,
      }, () => loadComments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [photo.id, loadComments]);

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

  const sendComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setSending(true);
    await supabase.from("photo_comments").insert({
      photo_id: photo.id,
      couple_space_id: spaceId,
      user_id: userId,
      content: text,
    });
    setNewComment("");
    setInputOpen(false);
    setSending(false);
    notifyPartner({
      couple_space_id: spaceId,
      title: `"${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`,
      body: "Novo comentário na vossa memória",
      url: "/memorias",
      type: "memorias",
    });
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

  return (
    <>
      {/* ── Full-screen overlay ─────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top,0px),1rem)]">
          <button
            type="button"
            onClick={onClose}
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

        {/* Image */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          {url ? (
            <img
              src={url}
              alt={photo.caption ?? "Memória"}
              style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }}
              className="block"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
          )}
        </div>

        {/* Info + comments panel — scrollable */}
        <div className="bg-card rounded-t-[2rem] overflow-y-auto max-h-[55vh] shrink-0">
          <div className="px-5 pt-4 pb-2">
            {/* Caption */}
            <p className="text-base font-bold text-foreground leading-snug mb-0.5 line-clamp-2">
              {photo.caption || "Sem legenda"}
            </p>
            {/* Dates */}
            <p className="text-xs text-muted-foreground capitalize mb-0.5">
              {dayOfWeek}, {dateFormatted}
            </p>
            <p className="text-[11px] font-semibold text-rose-400 mb-3">{relativeStr}</p>

            {/* Reactions */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {REACTIONS.map(({ key, emoji }) => {
                const count = reactions.filter(r => r.reaction === key).length;
                const mine = reactions.some(r => r.user_id === userId && r.reaction === key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleReaction(key)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all duration-150 border",
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

            {/* Comments header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {comments.length === 0
                    ? "Comentários"
                    : `${comments.length} comentário${comments.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              {!inputOpen && (
                <button
                  type="button"
                  onClick={() => setInputOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-500"
                >
                  <PenLine className="w-3 h-3" />
                  Comentar
                </button>
              )}
            </div>
          </div>

          {/* Comment list — always visible */}
          <div className="px-5 space-y-3 pb-3">
            {comments.length === 0 && !inputOpen && (
              <p className="text-sm text-muted-foreground text-center py-3">
                Sem comentários ainda.
              </p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5",
                  c.user_id === userId
                    ? "bg-rose-100 dark:bg-rose-950/30 text-rose-500"
                    : "bg-muted text-muted-foreground"
                )}>
                  {c.user_id === userId ? "EU" : "PAR"}
                </div>
                <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                  <p className="text-sm text-foreground leading-snug">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(c.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            ))}

            {/* Input — only shown on demand, keyboard opens only here */}
            {inputOpen && (
              <div className="flex gap-2 pt-1 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)]">
                <input
                  type="text"
                  placeholder="Escrever um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-800 transition-all"
                  maxLength={300}
                />
                <button
                  type="button"
                  onClick={sendComment}
                  disabled={sending || !newComment.trim()}
                  className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bottom padding for safe area */}
            <div className="h-[max(env(safe-area-inset-bottom,0px),0.75rem)]" />
          </div>
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

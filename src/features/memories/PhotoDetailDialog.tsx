import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Photo } from "@/pages/Memories";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Props {
  photo: Photo;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  spaceId: string;
  userId: string;
  onDeleted: () => void;
}

export function PhotoDetailDialog({ photo, open, onOpenChange, spaceId, userId, onDeleted }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.storage.from("memories").createSignedUrl(photo.file_path, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [open, photo.file_path]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("photo_comments")
      .select("id, user_id, content, created_at")
      .eq("photo_id", photo.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  }, [photo.id]);

  useEffect(() => { if (open) fetchComments(); }, [open, fetchComments]);

  // Realtime for comments
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel(`comments-${photo.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_comments", filter: `photo_id=eq.${photo.id}` }, () => {
        fetchComments();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, photo.id, fetchComments]);

  const addComment = async () => {
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
    setSending(false);
    // Push to partner
    notifyPartner({
      couple_space_id: spaceId,
      title: "💬 Comentário numa memória",
      body: text.slice(0, 80),
      url: "/memorias",
      type: "memorias",
    });
  };

  const deletePhoto = async () => {
    if (!window.confirm("Tens a certeza que queres apagar esta memória?")) return;
    await supabase.storage.from("memories").remove([photo.file_path]);
    await supabase.from("photos").delete().eq("id", photo.id);
    toast({ title: "Memória apagada" });
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{photo.caption || "Memória"}</DialogTitle>
          <DialogDescription>
            {photo.taken_on ? format(new Date(photo.taken_on + "T00:00:00"), "d 'de' MMMM yyyy", { locale: pt }) : format(new Date(photo.created_at), "d MMM yyyy", { locale: pt })}
          </DialogDescription>
        </DialogHeader>

        {url && <img src={url} alt={photo.caption ?? "Memória"} className="w-full rounded-lg object-contain max-h-72" />}

        {/* Comments */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Comentários</h4>
          {comments.length === 0 && <p className="text-xs text-muted-foreground">Sem comentários ainda.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="font-medium text-xs">{c.user_id === userId ? "Eu" : "Par"}</span>
              <span className="text-xs flex-1">{c.content}</span>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              placeholder="Escrever comentário…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={300}
              onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
            />
            <Button size="icon" variant="ghost" disabled={sending || !newComment.trim()} onClick={addComment}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button variant="destructive" size="sm" className="w-full" onClick={deletePhoto}>
          <Trash2 className="mr-1 h-4 w-4" /> Apagar memória
        </Button>
      </DialogContent>
    </Dialog>
  );
}

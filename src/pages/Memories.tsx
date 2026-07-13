import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { useProfile } from "@/hooks/useProfile";
import { Plus, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MemoryGallery } from "@/features/memories/MemoryGallery";
import { MemoryDetail } from "@/features/memories/MemoryDetail";
import { UploadMemorySheet } from "@/features/memories/UploadMemorySheet";

export interface Photo {
  id: string;
  couple_space_id: string;
  album_id: string | null;
  uploaded_by: string;
  file_path: string;
  caption: string | null;
  taken_on: string | null;
  created_at: string;
}

const BATCH_SIZE = 30;

export default function Memories() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const spaceId = useCoupleSpaceId();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastCursorRef = useRef<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setUploadOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchPhotos = useCallback(async (append = false) => {
    if (!spaceId) return;
    if (!append) setLoading(true);

    let query = supabase
      .from("photos")
      .select("*")
      .eq("couple_space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (append && lastCursorRef.current) {
      query = query.lt("created_at", lastCursorRef.current);
    }

    const { data } = await query;
    if (data) {
      const typed = data as Photo[];
      if (typed.length > 0) {
        lastCursorRef.current = typed[typed.length - 1].created_at;
      }
      setPhotos(append ? (prev) => [...prev, ...typed] : typed);
      setHasMore(data.length === BATCH_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [spaceId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Realtime: refresh list on any change to photos
  useEffect(() => {
    if (!spaceId) return;
    const ch = supabase
      .channel("memories-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "photos",
        filter: `couple_space_id=eq.${spaceId}`,
      }, () => fetchPhotos())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, fetchPhotos]);

  // Keep selectedPhoto in sync when photos list refreshes (e.g. after edit)
  const selectedId = selectedPhoto?.id;
  useEffect(() => {
    if (!selectedId) return;
    const updated = photos.find(p => p.id === selectedId);
    if (updated) setSelectedPhoto(updated);
  }, [photos, selectedId]);

  const handleDeleteTarget = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.storage.from("memories").remove([deleteTarget.file_path]);
    await supabase.from("photos").delete().eq("id", deleteTarget.id);
    toast({ title: "Memória apagada" });
    setDeleteTarget(null);
    setDeleting(false);
    fetchPhotos();
  };

  if (!profileLoading && profile?.usage_mode === "solo") {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="pb-24 min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3.5 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Memórias</h1>
          {photos.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {photos.length} momento{photos.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white shadow-sm transition-colors"
          aria-label="Nova memória"
        >
          <Plus className="w-[18px] h-[18px]" />
        </button>
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center mb-4">
            <ImagePlus className="w-7 h-7 text-rose-300" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Sem memórias ainda</p>
          <p className="text-sm text-muted-foreground mb-6">Adiciona a primeira foto do casal</p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="px-6 py-2.5 rounded-full bg-rose-500 text-white text-sm font-semibold shadow-sm"
          >
            Adicionar foto
          </button>
        </div>
      ) : (
        <div className="pt-1">
          <MemoryGallery photos={photos} onSelect={setSelectedPhoto} onLongPress={setDeleteTarget} />
          {hasMore && (
            <div className="flex justify-center py-6">
              <button
                type="button"
                onClick={() => { setLoadingMore(true); fetchPhotos(true); }}
                disabled={loadingMore}
                className="px-5 py-2 rounded-full text-sm font-medium text-muted-foreground bg-muted disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload sheet */}
      <UploadMemorySheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        spaceId={spaceId}
        userId={user?.id ?? ""}
        onUploaded={() => {}}
      />

      {/* Detail overlay */}
      {selectedPhoto && (
        <MemoryDetail
          photo={selectedPhoto}
          spaceId={spaceId ?? ""}
          userId={user?.id ?? ""}
          onClose={() => setSelectedPhoto(null)}
          onDeleted={() => { setSelectedPhoto(null); fetchPhotos(); }}
        />
      )}

      {/* Long-press delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            {deleteTarget.caption && (
              <p className="text-center text-sm text-muted-foreground line-clamp-1 mb-1">
                "{deleteTarget.caption}"
              </p>
            )}
            <p className="text-center text-base font-bold text-foreground">Eliminar esta memória?</p>
            <p className="text-center text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
            <button
              type="button"
              onClick={handleDeleteTarget}
              disabled={deleting}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "A eliminar..." : "Eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="w-full h-12 rounded-2xl bg-muted text-foreground font-semibold text-sm disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

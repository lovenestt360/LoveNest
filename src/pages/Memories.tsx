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
import { ScreenHeader } from "@/components/ScreenHeader";
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
    <section className="animate-fade-in">
      <ScreenHeader
        title="Memórias"
        subtitle={photos.length > 0 ? `${photos.length} momento${photos.length !== 1 ? "s" : ""}` : "As vossas fotos juntos"}
        action={
          <button type="button" onClick={() => setUploadOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B1324] text-white shadow-[0_10px_20px_-10px_rgba(11,19,36,0.7)] transition-transform active:scale-90 dark:bg-foreground dark:text-background" aria-label="Nova memória">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        }
        className="mb-4"
      />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] px-8 py-14 text-center bg-white border border-[#ECE8E3] shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:bg-card dark:border-border">
          <div className="w-14 h-14 rounded-[18px] bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center mb-4">
            <ImagePlus className="w-6 h-6 text-rose-500" strokeWidth={1.8} />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Sem memórias ainda</p>
          <p className="text-sm text-muted-foreground mb-6">Adiciona a primeira foto do casal</p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-full bg-[#0B1324] px-6 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95 dark:bg-foreground dark:text-background"
          >
            Adicionar foto
          </button>
        </div>
      ) : (
        <div className="pt-1">
          <MemoryGallery
            photos={photos}
            onSelect={(photo) => setSelectedPhoto(photo)}
            onLongPress={setDeleteTarget}
          />
          {hasMore && (
            <div className="flex justify-center py-6">
              <button
                type="button"
                onClick={() => { setLoadingMore(true); fetchPhotos(true); }}
                disabled={loadingMore}
                className="rounded-full border border-[#ECE8E3] bg-white px-5 py-2 text-sm font-medium text-[#3A4150] disabled:opacity-50 dark:border-border dark:bg-card dark:text-muted-foreground"
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
            className="w-full max-w-md mx-auto bg-white dark:bg-card rounded-t-[26px] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[#E2DED8] dark:bg-border mx-auto mb-4" />
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
              className="w-full h-12 rounded-[16px] bg-rose-600 text-white font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "A eliminar..." : "Eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="w-full h-12 rounded-[16px] bg-[#F4F2EF] text-[#3A4150] font-semibold text-sm disabled:opacity-60 dark:bg-muted dark:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useCoupleSpaceId } from "@/hooks/useCoupleSpaceId";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { UploadMemoryDialog } from "@/features/memories/UploadMemoryDialog";
import { PhotoGrid } from "@/features/memories/PhotoGrid";
import { PhotoDetailDialog } from "@/features/memories/PhotoDetailDialog";

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

const BATCH_SIZE = 20;

export default function Memories() {
  const { user } = useAuth();
  const spaceId = useCoupleSpaceId();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Auto-open upload from home CTA
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setUploadOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const lastCursorRef = useRef<string | null>(null);

  const fetchPhotos = useCallback(async (append = false) => {
    if (!spaceId) return;
    if (!append) setLoading(true);

    const query = supabase
      .from("photos")
      .select("*")
      .eq("couple_space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (append && lastCursorRef.current) {
      query.lt("created_at", lastCursorRef.current);
    }

    const { data } = await query;
    if (data) {
      const typed = data as Photo[];
      if (typed.length > 0) {
        lastCursorRef.current = typed[typed.length - 1].created_at;
      }
      if (append) {
        setPhotos((prev) => [...prev, ...typed]);
      } else {
        setPhotos(typed);
      }
      setHasMore(data.length === BATCH_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [spaceId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Realtime
  useEffect(() => {
    if (!spaceId) return;
    const channel = supabase
      .channel("memories-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos", filter: `couple_space_id=eq.${spaceId}` }, () => {
        fetchPhotos();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchPhotos(true);
  };

  return (
    <section className="space-y-5 pb-24 animate-fade-in max-w-lg mx-auto">
      <header className="flex items-center justify-between px-4 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-40 border-b border-[#f0f0f0]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Memórias</h1>
          <p className="text-[12px] text-[#717171]">{photos.length} momento{photos.length !== 1 ? "s" : ""} guardado{photos.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)} className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-0 shadow-sm">
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#c0c0c0]" />
        </div>
      ) : photos.length === 0 ? (
        <div className="mx-4 bg-white border border-[#f0f0f0] rounded-2xl p-10 text-center shadow-sm space-y-2">
          <p className="text-2xl">📸</p>
          <p className="text-sm font-semibold text-foreground">Ainda sem memórias</p>
          <p className="text-[12px] text-[#717171]">Adiciona a primeira foto do casal</p>
        </div>
      ) : (
        <>
          <PhotoGrid photos={photos} onSelect={setSelectedPhoto} />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}

      <UploadMemoryDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        spaceId={spaceId}
        userId={user?.id ?? ""}
        onUploaded={() => fetchPhotos()}
      />

      {selectedPhoto && (
        <PhotoDetailDialog
          photo={selectedPhoto}
          open={!!selectedPhoto}
          onOpenChange={(o) => { if (!o) setSelectedPhoto(null); }}
          spaceId={spaceId ?? ""}
          userId={user?.id ?? ""}
          onDeleted={() => { setSelectedPhoto(null); fetchPhotos(); }}
        />
      )}
    </section>
  );
}

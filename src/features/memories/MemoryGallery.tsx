import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Photo } from "@/pages/Memories";

interface Props {
  photos: Photo[];
  onSelect: (p: Photo) => void;
}

export function MemoryGallery({ photos, onSelect }: Props) {
  const col1 = photos.filter((_, i) => i % 2 === 0);
  const col2 = photos.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex gap-[3px] px-[3px]">
      <div className="flex flex-col gap-[3px] flex-1">
        {col1.map((photo) => (
          <MemoryTile key={photo.id} photo={photo} onClick={() => onSelect(photo)} />
        ))}
      </div>
      <div className="flex flex-col gap-[3px] flex-1">
        {col2.map((photo) => (
          <MemoryTile key={photo.id} photo={photo} onClick={() => onSelect(photo)} />
        ))}
      </div>
    </div>
  );
}

function MemoryTile({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(photo.file_path, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [photo.file_path]);

  const displayDate = photo.taken_on
    ? format(new Date(photo.taken_on + "T00:00:00"), "MMM ''yy", { locale: pt })
    : format(new Date(photo.created_at), "MMM ''yy", { locale: pt });

  return (
    <button
      type="button"
      className="relative overflow-hidden rounded-xl bg-muted active:scale-[0.97] transition-transform duration-150 w-full block text-left"
      onClick={onClick}
    >
      {/* Placeholder shown while loading */}
      {!loaded && <div className="w-full aspect-[3/4] bg-muted/60 animate-pulse" />}

      {url && (
        <img
          src={url}
          alt={photo.caption ?? "Memória"}
          className={`w-full h-auto block transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      )}

      {loaded && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-none">
            {photo.caption && (
              <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2 mb-0.5">
                {photo.caption}
              </p>
            )}
            <p className="text-white/50 text-[9px] font-medium uppercase tracking-widest">
              {displayDate}
            </p>
          </div>
        </>
      )}
    </button>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Photo } from "@/pages/Memories";

interface Props {
  photos: Photo[];
  onSelect: (p: Photo) => void;
}

export function PhotoGrid({ photos, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) => (
        <PhotoThumb key={photo.id} photo={photo} onClick={() => onSelect(photo)} />
      ))}
    </div>
  );
}

function PhotoThumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage.from("memories").createSignedUrl(photo.file_path, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [photo.file_path]);

  return (
    <button
      type="button"
      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
      onClick={onClick}
    >
      {url ? (
        <img src={url} alt={photo.caption ?? "Memória"} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">A carregar…</div>
      )}
      {photo.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
          <p className="text-[11px] text-white truncate">{photo.caption}</p>
        </div>
      )}
    </button>
  );
}

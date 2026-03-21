import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Photo } from "@/pages/Memories";

interface Props {
  photos: Photo[];
  onSelect: (p: Photo) => void;
}

export function PhotoGrid({ photos, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      className="group relative aspect-square overflow-hidden rounded-[1.5rem] bg-muted shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
      onClick={onClick}
    >
      {url ? (
        <img src={url} alt={photo.caption ?? "Memória"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-[10px] uppercase font-black tracking-widest">...</div>
      )}
      {photo.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-[10px] text-white font-bold leading-tight line-clamp-2">{photo.caption}</p>
        </div>
      )}
    </button>
  );
}

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Photo } from "@/pages/Memories";

interface Props {
  photos: Photo[];
  onSelect: (p: Photo) => void;
  onLongPress: (p: Photo) => void;
}

export function MemoryGallery({ photos, onSelect, onLongPress }: Props) {
  const col1 = photos.filter((_, i) => i % 2 === 0);
  const col2 = photos.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex gap-[3px] px-[3px]">
      <div className="flex flex-col gap-[3px] flex-1">
        {col1.map((photo) => (
          <MemoryTile
            key={photo.id}
            photo={photo}
            onClick={() => onSelect(photo)}
            onLongPress={() => onLongPress(photo)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-[3px] flex-1">
        {col2.map((photo) => (
          <MemoryTile
            key={photo.id}
            photo={photo}
            onClick={() => onSelect(photo)}
            onLongPress={() => onLongPress(photo)}
          />
        ))}
      </div>
    </div>
  );
}

function MemoryTile({
  photo,
  onClick,
  onLongPress,
}: {
  photo: Photo;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pressing, setPressing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(photo.file_path, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [photo.file_path]);

  const displayDate = photo.taken_on
    ? format(new Date(photo.taken_on + "T00:00:00"), "MMM ''yy", { locale: pt })
    : format(new Date(photo.created_at), "MMM ''yy", { locale: pt });

  const startPress = () => {
    didLongPress.current = false;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(false);
      onLongPress();
    }, 550);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(false);
  };

  const handleClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onClick();
  };

  return (
    <button
      type="button"
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted w-full block text-left select-none",
        pressing ? "scale-95 transition-transform duration-300" : "transition-transform duration-150"
      )}
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
    >
      {/* Placeholder */}
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
          {/* Long-press feedback overlay */}
          {pressing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <div className="w-10 h-10 rounded-full bg-rose-500/90 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
            </div>
          )}

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

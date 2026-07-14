import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Photo } from "@/pages/Memories";

interface Props {
  photos: Photo[];
  onSelect: (p: Photo, rect: DOMRect) => void;
  onLongPress: (p: Photo) => void;
}

export function MemoryGallery({ photos, onSelect, onLongPress }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; photos: Photo[] }>();
    for (const photo of photos) {
      const date = photo.taken_on
        ? new Date(photo.taken_on + "T00:00:00")
        : new Date(photo.created_at);
      const key = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy", { locale: pt });
      if (!map.has(key)) map.set(key, { label, photos: [] });
      map.get(key)!.photos.push(photo);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({ key, ...val }));
  }, [photos]);

  return (
    <div>
      {groups.map((group) => (
        <div key={group.key}>
          <div className="px-4 pt-5 pb-2.5 flex items-center gap-3">
            <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">
              {group.label.charAt(0).toUpperCase() + group.label.slice(1)}
            </p>
            <div className="flex-1 h-px bg-border/40" />
            <p className="text-[10px] text-muted-foreground/40 font-medium">{group.photos.length}</p>
          </div>
          <div className="flex gap-[3px] px-[3px]">
            <div className="flex flex-col gap-[3px] flex-1">
              {group.photos.filter((_, i) => i % 2 === 0).map((photo) => (
                <MemoryTile
                  key={photo.id}
                  photo={photo}
                  onClick={(rect) => onSelect(photo, rect)}
                  onLongPress={() => onLongPress(photo)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-[3px] flex-1">
              {group.photos.filter((_, i) => i % 2 === 1).map((photo) => (
                <MemoryTile
                  key={photo.id}
                  photo={photo}
                  onClick={(rect) => onSelect(photo, rect)}
                  onLongPress={() => onLongPress(photo)}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemoryTile({
  photo,
  onClick,
  onLongPress,
}: {
  photo: Photo;
  onClick: (rect: DOMRect) => void;
  onLongPress: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pressing, setPressing] = useState(false);

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress  = useRef(false);
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    supabase.storage
      .from("memories")
      .createSignedUrl(photo.file_path, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [photo.file_path]);

  const displayDate = photo.taken_on
    ? format(new Date(photo.taken_on + "T00:00:00"), "MMM ''yy", { locale: pt })
    : format(new Date(photo.created_at), "MMM ''yy", { locale: pt });

  const cancelPress = () => {
    if (timerRef.current)    { clearTimeout(timerRef.current);    timerRef.current    = null; }
    if (feedbackRef.current) { clearTimeout(feedbackRef.current); feedbackRef.current = null; }
    setPressing(false);
    pointerOrigin.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerOrigin.current = { x: e.clientX, y: e.clientY };
    didLongPress.current = false;
    // Visual feedback (scale + trash icon) only after 500ms — quick taps see nothing
    feedbackRef.current = setTimeout(() => setPressing(true), 500);
    // Action fires at 1400ms — clearly intentional hold
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(false);
      pointerOrigin.current = null;
      onLongPress();
    }, 1400);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerOrigin.current) return;
    const dx = Math.abs(e.clientX - pointerOrigin.current.x);
    const dy = Math.abs(e.clientY - pointerOrigin.current.y);
    // Cancel if finger moved more than 10px — user is scrolling, not pressing
    if (dx > 10 || dy > 10) cancelPress();
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (didLongPress.current) { didLongPress.current = false; return; }
    onClick(e.currentTarget.getBoundingClientRect());
  };

  return (
    <button
      type="button"
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted w-full block text-left select-none",
        pressing ? "scale-95 transition-transform duration-300" : "transition-transform duration-150"
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelPress}
      onPointerMove={handlePointerMove}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
    >
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

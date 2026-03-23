import { useUserSettings } from "@/hooks/useUserSettings";
import { useLocation } from "react-router-dom";

export function ChatWallpaper() {
  const { wallpaperUrl, wallpaperOpacity } = useUserSettings();
  const location = useLocation();
  const isChat = location.pathname === "/chat";

  if (!isChat || !wallpaperUrl) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
      <img
        src={wallpaperUrl}
        alt="Chat Wallpaper"
        className="h-full w-full object-cover"
        style={{ opacity: wallpaperOpacity }}
      />
    </div>
  );
}

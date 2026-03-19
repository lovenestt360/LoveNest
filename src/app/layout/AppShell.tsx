import { Outlet } from "react-router-dom";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { Fab } from "@/app/layout/Fab";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useUserSettings } from "@/hooks/useUserSettings";
import { WifiOff } from "lucide-react";

export function AppShell() {
  const isOnline = useOnlineStatus();
  const { wallpaperUrl, wallpaperOpacity } = useUserSettings();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-x-hidden">
      {/* Dynamic Background Mesh */}
      <div className="bg-mesh" aria-hidden="true" />

      {/* Global Wallpaper */}
      {wallpaperUrl && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center transition-opacity duration-700"
          style={{ 
            backgroundImage: `url(${wallpaperUrl})`, 
            opacity: wallpaperOpacity 
          }}
          aria-hidden="true"
        />
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 backdrop-blur-md">
          <WifiOff className="w-3 h-3" />
          Modo Offline — Algumas funções podem estar limitadas
        </div>
      )}

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-6 relative z-10">
        <Outlet />
      </main>

      <Fab />
      <BottomTabs />
    </div>
  );
}

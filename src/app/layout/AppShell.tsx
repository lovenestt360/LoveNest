import { Outlet } from "react-router-dom";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { Fab } from "@/app/layout/Fab";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export function AppShell() {
  const isOnline = useOnlineStatus();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <WifiOff className="w-3 h-3" />
          Modo Offline — Algumas funções podem estar limitadas
        </div>
      )}

      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6">
        <Outlet />
      </main>

      <Fab />
      <BottomTabs />
    </div>
  );
}

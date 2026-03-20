import { Outlet, useLocation } from "react-router-dom";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { Fab } from "@/app/layout/Fab";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { PWATutorialProvider } from "@/features/pwa/PWATutorialContext";
import { PWATutorialModal } from "@/features/pwa/PWATutorialModal";
import { PWAInstallButton } from "@/features/pwa/PWAInstallButton";
import { cn } from "@/lib/utils";

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const isChat = location.pathname === "/casa";

  return (
    <PWATutorialProvider>
      <div className={cn(
        "min-h-[100dvh] text-foreground relative transition-colors duration-500",
        isChat ? "bg-transparent" : "bg-background"
      )}>
        {/* Dynamic Background Mesh */}
        <div className="bg-mesh" aria-hidden="true" />

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
        
        {/* PWA System Components */}
        <PWAInstallButton />
        <PWATutorialModal />
      </div>
    </PWATutorialProvider>
  );
}

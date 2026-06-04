import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { FloatingSetupChecklist } from "@/components/onboarding/FloatingSetupChecklist";
import { VerificationPrompt } from "@/features/verification/VerificationPrompt";
import { cn } from "@/lib/utils";
import { ChatWallpaper } from "@/features/chat/components/ChatWallpaper";
import { toast } from "sonner";

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-slide-up w-full">
      {children}
    </div>
  );
}

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const isChat = location.pathname === "/chat";

  // Listen for streak events dispatched by useStreak after recalculation
  useEffect(() => {
    const onBroke = (e: Event) => {
      const prev = (e as CustomEvent).detail?.prev ?? 0;
      toast("A vossa chama esfriou.", {
        description: prev > 0
          ? `A sequência de ${prev} ${prev === 1 ? "dia" : "dias"} terminou. Comecem de novo hoje.`
          : "Apareçam todos os dias para manter a chama viva.",
        duration: 6000,
      });
    };

    const onShield = (e: Event) => {
      const left = (e as CustomEvent).detail?.shieldsLeft ?? 0;
      toast("A vossa sequência foi protegida.", {
        description: left > 0
          ? `Um escudo foi usado automaticamente. Restam ${left} ${left === 1 ? "escudo" : "escudos"}.`
          : "O último escudo foi usado. Apareçam hoje para proteger a chama.",
        duration: 6000,
      });
    };

    window.addEventListener("streak-broke", onBroke);
    window.addEventListener("shield-protected", onShield);
    return () => {
      window.removeEventListener("streak-broke", onBroke);
      window.removeEventListener("shield-protected", onShield);
    };
  }, []);

  return (
    <div className={cn(
      "min-h-[100dvh] text-foreground relative transition-colors duration-500",
      isChat ? "bg-transparent" : "bg-background"
    )}>
      {/* Global Chat Wallpaper (Fixed, outside transitions) */}
      <ChatWallpaper />

      {/* Dynamic Background Mesh */}
      <div className="bg-mesh" aria-hidden="true" />

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 backdrop-blur-md">
          <WifiOff className="w-3 h-3" />
          Modo Offline — Algumas funções podem estar limitadas
        </div>
      )}

      <main className={cn(
        "mx-auto w-full max-w-md relative z-10",
        isChat ? "px-0 pb-0 pt-0 h-[100dvh]" : "px-4 pb-32 pt-6"
      )}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {!isChat && <BottomTabs />}
      
      {/* System Components */}
      <FloatingSetupChecklist />
      <VerificationPrompt />
    </div>
  );
}

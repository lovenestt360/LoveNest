import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { Fab } from "@/app/layout/Fab";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { VerificationPrompt } from "@/features/verification/VerificationPrompt";
import { cn } from "@/lib/utils";
import { useLoveEngine } from "@/hooks/useLoveEngine";

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  const { emitEvent } = useLoveEngine();

  useEffect(() => {
    emitEvent("app_open");
  }, [emitEvent]);

  return (
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
        <div key={location.pathname} className="animate-fade-slide-up w-full min-h-screen">
          <Outlet />
        </div>
      </main>

      <Fab />
      <BottomTabs />
      
      {/* System Components */}
      <OnboardingWizard />
      <VerificationPrompt />
    </div>
  );
}

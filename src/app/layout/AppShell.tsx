import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { BottomTabs } from "@/app/layout/BottomTabs";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { FloatingSetupChecklist } from "@/components/onboarding/FloatingSetupChecklist";
import { VerificationPrompt } from "@/features/verification/VerificationPrompt";
import { cn } from "@/lib/utils";
import { ChatWallpaper } from "@/features/chat/components/ChatWallpaper";
import { toast } from "sonner";

// Import directo (não lazy) para que o keep-alive funcione —
// AppShell mantém Index montado em memória e apenas o mostra/oculta via CSS.
// Este import é intencional: Index deve carregar junto com AppShell
// porque é a página mais usada e nunca deve ser destruída.
import IndexPage from "@/pages/Index";

export function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  const isHome = location.pathname === "/";

  // Quando o utilizador navega de volta para a Home (keep-alive esconde/mostra),
  // nenhum useEffect remonta — notifica os hooks via evento para que
  // sincronizem os dados imediatamente (streak, missões, pontos).
  const wasMountedRef = useRef(false);
  useEffect(() => {
    if (wasMountedRef.current && isHome) {
      window.dispatchEvent(new CustomEvent("home-visible"));
    }
    wasMountedRef.current = true;
  }, [isHome]);

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
      <ChatWallpaper />
      <div className="bg-mesh" aria-hidden="true" />

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
        {/*
          ── KEEP-ALIVE DA HOME ───────────────────────────────────────────
          Index é mantido montado permanentemente. Apenas é ocultado via
          CSS quando o utilizador navega para outra página — nunca é
          destruído nem recriado. Ao regressar, aparece instantaneamente
          com o estado exactamente como foi deixado.
          ─────────────────────────────────────────────────────────────────
        */}
        <div
          style={{ display: isHome ? "block" : "none" }}
          aria-hidden={!isHome}
        >
          <IndexPage />
        </div>

        {/* Todas as outras rotas via Outlet com animação de entrada */}
        {!isHome && (
          <div className="animate-fade-slide-up w-full">
            <Outlet />
          </div>
        )}
      </main>

      {!isChat && <BottomTabs />}
      <FloatingSetupChecklist />
      <VerificationPrompt />
    </div>
  );
}

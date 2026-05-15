import { useEffect, useState } from "react";
import { useOnboarding, isPushCapable } from "@/hooks/useOnboarding";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, User, Bell, Sparkles, BellOff } from "lucide-react";

export function OnboardingWizard() {
  const { step, loading, refresh, userId } = useOnboarding();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const pushCapable = isPushCapable();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (!loading && step !== "complete" && isStandalone) {
      const hash = location.hash.replace("#", "");
      if (location.pathname === "/configuracoes" && hash === step) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    } else {
      setOpen(false);
    }
  }, [step, loading, location]);

  const handleAction = () => {
    if (step === "profile") {
      navigate("/configuracoes#profile");
    } else if (step === "house") {
      navigate("/configuracoes#house");
    } else if (step === "notifications") {
      navigate("/configuracoes#notifications");
    }
    setOpen(false);
  };

  // Skip the notifications step — store flag in localStorage so useOnboarding bypasses it
  const handleSkipNotifications = () => {
    if (userId) localStorage.setItem(`notif-skipped-${userId}`, "1");
    setOpen(false);
    refresh();
  };

  if (step === "complete") return null;

  // Notifications step: different content for iOS-incompatible vs capable devices
  const notificationsContent = pushCapable
    ? {
        title: "Fiquem ligados",
        description:
          "Ativa as notificações para receberes os mimos e alertas do teu par em tempo real.",
        icon: <Bell className="h-12 w-12 text-indigo-500" />,
        button: "Ativar Notificações",
        showSkip: true,
        skipLabel: "Continuar sem notificações",
      }
    : {
        title: "Notificações indisponíveis",
        description:
          "O teu dispositivo não suporta notificações push nesta versão. Podes continuar a usar o LoveNest normalmente — as notificações ficam disponíveis ao atualizar o sistema.",
        icon: <BellOff className="h-12 w-12 text-[#aaa]" />,
        button: "Continuar",
        showSkip: false,
        skipLabel: "",
      };

  const content = {
    profile: {
      title: "Boas-vindas ao LoveNest",
      description:
        "Para começarmos, configura o teu perfil. É rápido e personaliza a vossa experiência.",
      icon: <User className="h-12 w-12 text-rose-500" />,
      button: "Configurar Perfil",
      showSkip: false,
      skipLabel: "",
    },
    house: {
      title: "O vosso Ninho",
      description:
        "A vossa casa ainda não está completa. Vamos dar-lhe um nome e definir a vossa data especial.",
      icon: <Heart className="h-12 w-12 text-rose-500" />,
      button: "Configurar a Nossa Casa",
      showSkip: false,
      skipLabel: "",
    },
    notifications: notificationsContent,
  };

  const current = content[step as keyof typeof content] ?? content.profile;
  const isNotifStep = step === "notifications";

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-[90vw] rounded-[2.5rem] p-8 border-none shadow-2xl glass-card">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="bg-primary/10 p-4 rounded-3xl mb-2">
            {current.icon}
          </div>
          <AlertDialogTitle className="text-2xl font-black gradient-text">
            {current.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground font-medium pt-2">
            {current.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-6 sm:justify-center flex-col gap-2">
          {/* Primary action */}
          <AlertDialogAction
            onClick={isNotifStep && !pushCapable ? handleSkipNotifications : handleAction}
            className="w-full h-14 rounded-2xl font-bold text-lg glow-primary flex items-center justify-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            {current.button}
          </AlertDialogAction>

          {/* Skip — only for notifications step on capable devices */}
          {isNotifStep && current.showSkip && (
            <button
              onClick={handleSkipNotifications}
              className="w-full h-11 rounded-2xl text-sm text-[#aaa] hover:text-[#717171] transition-colors font-medium"
            >
              {current.skipLabel}
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

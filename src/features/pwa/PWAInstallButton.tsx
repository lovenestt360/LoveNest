import React, { useState, useEffect } from "react";
import { usePWATutorial } from "./PWATutorialContext";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function PWAInstallButton() {
  const { settings, setShowModal, installPrompt } = usePWATutorial();
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    // Show tooltip 2 seconds after mount, then hide it 5 seconds later
    const timer = setTimeout(() => setShowTooltip(true), 2000);
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
      setPulse(false);
    }, 7000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!settings?.is_enabled) return null;

  const handleInstallClick = () => {
    setShowModal(true);
    // If it's Android and we have a prompt, we could also trigger it
    // But per user request, we primarily open the tutorial modal.
  };

  return (
    <div className="fixed bottom-24 left-6 z-[150] flex items-center gap-3 pointer-events-none sm:pointer-events-auto">
      {/* Tooltip */}
      <div className={cn(
        "bg-zinc-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md shadow-xl transition-all duration-500 origin-left scale-0",
        showTooltip && "scale-100"
      )}>
        Instalar App ✨
      </div>

      {/* Floating Button */}
      <button
        onClick={handleInstallClick}
        className={cn(
          "w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl pointer-events-auto transition-transform active:scale-90 hover:scale-110 relative group border-2 border-white/20",
          pulse && "animate-pulse"
        )}
      >
        <Download className="w-6 h-6 transition-transform group-hover:-translate-y-0.5" />
        
        {/* Subtle Ring Animation */}
        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20 pointer-events-none" />
      </button>
    </div>
  );
}

import React, { useState } from "react";
import { usePWATutorial } from "./PWATutorialContext";
import { X, Smartphone, Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PWATutorialModal() {
  const { showModal, setShowModal, settings, isIOS, isAndroid, markAsSeen } = usePWATutorial();
  const [activePlatform, setActivePlatform] = useState<"android" | "ios">(isIOS ? "ios" : "android");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!showModal || !settings) return null;

  const videoUrl = activePlatform === "android" ? settings.android_video_url : settings.ios_video_url;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={() => setShowModal(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[380px] bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 pb-0 flex justify-between items-start">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black tracking-tight gradient-text">Instalar App ✨</h2>
            <p className="text-[11px] text-muted-foreground font-medium">Guia rápido para teu telemóvel.</p>
          </div>
          <button 
            onClick={() => setShowModal(false)}
            className="p-1.5 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Platform Switch */}
          <div className="p-5">
            <div className="flex p-1 bg-muted/50 rounded-xl gap-1 mb-4">
              <button 
                onClick={() => setActivePlatform("android")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                  activePlatform === "android" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Android
              </button>
              <button 
                onClick={() => setActivePlatform("ios")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                  activePlatform === "ios" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                iPhone
              </button>
            </div>

            {/* Video / Content Section */}
            <div className="w-full bg-black/5 rounded-2xl overflow-hidden border border-border/50 relative">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  className="w-full max-h-[30vh] object-contain rounded-2xl" 
                  controls 
                  playsInline
                  loop
                  autoPlay
                  muted
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 min-h-[150px]">
                  <HelpCircle className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Tutorial em breve para {activePlatform === "android" ? "Android" : "iPhone"}.
                  </p>
                </div>
              )}
            </div>

            {/* Tips for the Current Platform */}
            <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Dica Rápida</h4>
              <p className="text-xs font-medium leading-relaxed">
                {activePlatform === "android" 
                  ? "No Chrome, toca nos 3 pontos e escolhe 'Instalar Aplicativo'."
                  : "No Safari, toca em 'Partilhar' e escolhe 'Adicionar ao Ecrã Principal'."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-muted/30 border-t border-border/50 flex flex-col gap-3">
          <div className="flex items-center gap-3 justify-center">
            <input 
              type="checkbox" 
              id="dont-show" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded-md accent-primary cursor-pointer"
            />
            <label htmlFor="dont-show" className="text-[11px] font-bold cursor-pointer select-none">
              Não mostrar automaticamente
            </label>
          </div>
          
          <Button 
            className="w-full h-11 rounded-xl font-black text-sm shadow-lg shadow-primary/25 gap-2"
            onClick={() => {
              if (dontShowAgain) markAsSeen();
              else setShowModal(false);
            }}
          >
            <Check className="w-4 h-4" />
            Já Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}

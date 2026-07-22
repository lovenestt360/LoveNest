import React, { useState } from "react";
import { usePWATutorial } from "./PWATutorialContext";
import { X, Download, Share, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PWATutorialModal() {
  const { showModal, setShowModal, settings, isIOS, installPrompt, markAsSeen } = usePWATutorial();
  const [activePlatform, setActivePlatform] = useState<"android" | "ios">(isIOS ? "ios" : "android");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!showModal) return null;

  const handleNativeInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setShowModal(false);
    }
  };

  const videoUrl =
    activePlatform === "android" ? settings?.android_video_url : settings?.ios_video_url;

  // Passos para iOS (instruções visuais)
  const iosSteps = [
    {
      icon: <Share className="w-5 h-5 text-primary" />,
      text: 'Toca no ícone de Partilhar na barra do Safari',
    },
    {
      icon: <Plus className="w-5 h-5 text-primary" />,
      text: 'Desliza para baixo e toca em "Adicionar ao Ecrã Principal"',
    },
    {
      icon: <Download className="w-5 h-5 text-primary" />,
      text: 'Toca em "Adicionar" no canto superior direito',
    },
  ];

  // Passos para Android sem prompt nativo
  const androidSteps = [
    {
      icon: <MoreVertical className="w-5 h-5 text-primary" />,
      text: 'Toca nos 3 pontos no canto superior do Chrome',
    },
    {
      icon: <Download className="w-5 h-5 text-primary" />,
      text: '"Instalar aplicação" ou "Adicionar ao Ecrã inicial"',
    },
  ];

  return (
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setShowModal(false)}
      />

      <div className="relative w-full sm:max-w-[360px] bg-card sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">Instalar LoveNest</h2>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Acede direto do teu ecrã inicial
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Botão nativo — Android/Desktop com prompt disponível */}
        {installPrompt && (
          <div className="px-5 pb-3">
            <button
              onClick={handleNativeInstall}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
            >
              <Download className="w-4 h-4" />
              Instalar agora — um toque
            </button>
          </div>
        )}

        {/* Tabs plataforma (só mostrar se não há prompt nativo) */}
        {!installPrompt && (
          <div className="px-5 pb-3">
            <div className="flex p-1 bg-muted/60 rounded-xl gap-1">
              {(["android", "ios"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                    activePlatform === p
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === "android" ? "Android" : "iPhone"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conteúdo: vídeo se existir, senão passos visuais */}
        {videoUrl && !installPrompt ? (
          <div className="w-full bg-black flex items-center justify-center">
            <video
              key={videoUrl}
              src={videoUrl}
              className="w-full max-h-[40vh] object-contain block"
              controls
              playsInline
              loop
              autoPlay
              muted
            />
          </div>
        ) : !installPrompt ? (
          <div className="px-5 pb-2">
            {(activePlatform === "ios" ? iosSteps : androidSteps).map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-black text-muted-foreground mr-2">{i + 1}.</span>
                  <span className="text-[12px] font-medium text-foreground">{step.text}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 flex flex-col gap-3">
          {!installPrompt && (
            <label className="flex items-center justify-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <span className="text-[11px] font-bold text-muted-foreground">
                Não mostrar automaticamente
              </span>
            </label>
          )}

          <Button
            variant="outline"
            className="w-full h-11 rounded-2xl font-bold text-sm"
            onClick={() => {
              if (dontShowAgain) markAsSeen();
              else setShowModal(false);
            }}
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

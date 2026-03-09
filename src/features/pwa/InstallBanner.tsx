import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InstallBanner() {
  const { canInstall, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Instalar DK</p>
        <p className="text-xs text-muted-foreground truncate">Acesse direto da tela inicial</p>
      </div>
      <Button size="sm" onClick={install}>
        Instalar
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { displayableUrl } from "@/lib/heic";

// Os links assinados duram 1 hora; renovamos aos 50 minutos.
const TTL = 50 * 60 * 1000;
const cache = new Map<string, { at: number; url: Promise<string | null> }>();

/** Link que o browser consegue mostrar para uma foto do bucket "memories". */
export function getPhotoUrl(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.url;
  const url = supabase.storage
    .from("memories")
    .createSignedUrl(path, 3600)
    .then(({ data }) => (data ? displayableUrl(data.signedUrl) : null))
    .catch(() => null);
  url.then((u) => { if (!u) cache.delete(path); });
  cache.set(path, { at: Date.now(), url });
  return url;
}

export function usePhotoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (path) getPhotoUrl(path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path]);
  return url;
}

/**
 * Ecrã por cima da página (capítulo, filme, partilhar): o botão "voltar" do
 * telemóvel fecha-o em vez de sair da Nossa História.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const key = Math.random().toString(36).slice(2);
    window.history.pushState({ ...(window.history.state ?? {}), lnOverlay: key }, "");
    let poppedHere = false;
    const onPop = () => {
      // Voltámos ao nosso próprio passo (fechou-se um ecrã que estava por cima deste).
      if (window.history.state?.lnOverlay === key) return;
      poppedHere = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!poppedHere && window.history.state?.lnOverlay === key) window.history.back();
    };
  }, [open]);
}

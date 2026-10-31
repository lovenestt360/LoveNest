import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { displayableUrl } from "@/lib/heic";

/**
 * Ficheiros de buckets privados (chat-media, photos) abrem por links assinados.
 * As linhas antigas guardam o URL público completo; este helper aceita esse
 * URL, um URL assinado antigo ou só o caminho, e devolve um link que funciona
 * com o bucket privado. URLs blob:/data: (pré-visualização local) passam tal
 * como estão.
 */

const TTL_S = 3600;
const cache = new Map<string, { url: string; until: number }>();
const inflight = new Map<string, Promise<string | null>>();

/** O caminho do objeto dentro do bucket, ou null se o valor não for deste bucket. */
export function storagePath(bucket: string, value: string | null | undefined): string | null {
  if (!value || value.startsWith("blob:") || value.startsWith("data:")) return null;
  for (const kind of ["public", "sign"]) {
    const marker = `/storage/v1/object/${kind}/${bucket}/`;
    const i = value.indexOf(marker);
    if (i !== -1) return decodeURIComponent(value.slice(i + marker.length).split("?")[0]);
  }
  // Só o caminho ("<user>/123.webm", "capsules/x.jpg"); "pending" e afins não contam.
  return !/^https?:/i.test(value) && value.includes("/") ? value : null;
}

/** Link assinado (com cache) para um ficheiro do bucket; devolve o valor original se não for do bucket. */
export async function signedMediaUrl(bucket: string, value: string | null | undefined): Promise<string | null> {
  const path = storagePath(bucket, value);
  if (!path) return value ?? null;
  const key = `${bucket}/${path}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.url;
  let p = inflight.get(key);
  if (!p) {
    p = supabase.storage.from(bucket).createSignedUrl(path, TTL_S).then(async ({ data }) => {
      inflight.delete(key);
      if (!data?.signedUrl) return null;
      // Fotos HEIC antigas viram um blob: JPEG (o Chrome não as mostra).
      const url = await displayableUrl(data.signedUrl);
      // Renova uns minutos antes de expirar.
      cache.set(key, { url, until: Date.now() + (TTL_S - 300) * 1000 });
      return url;
    }, () => { inflight.delete(key); return null; });
    inflight.set(key, p);
  }
  return p;
}

/** Versão em hook: null enquanto o link é pedido. */
export function useSignedMedia(bucket: string, value: string | null | undefined): string | null {
  const direct = storagePath(bucket, value) ? null : value ?? null;
  const [url, setUrl] = useState<string | null>(() => {
    const path = storagePath(bucket, value);
    const hit = path ? cache.get(`${bucket}/${path}`) : undefined;
    return hit && hit.until > Date.now() ? hit.url : null;
  });

  useEffect(() => {
    if (!storagePath(bucket, value)) return;
    let alive = true;
    signedMediaUrl(bucket, value).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [bucket, value]);

  return direct ?? url;
}

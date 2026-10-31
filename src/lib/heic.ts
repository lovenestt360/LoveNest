/**
 * Fotos HEIC/HEIF (o formato "alta eficiência" das câmaras dos telemóveis)
 * não abrem no Chrome do Android nem no Windows. Convertem-se para JPEG antes
 * de guardar; as que já estão guardadas convertem-se na hora de mostrar.
 *
 * A conversão é feita no servidor (/api/heic): no telemóvel o libheif em JS
 * falha por falta de memória ou demora demasiado. Só se o servidor falhar é
 * que se tenta no browser (o conversor, ~3 MB, só é descarregado aí).
 */
import { supabase } from "@/integrations/supabase/client";

const HEIC_EXT = /\.(heic|heif)$/i;
/** Limite do corpo de uma Vercel Function (4,5 MB), com margem. */
const SERVER_MAX_BYTES = 4_300_000;

export function isHeicFile(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || HEIC_EXT.test(file.name);
}

/** O URL aponta para um ficheiro HEIC (ignora a query do link assinado). */
export function isHeicUrl(url: string | null | undefined): boolean {
  return !!url && HEIC_EXT.test(url.split("?")[0]);
}

async function convertOnServer(blob: Blob): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || blob.size > SERVER_MAX_BYTES) throw new Error("heic: sem servidor");
  const r = await fetch("/api/heic", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/heic" },
    body: blob,
  });
  if (!r.ok) throw new Error(`heic: ${r.status}`);
  return r.blob();
}

async function convertInBrowser(blob: Blob): Promise<Blob> {
  const { heicTo } = await import("heic-to/csp");
  return heicTo({ blob, type: "image/jpeg", quality: 0.85 });
}

const toJpeg = (blob: Blob) => convertOnServer(blob).catch(() => convertInBrowser(blob));

/** Devolve o ficheiro tal como está, ou uma cópia JPEG se for HEIC. */
export async function toJpegIfHeic(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;
  const jpeg = await toJpeg(file);
  return new File([jpeg], file.name.replace(HEIC_EXT, "") + ".jpg", { type: "image/jpeg" });
}

const converted = new Map<string, Promise<string>>();

/**
 * URL que o browser consegue mostrar: o próprio, ou um blob: JPEG se for HEIC.
 * A conversão é feita uma vez por ficheiro (a chave ignora o token assinado).
 */
export function displayableUrl(url: string): Promise<string> {
  if (!isHeicUrl(url)) return Promise.resolve(url);
  const key = url.split("?")[0];
  let p = converted.get(key);
  if (!p) {
    p = (async () => {
      const blob = await (await fetch(url)).blob();
      return URL.createObjectURL(await toJpeg(blob));
    })();
    p.catch(() => converted.delete(key));
    converted.set(key, p);
  }
  return p.catch(() => url);
}

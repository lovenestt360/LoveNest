/**
 * Fotos HEIC/HEIF (o formato "alta eficiência" das câmaras dos telemóveis)
 * não abrem no Chrome do Android nem no Windows. Convertem-se para JPEG antes
 * de guardar; as que já estão guardadas convertem-se na hora de mostrar.
 * O conversor (libheif, ~3 MB) só é descarregado quando aparece uma HEIC.
 */

const HEIC_EXT = /\.(heic|heif)$/i;

const loadConverter = () => import("heic-to/csp").then((m) => m.heicTo);

export function isHeicFile(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || HEIC_EXT.test(file.name);
}

/** Devolve o ficheiro tal como está, ou uma cópia JPEG se for HEIC. */
export async function toJpegIfHeic(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;
  const heicTo = await loadConverter();
  const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.88 });
  return new File([jpeg], file.name.replace(HEIC_EXT, "") + ".jpg", { type: "image/jpeg" });
}

/** O URL aponta para um ficheiro HEIC (ignora a query do link assinado). */
export function isHeicUrl(url: string | null | undefined): boolean {
  return !!url && HEIC_EXT.test(url.split("?")[0]);
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
      const heicTo = await loadConverter();
      const jpeg = await heicTo({ blob, type: "image/jpeg", quality: 0.85 });
      return URL.createObjectURL(jpeg);
    })();
    p.catch(() => converted.delete(key));
    converted.set(key, p);
  }
  return p.catch(() => url);
}

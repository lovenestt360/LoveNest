import { supabase } from "@/integrations/supabase/client";

const PUBLIC_MARKER = "/storage/v1/object/public/receipts/";
const SIGNED_MARKER = "/storage/v1/object/sign/receipts/";

export function receiptObjectPath(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const value = ref.trim();
  if (!value) return null;

  for (const marker of [PUBLIC_MARKER, SIGNED_MARKER]) {
    const index = value.indexOf(marker);
    if (index >= 0) {
      const raw = value.slice(index + marker.length).split("?")[0];
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }

  // New receipts are stored as a private object path, not a public URL.
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, "");
  return null;
}

export async function getReceiptSignedUrl(ref: string, expiresIn = 120): Promise<string> {
  const path = receiptObjectPath(ref);
  if (!path) throw new Error("Referência de comprovativo inválida.");

  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Não foi possível abrir o comprovativo.");
  }
  return data.signedUrl;
}

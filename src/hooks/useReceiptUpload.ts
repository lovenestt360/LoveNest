import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Porta única de upload de comprovativo. O valor persistido é o caminho do
// objecto no bucket privado "receipts", nunca uma URL pública.
export function useReceiptUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [proofRef, setProofRef] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const clearPreview = (value: string | null) => {
    if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
  };

  const select = async (selected: File, buildFileName: (file: File) => string) => {
    clearPreview(preview);
    setFile(selected);
    setPreview(selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null);
    setProofRef(null);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entra novamente.");

      const suffix = buildFileName(selected).replace(/^\/+/, "");
      const objectPath = `${user.id}/${suffix}`;

      const { error } = await supabase.storage
        .from("receipts")
        .upload(objectPath, selected, {
          contentType: selected.type || "application/octet-stream",
          upsert: false,
        });
      if (error) throw error;

      setProofRef(objectPath);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar comprovativo", description: err.message });
      setFile(null);
      clearPreview(preview);
      setPreview(null);
      setProofRef(null);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    clearPreview(preview);
    setFile(null);
    setPreview(null);
    setProofRef(null);
  };

  return { file, preview, proofRef, uploading, select, reset };
}

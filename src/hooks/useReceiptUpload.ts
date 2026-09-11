import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Porta única de upload de comprovativo — partilhada entre Subscription.tsx
// (subscrição) e PurchaseSection.tsx (livros da Biblioteca), que faziam
// praticamente a mesma coisa com pequenas variações.
//
// Upload logo que o ficheiro é escolhido, não só no submit: reduz o tempo
// em que o ficheiro só existe em memória local — um telemóvel pode
// descarregar a app em segundo plano enquanto a galeria/câmara está
// aberta, perdendo a referência ao ficheiro antes do utilizador confirmar.
export function useReceiptUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const select = async (selected: File, buildFileName: (file: File) => string) => {
    setFile(selected);
    setPreview(selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null);
    setProofUrl(null);
    setUploading(true);
    try {
      const fileName = buildFileName(selected);
      const { error } = await supabase.storage
        .from("receipts")
        .upload(fileName, selected, { contentType: selected.type || "image/jpeg", upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("receipts").getPublicUrl(fileName);
      setProofUrl(data.publicUrl);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar comprovativo", description: err.message });
      setFile(null);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setProofUrl(null);
  };

  return { file, preview, proofUrl, uploading, select, reset };
}

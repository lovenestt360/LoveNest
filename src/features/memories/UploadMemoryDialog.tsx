import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  spaceId: string | null;
  userId: string;
  onUploaded: () => void;
}

export function UploadMemoryDialog({ open, onOpenChange, spaceId, userId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (spaceId) {
      console.log("MemoryDialog READY: spaceId obtained", spaceId);
      setIsReady(true);
    }
  }, [spaceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setTakenOn("");
  };

  const handleSave = async () => {
    if (!file || !userId) {
      toast({ title: "Dados em falta", description: "Não foi possível identificar o teu utilizador ou ficheiro.", variant: "destructive" });
      return;
    }

    if (!isReady) {
      console.warn("MemoryDialog: Tentativa de guardar antes do sistema estar pronto.");
      return;
    }

    let sp = spaceId;
    if (!sp && userId) {
      const { data: member } = await supabase
        .from('members')
        .select('couple_space_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      sp = member?.couple_space_id;
    }

    if (!sp) {
      console.error("CRITICAL: couple_space_id ainda null nas Memórias", userId);
      toast({ title: "Dados em falta", description: "Não foi possível identificar a tua casa.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${sp}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("photos").insert({
        couple_space_id: sp,
        uploaded_by: userId,
        file_path: path,
        caption: caption.trim() || null,
        taken_on: takenOn || null,
      });

      if (insertErr) throw insertErr;

      toast({ title: "📸 Memória guardada!" });

      // Notificação e lógica de streak removidas para purga total
      if (sp) {
        notifyPartner({
          couple_space_id: sp,
          title: "📸 Nova memória",
          body: caption.trim() || "Nova foto adicionada",
          url: "/memorias",
          type: "memorias",
        });
      }
      reset();
      onOpenChange(false);
      onUploaded();
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md p-6 rounded-3xl border border-[#f0f0f0] bg-white shadow-xl animate-in fade-in zoom-in duration-200">
        <DialogHeader className="text-center pb-1">
          <DialogTitle className="text-xl font-semibold tracking-tight text-center w-full">Nova Memória</DialogTitle>
          <DialogDescription className="text-center w-full text-[13px] text-[#717171]">Regista este momento especial no vosso ninho.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl shadow-sm">
              <img src={preview} alt="Preview" className="w-full h-56 object-cover" />
              <button
                className="absolute top-2.5 right-2.5 rounded-full bg-white/90 backdrop-blur shadow px-3 py-1 text-xs font-semibold text-foreground border border-[#f0f0f0]"
                onClick={() => { setFile(null); setPreview(null); }}
              >
                Trocar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#e0e0e0] bg-[#fafafa] p-10 active:scale-[0.98] transition-all"
              onClick={() => inputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400">
                <ImagePlus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold text-foreground block">Escolher foto da galeria</span>
                <span className="text-[11px] text-[#aaa] mt-0.5 block">JPG, PNG, WEBP</span>
              </div>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <div className="bg-white border border-[#f0f0f0] rounded-2xl divide-y divide-[#f0f0f0]">
            <div className="p-4 space-y-1">
              <Label className="text-[11px] font-semibold text-[#717171]">Legenda</Label>
              <Textarea
                rows={2}
                placeholder="O que aconteceu neste momento..."
                className="resize-none border-none bg-transparent focus-visible:ring-0 p-0 text-sm placeholder:text-[#c0c0c0]"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="p-4 space-y-1">
              <Label className="text-[11px] font-semibold text-[#717171]">Data do momento</Label>
              <Input
                type="date"
                className="bg-transparent border-none focus-visible:ring-0 p-0 h-auto text-sm cursor-pointer"
                value={takenOn}
                onChange={(e) => setTakenOn(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full h-12 rounded-2xl font-semibold text-sm bg-rose-500 hover:bg-rose-600 text-white border-0 shadow-sm transition-all"
            disabled={!file || !isReady || uploading}
            onClick={handleSave}
          >
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A guardar...</> : "Guardar Memória"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

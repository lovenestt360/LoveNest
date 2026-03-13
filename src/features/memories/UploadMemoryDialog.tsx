import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { useLoveStreak } from "@/hooks/useLoveStreak";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus } from "lucide-react";
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
  const { recordInteraction } = useLoveStreak();
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!file || !spaceId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${spaceId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("photos").insert({
        couple_space_id: spaceId,
        uploaded_by: userId,
        file_path: path,
        caption: caption.trim() || null,
        taken_on: takenOn || null,
      });

      if (insertErr) throw insertErr;

      toast({ title: "📸 Memória guardada!" });
      if (spaceId) {
        notifyPartner({
          couple_space_id: spaceId,
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar memória</DialogTitle>
          <DialogDescription>Escolhe uma foto e adiciona uma legenda.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full rounded-lg object-cover max-h-56" />
              <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => { setFile(null); setPreview(null); }}>
                Trocar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-muted-foreground hover:border-primary/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm">Escolher foto</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <div className="space-y-2">
            <Label>Legenda</Label>
            <Textarea rows={2} placeholder="Opcional..." value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} />
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
          </div>

          <Button className="w-full" disabled={!file || uploading} onClick={handleSave}>
            {uploading ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

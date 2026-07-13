import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { awardLovePoints } from "@/lib/lovePoints";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  spaceId: string | null;
  userId: string;
  onUploaded: () => void;
}

export function UploadMemorySheet({ open, onClose, spaceId, userId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setTakenOn("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!file || !userId || !spaceId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${spaceId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("memories").upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from("photos").insert({
        couple_space_id: spaceId,
        uploaded_by: userId,
        file_path: path,
        caption: caption.trim() || null,
        taken_on: takenOn || null,
      });
      if (insertErr) throw insertErr;
      awardLovePoints(spaceId, 5, "memoria", "Nova memória guardada", userId);
      notifyPartner({
        couple_space_id: spaceId,
        title: "Nova memória",
        body: caption.trim() || "Uma nova foto foi adicionada",
        url: "/memorias",
        type: "memorias",
      });
      toast({ title: "Memória guardada" });
      reset();
      onClose();
      onUploaded();
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-sm font-bold text-foreground">Nova memória</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!file || uploading}
          className="text-sm font-semibold text-rose-500 disabled:opacity-30 transition-opacity min-w-[52px] text-right"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-auto" /> : "Guardar"}
        </button>
      </div>

      {/* Photo picker or preview */}
      {!preview ? (
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center gap-5 px-8 active:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center">
            <ImagePlus className="w-9 h-9 text-rose-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-foreground">Escolher fotografia</p>
            <p className="text-sm text-muted-foreground">Toca para escolher da galeria</p>
          </div>
        </button>
      ) : (
        <>
          {/* Large preview */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
            <button
              type="button"
              className="absolute top-3 right-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-semibold"
              onClick={() => { setFile(null); setPreview(null); }}
            >
              Trocar
            </button>
          </div>

          {/* Form fields */}
          <div className="px-4 py-4 space-y-2 shrink-0 border-t border-border bg-card">
            <div className="bg-muted rounded-2xl divide-y divide-border/50">
              <div className="px-4 py-3">
                <input
                  type="text"
                  placeholder="Adiciona uma legenda..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={300}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                  Data do momento
                </span>
                <input
                  type="date"
                  value={takenOn}
                  onChange={(e) => setTakenOn(e.target.value)}
                  className="bg-transparent text-sm text-foreground text-right outline-none min-w-0"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyPartner } from "@/lib/notifyPartner";
import { useLoveStreak } from "@/hooks/useLoveStreak";
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
  // Removed useLoveStreak for daily_activity
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

      // Registrar interação na daily_activity (Padrão Unificado v12.8)
      if (!userId) return;
      let finalSp = sp;

      if (!finalSp && userId) {
        console.log("MemoryUpload: spaceId nulo, tentando fallback via members...");
        const { data: member } = await supabase
          .from('members')
          .select('couple_space_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        finalSp = member?.couple_space_id;
      }

      if (!finalSp) {
        console.error("CRITICAL: MemoryUpload sem couple_space_id", userId);
        return;
      }

      const { error: actErr } = await (supabase as any).from('daily_activity').insert({
        couple_space_id: finalSp,
        user_id: userId,
        type: "memory_upload"
      });

      if (actErr) {
        console.error("ACTIVITY ERROR (MemoryUpload):", actErr);
      } else {
        console.log("ACTIVITY OK (MemoryUpload): memory_upload");
        window.dispatchEvent(new CustomEvent("refetch-streak"));
      }
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
      <DialogContent className="max-w-md p-6 rounded-[2rem] border-none bg-background/80 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-300">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-black tracking-tight text-center w-full">Cria uma Memória ✨</DialogTitle>
          <DialogDescription className="text-center w-full font-medium text-muted-foreground">Regista este momento especial no vosso ninho.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {preview ? (
            <div className="relative group overflow-hidden rounded-3xl shadow-lg ring-1 ring-border/50 transition-all duration-500 hover:ring-primary/30">
              <img src={preview} alt="Preview" className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur shadow-lg hover:bg-white transition-all font-bold"
                onClick={() => { setFile(null); setPreview(null); }}
              >
                Trocar Foto
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="group flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-primary/20 p-12 text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 bg-muted/30"
              onClick={() => inputRef.current?.click()}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110 duration-300">
                <ImagePlus className="h-7 w-7" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold block text-foreground">Escolher foto da galeria</span>
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Formatos: JPG, PNG, WEBP</span>
              </div>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <div className="space-y-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">O que aconteceu?</Label>
              <Textarea 
                rows={2} 
                placeholder="Escreve uma legenda para esta memória..." 
                className="resize-none border-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 p-0 text-sm font-medium" 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)} 
                maxLength={300} 
              />
            </div>

            <div className="h-px bg-border/50" />

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data do Momento</Label>
              <div className="relative">
                <Input 
                  type="date" 
                  className="bg-transparent border-none focus-visible:ring-0 p-0 h-auto font-bold text-sm cursor-pointer" 
                  value={takenOn} 
                  onChange={(e) => setTakenOn(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <Button 
            className="w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" 
            disabled={!file || !isReady || uploading} 
            onClick={handleSave}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A Guardar...
              </>
            ) : (
              "Guardar Memória 📸"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

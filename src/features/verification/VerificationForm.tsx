import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, ShieldCheck, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  currentStatus: "unverified" | "pending" | "verified" | "rejected";
  onStatusChange: () => void;
  adminNotes?: string | null;
}

export function VerificationForm({ userId, currentStatus, onStatusChange, adminNotes }: Props) {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [idNumber, setIdNumber] = useState("");
  const [documentType, setDocumentType] = useState<"bi" | "passport">("bi");
  const [fileFront, setFileFront] = useState<File | null>(null);
  const [fileBack, setFileBack] = useState<File | null>(null);
  const [previewFront, setPreviewFront] = useState<string | null>(null);
  const [previewBack, setPreviewBack] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputFrontRef = useRef<HTMLInputElement>(null);
  const fileInputBackRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "Ficheiro muito grande", description: "O limite é de 10MB.", variant: "destructive" });
      return;
    }
    
    if (side === "front") {
      setFileFront(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewFront(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setFileBack(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewBack(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async () => {
    if (!fileFront || !fullName || !idNumber || !age) {
      toast({ title: "Campos em falta", description: "Por favor preencha todos os campos e anexe o documento.", variant: "destructive" });
      return;
    }

    if (documentType === "bi" && !fileBack) {
      toast({ title: "Verso em falta", description: "O BI requer a foto da frente e do verso.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // 1. Upload Front Document
      const fileExtFront = fileFront.name.split('.').pop();
      const pathFront = `${userId}/${crypto.randomUUID()}_front.${fileExtFront}`;
      
      const { error: uploadFrontError } = await supabase.storage
        .from("identity-documents")
        .upload(pathFront, fileFront);

      if (uploadFrontError) throw uploadFrontError;

      // 2. Upload Back Document (if BI)
      let pathBack = null;
      if (documentType === "bi" && fileBack) {
        const fileExtBack = fileBack.name.split('.').pop();
        pathBack = `${userId}/${crypto.randomUUID()}_back.${fileExtBack}`;
        
        const { error: uploadBackError } = await supabase.storage
          .from("identity-documents")
          .upload(pathBack, fileBack);

        if (uploadBackError) throw uploadBackError;
      }

      // 3. Create Verification Record
      const { error: dbError } = await supabase.from("identity_verifications" as any).insert({
        user_id: userId,
        full_name: fullName,
        age: parseInt(age),
        id_number: idNumber,
        document_type: documentType,
        document_url: pathFront,
        document_back_url: pathBack,
        status: 'pending'
      } as any);

      if (dbError) throw dbError;

      // 4. Update Profile Status
      await supabase.from("profiles").update({ verification_status: 'pending' }).eq("user_id", userId);

      toast({ title: "Submetido com sucesso! 🚀", description: "A tua verificação está agora em análise pela equipa." });
      onStatusChange();
    } catch (err: any) {
      toast({ title: "Erro na submissão", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (currentStatus === "verified") {
    return (
      <div className="glass-card p-8 flex flex-col items-center text-center gap-4 border-emerald-500/20 bg-emerald-500/[0.02]">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">Conta Verificada ✅</h3>
          <p className="text-sm text-muted-foreground font-medium mt-1">Obrigado por ajudares a manter o LoveNest seguro!</p>
        </div>
      </div>
    );
  }

  if (currentStatus === "pending") {
    return (
      <div className="glass-card p-8 flex flex-col items-center text-center gap-4 border-amber-500/20 bg-amber-500/[0.02]">
        <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
        <div>
          <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">Em Análise ⏳</h3>
          <p className="text-sm text-muted-foreground font-medium mt-1">Estamos a validar os teus documentos. Receberás uma notificação em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {currentStatus === "rejected" && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-destructive">Verificação Recusada</p>
            <p className="text-destructive/80 mt-0.5">{adminNotes || "Motivo não especificado. Por favor tente novamente com uma foto mais legível."}</p>
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold text-sm">Nome Completo (como no BI)</Label>
            <Input 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="Ex: João Silva Santos"
              className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold text-sm">Idade</Label>
              <Input 
                type="number" 
                value={age} 
                onChange={e => setAge(e.target.value)} 
                placeholder="Ex: 25"
                className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm">Nº do Documento</Label>
              <Input 
                value={idNumber} 
                onChange={e => setIdNumber(e.target.value)} 
                placeholder="Ex: 12345678"
                className="h-12 bg-white dark:bg-white/5 border border-border rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="font-bold text-sm block">Tipo de Documento</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDocumentType("bi")}
              className={cn(
                "h-12 rounded-xl border-2 font-bold text-sm transition-all",
                documentType === "bi" ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/20"
              )}
            >
              Bilhete (BI)
            </button>
            <button
              onClick={() => setDocumentType("passport")}
              className={cn(
                "h-12 rounded-xl border-2 font-bold text-sm transition-all",
                documentType === "passport" ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/20"
              )}
            >
              Passaporte
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FRONT DOCUMENT */}
          <div className="space-y-3">
            <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">
              {documentType === "bi" ? "Frente do BI" : "Página do Passaporte"}
            </Label>
            <div 
              onClick={() => fileInputFrontRef.current?.click()}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.02] transition-all hover:bg-primary/[0.04] hover:border-primary/40"
            >
              {previewFront ? (
                <div className="p-2">
                  <div className="relative h-40 w-full rounded-xl overflow-hidden shadow-lg">
                    <img src={previewFront} alt="Front Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white h-8 w-8" />
                    </div>
                  </div>
                  <p className="text-[10px] text-center mt-2 text-muted-foreground font-bold uppercase tracking-widest">Alterar Frente</p>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="h-6 w-6 text-primary" />
                  <p className="text-xs font-bold text-foreground text-center px-4">Tirar foto da frente</p>
                </div>
              )}
            </div>
            <input ref={fileInputFrontRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "front")} />
          </div>

          {/* BACK DOCUMENT (Only for BI) */}
          {documentType === "bi" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Verso do BI</Label>
              <div 
                onClick={() => fileInputBackRef.current?.click()}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.02] transition-all hover:bg-primary/[0.04] hover:border-primary/40"
              >
                {previewBack ? (
                  <div className="p-2">
                    <div className="relative h-40 w-full rounded-xl overflow-hidden shadow-lg">
                      <img src={previewBack} alt="Back Preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white h-8 w-8" />
                      </div>
                    </div>
                    <p className="text-[10px] text-center mt-2 text-muted-foreground font-bold uppercase tracking-widest">Alterar Verso</p>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="h-6 w-6 text-primary" />
                    <p className="text-xs font-bold text-foreground text-center px-4">Tirar foto do verso</p>
                  </div>
                )}
              </div>
              <input ref={fileInputBackRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "back")} />
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/30 rounded-2xl flex gap-3 border border-border/50">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
            <span className="font-bold text-foreground">Privacidade Garantida:</span> Os teus documentos são encriptados e armazenados num servidor privado. Apenas moderadores autorizados podem vê-los para o processo de verificação.
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={uploading || !fileFront || (documentType === "bi" && !fileBack)} 
          className="w-full h-14 rounded-2xl font-black text-lg glow-primary flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
        >
          {uploading ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> A Enviar...</>
          ) : (
            <><ShieldCheck className="h-6 w-6" /> Enviar para Verificação</>
          )}
        </Button>
      </div>
    </div>
  );
}

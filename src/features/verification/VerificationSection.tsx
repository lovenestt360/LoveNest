import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VerificationForm } from "./VerificationForm";
import { Shield, ShieldCheck, ShieldAlert, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
}

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export function VerificationSection({ userId }: Props) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // 1. Check Profile status
      const { data: profile } = await supabase.from("profiles").select("verification_status").eq("user_id", userId).maybeSingle();
      
      if (profile) {
        setStatus((profile.verification_status as VerificationStatus) || "unverified");
      } else {
        setStatus("unverified");
      }

      // 2. Fetch admin notes if rejected
      if (profile?.verification_status === "rejected" || profile?.verification_status === "pending") {
        const { data: verification } = await supabase
          .from("identity_verifications" as any)
          .select("admin_notes, status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (verification) {
          setAdminNotes(verification.admin_notes);
        }
      }
    } catch (err) {
      console.error("Error fetching verification status:", err);
      setStatus("unverified");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const statusConfig = {
    unverified: {
      title: "Verificação de Identidade",
      description: "Aumenta a tua segurança e confiança na plataforma.",
      icon: <Shield className="h-8 w-8 text-rose-500" />,
      color: "border-rose-500/10 bg-rose-500/[0.02]",
      badge: "Indisponível",
      badgeColor: "bg-rose-500/10 text-rose-600"
    },
    pending: {
      title: "Em Análise ⏳",
      description: "Estamos a validar os teus dados.",
      icon: <Shield className="h-8 w-8 text-blue-500" />,
      color: "border-blue-500/10 bg-blue-500/[0.02]",
      badge: "Análise",
      badgeColor: "bg-blue-500/10 text-blue-600"
    },
    verified: {
      title: "Conta Verificada ✅",
      description: "Podes desfrutar do LoveNest com total confiança.",
      icon: <ShieldCheck className="h-8 w-8 text-emerald-500" />,
      color: "border-emerald-500/10 bg-emerald-500/[0.02]",
      badge: "Verificado",
      badgeColor: "bg-emerald-500/10 text-emerald-600"
    },
    rejected: {
      title: "Recusada ⚠️",
      description: "A tua verificação foi recusada.",
      icon: <ShieldAlert className="h-8 w-8 text-amber-500" />,
      color: "border-amber-500/10 bg-amber-500/[0.02]",
      badge: "Recusado",
      badgeColor: "bg-amber-500/10 text-amber-600"
    }
  };

  const current = statusConfig[status || "unverified"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className={cn("glass-card p-6 flex items-center gap-4 border transition-all duration-500", current.color)}>
        <div className="h-14 w-14 rounded-2xl bg-white/50 dark:bg-white/5 flex items-center justify-center shadow-inner">
          {current.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm uppercase tracking-tight">{current.title}</h3>
            <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider", current.badgeColor)}>
              {current.badge}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">{current.description}</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <header className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm">Porquê verificar?</h4>
        </header>
        <div className="grid gap-3 pt-2">
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">1</div>
            <p className="text-xs text-muted-foreground">Evita fraudes e perfis falsos na comunidade.</p>
          </div>
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">2</div>
            <p className="text-xs text-muted-foreground">Garante que o LoveNest seja um ambiente seguro para casais.</p>
          </div>
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">3</div>
            <p className="text-xs text-muted-foreground">Desbloqueia selos de confiança para ambos no casal.</p>
          </div>
        </div>
      </div>

      <VerificationForm 
        userId={userId} 
        currentStatus={status || "unverified"} 
        onStatusChange={fetchStatus} 
        adminNotes={adminNotes}
      />
    </div>
  );
}

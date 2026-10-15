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
      const { data: profile } = await (supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle() as any);
      
      if (profile) {
        setStatus((profile.verification_status as VerificationStatus) || "unverified");
      } else {
        setStatus("unverified");
      }

      // 2. Fetch admin notes if rejected
      if (profile?.verification_status === "rejected" || profile?.verification_status === "pending") {
        const { data: verification } = await supabase
          .from("identity_verifications")
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
      icon: <Shield className="h-7 w-7 text-[#0B1324] dark:text-foreground" strokeWidth={1.8} />,
      color: "",
      badge: "Por verificar",
      badgeColor: "bg-[#F1EEEA] text-[#3A4150] dark:bg-muted dark:text-muted-foreground"
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
      title: "Recusada",
      description: "A tua verificação foi recusada.",
      icon: <ShieldAlert className="h-8 w-8 text-orange-500" />,
      color: "border-orange-400/10 bg-orange-400/[0.02]",
      badge: "Recusado",
      badgeColor: "bg-orange-400/10 text-orange-500"
    }
  };

  const current = statusConfig[status || "unverified"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className={cn("glass-card p-6 flex items-center gap-4 border transition-all duration-500", current.color)}>
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#F4F2EF] dark:bg-white/5 flex items-center justify-center">
          {current.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{current.title}</h3>
            <span className={cn("shrink-0 whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full", current.badgeColor)}>
              {current.badge}
            </span>
          </div>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{current.description}</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <header className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Info className="h-4 w-4 text-[#0B1324] dark:text-foreground" />
          <h4 className="text-[15px] font-semibold">Porquê verificar?</h4>
        </header>
        <div className="grid gap-3 pt-2">
          <div className="flex gap-3">
            <div className="h-5 w-5 shrink-0 rounded-full bg-[#F1EEEA] dark:bg-muted flex items-center justify-center text-[10px] font-bold text-[#0B1324] dark:text-foreground">1</div>
            <p className="text-xs text-muted-foreground">Evita fraudes e perfis falsos na comunidade.</p>
          </div>
          <div className="flex gap-3">
            <div className="h-5 w-5 shrink-0 rounded-full bg-[#F1EEEA] dark:bg-muted flex items-center justify-center text-[10px] font-bold text-[#0B1324] dark:text-foreground">2</div>
            <p className="text-xs text-muted-foreground">Garante que o LoveNest seja um ambiente seguro para casais.</p>
          </div>
          <div className="flex gap-3">
            <div className="h-5 w-5 shrink-0 rounded-full bg-[#F1EEEA] dark:bg-muted flex items-center justify-center text-[10px] font-bold text-[#0B1324] dark:text-foreground">3</div>
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

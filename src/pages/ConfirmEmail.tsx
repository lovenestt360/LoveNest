import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ConfirmEmail() {
  const email   = localStorage.getItem("confirm_email") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // If user somehow already has a session (clicked the link), redirect to app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/casa", { replace: true });
    });

    // Also listen for auth state changes (link clicked in same browser tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        localStorage.removeItem("confirm_email");
        navigate("/casa", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin + "/casa" },
      });
      if (error) throw error;
      setResent(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 dark:bg-rose-950/30 blur-[90px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[300px] text-center space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

        {/* Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
            Verifica o teu email.
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Enviámos um link de confirmação para{" "}
            {email && <span className="font-semibold text-foreground">{email}</span>}.
            Clica no link para activares a tua conta.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/entrar")}
            className="w-full h-12 rounded-2xl bg-rose-500/90 text-white font-semibold text-[14px] active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)] flex items-center justify-center gap-2"
          >
            Já confirmei — Entrar
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {!resent ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full h-11 rounded-2xl text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
            >
              {resending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Reenviar email de confirmação
            </button>
          ) : (
            <p className="text-[12px] text-rose-400 font-medium">
              Email reenviado. Verifica a caixa de entrada.
            </p>
          )}
        </div>

        {/* Help text */}
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
          Não encontras o email? Verifica a pasta de spam ou tenta com outro endereço.
        </p>
      </div>
    </div>
  );
}

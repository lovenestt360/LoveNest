import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthScaffold } from "@/features/auth/AuthScaffold";

export default function ConfirmEmail() {
  const email = localStorage.getItem("confirm_email") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/casa", { replace: true });
    });

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
    } catch (error: any) {
      toast({ variant: "destructive", title: "Não foi possível reenviar", description: error.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Só falta confirmar"
      title="Vê o teu email."
      subtitle="O link de confirmação protege a conta antes de entrares no vosso espaço."
    >
      <div className="rounded-[1.6rem] border border-slate-900/[0.06] bg-white/80 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
          <Mail className="h-5 w-5" strokeWidth={1.7} />
        </div>

        <p className="mx-auto mt-5 max-w-sm text-[13px] leading-6 text-slate-500">
          Enviámos um link para{" "}
          {email ? (
            <span className="font-bold text-slate-700">{email}</span>
          ) : (
            "o email usado no registo"
          )}.
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={1.8} />
          <p className="text-[11px] leading-5 text-slate-500">
            Depois de confirmares, volta ao LoveNest. Se o link abrir neste dispositivo, a entrada pode acontecer automaticamente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/entrar?returning=1")}
          className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white shadow-[0_12px_30px_rgba(11,19,36,0.13)] active:scale-[0.99]"
        >
          Já confirmei
          <ArrowRight className="h-4 w-4" />
        </button>

        {!resent ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[11px] font-bold text-slate-400 transition hover:text-slate-600 disabled:opacity-40"
          >
            {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reenviar email
          </button>
        ) : (
          <p className="mt-4 text-[11px] font-semibold text-emerald-600">
            Email reenviado. Verifica também a pasta de spam.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate("/landing")}
        className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao início
      </button>
    </AuthScaffold>
  );
}

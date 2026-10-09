import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import { HeaderLink, PrimaryButton } from "@/features/auth/AuthKit";

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
      title="Só falta confirmar o teu email."
      subtitle={
        <>
          Enviámos um link para{" "}
          {email ? <span className="font-semibold text-[#0B1324]">{email}</span> : "o email que usaste no registo"}.
          Abre-o para proteger a conta antes de entrares.
        </>
      }
      headerRight={<HeaderLink onClick={() => navigate("/landing")}>Início</HeaderLink>}
      footer={
        <div className="space-y-3">
          <PrimaryButton type="button" onClick={() => navigate("/entrar?returning=1")}>
            Já confirmei
          </PrimaryButton>
          {!resent ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email}
              className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-medium text-slate-500 transition-colors hover:text-[#0B1324] disabled:opacity-40"
            >
              {resending && <Loader2 className="h-4 w-4 animate-spin" />}
              Não chegou? Reenviar email
            </button>
          ) : (
            <p className="py-2.5 text-center text-[14px] text-slate-500">
              Reenviado. Vê também a pasta de spam.
            </p>
          )}
        </div>
      }
    >
      {/* O que acontece a seguir — passos reais, por ordem. */}
      <ol className="space-y-0 border-l border-[#0B1324]/[0.1] pl-5">
        {[
          "Abre o email do LoveNest.",
          "Toca em “Confirmar email”.",
          "Se abrir neste dispositivo, entras automaticamente.",
        ].map((step, index) => (
          <li key={step} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[26px] top-[3px] flex h-[11px] w-[11px] items-center justify-center rounded-full border border-[#0B1324]/25 bg-[#F7F3EE]" />
            <p className="text-[15px] leading-[1.5] text-slate-600">
              <span className="mr-1.5 font-semibold tabular-nums text-slate-400">{index + 1}.</span>
              {step}
            </p>
          </li>
        ))}
      </ol>
    </AuthScaffold>
  );
}

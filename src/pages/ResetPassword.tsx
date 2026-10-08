import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { getPasswordError } from "@/lib/passwordPolicy";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import { cn } from "@/lib/utils";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const passwordError = getPasswordError(password);
    if (passwordError) {
      toast({ variant: "destructive", title: "Senha fraca", description: passwordError });
      return;
    }

    if (password !== confirm) {
      toast({
        variant: "destructive",
        title: "As senhas não coincidem",
        description: "Confirma que escreveste a mesma senha nos dois campos.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate("/entrar?returning=1"), 1800);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Não foi possível redefinir", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "h-[52px] rounded-[1rem] border-slate-200/80 bg-white px-4 text-[14px] shadow-none focus-visible:border-rose-300 focus-visible:ring-2 focus-visible:ring-rose-200/50";

  return (
    <AuthScaffold
      eyebrow="Segurança da conta"
      title={done ? "Senha alterada." : "Cria uma nova senha."}
      subtitle={
        done
          ? "Está tudo pronto. Vamos levar-te de volta ao login."
          : "Escolhe uma senha única para proteger o acesso ao vosso espaço."
      }
    >
      <div className="rounded-[1.6rem] border border-slate-900/[0.06] bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
        {done ? (
          <div className="py-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="mt-4 text-[14px] font-bold text-slate-700">A tua conta está pronta.</p>
            <p className="mt-1 text-[11px] text-slate-400">A redirecionar para o login…</p>
          </div>
        ) : !ready ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-rose-400" />
            <p className="mt-4 text-[12px] font-semibold text-slate-500">A verificar o link de recuperação…</p>
            <button
              type="button"
              onClick={() => navigate("/entrar?returning=1")}
              className="mt-4 text-[11px] font-bold text-rose-500"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-[12px] font-bold text-slate-600">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className={cn(fieldClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-[12px] font-bold text-slate-600">
                Confirmar senha
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repete a nova senha"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                  className={cn(fieldClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400"
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white shadow-[0_12px_30px_rgba(11,19,36,0.13)] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Guardar nova senha
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {!done && (
        <button
          type="button"
          onClick={() => navigate("/entrar?returning=1")}
          className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao login
        </button>
      )}
    </AuthScaffold>
  );
}

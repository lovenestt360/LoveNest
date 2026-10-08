import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { track } from "@vercel/analytics";
import { getPasswordError } from "@/lib/passwordPolicy";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import { cn } from "@/lib/utils";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const ref = searchParams.get("ref") || sessionStorage.getItem("lovenest_ref");
    if (ref) {
      setInviteCode(ref);
      sessionStorage.setItem("lovenest_ref", ref);
    }

    const savedName = localStorage.getItem("onboarding_name");
    if (savedName) {
      setDisplayName(savedName);
      localStorage.removeItem("onboarding_name");
    }
  }, [searchParams]);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!isValidEmail(trimmedEmail)) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Usa um email completo, por exemplo nome@gmail.com.",
      });
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      toast({ variant: "destructive", title: "Senha fraca", description: passwordError });
      return;
    }

    if (displayName.trim().length < 2) {
      toast({
        variant: "destructive",
        title: "Nome inválido",
        description: "Insere o teu nome com pelo menos 2 caracteres.",
      });
      return;
    }

    setLoading(true);
    if (inviteCode) localStorage.setItem("lovenest_ref", inviteCode);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            referred_by_code: inviteCode || undefined,
          },
          emailRedirectTo: window.location.origin + "/casa",
        },
      });
      if (error) throw error;

      if (data.session) {
        track("signup_completed", { method: "email", has_invite: !!inviteCode });
        navigate("/casa");
      } else {
        track("signup_email_confirm", { has_invite: !!inviteCode });
        localStorage.setItem("confirm_email", trimmedEmail);
        navigate("/confirmar-email");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Não foi possível criar a conta", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    if (inviteCode) localStorage.setItem("lovenest_ref", inviteCode);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/casa" },
    });

    if (error) {
      toast({ variant: "destructive", title: "Erro com Google", description: error.message });
      setGoogleLoading(false);
    }
  };

  const fieldClass =
    "h-[52px] rounded-[1rem] border-slate-200/80 bg-white px-4 text-[14px] shadow-none focus-visible:border-rose-300 focus-visible:ring-2 focus-visible:ring-rose-200/50";

  return (
    <AuthScaffold
      eyebrow="Criar o vosso espaço"
      title="Começa por ti."
      subtitle="Cria a tua conta. Depois podes convidar o teu par e construir o LoveNest juntos."
    >
      <div className="rounded-[1.6rem] border border-slate-900/[0.06] bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[1rem] border border-slate-200/80 bg-white text-[13px] font-bold text-[#0B1324] transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200/70" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            ou por email
          </span>
          <div className="h-px flex-1 bg-slate-200/70" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="signup-name" className="text-[12px] font-bold text-slate-600">
              O teu nome
            </label>
            <Input
              id="signup-name"
              autoComplete="name"
              placeholder="Como queres aparecer?"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-email" className="text-[12px] font-bold text-slate-600">
              Email
            </label>
            <Input
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="teu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="text-[12px] font-bold text-slate-600">
              Senha
            </label>
            <div className="relative">
              <Input
                id="signup-password"
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
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 active:bg-slate-100"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="px-1 text-[10px] leading-4 text-slate-400">
              Usa uma senha única. Vais poder alterá-la mais tarde.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-invite" className="text-[12px] font-bold text-slate-600">
              Código de convite <span className="font-medium text-slate-400">(opcional)</span>
            </label>
            <Input
              id="signup-invite"
              type="text"
              placeholder="Ex: AMOR2024"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              className={fieldClass}
            />
            {inviteCode && (
              <p className="px-1 text-[10px] font-semibold text-rose-500">
                O código será aplicado quando a conta for criada.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white shadow-[0_12px_30px_rgba(11,19,36,0.13)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Criar conta
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 border-t border-slate-200/70 pt-5 text-center">
          <p className="text-[12px] text-slate-400">
            Já tens conta?{" "}
            <button
              type="button"
              onClick={() => navigate("/entrar?returning=1")}
              className="font-bold text-rose-500"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/landing")}
        className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 transition hover:text-slate-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>
    </AuthScaffold>
  );
}

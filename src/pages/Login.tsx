import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@vercel/analytics";
import { AuthScaffold } from "@/features/auth/AuthScaffold";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

async function getPostLoginDestination(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.onboarding_completed ? "/casa" : "/inicio";
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [tab, setTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [forgotView, setForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const destination = await getPostLoginDestination(session.user.id);
        navigate(destination, { replace: true });
        return;
      }

      const isReturning =
        searchParams.get("returning") === "1" ||
        document.referrer.includes(window.location.hostname);

      if (!localStorage.getItem("onboarding_seen") && !isReturning) {
        navigate("/landing", { replace: true });
      }
    });
  }, [navigate, searchParams]);

  useEffect(() => {
    if (!(location.state as any)?.bounced) return;

    toast({
      variant: "destructive",
      title: "Sessão expirada",
      description: (location.state as any).bounced,
    });
    window.history.replaceState({}, document.title);
  }, [location.state, toast]);

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Usa um email completo, por exemplo nome@gmail.com.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) throw error;

      track("login_completed", { method: "password" });
      const { data: { user } } = await supabase.auth.getUser();
      const destination = user ? await getPostLoginDestination(user.id) : "/casa";
      navigate(destination);
    } catch (error: any) {
      if (error.message?.includes("Email not confirmed")) {
        localStorage.setItem("confirm_email", trimmed);
        navigate("/confirmar-email");
        return;
      }

      const message = error.message?.includes("Invalid login credentials")
        ? "Email ou senha incorretos."
        : error.message;

      toast({ variant: "destructive", title: "Não foi possível entrar", description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleMagic = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Usa um email completo, por exemplo nome@gmail.com.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin + "/inicio" },
      });
      if (error) throw error;

      track("login_magic_link_sent");
      setMagicSent(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Não foi possível enviar", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = forgotEmail.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Usa um email completo, por exemplo nome@gmail.com.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: window.location.origin + "/redefinir-senha",
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Não foi possível enviar", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/inicio",
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro com Google", description: error.message });
      setGoogleLoading(false);
    }
  };

  const fieldClass =
    "h-13 rounded-[1rem] border-slate-200/80 bg-white px-4 text-[14px] shadow-none focus-visible:border-rose-300 focus-visible:ring-2 focus-visible:ring-rose-200/50";

  return (
    <AuthScaffold
      eyebrow={forgotView ? "Recuperar acesso" : "Bem-vindo de volta"}
      title={forgotView ? "Vamos recuperar a tua conta." : "Entra no vosso espaço."}
      subtitle={
        forgotView
          ? "Indica o email da tua conta e enviamos um link seguro para redefinires a senha."
          : "Continua exatamente onde vocês deixaram a vossa história."
      }
    >
      <div className="rounded-[1.6rem] border border-slate-900/[0.06] bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
        {!forgotView && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className="flex h-13 w-full items-center justify-center gap-3 rounded-[1rem] border border-slate-200/80 bg-white text-[13px] font-bold text-[#0B1324] transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
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

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-[1rem] bg-slate-100/80 p-1">
              {(["password", "magic"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTab(option)}
                  className={cn(
                    "rounded-[0.8rem] py-2.5 text-[11px] font-bold transition",
                    tab === option
                      ? "bg-white text-[#0B1324] shadow-sm"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {option === "password" ? "Senha" : "Link por email"}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "password" && !forgotView && (
          <form onSubmit={handlePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[12px] font-bold text-slate-600">
                Email
              </label>
              <Input
                id="login-email"
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
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-[12px] font-bold text-slate-600">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotView(true);
                    setForgotSent(false);
                  }}
                  className="text-[11px] font-bold text-rose-500"
                >
                  Esqueci a senha
                </button>
              </div>

              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="A tua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
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
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white shadow-[0_12px_30px_rgba(11,19,36,0.13)] transition active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}

        {tab === "password" && forgotView && (
          forgotSent ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
                <Mail className="h-5 w-5 text-rose-400" strokeWidth={1.7} />
              </div>
              <p className="mt-4 text-[16px] font-extrabold">Link enviado.</p>
              <p className="mx-auto mt-2 max-w-xs text-[13px] leading-5 text-slate-500">
                Verifica <span className="font-bold text-slate-700">{forgotEmail}</span> e segue o link para criares uma nova senha.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotView(false);
                  setForgotSent(false);
                }}
                className="mt-5 text-[12px] font-bold text-rose-500"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <button
                type="button"
                onClick={() => setForgotView(false)}
                className="-ml-1 flex items-center gap-1 text-[11px] font-bold text-slate-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>

              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="text-[12px] font-bold text-slate-600">
                  Email da conta
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="teu@email.com"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                  className={fieldClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enviar link <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )
        )}

        {tab === "magic" && !forgotView && (
          magicSent ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <Mail className="h-5 w-5 text-indigo-400" strokeWidth={1.7} />
              </div>
              <p className="mt-4 text-[16px] font-extrabold">Vê o teu email.</p>
              <p className="mx-auto mt-2 max-w-xs text-[13px] leading-5 text-slate-500">
                Enviámos um link seguro para <span className="font-bold text-slate-700">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => setMagicSent(false)}
                className="mt-5 text-[12px] font-bold text-rose-500"
              >
                Usar outro email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagic} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="magic-email" className="text-[12px] font-bold text-slate-600">
                  Email
                </label>
                <Input
                  id="magic-email"
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

              <p className="text-[11px] leading-5 text-slate-400">
                Recebes um link de acesso. Não precisas introduzir a senha.
              </p>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enviar link <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )
        )}

        {!forgotView && (
          <div className="mt-5 border-t border-slate-200/70 pt-5 text-center">
            <p className="text-[12px] text-slate-400">
              Ainda não têm LoveNest?{" "}
              <button
                type="button"
                onClick={() => navigate("/inicio")}
                className="font-bold text-rose-500"
              >
                Criar o vosso espaço
              </button>
            </p>
          </div>
        )}
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

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowRight, ChevronLeft, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// Google "G" SVG icon — official brand colour
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [tab, setTab]             = useState<"password" | "magic">("password");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [forgotView, setForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/casa", { replace: true });
        return;
      }
      // First-time visitors see the emotional onboarding before login
      if (!localStorage.getItem("onboarding_seen")) {
        navigate("/inicio", { replace: true });
      }
    });
  }, [navigate]);

  useEffect(() => {
    if ((location.state as any)?.bounced) {
      toast({ variant: "destructive", title: "Sessão Expirada", description: (location.state as any).bounced });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      toast({ variant: "destructive", title: "Email inválido", description: "Usa um email completo, ex: nome@gmail.com" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed, password,
      });
      if (error) throw error;
      navigate("/casa");
    } catch (err: any) {
      const msg = err.message.includes("Invalid login credentials")
        ? "Email ou senha incorretos."
        : err.message;
      toast({ variant: "destructive", title: "Erro ao entrar", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      toast({ variant: "destructive", title: "Email inválido", description: "Usa um email completo, ex: nome@gmail.com" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin + "/casa" },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      toast({ variant: "destructive", title: "Email inválido", description: "Usa um email completo, ex: nome@gmail.com" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: window.location.origin + "/redefinir-senha",
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: err.message });
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
          redirectTo: window.location.origin + "/casa",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
      // Supabase redirects the browser — no manual navigation needed
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro com Google", description: err.message });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 border border-rose-100 mx-auto">
            <Heart className="h-8 w-8 text-rose-400 fill-rose-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo</h1>
            <p className="text-sm text-[#717171] mt-1">O teu espaço privado de casal</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-7 space-y-5">

          {/* Google button — CTA principal (hidden in forgot view) */}
          {!forgotView && (
            <>
              <button
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="w-full h-12 rounded-2xl border border-[#e5e5e5] bg-white text-sm font-semibold text-foreground flex items-center justify-center gap-3 hover:bg-[#f9f9f9] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {googleLoading
                  ? <Loader2 className="w-4 h-4 animate-spin text-[#717171]" />
                  : <GoogleIcon className="w-5 h-5" />
                }
                Continuar com Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#f0f0f0]" />
                <span className="text-[11px] font-medium text-[#717171]">ou</span>
                <div className="flex-1 h-px bg-[#f0f0f0]" />
              </div>

              {/* Tabs */}
              <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
                {(["password", "magic"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
                      tab === t ? "bg-white text-foreground shadow-sm" : "text-[#717171]"
                    )}
                  >
                    {t === "password" ? "Senha" : "Link Mágico"}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Password form / Forgot password */}
          {tab === "password" && !forgotView && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <Input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="teu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotView(true); setForgotSent(false); }}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    Esqueceste a senha?
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="A tua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <> Entrar <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
                }
              </button>
            </form>
          )}

          {/* Forgot password view */}
          {tab === "password" && forgotView && (
            forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-rose-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Link enviado!</p>
                  <p className="text-sm text-[#717171] mt-1">
                    Verifica o teu e-mail em <span className="font-medium text-foreground">{forgotEmail}</span> e clica no link para definir uma nova senha.
                  </p>
                </div>
                <button
                  onClick={() => { setForgotView(false); setForgotSent(false); }}
                  className="text-sm font-medium text-rose-500 hover:underline"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setForgotView(false)}
                  className="flex items-center gap-1 text-sm text-[#717171] hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                <div>
                  <p className="text-base font-semibold text-foreground">Recuperar senha</p>
                  <p className="text-sm text-[#717171] mt-0.5">Envia-mos um link para redefinires a tua senha.</p>
                </div>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">E-mail da conta</label>
                    <Input
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="teu@email.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      required
                      className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <> Enviar link <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
                    }
                  </button>
                </form>
              </div>
            )
          )}

          {/* Magic link form */}
          {tab === "magic" && (
            magicSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-rose-400 fill-rose-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Link enviado!</p>
                  <p className="text-sm text-[#717171] mt-1">
                    Verifica o teu e-mail em <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>
                <button
                  onClick={() => setMagicSent(false)}
                  className="text-sm font-medium text-rose-500 hover:underline"
                >
                  Tentar outro e-mail
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagic} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <Input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="teu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <> Enviar Link <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
                  }
                </button>
              </form>
            )
          )}

          {/* Sign up link */}
          <div className="pt-4 border-t border-[#f5f5f5] text-center">
            <p className="text-sm text-[#717171]">
              Novo por aqui?{" "}
              <button
                onClick={() => navigate("/criar-conta")}
                className="font-semibold text-rose-500 hover:underline"
              >
                Cria a tua conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

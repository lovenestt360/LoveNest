import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import { track } from "@vercel/analytics";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import {
  Field,
  FieldGroup,
  GoogleButton,
  HeaderLink,
  OrDivider,
  PasswordField,
  PrimaryButton,
  QuietLink,
  Reveal,
} from "@/features/auth/AuthKit";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

async function getPostLoginDestination(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.onboarding_completed ? "/casa" : "/inicio";
}

export default function Login() {
  const [tab, setTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const busy = loading || googleLoading;

  return (
    <AuthScaffold
      title={forgotView ? "Recuperar o acesso." : "Bem-vindos de volta."}
      subtitle={
        forgotView
          ? "Indica o email da conta. Enviamos um link seguro para criares uma nova senha."
          : "Continuem onde deixaram a vossa história."
      }
      headerRight={
        <HeaderLink onClick={() => (forgotView ? setForgotView(false) : navigate("/landing"))}>
          {forgotView ? "Cancelar" : "Voltar"}
        </HeaderLink>
      }
      footer={
        !forgotView && (
          <p className="text-center text-[14px] text-slate-500">
            Ainda não têm LoveNest?{" "}
            <QuietLink onClick={() => navigate("/inicio")}>Criar o vosso espaço</QuietLink>
          </p>
        )
      }
    >
      {/* ── Recuperar senha ── */}
      {forgotView &&
        (forgotSent ? (
          <SentNotice
            email={forgotEmail}
            text="Segue o link para criares uma nova senha. Pode demorar um minuto a chegar."
            actionLabel="Voltar ao login"
            onAction={() => {
              setForgotView(false);
              setForgotSent(false);
            }}
          />
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <FieldGroup>
              <Field
                id="forgot-email"
                label="Email da conta"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="teu@email.com"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                required
              />
            </FieldGroup>
            <PrimaryButton type="submit" disabled={loading} loading={loading}>
              Enviar link
            </PrimaryButton>
          </form>
        ))}

      {/* ── Entrar ── */}
      {!forgotView && (
        <div className="space-y-5">
          <GoogleButton onClick={handleGoogle} disabled={busy} loading={googleLoading} />
          <OrDivider />

          {tab === "password" && (
            <form onSubmit={handlePassword} className="space-y-4">
              <FieldGroup>
                <Field
                  id="login-email"
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="teu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <PasswordField
                  id="login-password"
                  label="Senha"
                  autoComplete="current-password"
                  placeholder="A tua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </FieldGroup>

              <div className="flex items-center justify-between px-1 text-[13px]">
                <button
                  type="button"
                  onClick={() => setTab("magic")}
                  className="font-medium text-slate-500 transition-colors hover:text-[#0B1324]"
                >
                  Entrar sem senha
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotView(true);
                    setForgotSent(false);
                  }}
                  className="font-medium text-slate-500 transition-colors hover:text-[#0B1324]"
                >
                  Esqueci a senha
                </button>
              </div>

              <PrimaryButton type="submit" disabled={busy} loading={loading}>
                Entrar
              </PrimaryButton>
            </form>
          )}

          {tab === "magic" &&
            (magicSent ? (
              <SentNotice
                email={email}
                text="Abre o link nesse dispositivo e entras diretamente, sem senha."
                actionLabel="Usar outro email"
                onAction={() => setMagicSent(false)}
              />
            ) : (
              <form onSubmit={handleMagic} className="space-y-4">
                <FieldGroup>
                  <Field
                    id="magic-email"
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="teu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </FieldGroup>

                <div className="flex items-center justify-between px-1 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setTab("password")}
                    className="flex items-center gap-1 font-medium text-slate-500 transition-colors hover:text-[#0B1324]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    Usar senha
                  </button>
                  <span className="text-slate-400">Recebes um link de acesso</span>
                </div>

                <PrimaryButton type="submit" disabled={busy} loading={loading}>
                  Enviar link
                </PrimaryButton>
              </form>
            ))}
        </div>
      )}
    </AuthScaffold>
  );
}

function SentNotice({
  email,
  text,
  actionLabel,
  onAction,
}: {
  email: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Reveal>
      <div className="rounded-2xl border border-[#0B1324]/[0.08] bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.7} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold">Enviámos um link.</p>
            <p className="mt-1 break-words text-[14px] leading-[1.5] text-slate-500">
              Verifica <span className="font-semibold text-[#0B1324]">{email}</span>. {text}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-4 px-1 text-[14px]">
        <QuietLink onClick={onAction}>{actionLabel}</QuietLink>
      </p>
    </Reveal>
  );
}

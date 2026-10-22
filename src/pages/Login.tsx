import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { track } from "@vercel/analytics";
import { Guardian, type GuardianHandle } from "@/features/entry/Guardian";
import { BackButton, EmailChip, EntryScreen, Envelope, GoogleIcon, ResendLink, WebmailButton } from "@/features/entry/EntryKit";
import { isValidEmail, prefersReducedMotion } from "@/features/entry/entryUtils";

const LAST_NAME_KEY = "lovenest_last_name";

async function getPostLoginDestination(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed, display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.display_name) localStorage.setItem(LAST_NAME_KEY, data.display_name.split(" ")[0]);
  return data?.onboarding_completed ? "/casa" : "/inicio";
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

type View = "password" | "magic" | "forgot";

export default function Login() {
  const [view, setView] = useState<View>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const pet = useRef<GuardianHandle>(null);
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
    const bounced = (location.state as { bounced?: string } | null)?.bounced;
    if (!bounced) return;

    toast({
      variant: "destructive",
      title: "Sessão expirada",
      description: bounced,
    });
    window.history.replaceState({}, document.title);
  }, [location.state, toast]);

  // O Guardião recebe-te pelo nome, se já cá estiveste.
  useEffect(() => {
    const last = localStorage.getItem(LAST_NAME_KEY);
    const t = window.setTimeout(() => {
      pet.current?.react("wiggle");
      pet.current?.say(last ? `Bom ver-te, ${last} 💙` : "Bom ver-te de novo 💙");
    }, prefersReducedMotion() ? 0 : 1100);
    return () => window.clearTimeout(t);
  }, []);

  const switchView = (next: View) => {
    setView(next);
    setSent(false);
    pet.current?.react("nod");
  };

  const checkEmail = (value: string) => {
    if (isValidEmail(value)) return true;
    pet.current?.react("shake");
    pet.current?.say("Hmm, esse email não parece certo");
    toast({
      variant: "destructive",
      title: "Email inválido",
      description: "Usa um email completo, por exemplo nome@gmail.com.",
    });
    return false;
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!checkEmail(trimmed)) return;

    setLoading(true);
    pet.current?.react("spin");
    pet.current?.say("A abrir o vosso espaço…", 0);
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
    } catch (error) {
      const raw = errorMessage(error);
      if (raw.includes("Email not confirmed")) {
        localStorage.setItem("confirm_email", trimmed);
        navigate("/confirmar-email");
        return;
      }

      const message = raw.includes("Invalid login credentials")
        ? "Email ou senha incorretos."
        : raw;

      pet.current?.react("shake");
      pet.current?.say("Hmm, não deu. Tenta de novo?");
      toast({ variant: "destructive", title: "Não foi possível entrar", description: message });
    } finally {
      setLoading(false);
    }
  };

  // Envia o link (entrar ou recuperar). Também serve para "Reenviar".
  const sendLink = async (kind: "magic" | "forgot"): Promise<boolean> => {
    const trimmed = email.trim().toLowerCase();
    try {
      const { error } = kind === "magic"
        ? await supabase.auth.signInWithOtp({
            email: trimmed,
            options: { emailRedirectTo: window.location.origin + "/inicio" },
          })
        : await supabase.auth.resetPasswordForEmail(trimmed, {
            redirectTo: window.location.origin + "/redefinir-senha",
          });
      if (error) throw error;
      if (kind === "magic") track("login_magic_link_sent");
      return true;
    } catch (error) {
      pet.current?.react("shake");
      toast({ variant: "destructive", title: "Não foi possível enviar", description: errorMessage(error) });
      return false;
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (view === "password" || !checkEmail(email.trim().toLowerCase())) return;
    setLoading(true);
    pet.current?.react("spin");
    pet.current?.mail();
    pet.current?.say("A caminho! 💌", 0);
    const ok = await sendLink(view);
    setLoading(false);
    if (ok) window.setTimeout(() => setSent(true), prefersReducedMotion() ? 0 : 700);
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
    } catch (error) {
      toast({ variant: "destructive", title: "Erro com Google", description: errorMessage(error) });
      setGoogleLoading(false);
    }
  };

  const title = { password: "Bem-vindo de volta", magic: "Entrar sem senha", forgot: "Esqueceste a senha?" }[view];
  const subtitle = {
    password: "O vosso espaço está à espera.",
    magic: "Escreve o teu email e eu levo-te um link para entrares com um toque.",
    forgot: "Acontece a todos. Diz-me o email da conta e mando-te um link para criares uma nova.",
  }[view];

  const emailField = (id: string, label = "Email") => (
    <div className="en-in" style={{ ["--d" as string]: 3 }}>
      <label className="en-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="en-field"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nome@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => {
          if (email.trim() && !isValidEmail(email.trim())) {
            pet.current?.react("shake");
            pet.current?.say(email.includes("@") ? "Hmm, falta alguma coisa?" : "Hmm, falta o @?");
          }
        }}
      />
    </div>
  );

  // ── Link enviado: o envelope voa e o Guardião confirma ──
  if (sent && view === "magic") {
    return (
      <EntryScreen key="magic-sent" className="en-step">
        <BackButton className="en-in" onClick={() => setSent(false)} label="Usar outro email" />
        <div className="en-stage">
          <Guardian ref={pet} kind="guardiao" width={160} sayAt="right" delay={1} />
          {!prefersReducedMotion() && <Envelope mode="fly" style={{ animationDelay: ".9s" }} />}
        </div>
        <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 3, marginTop: 10 }}>Vê o teu email</h1>
        <p className="en-sub en-center en-in" style={{ ["--d" as string]: 4 }}>
          Deixei um link na tua caixa de entrada. Toca nele e entras logo.
        </p>
        <EmailChip email={email} />
        <div className="en-spacer" />
        <WebmailButton email={email} />
        <ResendLink
          seconds={30}
          onResend={async () => {
            const ok = await sendLink("magic");
            if (ok) { pet.current?.react("happy"); pet.current?.mail(); pet.current?.say("Enviei outra vez 💌"); }
            return ok;
          }}
        />
        <p className="en-small en-in" style={{ ["--d" as string]: 8, marginTop: 6 }}>
          <button type="button" className="en-quiet py-2" onClick={() => setSent(false)}>Usar outro email</button>
        </p>
      </EntryScreen>
    );
  }

  // ── Recuperação enviada: os passos que faltam ──
  if (sent && view === "forgot") {
    return (
      <EntryScreen key="forgot-sent" className="en-step">
        <BackButton className="en-in" onClick={() => switchView("password")} label="Voltar ao login" />
        <div className="en-row" style={{ marginTop: 14, alignItems: "flex-end" }}>
          <h1 className="en-h1 en-in" style={{ ["--d" as string]: 1, maxWidth: 210 }}>Está a caminho</h1>
          <Guardian ref={pet} kind="guardiao" width={100} delay={2} style={{ marginRight: -6 }} />
        </div>
        <p className="en-sub en-in" style={{ ["--d" as string]: 2 }}>
          Enviei o link para <b className="font-semibold text-[#0B1324]">{email.trim()}</b>.
        </p>
        <div className="en-steps">
          <div className="done" style={{ animationDelay: ".5s" }}><span className="en-n">✓</span>Link enviado</div>
          <div style={{ animationDelay: ".65s" }}><span className="en-n">2</span>Abre o email e toca no link</div>
          <div style={{ animationDelay: ".8s" }}><span className="en-n">3</span>Cria uma senha nova</div>
        </div>
        <p className="en-hint en-in" style={{ ["--d" as string]: 5 }}>Não está lá? Espreita o spam ou as promoções.</p>
        <div className="en-spacer" />
        <WebmailButton email={email} />
        <ResendLink
          seconds={30}
          onResend={async () => {
            const ok = await sendLink("forgot");
            if (ok) { pet.current?.react("happy"); pet.current?.mail(); pet.current?.say("Enviei outra vez 💌"); }
            return ok;
          }}
        />
        <p className="en-small en-in" style={{ ["--d" as string]: 8, marginTop: 6 }}>
          <button type="button" className="en-quiet py-2" onClick={() => switchView("password")}>Voltar ao login</button>
        </p>
      </EntryScreen>
    );
  }

  return (
    <EntryScreen key={view} className="en-step">
      <BackButton
        className="en-in"
        onClick={() => (view === "password" ? navigate("/landing") : switchView("password"))}
      />
      <div className="en-row" style={{ marginTop: 14, alignItems: "flex-end" }}>
        <h1 className="en-h1 en-in" style={{ ["--d" as string]: 1, maxWidth: 210 }}>{title}</h1>
        <Guardian
          ref={pet}
          kind="guardiao"
          width={100}
          delay={2}
          shy={passFocus && !showPassword}
          tapLines={["Olá! 💙", "Aqui estou!", "Estava à tua espera 😊"]}
          style={{ marginRight: -6 }}
        />
      </div>
      <p className="en-sub en-in" style={{ ["--d" as string]: 2 }}>{subtitle}</p>

      {view === "password" ? (
        <form onSubmit={handlePassword} className="flex flex-1 flex-col" noValidate>
          <div className="en-stack" style={{ marginTop: 26 }}>
            {emailField("login-email")}
            <div className="en-in" style={{ ["--d" as string]: 4 }}>
              <label className="en-label" htmlFor="login-password">Senha</label>
              <div className="en-field-wrap">
                <input
                  id="login-password"
                  className="en-field"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="A tua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => { setPassFocus(true); if (!showPassword) pet.current?.say("Prometo não ver 🙈", 0); }}
                  onBlur={() => { setPassFocus(false); if (password) pet.current?.say("Pronto, já podes 😄"); }}
                />
                <button
                  type="button"
                  className="en-eye"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setShowPassword((v) => !v);
                    pet.current?.say(showPassword ? "Já não vejo 🙈" : "Ups, agora vejo 👀");
                  }}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="en-link en-in self-end"
            style={{ ["--d" as string]: 5, marginTop: 10, fontSize: 13.5 }}
            onClick={() => switchView("forgot")}
          >
            Esqueci a senha
          </button>

          <div className="en-spacer" />
          <button type="submit" className="en-btn en-in" style={{ ["--d" as string]: 6 }} disabled={loading || googleLoading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <span className="en-arrow">→</span></>}
          </button>
          <div className="en-or en-in" style={{ ["--d" as string]: 7, margin: "16px 0" }}>ou</div>
          <button
            type="button"
            className="en-btn en-ghost en-in"
            style={{ ["--d" as string]: 8 }}
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-[18px] w-[18px]" />}
            Continuar com Google
          </button>
          <p className="en-small en-in" style={{ ["--d" as string]: 9, marginTop: 14 }}>
            <button type="button" className="en-quiet py-1" onClick={() => switchView("magic")}>Entrar com um link por email</button>
          </p>
          <p className="en-small en-in" style={{ ["--d" as string]: 10, marginTop: 8 }}>
            Ainda não tens conta?{" "}
            <button type="button" onClick={() => navigate("/inicio")}>Criar espaço</button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSend} className="flex flex-1 flex-col" noValidate>
          <div className="en-stack" style={{ marginTop: 26 }}>
            {emailField(view === "magic" ? "magic-email" : "forgot-email", view === "magic" ? "Email" : "Email da conta")}
          </div>
          <div className="en-spacer" />
          <button type="submit" className="en-btn en-in" style={{ ["--d" as string]: 5 }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enviar link <span className="en-arrow">→</span></>}
          </button>
          <p className="en-small en-in" style={{ ["--d" as string]: 6, marginTop: 14 }}>
            {view === "magic"
              ? <button type="button" className="en-quiet py-1" onClick={() => switchView("password")}>Entrar com senha</button>
              : <>Lembraste-te? <button type="button" onClick={() => switchView("password")}>Entrar</button></>}
          </p>
        </form>
      )}
    </EntryScreen>
  );
}

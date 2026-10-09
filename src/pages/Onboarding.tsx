import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogoIcon, LogoMark } from "@/components/Logo";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { ArrowRight, ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { getPasswordError } from "@/lib/passwordPolicy";
import { CountryPicker } from "@/components/onboarding/CountryPicker";
import { COUNTRIES } from "@/data/countries";

// ── Brand ─────────────────────────────────────────────────────────────────────
const PINK = "#FF6B8F";
const BLUE = "#4D7CFE";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

// ── Google icon ───────────────────────────────────────────────────────────────

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

// ── Intro visual — breathing circles ─────────────────────────────────────────

function IntroVisual({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-48 h-40 mx-auto">
      {/* Diffuse glow behind the circles */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40%",
          background: `radial-gradient(ellipse at 45% 55%, ${PINK}1e 0%, transparent 62%)`,
          filter: "blur(18px)",
          pointerEvents: "none",
        }}
      />
      {/* Circle A — large, warm rose */}
      <div
        className="absolute rounded-full"
        style={{
          width: 80, height: 80,
          top: 14, left: 18,
          background: `linear-gradient(140deg, #FECDD3 0%, #FDA4AF 100%)`,
          boxShadow: reduced
            ? "none"
            : `0 10px 40px rgba(255,107,143,0.24), 0 2px 8px rgba(255,107,143,0.12)`,
          animation: reduced ? "none" : "ob-float-a 8s ease-in-out infinite",
        }}
      />
      {/* Circle B — smaller, lighter, offset movement */}
      <div
        className="absolute rounded-full"
        style={{
          width: 58, height: 58,
          bottom: 12, right: 18,
          background: `linear-gradient(140deg, #FFF1F2 0%, #FECDD3 100%)`,
          border: `1.5px solid rgba(255,107,143,0.18)`,
          boxShadow: reduced
            ? "none"
            : `0 6px 28px rgba(255,107,143,0.16)`,
          animation: reduced ? "none" : "ob-float-b 10s ease-in-out infinite",
          animationDelay: "-4s",
        }}
      />
    </div>
  );
}

// ── Input shared style ────────────────────────────────────────────────────────

const INPUT = "w-full h-[52px] rounded-[1rem] border border-slate-200/80 bg-white px-4 text-[14px] font-medium text-[#0B1324] placeholder:text-slate-400 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200/50 transition-all";

// ── Main ──────────────────────────────────────────────────────────────────────

type Phase = "intro" | "form" | "welcome" | "country" | "gender" | "spiritual" | "mode" | "goal";

const PERS_STEPS: Phase[] = ["country", "gender", "spiritual", "mode", "goal"];

const GENDER_OPTIONS = [
  { value: "male",        label: "Masculino" },
  { value: "female",      label: "Feminino" },
  { value: "non_binary",  label: "Não-binário" },
  { value: "unspecified", label: "Prefiro não dizer" },
];

const RELIGION_OPTIONS = [
  { value: "christian",   label: "Cristão" },
  { value: "muslim",      label: "Muçulmano" },
  { value: "hindu",       label: "Hindu" },
  { value: "jewish",      label: "Judaico" },
  { value: "other",       label: "Outra" },
  { value: "none",        label: "Nenhuma" },
  { value: "unspecified", label: "Prefiro não dizer" },
];

const MODE_OPTIONS = [
  { value: "couple", label: "A dois",  desc: "Conectado ao teu par" },
  { value: "solo",   label: "A solo",  desc: "O teu espaço pessoal" },
];

const GOAL_OPTIONS = [
  { value: "relationship", label: "Melhorar o meu relacionamento" },
  { value: "books",        label: "Ler livros" },
  { value: "wellbeing",    label: "Bem-estar emocional" },
  { value: "growth",       label: "Crescimento pessoal" },
  { value: "explore",      label: "Explorar a aplicação" },
];

export default function Onboarding() {
  const [phase, setPhase] = useState<Phase>(() =>
    new URLSearchParams(window.location.search).get("start") === "1" ? "form" : "intro"
  );

  // If URL has ?code= we're in an OAuth callback — don't show intro until session resolves
  const [authResolved, setAuthResolved] = useState(
    () => !new URLSearchParams(window.location.search).get("code")
  );

  const [name, setName]           = useState(localStorage.getItem("onboarding_name") || "");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(
    sessionStorage.getItem("lovenest_ref") || localStorage.getItem("lovenest_ref") || ""
  );
  const [showInvite, setShowInvite] = useState(
    !!(sessionStorage.getItem("lovenest_ref") || localStorage.getItem("lovenest_ref"))
  );
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Personalization state
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null);
  const [country, setCountry]       = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [gender, setGender]         = useState("");
  const [religion, setReligion]     = useState("");
  const [usageMode, setUsageMode]   = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [stepVisible, setStepVisible] = useState(true);

  // Entry animation
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [hoverCta, setHoverCta] = useState(false);

  const navigate  = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const markSeen = () => localStorage.setItem("onboarding_seen", "1");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const code = ref.toUpperCase();
      sessionStorage.setItem("lovenest_ref", code);
      localStorage.setItem("lovenest_ref", code);
      setInviteCode(code);
      setShowInvite(true);
    }
  }, [searchParams]);

  // Trigger entry sequence shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Detect Google OAuth return: user already logged in, check onboarding status
  useEffect(() => {
    let handled = false;
    const hasCode = !!new URLSearchParams(window.location.search).get("code");

    const handleSession = async (session: { user: { id: string } } | null) => {
      if (handled || !session) {
        // Only mark resolved if not waiting for PKCE exchange
        if (!hasCode) setAuthResolved(true);
        return;
      }
      handled = true;
      setAuthResolved(true);
      setSignedInUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile?.onboarding_completed) {
        navigate("/casa", { replace: true });
      } else {
        markSeen();
        goToStep("welcome");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // Safety: if code exchange never resolves, show intro after 4s
    const timer = setTimeout(() => setAuthResolved(true), 4000);

    return () => { clearTimeout(timer); subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entrance helper
  const enter = (
    delay: number,
    fromY = 20,
    fromScale?: number
  ): React.CSSProperties => ({
    opacity: ready ? 1 : 0,
    transform:
      ready || reduced
        ? "none"
        : fromScale
        ? `translateY(${fromY}px) scale(${fromScale})`
        : `translateY(${fromY}px)`,
    transition: reduced
      ? "none"
      : `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const goToStep = (next: Phase) => {
    setStepVisible(false);
    setTimeout(() => { setPhase(next); setStepVisible(true); }, 160);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const uid = signedInUserId ?? (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        await supabase.from("profiles").update({
          country:                  country || null,
          country_code:             countryCode || null,
          gender:                   gender || null,
          religion:                 religion || null,
          usage_mode:               usageMode || "couple",
          primary_goal:             primaryGoal || null,
          onboarding_completed:     true,
          onboarding_completed_at:  new Date().toISOString(),
          timezone:                 Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).eq("user_id", uid);
        track("onboarding_v2_completed", { usage_mode: usageMode, religion, primary_goal: primaryGoal });
      }
    } catch { /* silent */ }
    setSavingProfile(false);
    navigate("/casa");
  };

  // ── Signup ────────────────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName  = name.trim();

    if (trimmedName.length < 2) {
      toast({ variant: "destructive", title: "Nome inválido", description: "Insere pelo menos 2 caracteres." });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast({ variant: "destructive", title: "Email inválido", description: "Usa um email completo, ex: nome@gmail.com" });
      return;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      toast({ variant: "destructive", title: "Senha fraca", description: passwordError });
      return;
    }

    setLoading(true);
    if (inviteCode) {
      localStorage.setItem("lovenest_ref", inviteCode);
      sessionStorage.setItem("lovenest_ref", inviteCode);
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { display_name: trimmedName, referred_by_code: inviteCode || undefined },
          emailRedirectTo: window.location.origin + "/casa",
        },
      });
      if (error) throw error;

      markSeen();
      localStorage.removeItem("onboarding_name");

      if (data.session) {
        track("signup_completed", { method: "email", has_invite: !!inviteCode });
        setSignedInUserId(data.session.user.id);
        goToStep("welcome");
      } else {
        track("signup_email_confirm", { has_invite: !!inviteCode });
        localStorage.setItem("confirm_email", trimmedEmail);
        navigate("/confirmar-email");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao criar conta", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    if (inviteCode) localStorage.setItem("lovenest_ref", inviteCode);
    markSeen();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/inicio" },
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro com Google", description: error.message });
      setGoogleLoading(false);
    }
  };

  // ── OAuth callback loading ─────────────────────────────────────────────────

  if (phase === "intro" && !authResolved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#F8F5F4] text-[#0B1324]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-indigo-100/65 blur-3xl" />

        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="text-[15px] font-extrabold tracking-[-0.02em]">LoveNest</span>
            </div>
            <button
              type="button"
              onClick={() => { markSeen(); navigate("/entrar?returning=1"); }}
              className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 active:bg-black/5"
            >
              Já tenho conta
            </button>
          </header>

          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-8">
              <div aria-hidden className="absolute inset-2 rounded-[2rem] bg-rose-300/25 blur-2xl" />
              <LogoIcon size={96} className="relative drop-shadow-[0_18px_35px_rgba(11,19,36,0.16)]" />
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500/80">
              Criar o vosso espaço
            </p>
            <h1 className="mt-3 max-w-[330px] text-[35px] font-black leading-[1.03] tracking-[-0.045em]">
              Comecem por uma coisa simples.
            </h1>
            <p className="mt-4 max-w-[300px] text-[14px] leading-6 text-slate-500">
              Uma conta, um espaço privado e depois o LoveNest cresce convosco.
            </p>
          </section>

          <footer className="space-y-3">
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#0B1324] text-[14px] font-bold text-white shadow-[0_14px_35px_rgba(11,19,36,0.16)] transition active:scale-[0.985]"
            >
              Criar o nosso LoveNest
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="text-center text-[10px] text-slate-400">
              Privado por defeito. Sem feed público.
            </p>
          </footer>
        </div>
      </main>
    );
  }

  // ── Personalization screens ───────────────────────────────────────────────

  const stepIdx = PERS_STEPS.indexOf(phase);

  const StepShell = ({ onBack, children }: { onBack: () => void; children: React.ReactNode }) => (
    <main
      className="relative min-h-[100dvh] overflow-hidden bg-[#F8F5F4] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1rem)] text-[#0B1324]"
      style={{ opacity: stepVisible ? 1 : 0, transform: stepVisible ? "none" : "translateY(12px)", transition: "opacity 160ms ease, transform 160ms ease" }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-28 -top-20 h-72 w-72 rounded-full bg-rose-100/55 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-2.25rem)] w-full max-w-md flex-col">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-500 active:scale-95"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
          </button>

          {stepIdx >= 0 ? (
            <div className="flex flex-1 items-center gap-1.5">
              {PERS_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    index <= stepIdx ? "bg-rose-400" : "bg-slate-200/80"
                  )}
                />
              ))}
            </div>
          ) : <div className="flex-1" />}

          <span className="w-10 text-right text-[10px] font-bold tabular-nums text-slate-400">
            {stepIdx >= 0 ? `${stepIdx + 1}/${PERS_STEPS.length}` : ""}
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          {children}
        </section>
      </div>
    </main>
  );

  const CtaBtn = ({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#0B1324] text-[14px] font-bold text-white shadow-[0_14px_35px_rgba(11,19,36,0.14)] transition active:scale-[0.985] disabled:opacity-30"
    >
      {label} <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
    </button>
  );

  const SkipBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="w-full py-3 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
      Saltar
    </button>
  );

  const OptionBtn = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-[52px] rounded-2xl border text-[14px] font-medium transition-all active:scale-[0.98]",
        selected
          ? "border-[#0B1324] bg-[#0B1324] text-white shadow-[0_8px_22px_rgba(11,19,36,0.10)]"
          : "border-slate-200/80 bg-white/75 text-[#0B1324] shadow-sm"
      )}
    >
      {children}
    </button>
  );

  if (phase === "welcome") {
    return <WelcomeStep onContinue={() => goToStep("country")} />;
  }

  if (phase === "country") {
    return (
      <StepShell onBack={() => goToStep("welcome")}>
        <div className="w-full max-w-[320px] mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">Onde estás?</h2>
            <p className="text-[13px] text-muted-foreground">Ajuda-nos a adaptar o conteúdo à tua região.</p>
          </div>
          <CountryPicker
            value={countryCode || null}
            onSelect={(code) => {
              setCountryCode(code);
              setCountry(COUNTRIES.find(c => c.code === code)?.name ?? "");
              setTimeout(() => goToStep("gender"), 300);
            }}
          />
          <SkipBtn onClick={() => goToStep("gender")} />
        </div>
      </StepShell>
    );
  }

  if (phase === "gender") {
    return (
      <StepShell onBack={() => goToStep("country")}>
        <div className="w-full max-w-[320px] mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">Como te identificas?</h2>
            <p className="text-[13px] text-muted-foreground">Opcional. Só para personalizar linguagem.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {GENDER_OPTIONS.map(o => (
              <OptionBtn
                key={o.value}
                selected={gender === o.value}
                onClick={() => { setGender(o.value); setTimeout(() => goToStep("spiritual"), 300); }}
              >
                {o.label}
              </OptionBtn>
            ))}
          </div>
          <SkipBtn onClick={() => goToStep("spiritual")} />
        </div>
      </StepShell>
    );
  }

  if (phase === "spiritual") {
    return (
      <StepShell onBack={() => goToStep("gender")}>
        <div className="w-full max-w-[320px] mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">Tens fé?</h2>
            <p className="text-[13px] text-muted-foreground">Ativamos recursos espirituais se quiseres.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {RELIGION_OPTIONS.map(o => (
              <OptionBtn
                key={o.value}
                selected={religion === o.value}
                onClick={() => { setReligion(o.value); setTimeout(() => goToStep("mode"), 300); }}
              >
                {o.label}
              </OptionBtn>
            ))}
          </div>
          <SkipBtn onClick={() => goToStep("mode")} />
        </div>
      </StepShell>
    );
  }

  if (phase === "mode") {
    return (
      <StepShell onBack={() => goToStep("spiritual")}>
        <div className="w-full max-w-[320px] mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">Como vais usar o LoveNest?</h2>
            <p className="text-[13px] text-muted-foreground">Podes mudar nas definições a qualquer momento.</p>
          </div>
          <div className="space-y-3">
            {MODE_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => { setUsageMode(o.value); setTimeout(() => goToStep("goal"), 300); }}
                className={cn(
                  "w-full rounded-2xl border p-5 text-left transition-all active:scale-[0.98]",
                  usageMode === o.value
                    ? "border-[#0B1324] bg-[#0B1324] text-white shadow-[0_8px_22px_rgba(11,19,36,0.10)]"
                    : "border-slate-200/80 bg-white/75 text-[#0B1324] shadow-sm"
                )}
              >
                <div className="text-[15px] font-semibold">{o.label}</div>
                <div className={cn("text-[12px] mt-0.5", usageMode === o.value ? "text-white/80" : "text-muted-foreground")}>{o.desc}</div>
              </button>
            ))}
          </div>
          <SkipBtn onClick={() => goToStep("goal")} />
        </div>
      </StepShell>
    );
  }

  if (phase === "goal") {
    return (
      <StepShell onBack={() => goToStep("mode")}>
        <div className="w-full max-w-[320px] mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">Qual é o teu objetivo principal?</h2>
          </div>
          <div className="space-y-2">
            {GOAL_OPTIONS.map(o => (
              <OptionBtn
                key={o.value}
                selected={primaryGoal === o.value}
                onClick={() => { setPrimaryGoal(o.value); setTimeout(handleSaveProfile, 400); }}
              >
                {o.label}
              </OptionBtn>
            ))}
          </div>
          <div className="pt-2">
            <button onClick={handleSaveProfile} disabled={savingProfile} className="w-full py-3 text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1.5">
              {savingProfile && <Loader2 className="w-3 h-3 animate-spin" />}
              Saltar
            </button>
          </div>
        </div>
      </StepShell>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────

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
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[1rem] border border-slate-200/80 bg-white text-[13px] font-bold text-[#0B1324] active:scale-[0.99] disabled:opacity-60"
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <GoogleIcon className="h-5 w-5" />}
          Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200/70" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">ou por email</span>
          <div className="h-px flex-1 bg-slate-200/70" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="onboarding-name" className="text-[12px] font-bold text-slate-600">O teu nome</label>
            <input
              id="onboarding-name"
              type="text"
              autoComplete="name"
              placeholder="Como queres aparecer?"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className={INPUT}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="onboarding-email" className="text-[12px] font-bold text-slate-600">Email</label>
            <input
              id="onboarding-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={INPUT}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="onboarding-password" className="text-[12px] font-bold text-slate-600">Senha</label>
            <div className="relative">
              <input
                id="onboarding-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={cn(INPUT, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 active:bg-slate-100"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!showInvite ? (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="w-full px-1 text-left text-[11px] font-semibold text-slate-400"
            >
              + Tenho um código de convite do meu par
            </button>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="onboarding-invite" className="text-[12px] font-bold text-slate-600">Código do par</label>
              <input
                id="onboarding-invite"
                type="text"
                placeholder="Ex: AMOR2024"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                className={cn(INPUT, "text-center font-bold tracking-wider")}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] bg-[#0B1324] text-[13px] font-bold text-white shadow-[0_12px_30px_rgba(11,19,36,0.13)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Criar o nosso espaço <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-5 border-t border-slate-200/70 pt-5 text-center">
          <p className="text-[12px] text-slate-400">
            Já tens conta?{" "}
            <button
              type="button"
              onClick={() => { markSeen(); navigate("/entrar?returning=1"); }}
              className="font-bold text-rose-500"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPhase("intro")}
        className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Voltar
      </button>
    </AuthScaffold>
  );
}

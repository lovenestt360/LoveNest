import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogoMark } from "@/components/Logo";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
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

const INPUT = "w-full h-12 rounded-2xl border border-border bg-card px-4 text-[15px] font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/30 transition-all";

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
  const [phase, setPhase] = useState<Phase>("intro");

  const [name, setName]           = useState(localStorage.getItem("onboarding_name") || "");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
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
    });
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
      options: { redirectTo: window.location.origin + "/onboarding" },
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro com Google", description: error.message });
      setGoogleLoading(false);
    }
  };

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div className="relative min-h-screen bg-background flex flex-col select-none overflow-hidden">

        {/* ── Ambient background glows ── */}
        {!reduced && (
          <>
            {/* Rosa — canto inferior esquerdo */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", bottom: "-8%", left: "-18%",
                width: 320, height: 320, borderRadius: "50%",
                background: PINK, filter: "blur(140px)", opacity: 0.065,
                animation: "ob-ambient-a 20s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            {/* Azul — canto superior direito */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", top: "-6%", right: "-14%",
                width: 280, height: 280, borderRadius: "50%",
                background: BLUE, filter: "blur(130px)", opacity: 0.055,
                animation: "ob-ambient-b 24s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            {/* Rosa eco — meio superior, imperceptível */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", top: "25%", left: "30%",
                width: 200, height: 200, borderRadius: "50%",
                background: PINK, filter: "blur(100px)", opacity: 0.03,
                animation: "ob-ambient-a 28s ease-in-out infinite",
                animationDelay: "-12s",
                pointerEvents: "none",
              }}
            />
          </>
        )}

        {/* ── Nav ── */}
        <div
          className="flex items-center justify-between px-6 pt-12 shrink-0 relative z-10"
          style={enter(0, -8)}
        >
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-[13px] font-bold tracking-tight text-foreground">LoveNest</span>
          </div>
          <button
            onClick={() => { markSeen(); navigate("/entrar"); }}
            className="text-[12px] font-medium text-muted-foreground/40 hover:text-muted-foreground transition-colors px-2 py-1"
          >
            Já tenho conta
          </button>
        </div>

        {/* ── Central visual + copy ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">

          {/* Circles */}
          <div style={{ ...enter(150, 0, 0.94), marginBottom: 44 }}>
            <IntroVisual reduced={reduced} />
          </div>

          {/* Headline */}
          <h1
            className="text-[28px] font-bold text-foreground leading-[1.2] tracking-tight text-center max-w-[272px]"
            style={enter(300, 24)}
          >
            O amor também vive<br />nos dias comuns.
          </h1>

          {/* Sub */}
          <p
            className="text-[14px] text-muted-foreground leading-[1.7] text-center mt-4"
            style={enter(450, 20)}
          >
            Cria o vosso espaço em menos de um minuto.
          </p>

        </div>

        {/* ── Bottom CTA ── */}
        <div
          className="px-8 pb-14 pt-6 shrink-0 space-y-3 relative z-10"
          style={enter(600, 20)}
        >
          <button
            onClick={() => setPhase("form")}
            onMouseEnter={() => setHoverCta(true)}
            onMouseLeave={() => setHoverCta(false)}
            className="w-full h-14 rounded-2xl text-white font-semibold text-[15px] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: PINK,
              boxShadow: hoverCta
                ? `0 12px 40px ${PINK}55, 0 4px 16px ${PINK}33`
                : `0 6px 28px ${PINK}44, 0 2px 8px ${PINK}22`,
              transform: hoverCta ? "translateY(-2px)" : "translateY(0)",
              transition: "box-shadow 180ms ease, transform 180ms ease",
            }}
          >
            Começar
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <p className="text-center text-[10px] tracking-[0.06em] text-muted-foreground/40 animate-ob-hint">
            grátis · privado · sem publicidade
          </p>
        </div>

      </div>
    );
  }

  // ── Personalization screens ───────────────────────────────────────────────

  const stepIdx = PERS_STEPS.indexOf(phase);

  const StepShell = ({ onBack, children }: { onBack: () => void; children: React.ReactNode }) => (
    <div
      className="min-h-screen bg-background flex flex-col relative overflow-hidden"
      style={{ opacity: stepVisible ? 1 : 0, transform: stepVisible ? "none" : "translateY(16px)", transition: "opacity 160ms ease, transform 160ms ease" }}
    >
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 dark:bg-rose-950/30 blur-[90px] pointer-events-none" />
      <div className="flex items-center justify-between px-5 pt-12 shrink-0 relative z-10">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-all">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        </button>
        {stepIdx >= 0 && (
          <span className="text-[12px] text-muted-foreground font-medium">{stepIdx + 1} de {PERS_STEPS.length}</span>
        )}
        <div className="w-9" />
      </div>
      <div className="flex-1 flex flex-col px-8 pt-10 pb-10 relative z-10">
        {children}
      </div>
    </div>
  );

  const CtaBtn = ({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 rounded-2xl text-white font-semibold text-[15px] disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      style={{ background: PINK, boxShadow: `0 6px 28px ${PINK}44` }}
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
          ? "bg-rose-500 border-rose-500 text-white"
          : "bg-card border-border text-foreground hover:border-rose-300 dark:hover:border-rose-700"
      )}
    >
      {children}
    </button>
  );

  if (phase === "welcome") {
    return (
      <div
        className="min-h-screen bg-background flex flex-col relative overflow-hidden"
        style={{ opacity: stepVisible ? 1 : 0, transform: stepVisible ? "none" : "translateY(16px)", transition: "opacity 160ms ease, transform 160ms ease" }}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 dark:bg-rose-950/30 blur-[90px] pointer-events-none" />
        <div className="flex-1 flex flex-col justify-center px-8 relative z-10">
          <div className="w-full max-w-[320px] mx-auto space-y-8">
            <div className="space-y-3">
              <p className="text-[13px] font-medium text-rose-500 uppercase tracking-widest">Bem-vindo</p>
              <h1 className="text-[28px] font-bold text-foreground leading-tight tracking-tight">
                {name ? `Olá, ${name.split(" ")[0]}.` : "Olá."}<br />
                Falta pouco.
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Algumas perguntas rápidas para personalizar a tua experiência.
              </p>
            </div>
            <CtaBtn onClick={() => goToStep("country")} label="Vamos lá" />
            <button onClick={() => navigate("/casa")} className="w-full py-2 text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Saltar personalização
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "country") {
    const selectedCountryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? "";
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
            }}
          />
          <div className="space-y-2 pt-2">
            <CtaBtn onClick={() => goToStep("gender")} disabled={!countryCode} label="Continuar" />
            <SkipBtn onClick={() => goToStep("gender")} />
          </div>
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
              <OptionBtn key={o.value} selected={gender === o.value} onClick={() => setGender(o.value)}>
                {o.label}
              </OptionBtn>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <CtaBtn onClick={() => goToStep("spiritual")} disabled={!gender} label="Continuar" />
            <SkipBtn onClick={() => goToStep("spiritual")} />
          </div>
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
              <OptionBtn key={o.value} selected={religion === o.value} onClick={() => setReligion(o.value)}>
                {o.label}
              </OptionBtn>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <CtaBtn onClick={() => goToStep("mode")} disabled={!religion} label="Continuar" />
            <SkipBtn onClick={() => goToStep("mode")} />
          </div>
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
                onClick={() => setUsageMode(o.value)}
                className={cn(
                  "w-full rounded-2xl border p-5 text-left transition-all active:scale-[0.98]",
                  usageMode === o.value
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "bg-card border-border text-foreground hover:border-rose-300 dark:hover:border-rose-700"
                )}
              >
                <div className="text-[15px] font-semibold">{o.label}</div>
                <div className={cn("text-[12px] mt-0.5", usageMode === o.value ? "text-white/80" : "text-muted-foreground")}>{o.desc}</div>
              </button>
            ))}
          </div>
          <CtaBtn onClick={() => goToStep("goal")} disabled={!usageMode} label="Continuar" />
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
              <OptionBtn key={o.value} selected={primaryGoal === o.value} onClick={() => setPrimaryGoal(o.value)}>
                {o.label}
              </OptionBtn>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={!primaryGoal || savingProfile}
              className="w-full h-14 rounded-2xl text-white font-semibold text-[15px] disabled:opacity-30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{ background: PINK, boxShadow: `0 6px 28px ${PINK}44` }}
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar no espaço <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></>}
            </button>
            <button onClick={handleSaveProfile} disabled={savingProfile} className="w-full py-3 text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Saltar
            </button>
          </div>
        </div>
      </StepShell>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Ambient warmth */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 dark:bg-rose-950/30 blur-[90px] pointer-events-none" />

      {/* Back */}
      <div className="px-5 pt-12 shrink-0">
        <button
          onClick={() => setPhase("intro")}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-6 relative z-10">
        <div className="w-full max-w-[320px] mx-auto space-y-6">

          <div className="space-y-1">
            <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
              Criar o vosso espaço.
            </h1>
            <p className="text-[13px] text-muted-foreground">Começa em segundos.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full h-12 rounded-2xl border border-border bg-card text-[13px] font-semibold text-foreground flex items-center justify-center gap-3 hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <GoogleIcon className="w-4 h-4" />}
            Continuar com Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            <input
              type="text"
              placeholder="O teu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className={INPUT}
            />
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder="teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={INPUT}
            />
            <input
              type="password"
              placeholder="Senha (mín. 8 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={INPUT}
            />

            {!showInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors w-full text-left px-1"
              >
                + Tenho um código de convite do meu par
              </button>
            ) : (
              <input
                type="text"
                placeholder="Código de convite (ex: AMOR2024)"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                className={cn(INPUT, "tracking-wider font-bold text-center")}
              />
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-12 rounded-2xl text-white font-semibold text-[14px] disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-1"
              style={{
                background: PINK,
                boxShadow: `0 6px 28px ${PINK}44, 0 2px 8px ${PINK}22`,
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Criar espaço <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></>}
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground">
            Já tens conta?{" "}
            <button onClick={() => { markSeen(); navigate("/entrar"); }} className="text-rose-500 font-semibold hover:underline">
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

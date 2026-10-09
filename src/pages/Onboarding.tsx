import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import {
  AuthHeader,
  AuthPage,
  CouplePair,
  EASE,
  Field,
  FieldGroup,
  GoogleButton,
  HeaderLink,
  OrDivider,
  PasswordField,
  PERSON_A,
  PrimaryButton,
  QuietLink,
  Reveal,
} from "@/features/auth/AuthKit";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { LogoMark } from "@/components/Logo";
import { BookOpen, Check, ChevronLeft, Compass, HeartHandshake, Leaf, Loader2, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { getPasswordError } from "@/lib/passwordPolicy";
import { CountryPicker } from "@/components/onboarding/CountryPicker";
import { COUNTRIES } from "@/data/countries";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

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
  { value: "couple", label: "A dois",       desc: "Um espaço partilhado. O teu par entra com o código do vosso LoveNest." },
  { value: "solo",   label: "Só para mim",  desc: "O teu espaço pessoal. Podes convidar alguém mais tarde." },
];

const GOAL_OPTIONS = [
  { value: "relationship", label: "Cuidar da nossa relação", icon: HeartHandshake },
  { value: "books",        label: "Ler mais",                  icon: BookOpen },
  { value: "wellbeing",    label: "Sentir-me melhor por dentro", icon: Leaf },
  { value: "growth",       label: "Crescer como pessoa",       icon: Sprout },
  { value: "explore",      label: "Só quero explorar",         icon: Compass },
];

const labelOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? "";

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

  const navigate  = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();

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
      <AuthPage className="items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </AuthPage>
    );
  }

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <AuthPage>
        <AuthHeader
          right={
            <HeaderLink onClick={() => { markSeen(); navigate("/entrar?returning=1"); }}>
              Já tenho conta
            </HeaderLink>
          }
        />

        <section className="flex flex-1 flex-col justify-center py-10">
          <Reveal>
            <h1 className="max-w-[15ch] text-[31px] font-extrabold leading-[1.08] tracking-[-0.038em]">
              Comecem por uma coisa simples.
            </h1>
            <p className="mt-3 max-w-[32ch] text-[15px] leading-[1.55] text-slate-500">
              Três passos, e o resto acontece no dia a dia.
            </p>
          </Reveal>

          {/* Uma sequência real — por isso numerada. */}
          <Reveal delay={0.08} className="mt-9">
            <ol className="border-y border-[#0B1324]/[0.08]">
              {[
                { t: "Crias a tua conta.", d: "Leva menos de um minuto." },
                { t: "O teu par junta-se a ti.", d: "Com o código do vosso espaço." },
                { t: "O espaço passa a ser vosso.", d: "Conversas, memórias e rituais, só entre os dois." },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-4 border-b border-[#0B1324]/[0.06] py-4 last:border-b-0">
                  <span className="pt-px text-[13px] font-bold tabular-nums text-slate-300">0{i + 1}</span>
                  <div>
                    <p className="text-[15px] font-bold">{s.t}</p>
                    <p className="mt-0.5 text-[14px] text-slate-500">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        <footer>
          <PrimaryButton type="button" onClick={() => setPhase("form")}>
            Criar o nosso espaço
          </PrimaryButton>
        </footer>
      </AuthPage>
    );
  }

  // ── Personalization screens ───────────────────────────────────────────────

  if (phase === "welcome") {
    return <WelcomeStep name={name} onContinue={() => goToStep("country")} />;
  }

  const stepIdx = PERS_STEPS.indexOf(phase);
  const shell = (props: Omit<StepShellProps, "stepIdx" | "visible" | "reduceMotion">) => (
    <StepShell {...props} stepIdx={stepIdx} visible={stepVisible} reduceMotion={!!reduceMotion} />
  );

  if (phase === "country") {
    return shell({
      onBack: () => goToStep("welcome"),
      onSkip: () => goToStep("gender"),
      question: "Onde estás neste momento?",
      hint: "Para datas, horários e conteúdos fazerem sentido onde vives.",
      children: (
        <CountryPicker
          value={countryCode || null}
          triggerClassName="h-[58px] rounded-2xl border-[#0B1324]/[0.08] bg-white text-[16px] font-semibold"
          onSelect={(code) => {
            setCountryCode(code);
            setCountry(COUNTRIES.find(c => c.code === code)?.name ?? "");
            setTimeout(() => goToStep("gender"), 300);
          }}
        />
      ),
    });
  }

  if (phase === "gender") {
    return shell({
      onBack: () => goToStep("country"),
      onSkip: () => goToStep("spiritual"),
      previousAnswer: country,
      question: "Como preferes que falemos contigo?",
      hint: "Opcional. Só muda a forma como o LoveNest se dirige a ti.",
      children: (
        <OptionList
          options={GENDER_OPTIONS}
          value={gender}
          onSelect={(v) => { setGender(v); setTimeout(() => goToStep("spiritual"), 300); }}
        />
      ),
    });
  }

  if (phase === "spiritual") {
    return shell({
      onBack: () => goToStep("gender"),
      onSkip: () => goToStep("mode"),
      previousAnswer: labelOf(GENDER_OPTIONS, gender),
      question: "A fé faz parte da tua vida?",
      hint: "Se sim, mostramos oração e jejum. Se não, ficam fora do caminho.",
      children: (
        <ChipChoice
          options={RELIGION_OPTIONS}
          value={religion}
          onSelect={(v) => { setReligion(v); setTimeout(() => goToStep("mode"), 300); }}
        />
      ),
    });
  }

  if (phase === "mode") {
    const initial = name.trim().charAt(0).toUpperCase() || "T";
    return shell({
      onBack: () => goToStep("spiritual"),
      onSkip: () => goToStep("goal"),
      previousAnswer: labelOf(RELIGION_OPTIONS, religion),
      question: "Para quem é este espaço?",
      hint: "Podes mudar isto mais tarde nas definições.",
      children: (
        <div className="space-y-3">
          {MODE_OPTIONS.map((o) => {
            const selected = usageMode === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { setUsageMode(o.value); setTimeout(() => goToStep("goal"), 300); }}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left",
                  "transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.985]",
                  selected
                    ? "border-[#0B1324] shadow-[0_0_0_1px_#0B1324]"
                    : "border-[#0B1324]/[0.08] hover:border-[#0B1324]/20",
                )}
              >
                <span className="flex w-[58px] shrink-0 justify-center">
                  {o.value === "couple" ? (
                    <CouplePair a={initial} b="+" size={30} />
                  ) : (
                    <span
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#F1ECE6] text-[12px] font-bold"
                      style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${PERSON_A}` }}
                      aria-hidden="true"
                    >
                      {initial}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold">{o.label}</span>
                  <span className="mt-0.5 block text-[14px] leading-[1.45] text-slate-500">{o.desc}</span>
                </span>
                <CheckDot on={selected} />
              </button>
            );
          })}
        </div>
      ),
    });
  }

  if (phase === "goal") {
    return shell({
      onBack: () => goToStep("mode"),
      onSkip: handleSaveProfile,
      skipBusy: savingProfile,
      skipLabel: "Saltar e entrar",
      previousAnswer: labelOf(MODE_OPTIONS, usageMode),
      question: "O que te trouxe ao LoveNest?",
      hint: "Escolhe o que pesa mais agora. Organizamos a tua Home à volta disso.",
      children: (
        <OptionList
          options={GOAL_OPTIONS}
          value={primaryGoal}
          disabled={savingProfile}
          onSelect={(v) => { setPrimaryGoal(v); setTimeout(handleSaveProfile, 400); }}
        />
      ),
    });
  }

  // ── Signup form ───────────────────────────────────────────────────────────

  return (
    <AuthScaffold
      title="Começa por ti."
      subtitle="Depois convidas o teu par — ou entras no espaço que ele já criou."
      headerRight={<HeaderLink onClick={() => setPhase("intro")}>Voltar</HeaderLink>}
      footer={
        <p className="text-center text-[14px] text-slate-500">
          Já tens conta?{" "}
          <QuietLink onClick={() => { markSeen(); navigate("/entrar?returning=1"); }}>Entrar</QuietLink>
        </p>
      }
    >
      <div className="space-y-5">
        <GoogleButton onClick={handleGoogle} disabled={googleLoading || loading} loading={googleLoading} />
        <OrDivider />

        <form onSubmit={handleSignup} className="space-y-4">
          <FieldGroup>
            <Field
              id="onboarding-name"
              label="O teu nome"
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Como o teu par te chama"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Field
              id="onboarding-email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
              placeholder="teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <PasswordField
              id="onboarding-password"
              label="Senha"
              autoComplete="new-password"
              enterKeyHint="done"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </FieldGroup>

          <InviteOption
            open={showInvite}
            onOpen={() => setShowInvite(true)}
            code={inviteCode}
            onCode={(v) => setInviteCode(v.toUpperCase())}
            reduceMotion={!!reduceMotion}
          />

          <PrimaryButton type="submit" disabled={loading || googleLoading} loading={loading}>
            Criar o nosso espaço
          </PrimaryButton>
        </form>
      </div>
    </AuthScaffold>
  );
}

// ── Peças do onboarding ───────────────────────────────────────────────────────
// Definidas fora do componente: assim não são recriadas a cada render, e o
// estado selecionado anima em vez de o ecrã ser remontado.

interface StepShellProps {
  stepIdx: number;
  visible: boolean;
  reduceMotion: boolean;
  onBack: () => void;
  onSkip: () => void;
  skipLabel?: string;
  skipBusy?: boolean;
  previousAnswer?: string;
  question: string;
  hint?: string;
  children: ReactNode;
}

/** Cada passo é uma pequena troca: a tua última resposta, e a pergunta seguinte. */
function StepShell({
  stepIdx, visible, reduceMotion, onBack, onSkip, skipLabel = "Saltar", skipBusy,
  previousAnswer, question, hint, children,
}: StepShellProps) {
  const total = PERS_STEPS.length;
  return (
    <AuthPage>
      <header className="flex h-11 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-[#0B1324] active:bg-black/[0.04]"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <div
          className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#0B1324]/[0.08]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={stepIdx + 1}
          aria-label={`Passo ${stepIdx + 1} de ${total}`}
        >
          <div
            className="h-full rounded-full bg-[#0B1324] transition-[width] duration-300 ease-out"
            style={{ width: `${((stepIdx + 1) / total) * 100}%` }}
          />
        </div>
        <span className="w-8 text-right text-[12px] font-semibold tabular-nums text-slate-400">
          {stepIdx + 1}/{total}
        </span>
      </header>

      <div
        className="flex flex-1 flex-col"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible || reduceMotion ? "none" : "translateY(8px)",
          transition: reduceMotion ? "opacity 120ms linear" : `opacity 200ms ease, transform 200ms cubic-bezier(${EASE.join(",")})`,
        }}
      >
        <section className="flex flex-1 flex-col pt-8">
          {/* A resposta anterior, como balão do lado de quem respondeu. */}
          {previousAnswer && (
            <div className="mb-6 flex justify-end">
              <span className="rounded-[16px] rounded-br-[5px] bg-[#0B1324]/[0.06] px-3.5 py-2 text-[14px] text-slate-500">
                {previousAnswer}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(11,19,36,0.08)]">
              <LogoMark size={14} />
            </span>
            <span className="text-[12px] font-semibold text-slate-400">LoveNest</span>
          </div>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em]">{question}</h2>
          {hint && <p className="mt-2 max-w-[36ch] text-[15px] leading-[1.5] text-slate-500">{hint}</p>}

          <div className="mt-7">{children}</div>
        </section>

        <footer className="pt-6">
          <button
            type="button"
            onClick={onSkip}
            disabled={skipBusy}
            className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-medium text-slate-400 transition-colors hover:text-[#0B1324] disabled:opacity-50"
          >
            {skipBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {skipLabel}
          </button>
        </footer>
      </div>
    </AuthPage>
  );
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-200",
        on ? "border-[#0B1324] bg-[#0B1324] text-white" : "border-[#0B1324]/15 bg-white",
      )}
      aria-hidden="true"
    >
      <Check className={cn("h-3 w-3 transition-transform duration-200", on ? "scale-100" : "scale-0")} strokeWidth={3} />
    </span>
  );
}

/** Lista de respostas numa só superfície — o mesmo padrão da lista "Hoje". */
function OptionList({
  options,
  value,
  onSelect,
  disabled,
}: {
  options: { value: string; label: string; icon?: typeof Leaf }[];
  value: string;
  onSelect: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#0B1324]/[0.08] bg-white" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(o.value)}
            className={cn(
              "flex w-full items-center gap-3.5 border-b border-[#0B1324]/[0.06] px-4 py-[15px] text-left last:border-b-0",
              "transition-colors duration-200 active:bg-[#0B1324]/[0.04] disabled:opacity-60",
              selected && "bg-[#0B1324]/[0.03]",
            )}
          >
            {Icon && <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", selected ? "text-[#0B1324]" : "text-slate-400")} strokeWidth={1.7} />}
            <span className={cn("flex-1 text-[16px] transition-colors", selected ? "font-bold" : "font-medium text-slate-700")}>
              {o.label}
            </span>
            <CheckDot on={selected} />
          </button>
        );
      })}
    </div>
  );
}

/** Escolha curta em fichas — para listas longas de respostas de uma palavra. */
function ChipChoice({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(o.value)}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-full border px-4 text-[15px]",
              "transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]",
              selected
                ? "border-[#0B1324] bg-[#0B1324] font-semibold text-white"
                : "border-[#0B1324]/[0.1] bg-white font-medium text-slate-700 hover:border-[#0B1324]/25",
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** O convite do par como uma opção com contexto, não uma linha de configuração. */
function InviteOption({
  open,
  onOpen,
  code,
  onCode,
  reduceMotion,
}: {
  open: boolean;
  onOpen: () => void;
  code: string;
  onCode: (v: string) => void;
  reduceMotion: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#0B1324]/[0.14]">
      {!open ? (
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/[0.02]">
          <CouplePair a="" b="" size={22} />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">O teu par já criou o espaço?</span>
            <span className="block text-[13px] text-slate-500">Usa o código dele para entrares no mesmo.</span>
          </span>
          <span className="text-[13px] font-semibold text-slate-500">Inserir</span>
        </button>
      ) : (
        <AnimatePresence initial={false}>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="px-4 py-3"
          >
            <label htmlFor="onboarding-invite" className="flex items-center gap-3">
              <CouplePair a="" b="" size={22} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-slate-400">Código do vosso espaço</span>
                <input
                  id="onboarding-invite"
                  type="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="EX: AMOR2024"
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  className="mt-0.5 block w-full bg-transparent text-[16px] font-bold tracking-[0.12em] text-[#0B1324] outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-300"
                />
              </span>
            </label>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

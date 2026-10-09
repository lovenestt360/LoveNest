import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import {
  AuthHeader,
  AuthPage,
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
import { Crescent, NestMark, NestPair } from "@/features/auth/Nest";
import {
  ChipChoice,
  GoalChoice,
  GreetingMoment,
  InviteOption,
  JourneyDone,
  JourneyShell,
  LocalTimeMoment,
  ModeChoice,
} from "@/features/onboarding/Journey";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { getPasswordError } from "@/lib/passwordPolicy";
import { CountryPicker } from "@/components/onboarding/CountryPicker";
import { COUNTRIES } from "@/data/countries";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

// ── Main ──────────────────────────────────────────────────────────────────────

type Phase = "intro" | "form" | "welcome" | "country" | "gender" | "spiritual" | "mode" | "goal" | "done";

// Cada passo pertence a uma etapa da jornada, e aproxima os dois lados do ninho.
const JOURNEY: Partial<Record<Phase, { chapter: number; gap: number }>> = {
  country:   { chapter: 0, gap: 0.92 },
  gender:    { chapter: 0, gap: 0.8 },
  spiritual: { chapter: 0, gap: 0.68 },
  mode:      { chapter: 1, gap: 0.52 },
  goal:      { chapter: 2, gap: 0.32 },
};

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
  { value: "couple", label: "A dois" },
  { value: "solo",   label: "Só para mim" },
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

  // `goal` chega por parâmetro: chamado logo após setPrimaryGoal, o estado
  // ainda teria o valor anterior.
  const handleSaveProfile = async (goal: string = primaryGoal) => {
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
          primary_goal:             goal || null,
          onboarding_completed:     true,
          onboarding_completed_at:  new Date().toISOString(),
          timezone:                 Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).eq("user_id", uid);
        track("onboarding_v2_completed", { usage_mode: usageMode, religion, primary_goal: goal });
      }
    } catch { /* silent */ }
    setSavingProfile(false);
  };

  // Conclusão: os dois lados encontram-se enquanto o perfil é guardado.
  const finishJourney = async (goal: string = primaryGoal) => {
    goToStep("done");
    await Promise.all([handleSaveProfile(goal), new Promise((r) => setTimeout(r, 1800))]);
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
          meet
          right={
            <HeaderLink onClick={() => { markSeen(); navigate("/entrar?returning=1"); }}>
              Já tenho conta
            </HeaderLink>
          }
        />

        <section className="flex flex-1 flex-col justify-center py-10">
          <Reveal>
            <h1 className="max-w-[15ch] text-[32px] font-extrabold leading-[1.06] tracking-[-0.04em]">
              Um lado de cada vez.
            </h1>
            <p className="mt-3 max-w-[32ch] text-[15px] leading-[1.55] text-slate-500">
              Começas tu. O teu par junta-se depois. O resto acontece no dia a dia.
            </p>
          </Reveal>

          {/* A sequência real, contada com o próprio ninho: tu, o teu par, os dois. */}
          <Reveal delay={0.08} className="mt-9">
            <ol className="border-y border-[#0B1324]/[0.08]">
              {[
                { mark: <Crescent side="a" height={26} />, t: "Crias o teu lado.", d: "Leva menos de um minuto." },
                { mark: <Crescent side="b" height={26} />, t: "O teu par junta-se.", d: "Com o código do vosso espaço." },
                { mark: <NestMark size={22} />, t: "O espaço passa a ser vosso.", d: "Conversas, memórias e rituais, só entre os dois." },
              ].map((s) => (
                <li key={s.t} className="flex items-center gap-4 border-b border-[#0B1324]/[0.06] py-4 last:border-b-0">
                  <span className="flex w-10 shrink-0 justify-center">{s.mark}</span>
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

  if (phase === "done") {
    return <JourneyDone solo={usageMode === "solo"} name={name} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || "T";
  const step = JOURNEY[phase];

  if (step) {
    // Uma única moldura para todos os passos: o ninho do topo não remonta,
    // aproxima-se. O lado azul ganha cor quando se escolhe "A dois".
    const common = {
      chapter: step.chapter,
      gap: step.gap,
      partner: usageMode === "couple" ? ("present" as const) : ("pending" as const),
      visible: stepVisible,
    };

    if (phase === "country") {
      return (
        <JourneyShell
          {...common}
          onBack={() => goToStep("welcome")}
          onSkip={() => goToStep("gender")}
          question="Onde estás agora?"
          hint="Usamos isto para adaptar horas, datas e conteúdos."
          moment={<LocalTimeMoment country={country} />}
        >
          <CountryPicker
            value={countryCode || null}
            triggerClassName="h-[58px] rounded-2xl border-[#0B1324]/[0.08] bg-white text-[16px] font-semibold"
            onSelect={(code) => {
              setCountryCode(code);
              setCountry(COUNTRIES.find(c => c.code === code)?.name ?? "");
              setTimeout(() => goToStep("gender"), 700);
            }}
          />
        </JourneyShell>
      );
    }

    if (phase === "gender") {
      return (
        <JourneyShell
          {...common}
          onBack={() => goToStep("country")}
          onSkip={() => goToStep("spiritual")}
          previousAnswer={country}
          question="Como preferes que falemos contigo?"
          hint="Opcional. Só muda a forma como o LoveNest se dirige a ti."
          moment={<GreetingMoment gender={gender} name={name} />}
        >
          <ChipChoice
            options={GENDER_OPTIONS}
            value={gender}
            onSelect={(v) => { setGender(v); setTimeout(() => goToStep("spiritual"), 650); }}
          />
        </JourneyShell>
      );
    }

    if (phase === "spiritual") {
      const faith = religion && religion !== "none" && religion !== "unspecified";
      return (
        <JourneyShell
          {...common}
          onBack={() => goToStep("gender")}
          onSkip={() => goToStep("mode")}
          previousAnswer={labelOf(GENDER_OPTIONS, gender)}
          question="A fé faz parte da tua vida?"
          hint="Se sim, mostramos oração e jejum. Se não, ficam fora do caminho."
        >
          <ChipChoice
            options={RELIGION_OPTIONS}
            value={religion}
            onSelect={(v) => { setReligion(v); setTimeout(() => goToStep("mode"), 400); }}
          />
          {religion && (
            <p className="mt-5 px-1 text-[13px] text-slate-500" aria-live="polite">
              {faith ? "Oração e jejum vão aparecer na tua Home." : "Oração e jejum ficam escondidos."}
            </p>
          )}
        </JourneyShell>
      );
    }

    if (phase === "mode") {
      return (
        <JourneyShell
          {...common}
          onBack={() => goToStep("spiritual")}
          onSkip={() => goToStep("goal")}
          previousAnswer={labelOf(RELIGION_OPTIONS, religion)}
          question="Para quem é este espaço?"
          hint="Podes mudar isto mais tarde nas definições."
        >
          <ModeChoice
            value={usageMode}
            initial={initial}
            onSelect={(v) => { setUsageMode(v); setTimeout(() => goToStep("goal"), 650); }}
          />
        </JourneyShell>
      );
    }

    // goal
    return (
      <JourneyShell
        {...common}
        onBack={() => goToStep("mode")}
        onSkip={() => finishJourney()}
        skipBusy={savingProfile}
        skipLabel="Saltar e entrar"
        previousAnswer={labelOf(MODE_OPTIONS, usageMode)}
        question="O que te trouxe ao LoveNest?"
        hint="Escolhe o que pesa mais agora. A tua Home organiza-se à volta disso."
      >
        <GoalChoice
          value={primaryGoal}
          solo={usageMode === "solo"}
          disabled={savingProfile}
          onSelect={(v) => { setPrimaryGoal(v); setTimeout(() => finishJourney(v), 400); }}
        />
      </JourneyShell>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────

  const joining = showInvite && inviteCode.trim().length > 0;
  const typedInitial = name.trim().charAt(0).toUpperCase();

  return (
    <AuthScaffold
      title="Começa pelo teu lado."
      subtitle={
        joining
          ? "Vais entrar no espaço que o teu par já criou."
          : "Depois convidas o teu par — ou entras no espaço que ele já criou."
      }
      headerRight={<HeaderLink onClick={() => setPhase("intro")}>Voltar</HeaderLink>}
      motif={
        // O teu lado ganha a tua inicial enquanto escreves; o do par fica guardado.
        <div className="flex items-center gap-3">
          <NestPair a={typedInitial} b="" size={28} partner={joining ? "present" : "pending"} />
          <span className="text-[12px] font-semibold text-slate-400">
            {joining ? "Os dois lados, no mesmo espaço." : typedInitial ? "O teu lado. O do teu par fica guardado." : "O teu lado, primeiro."}
          </span>
        </div>
      }
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
          />

          <PrimaryButton type="submit" disabled={loading || googleLoading} loading={loading}>
            Criar o nosso espaço
          </PrimaryButton>
        </form>
      </div>
    </AuthScaffold>
  );
}

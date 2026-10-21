import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { getPasswordError } from "@/lib/passwordPolicy";
import { CountryPicker } from "@/components/onboarding/CountryPicker";
import { COUNTRIES } from "@/data/countries";
import { Guardian, type GuardianHandle } from "@/features/entry/Guardian";
import { BackButton, ChatScript, CountUp, EntryScreen, GoogleIcon, type ChatLine } from "@/features/entry/EntryKit";
import { isValidEmail, prefersReducedMotion } from "@/features/entry/entryUtils";

// ── Passos ────────────────────────────────────────────────────────────────────

type Phase = "intro" | "form" | "welcome" | "country" | "gender" | "spiritual" | "mode";
type Step = "country" | "gender" | "spiritual" | "mode";

const STEPS: Step[] = ["country", "gender", "spiritual", "mode"];

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
  { value: "couple", label: "A dois",  desc: "Ligado ao teu par, no mesmo espaço" },
  { value: "solo",   label: "A solo",  desc: "Um espaço só teu" },
];

const QUESTIONS: Record<Step, ChatLine[]> = {
  country:   [["app", "Onde estás?"], ["app", "Ajuda-me a adaptar o conteúdo à tua região."]],
  gender:    [["app", "Como te identificas?"], ["app", "É opcional. Só para eu falar contigo da forma certa."]],
  spiritual: [["app", "Tens fé?"], ["app", "Se quiseres, ativo conteúdos espirituais para ti."]],
  mode:      [["app", "Como vais usar o LoveNest?"], ["app", "Podes mudar depois nas definições."]],
};

const LAST_NAME_KEY = "lovenest_last_name";

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [phase, setPhase] = useState<Phase>("intro");

  // If URL has ?code= we're in an OAuth callback — don't show intro until session resolves
  const [authResolved, setAuthResolved] = useState(
    () => !new URLSearchParams(window.location.search).get("code")
  );

  const [name, setName]           = useState(localStorage.getItem("onboarding_name") || "");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
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
  const [savingProfile, setSavingProfile] = useState(false);

  // O Guardião e a conversa de cada passo
  const pet = useRef<GuardianHandle>(null);
  const [talking, setTalking] = useState(false);
  const [listShown, setListShown] = useState(false);
  const [reply, setReply] = useState<ChatLine[] | null>(null);
  const [finished, setFinished] = useState(false);
  const advance = useRef<number>();

  const navigate  = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const markSeen = () => localStorage.setItem("onboarding_seen", "1");
  const firstName = name.trim().split(" ")[0];

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
        .select("onboarding_completed, display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile?.onboarding_completed) {
        navigate("/casa", { replace: true });
      } else {
        if (profile?.display_name) {
          setName((n) => n || profile.display_name || "");
          localStorage.setItem(LAST_NAME_KEY, profile.display_name.split(" ")[0]);
        }
        markSeen();
        goTo("welcome");
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

  // A introdução: a Faísca vai dizendo coisas de vez em quando.
  useEffect(() => {
    if (phase !== "intro" || !authResolved || prefersReducedMotion()) return;
    const lines = ["Olá! 👋", "Sou a Faísca", "Cuido da vossa chama 🔥", "Toca-me 💕"];
    let k = 0;
    const first = window.setTimeout(() => pet.current?.say(lines[0]), 1800);
    const idle = window.setInterval(() => {
      k = (k + 1) % lines.length;
      pet.current?.react("wiggle");
      pet.current?.say(lines[k]);
    }, 5200);
    return () => { window.clearTimeout(first); window.clearInterval(idle); };
  }, [phase, authResolved]);

  useEffect(() => () => window.clearTimeout(advance.current), []);

  const goTo = (next: Phase) => {
    window.clearTimeout(advance.current);
    setReply(null);
    setTalking(false);
    setListShown(false);
    setFinished(false);
    setPhase(next);
    window.scrollTo(0, 0);
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
          onboarding_completed:     true,
          onboarding_completed_at:  new Date().toISOString(),
          timezone:                 Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).eq("user_id", uid);
        track("onboarding_v2_completed", { usage_mode: usageMode, religion });
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
      pet.current?.react("shake");
      pet.current?.say("Como te chamas? 😊");
      toast({ variant: "destructive", title: "Nome inválido", description: "Insere pelo menos 2 caracteres." });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      pet.current?.react("shake");
      pet.current?.say("Hmm, esse email não parece certo");
      toast({ variant: "destructive", title: "Email inválido", description: "Usa um email completo, ex: nome@gmail.com" });
      return;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      pet.current?.react("shake");
      pet.current?.say("A senha precisa de ser mais forte");
      toast({ variant: "destructive", title: "Senha fraca", description: passwordError });
      return;
    }

    pet.current?.react("happy");
    pet.current?.hearts();
    pet.current?.say("Vamos lá! ✨", 0);
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
      localStorage.setItem(LAST_NAME_KEY, trimmedName.split(" ")[0]);

      if (data.session) {
        track("signup_completed", { method: "email", has_invite: !!inviteCode });
        setSignedInUserId(data.session.user.id);
        goTo("welcome");
      } else {
        track("signup_email_confirm", { has_invite: !!inviteCode });
        localStorage.setItem("confirm_email", trimmedEmail);
        navigate("/confirmar-email");
      }
    } catch (err) {
      pet.current?.react("shake");
      pet.current?.say("Ups, algo correu mal");
      toast({ variant: "destructive", title: "Erro ao criar conta", description: err instanceof Error ? err.message : String(err) });
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
      <EntryScreen className="items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#0B1324]/40" />
      </EntryScreen>
    );
  }

  // ── Introdução ────────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <EntryScreen>
        <div className="en-row en-in" style={{ ["--d" as string]: 0 }}>
          <span className="en-word">Love<i>N</i>est</span>
          <button type="button" className="en-link" onClick={() => { markSeen(); navigate("/entrar"); }}>
            Entrar
          </button>
        </div>

        <div className="en-preview" aria-hidden="true">
          <div className="en-card" style={{ top: 0, left: 10, right: 150, ["--r" as string]: "-2.5deg", animationDelay: ".2s, 1s" }}>
            <div className="en-k">Tempo juntos</div>
            <div className="en-big"><CountUp to={271} /> <small>dias</small></div>
          </div>
          <Guardian
            ref={pet}
            kind="faisca"
            width={170}
            sayAt="top"
            delay={3}
            tapLines={["Olá! 💕", "Hehe 😊", "Vamos criar o vosso espaço?"]}
            style={{ position: "absolute", left: "50%", marginLeft: -28, top: 24 }}
          >
            <span className="en-float-heart" style={{ left: "46%", top: "2%", animationDelay: "2s" }}>♥</span>
            <span className="en-float-heart" style={{ left: "60%", top: "6%", animationDelay: "3.4s" }}>♥</span>
          </Guardian>
          <div className="en-card" style={{ top: 196, left: 0, right: 70, ["--r" as string]: "1.8deg", animationDelay: ".45s, 1.6s" }}>
            <div className="en-k">Hoje</div>
            <ChatScript
              style={{ marginTop: 8 }}
              start={1400}
              script={[["app", "Já saíste do trabalho?"], ["me", "Quase, 20 minutos"]]}
            />
          </div>
        </div>

        <div className="en-spacer" />
        <h1 className="en-h1 en-in" style={{ ["--d" as string]: 6 }}>O amor também vive nos dias comuns.</h1>
        <p className="en-sub en-in" style={{ ["--d" as string]: 7 }}>
          Um espaço só para os dois. Cria o vosso em menos de um minuto.
        </p>
        <button
          type="button"
          className="en-btn en-in"
          style={{ ["--d" as string]: 8, marginTop: 24 }}
          onClick={() => goTo("form")}
        >
          Criar o nosso espaço <span className="en-arrow">→</span>
        </button>
        <p className="en-small en-in" style={{ ["--d" as string]: 9, marginTop: 14 }}>
          Grátis · privado · sem publicidade
        </p>
      </EntryScreen>
    );
  }

  // ── Boas-vindas: o Guardião apresenta-se ──────────────────────────────────

  if (phase === "welcome") {
    return (
      <EntryScreen key="welcome" className="en-step">
        <Guardian
          ref={pet}
          kind="guardiao"
          width={150}
          sayAt="right"
          talking={talking}
          style={{ margin: "6px auto 4px" }}
        />
        <p className="en-from en-in" style={{ ["--d" as string]: 1 }}>O teu Guardião</p>
        <ChatScript
          style={{ marginTop: 8 }}
          start={500}
          onTalking={setTalking}
          onDone={() => setListShown(true)}
          script={[
            ["app", firstName ? `Olá, ${firstName} 👋` : "Olá 👋"],
            ["app", "Que bom ter-te aqui. Falta pouco para o vosso espaço ficar pronto."],
            ["app", "Vou fazer-te quatro perguntas rápidas, para me ajustar a vocês."],
          ]}
        />
        {listShown && (
          <div className="en-list">
            {[
              ["Onde estás", "país"],
              ["Como te identificas", "opcional"],
              ["A tua fé", "opcional"],
              ["Como vais usar", "a dois ou solo"],
            ].map(([label, hint], i) => (
              <div key={label} className="en-li" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="en-n">{i + 1}</span>{label}<em>{hint}</em>
              </div>
            ))}
          </div>
        )}
        <div className="en-spacer" />
        <button
          type="button"
          className="en-btn en-in"
          style={{ ["--d" as string]: 4 }}
          onClick={() => {
            pet.current?.react("happy");
            pet.current?.hearts(9);
            pet.current?.say("Boa! Começamos 💙");
            advance.current = window.setTimeout(() => goTo("country"), prefersReducedMotion() ? 0 : 750);
          }}
        >
          Começar <span className="en-arrow">→</span>
        </button>
        <p className="en-small en-in" style={{ ["--d" as string]: 5, marginTop: 6 }}>
          <button type="button" className="en-quiet py-2" onClick={() => navigate("/casa")}>Saltar por agora</button>
        </p>
      </EntryScreen>
    );
  }

  // ── As quatro perguntas ───────────────────────────────────────────────────

  if (STEPS.includes(phase as Step)) {
    const step = phase as Step;
    const idx = STEPS.indexOf(step);
    const isLast = idx === STEPS.length - 1;
    const answered = { country: countryCode, gender, spiritual: religion, mode: usageMode }[step];
    const next = () => (isLast ? undefined : goTo(STEPS[idx + 1]));
    const back = () => goTo(idx === 0 ? "welcome" : STEPS[idx - 1]);

    // Responde: a resposta aparece como mensagem, o Guardião reage e,
    // nos três primeiros passos, avança sozinho depois de falar.
    const answer = (label: string, line: string, mood: "happy" | "nod", hearts = 0) => {
      window.clearTimeout(advance.current);
      pet.current?.react(mood);
      if (hearts) pet.current?.hearts(hearts);
      setReply([["me", label], ["app", line]]);
    };

    const finish = () => {
      if (finished) return;
      setFinished(true);
      pet.current?.react("spin");
      pet.current?.hearts(12);
    };

    return (
      <EntryScreen key={step} className="en-step">
        <div className="en-row en-in" style={{ ["--d" as string]: 0 }}>
          <BackButton onClick={back} />
          <div className="en-prog" aria-label={`Passo ${idx + 1} de ${STEPS.length}`}>
            {STEPS.map((s, i) => <span key={s} className={cn((i < idx || (i === idx && answered)) && "on")} />)}
          </div>
          <button type="button" className="en-skip" onClick={() => (isLast ? handleSaveProfile() : next())}>
            Saltar
          </button>
        </div>

        <p className="en-eyebrow en-in" style={{ ["--d" as string]: 1, marginTop: 30 }}>{idx + 1} de {STEPS.length}</p>
        <div className="en-speaker" style={{ marginTop: 10 }}>
          <Guardian ref={pet} kind="guardiao" width={64} sayAt="right" talking={talking} delay={1} />
          <ChatScript script={QUESTIONS[step]} start={350} onTalking={setTalking} />
        </div>

        <div style={{ marginTop: 22 }}>
          {step === "country" && (
            <div className="en-in" style={{ ["--d" as string]: 14 }}>
              <CountryPicker
                value={countryCode || null}
                onSelect={(code) => {
                  const found = COUNTRIES.find((c) => c.code === code)?.name ?? "";
                  setCountryCode(code);
                  setCountry(found);
                  answer(found || code, `Que bom, ${found || "anotado"} 🌍`, "happy", 6);
                }}
              />
            </div>
          )}

          {step === "gender" && (
            <div className="en-grid2">
              {GENDER_OPTIONS.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn("en-opt", gender === o.value && "sel")}
                  style={{ animationDelay: `${1.6 + i * 0.08}s` }}
                  onClick={() => {
                    setGender(o.value);
                    answer(o.label, o.value === "unspecified" ? "Sem problema, fica entre nós." : "Obrigado por partilhares 💙", "nod");
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {step === "spiritual" && (
            <div className="en-grid2">
              {RELIGION_OPTIONS.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn("en-opt", religion === o.value && "sel", i === RELIGION_OPTIONS.length - 1 && "col-span-2")}
                  style={{ animationDelay: `${1.6 + i * 0.06}s` }}
                  onClick={() => {
                    setReligion(o.value);
                    const faith = o.value !== "none" && o.value !== "unspecified";
                    answer(o.label, faith ? "Vou incluir conteúdos de fé para ti 🙏" : "Tudo bem, fica ao teu ritmo.", faith ? "happy" : "nod", faith ? 5 : 0);
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {step === "mode" && (
            <div className="en-stack" style={{ gap: 10 }}>
              {MODE_OPTIONS.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn("en-opt", usageMode === o.value && "sel")}
                  style={{ animationDelay: `${1.8 + i * 0.12}s` }}
                  onClick={() => {
                    if (finished) return;
                    setUsageMode(o.value);
                    if (o.value === "solo") answer(o.label, "Perfeito, este espaço é só teu.", "nod");
                    else answer(o.label, "Lindo. Depois convidas o teu par com um código.", "happy", 10);
                  }}
                >
                  <div>{o.label}<small>{o.desc}</small></div>
                  <span className="en-radio" />
                </button>
              ))}
            </div>
          )}
        </div>

        {reply && (
          <ChatScript
            script={reply}
            start={100}
            onTalking={setTalking}
            style={{ marginTop: 14, paddingLeft: 74 }}
            onDone={() => {
              if (!isLast) advance.current = window.setTimeout(next, prefersReducedMotion() ? 400 : 900);
            }}
          />
        )}
        {finished && (
          <ChatScript
            script={[["app", "Tudo pronto. Bem-vindos a casa 🏡"]]}
            start={150}
            onTalking={setTalking}
            style={{ marginTop: 8, paddingLeft: 74 }}
            onDone={() => { advance.current = window.setTimeout(handleSaveProfile, prefersReducedMotion() ? 0 : 900); }}
          />
        )}

        <div className="en-spacer" />
        <button
          type="button"
          className="en-btn en-in"
          style={{ ["--d" as string]: 16 }}
          disabled={!answered || savingProfile || (isLast && finished)}
          onClick={() => (isLast ? finish() : next())}
        >
          {savingProfile
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <>{isLast ? "Concluir" : "Continuar"} <span className="en-arrow">→</span></>}
        </button>
      </EntryScreen>
    );
  }

  // ── Criar conta ───────────────────────────────────────────────────────────

  return (
    <EntryScreen key="form" className="en-step">
      <form onSubmit={handleSignup} className="flex flex-1 flex-col" noValidate>
        <BackButton onClick={() => goTo("intro")} className="en-in" />
        <div className="en-row" style={{ marginTop: 14, alignItems: "flex-end" }}>
          <h1 className="en-h1 en-in" style={{ ["--d" as string]: 1, maxWidth: 220 }}>Criar o vosso espaço</h1>
          <Guardian ref={pet} kind="faisca" width={78} delay={2} shy={passFocus && !showPassword} style={{ marginRight: -4 }} />
        </div>
        <p className="en-sub en-in" style={{ ["--d" as string]: 2 }}>
          Começa por ti. O teu par junta-se depois com um código.
        </p>

        <div className="en-stack" style={{ marginTop: 18, gap: 12 }}>
          <div className="en-in" style={{ ["--d" as string]: 3 }}>
            <label className="en-label" htmlFor="su-name">Nome</label>
            <input
              id="su-name"
              className="en-field"
              type="text"
              autoComplete="given-name"
              placeholder="Como te chamas"
              value={name}
              onFocus={() => { if (!name) pet.current?.say("Como te chamas? 😊"); }}
              onChange={(e) => {
                setName(e.target.value);
                pet.current?.react("nod");
                const v = e.target.value.trim().split(" ")[0];
                pet.current?.say(v ? `Olá, ${v}! 👋` : "Como te chamas? 😊", 0);
              }}
              onBlur={() => { if (firstName) pet.current?.say(`Olá, ${firstName}! 👋`); }}
            />
          </div>
          <div className="en-in" style={{ ["--d" as string]: 4 }}>
            <label className="en-label" htmlFor="su-email">Email</label>
            <input
              id="su-email"
              className="en-field"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nome@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); pet.current?.react("nod"); }}
              onBlur={() => {
                if (!email.trim()) return;
                if (isValidEmail(email.trim())) { pet.current?.react("happy"); pet.current?.say("Perfeito ✓"); }
                else { pet.current?.react("shake"); pet.current?.say(email.includes("@") ? "Hmm, falta alguma coisa?" : "Hmm, falta o @?"); }
              }}
            />
          </div>
          <div className="en-in" style={{ ["--d" as string]: 5 }}>
            <label className="en-label" htmlFor="su-pass">Senha</label>
            <div className="en-field-wrap">
              <input
                id="su-pass"
                className="en-field"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onFocus={() => { setPassFocus(true); if (!showPassword) pet.current?.say("Não estou a espreitar 🙈", 0); }}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (e.target.value.length === 8) pet.current?.say("Agora sim 🔒", 0);
                }}
                onBlur={() => {
                  setPassFocus(false);
                  if (!password) return;
                  pet.current?.say(getPasswordError(password) ? "Mais umas letrinhas?" : "Senha segura 💪");
                }}
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
          {showInvite && (
            <div className="en-in">
              <label className="en-label" htmlFor="su-code">Código do teu par</label>
              <input
                id="su-code"
                className="en-field"
                type="text"
                autoCapitalize="characters"
                placeholder="Ex: AMOR2024"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: ".08em", fontWeight: 600 }}
              />
            </div>
          )}
        </div>

        {!showInvite && (
          <button
            type="button"
            className="en-invite en-in"
            style={{ ["--d" as string]: 6 }}
            onClick={() => { setShowInvite(true); pet.current?.react("happy"); pet.current?.say("O teu par já cá está? 💕"); }}
          >
            <span>+</span> Tenho um código do meu par
          </button>
        )}

        <div className="en-spacer" />
        <button type="submit" className="en-btn en-in" style={{ ["--d" as string]: 7 }} disabled={loading || googleLoading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continuar <span className="en-arrow">→</span></>}
        </button>
        <div className="en-or en-in" style={{ ["--d" as string]: 8, margin: "16px 0" }}>ou</div>
        <button
          type="button"
          className="en-btn en-ghost en-in"
          style={{ ["--d" as string]: 9 }}
          onClick={handleGoogle}
          disabled={googleLoading || loading}
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-[18px] w-[18px]" />}
          Continuar com Google
        </button>
        <p className="en-small en-in" style={{ ["--d" as string]: 10, marginTop: 16 }}>
          Já tens conta?{" "}
          <button type="button" onClick={() => { markSeen(); navigate("/entrar"); }}>Entrar</button>
        </p>
      </form>
    </EntryScreen>
  );
}

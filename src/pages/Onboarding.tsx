import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogoMark } from "@/components/Logo";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

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

// ── Intro visual ──────────────────────────────────────────────────────────────

function IntroVisual() {
  return (
    <div className="relative w-44 h-36 mx-auto">
      <div className="absolute inset-0 rounded-full bg-rose-50/50 blur-3xl scale-75" />
      <div className="absolute w-18 h-18 w-[72px] h-[72px] rounded-full bg-rose-100/90 top-4 left-4 animate-ob-float-a" />
      <div
        className="absolute w-14 h-14 rounded-full bg-rose-50 border border-rose-100 bottom-4 right-4 animate-ob-float-b"
        style={{ animationDelay: "-4s" }}
      />
    </div>
  );
}

// ── Input shared style ────────────────────────────────────────────────────────

const INPUT = "w-full h-12 rounded-2xl border border-[#eeeeee] bg-white px-4 text-[15px] font-medium text-foreground placeholder:text-[#d4d4d4] focus:outline-none focus:border-[#ddd0d0] focus:ring-2 focus:ring-rose-50 transition-all";

// ── Main ──────────────────────────────────────────────────────────────────────

type Phase = "intro" | "form";

export default function Onboarding() {
  const [phase, setPhase] = useState<Phase>("intro");

  // Form state
  const [name, setName]           = useState(localStorage.getItem("onboarding_name") || "");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [inviteCode, setInviteCode] = useState(
    sessionStorage.getItem("lovenest_ref") || localStorage.getItem("lovenest_ref") || ""
  );
  const [showInvite, setShowInvite] = useState(
    !!(sessionStorage.getItem("lovenest_ref") || localStorage.getItem("lovenest_ref"))
  );
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate  = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const markSeen = () => localStorage.setItem("onboarding_seen", "1");

  // Capture ?ref=CODE from URL (shared invite links)
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
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Senha curta", description: "Mínimo de 6 caracteres." });
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
        navigate("/casa");
      } else {
        track("signup_email_confirm", { has_invite: !!inviteCode });
        // Store email so confirmation screen can display it
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
      options: { redirectTo: window.location.origin + "/casa" },
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro com Google", description: error.message });
      setGoogleLoading(false);
    }
  };

  // ── Intro screen ──────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-white flex flex-col select-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-12 shrink-0">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-[13px] font-bold tracking-tight text-foreground">LoveNest</span>
          </div>
          <button
            onClick={() => { markSeen(); navigate("/entrar"); }}
            className="text-[12px] font-medium text-[#ccc] hover:text-[#999] transition-colors px-2 py-1"
          >
            Já tenho conta
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-12">
            <IntroVisual />
          </div>
          <div className="text-center space-y-5 max-w-[272px]">
            <h1 className="text-[28px] font-bold text-foreground leading-[1.2] tracking-tight">
              O amor também vive nos dias comuns.
            </h1>
            <p className="text-[14px] text-[#999] leading-[1.7]">
              Cria o vosso espaço em menos de um minuto.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="px-8 pb-14 pt-6 shrink-0 space-y-3">
          <button
            onClick={() => setPhase("form")}
            className="w-full h-14 rounded-2xl bg-rose-500/90 text-white font-semibold text-[15px] active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)] flex items-center justify-center gap-2"
          >
            Começar
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <p className="text-center text-[10px] text-[#d8d8d8] tracking-[0.06em] animate-ob-hint">
            grátis · privado · sem publicidade
          </p>
        </div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {/* Ambient warmth */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 blur-[90px] pointer-events-none" />

      {/* Back */}
      <div className="px-5 pt-12 shrink-0">
        <button
          onClick={() => setPhase("intro")}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[#c0c0c0]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 py-6 relative z-10">
        <div className="w-full max-w-[320px] mx-auto space-y-6">

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
              Criar o vosso espaço.
            </h1>
            <p className="text-[13px] text-[#999]">Começa em segundos.</p>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full h-12 rounded-2xl border border-[#e8e8e8] bg-white text-[13px] font-semibold text-foreground flex items-center justify-center gap-3 hover:bg-[#f9f9f9] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#717171]" /> : <GoogleIcon className="w-4 h-4" />}
            Continuar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#f0f0f0]" />
            <span className="text-[11px] text-[#bbb]">ou</span>
            <div className="flex-1 h-px bg-[#f0f0f0]" />
          </div>

          {/* Form */}
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
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={INPUT}
            />

            {/* Invite code toggle */}
            {!showInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="text-[12px] text-[#bbb] hover:text-[#717171] transition-colors w-full text-left px-1"
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
              className="w-full h-12 rounded-2xl bg-rose-500/90 text-white font-semibold text-[14px] disabled:opacity-40 active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)] flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Criar espaço <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></>}
            </button>
          </form>

          <p className="text-center text-[11px] text-[#bbb]">
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

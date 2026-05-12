import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowRight } from "lucide-react";

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

export default function Signup() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast }     = useToast();

  useEffect(() => {
    const ref = searchParams.get("ref") || sessionStorage.getItem("lovenest_ref");
    if (ref) { setInviteCode(ref); sessionStorage.setItem("lovenest_ref", ref); }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Persist code in localStorage so useReferralTracking finds it even
    // after the email-verification redirect (sessionStorage doesn't survive)
    if (inviteCode) localStorage.setItem("lovenest_ref", inviteCode);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: displayName, referred_by_code: inviteCode || undefined },
          emailRedirectTo: window.location.origin + "/casa",
        },
      });
      if (error) throw error;
      if (data.session) {
        navigate("/casa");
      } else {
        toast({ title: "Verifica o teu e-mail!", description: "Enviámos um link de confirmação." });
        navigate("/entrar");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao criar", description: err.message });
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold text-foreground">Criar conta</h1>
            <p className="text-sm text-[#717171] mt-1">A tua jornada de casal começa aqui</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-7 space-y-5">

          {/* Google */}
          <button
            type="button"
            onClick={async () => {
              setGoogleLoading(true);
              // Persistir código de convite em localStorage antes do redirect OAuth
              // (sessionStorage não sobrevive ao redirect externo do Google)
              if (inviteCode) localStorage.setItem("lovenest_ref", inviteCode);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin + "/casa" },
              });
              if (error) {
                toast({ variant: "destructive", title: "Erro com Google", description: error.message });
                setGoogleLoading(false);
              }
            }}
            disabled={googleLoading || loading}
            className="w-full h-12 rounded-2xl border border-[#e5e5e5] bg-white text-sm font-semibold text-foreground flex items-center justify-center gap-3 hover:bg-[#f9f9f9] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-[#717171]" />
              : <GoogleIcon className="w-5 h-5" />
            }
            Continuar com Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#f0f0f0]" />
            <span className="text-[11px] font-medium text-[#717171]">ou cria com email</span>
            <div className="flex-1 h-px bg-[#f0f0f0]" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">O teu nome</label>
              <Input
                type="text"
                placeholder="Ex: João"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="teu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Código de convite <span className="text-[#717171] font-normal">(opcional)</span>
              </label>
              <Input
                type="text"
                placeholder="Ex: AMOR2024"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
              />
              {inviteCode && (
                <p className="text-[11px] text-rose-500 font-medium px-1">
                  Ganha 60 pontos ao registar com código de convite.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <> Criar conta <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
              }
            </button>
          </form>

          <div className="pt-4 border-t border-[#f5f5f5] text-center">
            <p className="text-sm text-[#717171]">
              Já tens conta?{" "}
              <button
                onClick={() => navigate("/entrar")}
                className="font-semibold text-rose-500 hover:underline"
              >
                Entrar
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

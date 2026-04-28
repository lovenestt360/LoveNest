import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowRight } from "lucide-react";

export default function Signup() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading]       = useState(false);

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
        <div className="glass-card p-7 space-y-4">
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
                  Ganha 100 pontos iniciais ao registar com código.
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

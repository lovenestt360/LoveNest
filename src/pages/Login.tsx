import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const [tab, setTab]               = useState<"password" | "magic">("password");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [magicSent, setMagicSent]   = useState(false);

  const navigate    = useNavigate();
  const location    = useLocation();
  const { toast }   = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/casa", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if ((location.state as any)?.bounced) {
      toast({ variant: "destructive", title: "Sessão Expirada", description: (location.state as any).bounced });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (error) throw error;
      navigate("/casa");
    } catch (err: any) {
      const msg = err.message.includes("Invalid login credentials")
        ? "Email ou senha incorretos."
        : err.message;
      toast({ variant: "destructive", title: "Erro ao entrar", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin + "/casa" },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: err.message });
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
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo</h1>
            <p className="text-sm text-[#717171] mt-1">O teu espaço privado de casal</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-7 space-y-6">

          {/* Tabs */}
          <div className="flex bg-[#f5f5f5] rounded-2xl p-1 gap-1">
            {(["password", "magic"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150",
                  tab === t ? "bg-white text-foreground shadow-sm" : "text-[#717171]"
                )}
              >
                {t === "password" ? "Senha" : "Link Mágico"}
              </button>
            ))}
          </div>

          {/* Password form */}
          {tab === "password" && (
            <form onSubmit={handlePassword} className="space-y-4">
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
                  placeholder="A tua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <> Entrar <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
                }
              </button>
            </form>
          )}

          {/* Magic link form */}
          {tab === "magic" && (
            magicSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-rose-400 fill-rose-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Link enviado!</p>
                  <p className="text-sm text-[#717171] mt-1">
                    Verifica o teu e-mail em <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>
                <button
                  onClick={() => setMagicSent(false)}
                  className="text-sm font-medium text-rose-500 hover:underline"
                >
                  Tentar outro e-mail
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagic} className="space-y-4">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <> Enviar Link <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
                  }
                </button>
              </form>
            )
          )}

          {/* Sign up link */}
          <div className="pt-4 border-t border-[#f5f5f5] text-center">
            <p className="text-sm text-[#717171]">
              Novo por aqui?{" "}
              <button
                onClick={() => navigate("/criar-conta")}
                className="font-semibold text-rose-500 hover:underline"
              >
                Cria a tua conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

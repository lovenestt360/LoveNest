import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Heart, User, Mail, Lock, Gift, ArrowRight, Sparkles } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setInviteCode(ref);
      sessionStorage.setItem("lovenest_ref", ref);
    } else {
      const storedRef = sessionStorage.getItem("lovenest_ref");
      if (storedRef) setInviteCode(storedRef);
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: displayName,
            referred_by_code: inviteCode || undefined,
          },
          emailRedirectTo: window.location.origin + "/casa",
        },
      });

      if (error) throw error;

      if (data.session) {
        toast({ title: "Bem-vindo!", description: "Conta criada com sucesso! ✨" });
        navigate("/casa");
      } else {
        toast({ title: "Verifica o teu e-mail!", description: "Enviámos um link de confirmação." });
        navigate("/entrar");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-white py-12">
      <div className="bg-mesh opacity-30" />

      <div className="w-full max-w-lg animate-fade-in space-y-8 relative z-10">
        <div className="text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white shadow-2xl mb-2 border-2 border-primary/20">
                <Heart className="h-10 w-10 text-primary fill-primary animate-pulse" />
            </div>
            <div className="space-y-1">
                <h1 className="text-5xl font-black tracking-tighter text-foreground">Inicia o Ninho</h1>
                <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">A tua jornada romântica começa aqui</p>
            </div>
        </div>

        <div className="glass-card rounded-[3rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border-white/80 bg-white/70 backdrop-blur-3xl space-y-8">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label htmlFor="displayName" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                  <User className="w-3.5 h-3.5" /> O teu Nome
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ex: João"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" title="Senha" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                <Lock className="w-3.5 h-3.5" /> Define uma Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="inviteCode" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                 <Gift className="w-3.5 h-3.5" /> Código de Convite (Opcional)
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Ex: AMOR2024"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
              />
              <p className="text-[10px] text-primary font-black italic px-2">
                Ganha 100 pontos iniciais para usares na loja! ✨
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="glass-btn-primary w-full h-16 flex items-center justify-center gap-3 font-black tracking-tight text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 mt-4"
            >
              {loading ? "A criar..." : <>Criar o Ninho <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="pt-8 text-center border-t border-zinc-100">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Já tens o teu lugar?</p>
            <button 
                onClick={() => navigate("/entrar")}
                className="group flex items-center justify-center mx-auto gap-2 text-sm font-black text-primary hover:scale-105 transition-transform"
            >
              Entrar aqui <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

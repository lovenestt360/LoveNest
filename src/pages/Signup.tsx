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
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-[#fdf2f8] py-12">
      {/* Animated Background Mesh */}
      <div className="bg-mesh opacity-10" />

      <div className="w-full max-w-lg animate-fade-in space-y-8 relative z-10">
        <div className="text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-white border border-rose-100 shadow-xl mb-2">
                <Heart className="h-10 w-10 text-primary fill-primary animate-pulse" />
            </div>
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900">Inicia o Ninho</h1>
                <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">A tua jornada romântica começa aqui</p>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl relative z-10 space-y-8">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label htmlFor="displayName" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
                  <User className="w-3.5 h-3.5" /> O teu Nome
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ex: João"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" title="Senha" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
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
                className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="inviteCode" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
                 <Gift className="w-3.5 h-3.5" /> Código de Convite (Opcional)
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Ex: AMOR2024"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
              />
              <p className="text-[10px] text-primary font-black italic px-2">
                Ganha 100 pontos iniciais para usares na loja! ✨
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 rounded-2xl text-lg font-black tracking-tight shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
            >
              {loading ? "A criar..." : "Criar o Ninho"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>

          <div className="pt-8 text-center border-t border-rose-50">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Já tens o teu lugar?</p>
            <Button
                variant="ghost"
                onClick={() => navigate("/entrar")}
                className="group w-full h-12 rounded-2xl text-sm font-black text-primary hover:bg-rose-50/50 hover:text-primary transition-all"
            >
              Entrar aqui
              <Sparkles className="ml-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

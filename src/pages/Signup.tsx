import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Heart, User, Mail, Lock, Gift, ArrowRight } from "lucide-react";

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
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
      <div className="bg-mesh" />

      <div className="w-full max-w-lg animate-fade-in space-y-8 py-10">
        <div className="text-center space-y-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl mb-4 border border-white/50">
                <Heart className="h-8 w-8 text-primary fill-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter gradient-text">Inicia o teu Ninho</h1>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">A tua jornada romântica começa aqui</p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                  <User className="w-3 h-3" /> O teu Nome
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ex: João"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                  <Mail className="w-3 h-3" /> E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="Senha" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                <Lock className="w-3 h-3" /> Define uma Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                 <Gift className="w-3 h-3" /> Código de Convite (Opcional)
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Ex: AMOR2024"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
              />
              <p className="text-[10px] text-primary font-black italic px-1">
                Ganha 100 pontos iniciais para usares na loja! ✨
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="glass-btn-primary w-full h-14 flex items-center justify-center gap-2 font-black tracking-tight mt-4"
            >
              {loading ? "A criar..." : <>Criar o Ninho <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="pt-4 text-center border-t border-white/10">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Já tens o teu lugar?</p>
            <button 
                onClick={() => navigate("/entrar")}
                className="text-sm font-black text-primary hover:scale-105 transition-transform"
            >
              Entrar aqui ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

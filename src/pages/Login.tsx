import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Heart, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/casa", { replace: true });
    });
  }, [navigate]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;
      navigate("/casa");
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes("Invalid login credentials")) {
        msg = "Email ou senha incorretos.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin + "/casa",
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      toast({
        title: "Link mágico enviado!",
        description: "Verifica o teu e-mail.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
      <div className="bg-mesh" />

      <div className="w-full max-w-md animate-fade-in space-y-8">
        <div className="text-center space-y-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl mb-4 border border-white/50">
                <Heart className="h-8 w-8 text-primary fill-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter gradient-text">Bem-vindo de volta</h1>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">O teu Hub de Casal privado</p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/20 p-1 rounded-2xl mb-6">
              <TabsTrigger value="password" className="rounded-xl font-bold text-xs uppercase tracking-wider">Senha</TabsTrigger>
              <TabsTrigger value="magic" className="rounded-xl font-bold text-xs uppercase tracking-wider">Mágico</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-pwd" title="E-mail" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                    <Mail className="w-3 h-3" /> E-mail
                  </Label>
                  <Input
                    id="email-pwd"
                    type="email"
                    placeholder="teu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" title="Senha" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                     <Lock className="w-3 h-3" /> Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="glass-btn-primary w-full h-14 flex items-center justify-center gap-2 font-black tracking-tight"
                >
                  {loading ? "A entrar..." : <>Entrar <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              {magicLinkSent ? (
                <div className="space-y-6 pt-4 text-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-foreground">Link mágico enviado!</p>
                        <p className="text-xs text-muted-foreground font-medium">Verifica a caixa de entrada em <strong>{email}</strong>.</p>
                    </div>
                  <Button
                    variant="ghost"
                    onClick={() => setMagicLinkSent(false)}
                    className="w-full font-bold text-primary hover:bg-primary/5 rounded-2xl"
                  >
                    Tentar outro e-mail
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                      <Mail className="w-3 h-3" /> E-mail para entrada rápida
                    </Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="teu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-2xl bg-white/50 border-white/40 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="glass-btn-primary w-full h-14 flex items-center justify-center gap-2 font-black tracking-tight"
                  >
                    {loading ? "A enviar..." : <>Enviar Link <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Ainda não tens conta?</p>
            <button 
                onClick={() => navigate("/criar-conta")}
                className="text-sm font-black text-primary hover:scale-105 transition-transform"
            >
              Criar Conta Grátis ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

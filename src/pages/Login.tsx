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
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/casa", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (location.state && (location.state as any).bounced) {
      toast({
        variant: "destructive",
        title: "Sessão Expirada Precocemente",
        description: (location.state as any).bounced,
        duration: 8000,
      });
      // clear state so it doesn't loop
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

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
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-white">
      {/* Mesh Background with more vibrant colors */}
      <div className="bg-mesh opacity-30" />

      <div className="w-full max-w-md animate-fade-in space-y-8 relative z-10">
        <div className="text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white shadow-2xl mb-2 border-2 border-primary/20">
                <Heart className="h-10 w-10 text-primary fill-primary animate-pulse" />
            </div>
            <div className="space-y-1">
                <h1 className="text-5xl font-black tracking-tighter text-foreground">Bem-vindo</h1>
                <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">O teu Hub de Casal privado</p>
            </div>
        </div>

        <div className="glass-card rounded-[3rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border-white/80 bg-white/70 backdrop-blur-3xl">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-200/50 p-1.5 rounded-2xl mb-8">
              <TabsTrigger value="password" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-2.5">Senha</TabsTrigger>
              <TabsTrigger value="magic" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-2.5">Mágico</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email-pwd" title="E-mail" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </Label>
                  <Input
                    id="email-pwd"
                    type="email"
                    placeholder="teu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="password" title="Senha" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                     <Lock className="w-3.5 h-3.5" /> Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Insere a tua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="glass-btn-primary w-full h-16 flex items-center justify-center gap-3 font-black tracking-tight text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {loading ? "A entrar..." : <>Entrar agora <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              {magicLinkSent ? (
                <div className="space-y-8 pt-4 text-center anim-fade-in">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <Sparkles className="w-10 h-10 animate-pulse" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-lg font-black text-foreground">Link enviado!</p>
                        <p className="text-sm text-zinc-600 font-bold leading-relaxed px-4">Verifica a tua caixa de e-mail em <br/><strong className="text-primary">{email}</strong>.</p>
                    </div>
                  <Button
                    variant="ghost"
                    onClick={() => setMagicLinkSent(false)}
                    className="w-full font-black text-primary hover:bg-primary/5 rounded-2xl h-14 uppercase tracking-widest text-[10px]"
                  >
                    Tentar outro e-mail
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="email-magic" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary px-1">
                      <Mail className="w-3.5 h-3.5" /> E-mail para Link Rápido
                    </Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="teu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-14 rounded-2xl bg-white border-zinc-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400 text-foreground"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="glass-btn-primary w-full h-16 flex items-center justify-center gap-3 font-black tracking-tight text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    {loading ? "A enviar..." : <>Enviar Link <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-10 text-center border-t border-zinc-100 pt-8">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Novo por aqui?</p>
            <button 
                onClick={() => navigate("/criar-conta")}
                className="group flex items-center justify-center mx-auto gap-2 text-sm font-black text-primary hover:scale-105 transition-transform"
            >
              Cria o teu Ninho Grátis <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

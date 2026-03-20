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
    <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-[#fdf2f8]">
      {/* Animated Background Mesh */}
      <div className="bg-mesh opacity-10" />

      <div className="w-full max-w-md animate-fade-in space-y-8 relative z-10">
        <div className="text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-white border border-rose-100 shadow-xl mb-2">
                <Heart className="h-10 w-10 text-primary fill-primary animate-pulse" />
            </div>
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900">Bem-vindo</h1>
                <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">O teu Hub de Casal privado</p>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl relative z-10">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl mb-8">
              <TabsTrigger value="password" title="Entrar com Senha" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-2.5">Senha</TabsTrigger>
              <TabsTrigger value="magic" title="Link Mágico" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-2.5">Mágico</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email-pwd" title="E-mail" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </Label>
                   <Input
                    id="email-pwd"
                    type="email"
                    placeholder="teu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="password" title="Senha" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
                     <Lock className="w-3.5 h-3.5" /> Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Insere a tua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-16 rounded-2xl text-lg font-black tracking-tight shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {loading ? "A entrar..." : "Entrar agora"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
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
                    <Label htmlFor="email-magic" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
                      <Mail className="w-3.5 h-3.5" /> E-mail para Link Rápido
                    </Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="teu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-14 rounded-2xl bg-white border-rose-100 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-zinc-400"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-16 rounded-2xl text-lg font-black tracking-tight shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {loading ? "A enviar..." : "Enviar Link"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-10 text-center border-t border-rose-50 pt-8">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Novo por aqui?</p>
            <Button
                variant="ghost"
                onClick={() => navigate("/criar-conta")}
                className="group w-full h-12 rounded-2xl text-sm font-black text-primary hover:bg-rose-50/50 hover:text-primary transition-all"
            >
              Cria o teu Ninho Grátis
              <Sparkles className="ml-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

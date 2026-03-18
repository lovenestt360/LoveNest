import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
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
        msg = "Email ou senha incorretos. Verifique se digitou corretamente.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: msg || "Verifique suas credenciais e tente novamente.",
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
        description: "Verifique seu e-mail para entrar.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar link",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">LoveNest</CardTitle>
          <CardDescription>Seu hub privado de casal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Senha</TabsTrigger>
              <TabsTrigger value="magic">Link Mágico</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-pwd">E-mail</Label>
                  <Input
                    id="email-pwd"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              {magicLinkSent ? (
                <div className="space-y-4 pt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Enviamos um link mágico para <strong>{email}</strong>. Verifique sua caixa de entrada.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setMagicLinkSent(false)}
                    className="w-full"
                  >
                    Enviar para outro e-mail
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic">E-mail</Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link mágico"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Não tem conta? </span>
            <Button variant="link" className="p-0" onClick={() => navigate("/criar-conta")}>
              Criar conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

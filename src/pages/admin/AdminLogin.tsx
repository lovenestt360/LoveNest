import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Autenticação real via Supabase Auth — substitui a comparação de
            // hash no browser + token em localStorage. O acesso de admin é
            // verificado a seguir através de admin_users.user_id = auth.uid(),
            // decidido no servidor pelas políticas RLS, não pelo cliente.
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw new Error("Credenciais inválidas.");
            if (!authData.user) throw new Error("Sessão inválida.");

            const { data: adminRow, error: adminError } = await supabase
                .from("admin_users" as any)
                .select("id")
                .eq("user_id", authData.user.id)
                .maybeSingle();

            if (adminError || !adminRow) {
                await supabase.auth.signOut();
                throw new Error("Esta conta não tem acesso de administrador.");
            }

            toast({ title: "Bem-vindo", description: "Login efetuado com sucesso." });
            navigate("/admin");
        } catch (error: any) {
            console.error("Login Error:", error);
            toast({ title: "Erro de Autenticação", description: error.message || "Erro desconhecido", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-primary/5 rounded-full blur-3xl opacity-50" />

            <div className="w-full max-w-sm glass-card rounded-3xl p-8 z-10 shadow-xl border border-primary/10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Login</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gestão Exclusiva LoveNest SaaS</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-primary/20"
                                placeholder="admin@lovenestt.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-primary/20"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-12 mt-4 text-md font-bold group">
                        {loading ? "A autenticar..." : (
                            <>Entrar Dashboard <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

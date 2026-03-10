import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Simple SHA-256 string hash for basic frontend matching (not bank-grade, but fine for this simple implementation)
async function hashText(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const hashedAttempt = await hashText(password);

            // Check against DB
            const { data, error } = await supabase
                .from("admin_users")
                .select("id, password_hash")
                .eq("username", username)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error("Credenciais inválidas.");

            if (data.password_hash === hashedAttempt) {
                // Success - set local storage token for protected route
                localStorage.setItem("lovenest_admin_token", data.id);
                toast({ title: "Bem-vindo", description: "Login efetuado com sucesso." });
                navigate("/admin");
            } else {
                throw new Error("Credenciais inválidas.");
            }

        } catch (error: any) {
            toast({ title: "Erro de Autenticação", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-3xl opacity-50" />

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
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Usuário</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-primary/20"
                                placeholder="nome_admin"
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

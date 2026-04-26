import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Chave lida de variável de ambiente — nunca hardcoded no bundle
// Definir VITE_ADMIN_SETUP_KEY no .env e nas env vars do Vercel
const SETUP_KEY = import.meta.env.VITE_ADMIN_SETUP_KEY ?? "";

async function hashText(message: string): Promise<string> {
    if (!crypto?.subtle) {
        // Fallback básico se crypto não estiver disponível
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            hash = ((hash << 5) - hash) + message.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString();
    }
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

export default function AdminRegister() {
    const [username, setUsername]       = useState("");
    const [password, setPassword]       = useState("");
    const [securityKey, setSecurityKey] = useState("");
    const [loading, setLoading]         = useState(false);
    const [checking, setChecking]       = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Auto-desactivar rota se já existir pelo menos 1 admin
    useEffect(() => {
        const checkExisting = async () => {
            const { count } = await supabase
                .from("admin_users" as any)
                .select("id", { count: "exact", head: true });

            if ((count ?? 0) > 0) {
                // Já existe admin → rota não deve estar acessível
                toast({
                    title: "Setup já concluído",
                    description: "Já existe um administrador. Faz login.",
                    variant: "destructive",
                });
                navigate("/admin-login", { replace: true });
            } else {
                setChecking(false);
            }
        };
        checkExisting();
    }, [navigate, toast]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!SETUP_KEY) {
            toast({
                title: "Setup desativado",
                description: "VITE_ADMIN_SETUP_KEY não está configurada.",
                variant: "destructive",
            });
            return;
        }

        if (securityKey !== SETUP_KEY) {
            toast({
                title: "Chave Incorreta",
                description: "Não tens permissão para criar administradores.",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 8) {
            toast({
                title: "Senha fraca",
                description: "A senha deve ter pelo menos 8 caracteres.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const hashedPwd = await hashText(password);

            const { error } = await supabase
                .from("admin_users" as any)
                .insert({ username, password_hash: hashedPwd });

            if (error) throw error;

            toast({ title: "Admin Criado!", description: "Já podes fazer login." });
            navigate("/admin-login");
        } catch (error: any) {
            toast({ title: "Erro ao Criar", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm border-2 border-dashed border-primary/20 rounded-3xl p-8 shadow-sm bg-card">
                <div className="flex flex-col items-center mb-8">
                    <ShieldAlert className="w-12 h-12 text-primary mb-2 opacity-50" />
                    <h1 className="text-xl font-bold">Criar Master Admin</h1>
                    <p className="text-xs text-muted-foreground">Rota de Setup — uso único</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <Input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Nome de Utilizador"
                        required
                        minLength={3}
                    />
                    <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Senha (mín. 8 caracteres)"
                        required
                        minLength={8}
                    />
                    <Input
                        type="password"
                        value={securityKey}
                        onChange={e => setSecurityKey(e.target.value)}
                        placeholder="Chave de Acesso"
                        required
                    />

                    <Button type="submit" disabled={loading} className="w-full gap-2">
                        {loading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> A criar...</>
                            : <><Plus className="w-4 h-4" /> Criar Admin</>
                        }
                    </Button>
                </form>
            </div>
        </div>
    );
}

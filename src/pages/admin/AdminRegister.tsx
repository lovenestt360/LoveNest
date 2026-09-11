import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Sem verificação de chave no cliente: uma variável VITE_* fica sempre
// visível no bundle publicado (é assim que o Vite funciona), por isso
// comparar aqui só daria a ilusão de segurança — e se essa chave fosse
// igual à do servidor, publicava-a. A chave escrita no formulário abaixo
// segue direto para a Edge Function admin-claim, que é quem valida contra
// o segredo ADMIN_SETUP_KEY do servidor (nunca enviado ao browser).
export default function AdminRegister() {
    const [email, setEmail]             = useState("");
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
            // 1. Cria (ou reutiliza) uma conta real do Supabase Auth para o admin
            //    — a ligação a admin_users passa a exigir esta sessão, em vez de
            //    um INSERT direto que qualquer visitante podia fazer.
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            let userId = signUpData?.user?.id;

            if (signUpError && signUpError.message.toLowerCase().includes("already registered")) {
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                userId = signInData.user?.id;
            } else if (signUpError) {
                throw signUpError;
            }

            if (!userId) throw new Error("Não foi possível criar a sessão.");

            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                throw new Error("Confirma o email (se a confirmação estiver ativa) e tenta novamente.");
            }

            // 2. Liga esta conta a admin_users — validado no servidor
            const { error: claimError } = await supabase.functions.invoke("admin-claim", {
                body: { setup_key: securityKey, username: username || email },
            });
            if (claimError) {
                let message = claimError.message || "Falha ao criar administrador.";
                try {
                    const body = await (claimError as any).context?.json?.();
                    if (body?.error) message = body.error;
                } catch { /* mantém a mensagem genérica */ }
                throw new Error(message);
            }

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
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                    />
                    <Input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Nome de Utilizador (opcional)"
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

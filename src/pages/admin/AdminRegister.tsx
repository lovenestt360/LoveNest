import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Lock, User, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function hashText(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminRegister() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [securityKey, setSecurityKey] = useState(""); // Simple hardcoded block
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Very basic protection for this secret route
        if (securityKey !== "LOVENEST_MASTER_ADMIN") {
            toast({ title: "Chave Incorreta", description: "Não tens permissão para criar administradores.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const hashedPwd = await hashText(password);

            const { error } = await supabase
                .from("admin_users")
                .insert({
                    username,
                    password_hash: hashedPwd
                });

            if (error) throw error;

            toast({ title: "Admin Criado!", description: "Já podes fazer login." });
            navigate("/admin-login");

        } catch (error: any) {
            toast({ title: "Erro ao Criar", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm border-2 border-dashed border-primary/20 rounded-3xl p-8 shadow-sm bg-card">
                <div className="flex flex-col items-center mb-8">
                    <ShieldAlert className="w-12 h-12 text-primary mb-2 opacity-50" />
                    <h1 className="text-xl font-bold">Criar Master Admin</h1>
                    <p className="text-xs text-muted-foreground">Rota de Setup</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nome de Utilizador"
                        required
                    />
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha Forte"
                        required
                    />
                    <Input
                        type="password"
                        value={securityKey}
                        onChange={(e) => setSecurityKey(e.target.value)}
                        placeholder="Chave de Acesso Oculta"
                        required
                    />

                    <Button type="submit" disabled={loading} className="w-full gap-2">
                        {loading ? "A criar..." : <><Plus className="w-4 h-4" /> Efetuar Registo</>}
                    </Button>
                </form>
            </div>
        </div>
    );
}

import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AdminRoute() {
    // Antes: só verificava se existia um token qualquer no localStorage — o
    // ID de um admin lido da tabela pública (ou um novo, inserido pelo
    // próprio visitante) chegava para passar por esta guarda. Agora exige
    // uma sessão real do Supabase Auth E que essa conta tenha uma linha em
    // admin_users, verificado através das políticas RLS (auth.uid()),
    // nunca de um valor que o cliente possa forjar.
    const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

    useEffect(() => {
        let active = true;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (active) setStatus("denied");
                return;
            }
            const { data } = await supabase
                .from("admin_users" as any)
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();
            if (active) setStatus(data ? "allowed" : "denied");
        })();
        return () => { active = false; };
    }, []);

    if (status === "checking") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (status === "denied") {
        return <Navigate to="/admin-login" replace />;
    }

    return <Outlet />;
}

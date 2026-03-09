import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasCoupleSpace, setHasCoupleSpace] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);

  const runCheck = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    setChecking(true);
    setCheckError(null);

    try {
      const { data, error } = await supabase
        .from("members")
        .select("couple_space_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking couple space:", error);
        setHasCoupleSpace(null);
        setCheckError("Não foi possível verificar sua Casa DK. Tente novamente.");
        return;
      }

      setHasCoupleSpace(!!data?.couple_space_id);
    } catch (err) {
      console.error("Exception checking couple space:", err);
      setHasCoupleSpace(null);
      setCheckError("Não foi possível verificar sua Casa DK. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" replace />;
  }

  if (checkError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-4 text-card-foreground">
          <h1 className="text-base font-semibold">Erro ao verificar acesso</h1>
          <p className="mt-1 text-sm text-muted-foreground">{checkError}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={runCheck}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => window.location.assign("/casa-dk")}
              >Ir para Casa DK</Button
            >
          </div>
        </div>
      </div>
    );
  }

  if (hasCoupleSpace === false) {
    return <Navigate to="/casa-dk" replace />;
  }

  return <Outlet />;
}

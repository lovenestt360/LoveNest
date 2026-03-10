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
  const [isSuspended, setIsSuspended] = useState(false);

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

      // Check Suspension Status
      const { data: houseMember } = await supabase.from("house_members").select("house_id").eq("user_id", user.id).maybeSingle();
      if (houseMember) {
        const { data: house } = await supabase.from("houses").select("is_suspended").eq("id", houseMember.house_id).maybeSingle();
        if (house?.is_suspended) {
          setIsSuspended(true);
        }
      }

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

  if (isSuspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center space-y-4 shadow-sm animate-in zoom-in-95">
          <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          </div>
          <h1 className="text-xl font-bold text-destructive">Conta Suspensa</h1>
          <p className="text-sm text-foreground/80">
            O acesso à sua LoveNest foi temporariamente suspenso. Por favor, regularize a sua subscrição ou contacte o suporte para mais informações.
          </p>
          <Button variant="default" className="w-full mt-4" onClick={() => window.location.assign("/subscricao")}>
            Ver Subscrição
          </Button>
        </div>
      </div>
    );
  }

  if (hasCoupleSpace === false) {
    return <Navigate to="/casa-dk" replace />;
  }

  return <Outlet />;
}

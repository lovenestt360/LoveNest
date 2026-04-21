import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AuthOnlyRoute() {
  const { user, loading } = useAuth();
  
  // Anti-Lag Verification
  // Inicia isVerifying = true se não houver user, para bloquear o navigate prematuro antes do useEffect
  const [isVerifying, setIsVerifying] = useState(!user);
  const [verifiedUser, setVerifiedUser] = useState<any>(user);

  useEffect(() => {
    if (!loading && !user) {
      if (!isVerifying) setIsVerifying(true);
      supabase.auth.getSession().then(({ data }) => {
        setVerifiedUser(data.session?.user ?? null);
        setIsVerifying(false);
      });
    } else {
      setVerifiedUser(user);
      setIsVerifying(false);
    }
  }, [user, loading]);

  if (loading || isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!verifiedUser) {
    return <Navigate to="/entrar" replace />;
  }

  return <Outlet />;
}

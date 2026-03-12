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
  const [houseData, setHouseData] = useState<any>(null);
  const [savingTrial, setSavingTrial] = useState(false);

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
        setCheckError("Não foi possível verificar seu LoveNest. Tente novamente.");
        return;
      }

      setHasCoupleSpace(!!data?.couple_space_id);

      // Check Suspension & Trial Status
      const { data: houseMember } = await supabase.from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
      if (houseMember) {
        const { data: house } = await supabase.from("couple_spaces").select("*").eq("id", houseMember.couple_space_id).maybeSingle();
        if (house) {
          setHouseData(house);
          if (house.is_suspended) {
            setIsSuspended(true);
          }
        }
      }

    } catch (err) {
      console.error("Exception checking couple space:", err);
      setHasCoupleSpace(null);
      setCheckError("Não foi possível verificar seu LoveNest. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]);

  const handleActivateTrial = async () => {
    if (!houseData?.id) return;
    try {
      setSavingTrial(true);

      // 5 days from now
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 5);

      const { error } = await supabase.from("couple_spaces").update({
        trial_started_at: new Date().toISOString(),
        trial_ends_at: endsAt.toISOString(),
        trial_used: true
      }).eq("id", houseData.id);

      if (error) throw error;

      // refresh status
      await runCheck();
    } catch (e) {
      console.error("Failed to activate trial", e);
    } finally {
      setSavingTrial(false);
    }
  };

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
            <Button variant="outline" onClick={() => window.location.assign("/casa")}
            >Ir para LoveNest</Button
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
    return <Navigate to="/casa" replace />;
  }

  // Check Trial Flow if they have a house but never started a trial and are not active
  if (houseData && houseData.trial_used === false && houseData.subscription_status !== 'active') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-primary/20 bg-card p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-orange-500"></div>

          <div className="w-20 h-20 bg-gradient-to-tr from-primary/20 to-orange-500/20 text-primary rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>

          <div>
            <h1 className="text-2xl font-black text-foreground mb-2 tracking-tight">Bem-vindo(a) ao LoveNest Premium</h1>
            <p className="text-sm text-foreground/80 leading-relaxed font-medium">
              A sua casa foi criada com sucesso! Para começar, oferecemos <strong className="text-primary">5 dias totalmente gratuitos</strong> para explorar todas as funcionalidades do aplicativo com o seu parceiro.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="default"
              className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform bg-primary hover:bg-primary/90"
              onClick={handleActivateTrial}
              disabled={savingTrial}
            >
              {savingTrial ? "A ativar..." : "Começar 5 dias grátis"}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-bold text-muted-foreground border-2 hover:bg-muted"
              onClick={() => window.location.assign("/subscricao")}
            >
              Ativar plano definitivo agora
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

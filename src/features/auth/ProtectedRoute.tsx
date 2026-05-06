import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useFreeMode } from "@/hooks/useFreeMode";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { freeMode, loading: freeModeLoading } = useFreeMode();
  
  // Anti-Lag Verification
  // isVerifying = true desde o mount se n houver user para dar tempo à leitura
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

  const [hasCoupleSpace, setHasCoupleSpace] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [houseData, setHouseData] = useState<any>(null);
  const [savingTrial, setSavingTrial] = useState(false);

  // Tracks whether we've completed at least one successful check.
  // Subsequent runs (token refresh, etc.) skip the blocking spinner so that
  // the Outlet (and child pages like Subscription) never unmounts mid-session.
  const hasCheckedRef = useRef(false);

  const runCheck = async () => {
    if (!verifiedUser) {
      setChecking(false);
      hasCheckedRef.current = false;
      return;
    }

    setCheckError(null);
    // Only block UI with spinner on the very first check
    if (!hasCheckedRef.current) setChecking(true);

    try {
      const { data, error } = await supabase
        .from("members")
        .select("couple_space_id")
        .eq("user_id", verifiedUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking couple space:", error);
        setHasCoupleSpace(null);
        setCheckError("Não foi possível verificar seu LoveNest. Tente novamente.");
        return;
      }

      setHasCoupleSpace(!!data?.couple_space_id);

      // Check Suspension & Trial Status
      const { data: houseMember } = await supabase.from("members").select("couple_space_id").eq("user_id", verifiedUser.id).maybeSingle();
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
      hasCheckedRef.current = true;
      setChecking(false);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedUser]);

  const handleActivateTrial = async () => {
    if (!houseData?.id) return;
    try {
      setSavingTrial(true);

      // 15 days from now
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 15);

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

  if (loading || checking || freeModeLoading || isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!verifiedUser) {
    return <Navigate to="/entrar" state={{ bounced: "A sua sessão expirou automaticamente ou o dispositivo barrou a leitura. Verifique a Data/Hora do PC." }} replace />;
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

  // If Free Mode is active, we bypass everything downstream (trials, paywalls, etc.)
  if (freeMode) return <Outlet />;

  if (houseData && houseData.trial_used === false && houseData.subscription_status !== 'active' && location.pathname !== '/subscricao') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-5">
        <div className="w-full max-w-sm text-center space-y-7 animate-in fade-in slide-in-from-bottom-4">

          {/* Icon */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <div className="w-2 h-2 rounded-full bg-primary/30 mx-auto" />
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
              A vossa LoveNest<br />está pronta!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A vossa casa foi criada com sucesso. Experimentem{" "}
              <span className="text-primary font-bold">15 dias completamente grátis</span>{" "}
              e descubram tudo o que o LoveNest tem para oferecer.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              className="w-full h-14 rounded-2xl font-bold text-base bg-primary text-primary-foreground shadow-md active:scale-95 transition-transform disabled:opacity-60"
              onClick={handleActivateTrial}
              disabled={savingTrial}
            >
              {savingTrial ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  A ativar...
                </span>
              ) : "Começar 15 dias grátis"}
            </button>

            <button
              className="w-full h-12 rounded-2xl font-bold text-sm text-muted-foreground bg-muted/60 active:scale-95 transition-transform"
              onClick={() => window.location.assign("/subscricao")}
            >
              Ver planos e preços
            </button>
          </div>

        </div>
      </div>
    );
  }

  return <Outlet />;
}

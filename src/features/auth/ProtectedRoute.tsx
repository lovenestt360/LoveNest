import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useFreeMode } from "@/hooks/useFreeMode";
import { hasActivePaidSubscription } from "@/lib/subscriptionAccess";
import { TrialOffer } from "@/features/subscription/TrialOffer";
import { SubscriptionEnded, SuspendedForPayment, SuspendedIrregular, TrialEnded } from "@/features/subscription/BlockedScreen";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { freeMode, loading: freeModeLoading } = useFreeMode();
  
  // Anti-Lag Verification
  // isVerifying = true desde o mount se n houver user para dar tempo à leitura
  const [isVerifying, setIsVerifying] = useState(!user);
  const [verifiedUser, setVerifiedUser] = useState<any>(user);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      if (!isVerifying) setIsVerifying(true);
      supabase.auth.getSession().then(({ data, error }) => {
        setVerifiedUser(data.session?.user ?? null);
        // Only flag as expired when Supabase returns an actual auth error
        if (!data.session && error) setSessionExpired(true);
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

      // Check Suspension & Trial Status — reusa o resultado da query anterior
      const houseMember = data;
      if (houseMember) {
        const { data: house } = await supabase.from("couple_spaces").select("*").eq("id", houseMember.couple_space_id).maybeSingle();
        if (house) {
          setHouseData(house);
          // Sincroniza sempre com o valor atual — antes só ligava, nunca desligava,
          // por isso uma conta reativada continuava bloqueada até recarregar a página.
          setIsSuspended(!!house.is_suspended);
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

  // A casa muda sem recarregar a app: depois de um pagamento, ou quando o par paga ou ativa
  // o teste noutro telemóvel. Sem isto, ficava a oferecer o teste a uma casa que já tem plano.
  useEffect(() => {
    if (!verifiedUser) return;
    const refresh = () => { if (document.visibilityState === "visible") runCheck(); };
    window.addEventListener("ln:house-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("ln:house-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedUser]);

  const handleActivateTrial = async () => {
    if (!houseData?.id) return;
    try {
      setSavingTrial(true);

      // Via RPC (SECURITY DEFINER) em vez de UPDATE direto: couple_spaces
      // também guarda subscription_status/tier_level, e um membro com
      // permissão de UPDATE na linha não deve conseguir tocar nesses
      // campos de faturação a partir do browser.
      const { error } = await supabase.rpc("activate_trial" as any, {
        p_couple_space_id: houseData.id,
      });

      if (error) throw error;

      // refresh status
      await runCheck();
    } catch (e) {
      console.error("Failed to activate trial", e);
      // O par pode já ter ativado o teste ou pago: atualiza para sair deste ecrã.
      await runCheck();
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
    return <Navigate
      to="/entrar"
      state={sessionExpired ? { bounced: "A tua sessão expirou. Inicia sessão novamente." } : undefined}
      replace
    />;
  }

  // Email ainda não confirmado — sem isto, qualquer email (mesmo inexistente)
  // dava acesso total à app.
  if (!verifiedUser.email_confirmed_at) {
    localStorage.setItem("confirm_email", verifiedUser.email ?? "");
    return <Navigate to="/confirmar-email" replace />;
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

  // Suspensão por irregularidade bloqueia tudo: pagar não a resolve.
  if (isSuspended && houseData?.suspension_reason === "irregular") {
    return <SuspendedIrregular note={houseData.suspension_note} />;
  }

  if (isSuspended && location.pathname !== '/subscricao') {
    return <SuspendedForPayment />;
  }

  if (hasCoupleSpace === false) {
    return <Navigate to="/casa" replace />;
  }

  // If Free Mode is active, we bypass everything downstream (trials, paywalls, etc.)
  if (freeMode) return <Outlet />;

  if (houseData && houseData.trial_used === false && houseData.subscription_status !== 'active' && location.pathname !== '/subscricao') {
    return (
      <TrialOffer saving={savingTrial} onStart={handleActivateTrial} onPlans={() => window.location.assign("/subscricao")} />
    );
  }

  const paidSubscriptionExpired =
    houseData &&
    houseData.subscription_status === "active" &&
    !hasActivePaidSubscription(houseData);

  if (paidSubscriptionExpired && location.pathname !== "/subscricao") {
    return <SubscriptionEnded />;
  }

  // Trial já foi usado, terminou (trial_ends_at no passado) e ainda não há
  // subscrição ativa — sem isto, o trial nunca expirava de verdade.
  const trialExpired =
    houseData &&
    houseData.trial_used === true &&
    houseData.subscription_status !== 'active' &&
    houseData.trial_ends_at &&
    new Date(houseData.trial_ends_at) < new Date();

  if (trialExpired && location.pathname !== '/subscricao') {
    return <TrialEnded />;
  }

  return <Outlet />;
}

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Guardian, type GuardianHandle } from "@/features/entry/Guardian";
import { EmailChip, EntryScreen, Envelope, ResendLink, WebmailButton } from "@/features/entry/EntryKit";
import { prefersReducedMotion } from "@/features/entry/entryUtils";

export default function ConfirmEmail() {
  const email   = localStorage.getItem("confirm_email") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const pet = useRef<GuardianHandle>(null);

  // If user somehow already has a session (clicked the link), redirect to app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/casa", { replace: true });
    });

    // Also listen for auth state changes (link clicked in same browser tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        localStorage.removeItem("confirm_email");
        navigate("/casa", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // A Faísca fica à espera contigo.
  useEffect(() => {
    const t = window.setTimeout(() => {
      pet.current?.react("wiggle");
      pet.current?.say("Estou à espera de ti ✨", 2600);
    }, prefersReducedMotion() ? 0 : 1000);
    return () => window.clearTimeout(t);
  }, []);

  const handleResend = async () => {
    if (!email) return false;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin + "/casa" },
      });
      if (error) throw error;
      pet.current?.react("happy");
      pet.current?.mail();
      pet.current?.say("Enviei outra vez 💌");
      return true;
    } catch (err) {
      pet.current?.react("shake");
      toast({ variant: "destructive", title: "Erro", description: err instanceof Error ? err.message : String(err) });
      return false;
    }
  };

  return (
    <EntryScreen>
      <div className="en-stage" style={{ marginTop: 20 }}>
        <Guardian ref={pet} kind="faisca" width={150} sayAt="right" delay={1} />
        <Envelope mode="wait" style={{ left: "50%", top: 40, marginLeft: 44 }} />
      </div>
      <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 3, marginTop: 10 }}>Só falta confirmar</h1>
      <p className="en-sub en-center en-in" style={{ ["--d" as string]: 4 }}>
        Enviei um email para confirmares a tua conta. Toca no link e o vosso espaço abre.
      </p>
      {email && <EmailChip email={email} />}
      <p className="en-hint en-in" style={{ ["--d" as string]: 5 }}>Não está lá? Espreita o spam ou as promoções.</p>
      <div className="en-spacer" />
      <WebmailButton email={email} />
      {email && <ResendLink seconds={45} onResend={handleResend} />}
      <p className="en-small en-in" style={{ ["--d" as string]: 8, marginTop: 6 }}>
        Já confirmaste? <button type="button" className="py-2" onClick={() => navigate("/entrar")}>Entrar</button>
      </p>
    </EntryScreen>
  );
}

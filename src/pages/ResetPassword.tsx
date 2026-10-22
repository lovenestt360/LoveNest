import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordError } from "@/lib/passwordPolicy";
import { Guardian, type GuardianHandle } from "@/features/entry/Guardian";
import { EntryScreen } from "@/features/entry/EntryKit";
import { passwordStrength, prefersReducedMotion } from "@/features/entry/entryUtils";

const STRENGTH = ["", "Fraca", "Razoável", "Boa", "Forte"];

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pet = useRef<GuardianHandle>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Supabase exchanges the recovery token from the URL hash automatically.
  // When it does, it fires PASSWORD_RECOVERY on onAuthStateChange.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Senha guardada: o Guardião festeja e voltamos ao login.
  useEffect(() => {
    if (!done) return;
    const a = window.setTimeout(() => {
      pet.current?.react("spin");
      pet.current?.hearts(12);
      pet.current?.say("Tudo seguro 🔒", 2600);
    }, prefersReducedMotion() ? 0 : 500);
    const b = window.setTimeout(() => navigate("/entrar"), 3000);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [done, navigate]);

  const strength = passwordStrength(password);
  const matches = password.length > 0 && password === confirm && !getPasswordError(password);
  const lastStrength = useRef(0);
  const wasMatching = useRef(false);

  useEffect(() => {
    if (strength === 4 && lastStrength.current < 4) pet.current?.say("Essa é forte 💪", 0);
    lastStrength.current = strength;
  }, [strength]);

  useEffect(() => {
    if (matches && !wasMatching.current) { pet.current?.react("happy"); pet.current?.hearts(5); }
    wasMatching.current = matches;
  }, [matches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = getPasswordError(password);
    if (passwordError) {
      pet.current?.react("shake");
      toast({ variant: "destructive", title: "Senha fraca", description: passwordError });
      return;
    }
    if (password !== confirm) {
      pet.current?.react("shake");
      toast({ variant: "destructive", title: "As senhas não coincidem", description: "Confirma que escreveste a mesma senha nos dois campos." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      pet.current?.react("shake");
      pet.current?.say("Hmm, não deu");
      toast({ variant: "destructive", title: "Erro ao redefinir", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <EntryScreen key="done" className="en-step">
        <div className="en-stage" style={{ height: 270, marginTop: 40 }}>
          <Guardian ref={pet} kind="guardiao" width={180} sayAt="right" />
        </div>
        <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 3, marginTop: 14 }}>Senha nova guardada</h1>
        <p className="en-sub en-center en-in" style={{ ["--d" as string]: 4 }}>
          A tua conta está segura. Vou levar-te de volta para entrares.
        </p>
        <div className="en-redirect"><span /></div>
        <div className="en-spacer" />
        <button type="button" className="en-btn en-in" style={{ ["--d" as string]: 6 }} onClick={() => navigate("/entrar")}>
          Entrar agora <span className="en-arrow">→</span>
        </button>
      </EntryScreen>
    );
  }

  if (!ready) {
    return (
      <EntryScreen key="wait" className="en-step">
        <div className="en-stage" style={{ marginTop: 40 }}>
          <Guardian ref={pet} kind="guardiao" width={150} talking />
        </div>
        <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 2, marginTop: 14 }}>A verificar o teu link</h1>
        <p className="en-sub en-center en-in" style={{ ["--d" as string]: 3 }}>Só um instante…</p>
        <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-[#0B1324]/40" />
        <div className="en-spacer" />
        <p className="en-small en-in" style={{ ["--d" as string]: 5 }}>
          Chegaste aqui por engano? <button type="button" onClick={() => navigate("/entrar")}>Voltar ao login</button>
        </p>
      </EntryScreen>
    );
  }

  const shy = focused && !show;
  const onFocus = () => { setFocused(true); if (!show) pet.current?.say("Não estou a ver 🙈", 0); };
  const onBlur = () => { setFocused(false); pet.current?.say(matches ? "Perfeito ✓" : "Pronto, já podes 😄"); };

  return (
    <EntryScreen key="form" className="en-step">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col" noValidate>
        <div className="en-row" style={{ marginTop: 6, alignItems: "flex-end" }}>
          <h1 className="en-h1 en-in" style={{ ["--d" as string]: 1, maxWidth: 200 }}>Cria uma senha nova</h1>
          <Guardian ref={pet} kind="guardiao" width={100} delay={2} shy={shy} style={{ marginRight: -6 }} />
        </div>
        <p className="en-sub en-in" style={{ ["--d" as string]: 2 }}>Escolhe uma que só tu saibas. Eu prometo não ver.</p>

        <div className="en-stack" style={{ marginTop: 22 }}>
          <div className="en-in" style={{ ["--d" as string]: 3 }}>
            <label className="en-label" htmlFor="rp-pass">Nova senha</label>
            <div className="en-field-wrap">
              <input
                id="rp-pass"
                className="en-field"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                className="en-eye"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setShow((v) => !v); pet.current?.say(show ? "Já não vejo 🙈" : "Ups, agora vejo 👀"); }}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="en-meter" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <span key={i} className={cn(i < strength && "on")} />)}
            </div>
            <div className="en-meter-label" aria-live="polite">{STRENGTH[strength]}</div>
          </div>
          <div className="en-in" style={{ ["--d" as string]: 4 }}>
            <label className="en-label" htmlFor="rp-confirm">Confirmar</label>
            <input
              id="rp-confirm"
              className="en-field"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repete a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <div className={cn("en-match", matches && "ok")}>
              <span className="en-tick">✓</span>
              <span>{matches ? "As senhas coincidem" : "As duas senhas têm de ser iguais"}</span>
            </div>
          </div>
        </div>

        <div className="en-spacer" />
        <button type="submit" className="en-btn en-in" style={{ ["--d" as string]: 6 }} disabled={!matches || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Guardar senha <span className="en-arrow">→</span></>}
        </button>
      </form>
    </EntryScreen>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { getPasswordError } from "@/lib/passwordPolicy";
import { AuthScaffold } from "@/features/auth/AuthScaffold";
import { FieldGroup, HeaderLink, PasswordField, PrimaryButton, Reveal } from "@/features/auth/AuthKit";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const passwordError = getPasswordError(password);
    if (passwordError) {
      toast({ variant: "destructive", title: "Senha fraca", description: passwordError });
      return;
    }

    if (password !== confirm) {
      toast({
        variant: "destructive",
        title: "As senhas não coincidem",
        description: "Confirma que escreveste a mesma senha nos dois campos.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate("/entrar?returning=1"), 1800);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Não foi possível redefinir", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Indicação discreta, à medida que se escreve — não substitui a validação.
  const longEnough = password.length >= 8;
  const matches = confirm.length > 0 && password === confirm;

  return (
    <AuthScaffold
      title={done ? "Senha alterada." : "Uma nova senha."}
      subtitle={
        done
          ? "Está tudo pronto. Vamos levar-te de volta ao login."
          : "Escolhe uma senha que só tu sabes. Protege o espaço que é vosso."
      }
      headerRight={!done && <HeaderLink onClick={() => navigate("/entrar?returning=1")}>Cancelar</HeaderLink>}
    >
      {done ? (
        <Reveal>
          <div className="flex items-center gap-3 text-[15px] text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            A redirecionar para o login…
          </div>
        </Reveal>
      ) : !ready ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[15px] text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            A verificar o link de recuperação…
          </div>
          <p className="text-[14px] leading-[1.5] text-slate-500">
            Se demorar, abre de novo o link do email neste dispositivo.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <PasswordField
              id="new-password"
              label="Nova senha"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <PasswordField
              id="confirm-password"
              label="Repetir senha"
              autoComplete="new-password"
              placeholder="A mesma senha"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </FieldGroup>

          <ul className="flex gap-4 px-1 text-[13px]" aria-live="polite">
            <Hint ok={longEnough}>8+ caracteres</Hint>
            <Hint ok={matches}>Coincidem</Hint>
          </ul>

          <PrimaryButton type="submit" disabled={loading} loading={loading}>
            Guardar nova senha
          </PrimaryButton>
        </form>
      )}
    </AuthScaffold>
  );
}

function Hint({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 transition-colors duration-200 ${ok ? "text-[#0B1324]" : "text-slate-400"}`}>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors duration-200 ${
          ok ? "border-[#0B1324] bg-[#0B1324] text-white" : "border-slate-300"
        }`}
      >
        {ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}

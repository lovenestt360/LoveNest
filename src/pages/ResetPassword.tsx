import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "As senhas não coincidem", description: "Confirma que escreveste a mesma senha nos dois campos." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate("/entrar"), 2500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao redefinir", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 border border-rose-100 mx-auto">
            <Heart className="h-8 w-8 text-rose-400 fill-rose-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nova senha</h1>
            <p className="text-sm text-[#717171] mt-1">Define uma nova senha para a tua conta</p>
          </div>
        </div>

        <div className="glass-card p-7">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-rose-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Senha alterada!</p>
                <p className="text-sm text-[#717171] mt-1">A redirecionar para o login...</p>
              </div>
            </div>
          ) : !ready ? (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-rose-400 mx-auto" />
              <p className="text-sm text-[#717171]">A verificar o link de recuperação...</p>
              <p className="text-xs text-[#aaa]">Se chegaste aqui por engano, <button onClick={() => navigate("/entrar")} className="text-rose-500 hover:underline font-medium">volta ao login</button>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nova senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirmar senha</label>
                <Input
                  type="password"
                  placeholder="Repete a nova senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="h-12 rounded-2xl border-[#e5e5e5] bg-white text-sm focus-visible:ring-rose-400/30 focus-visible:border-rose-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <> Guardar nova senha <ArrowRight className="w-4 h-4" strokeWidth={1.5} /> </>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

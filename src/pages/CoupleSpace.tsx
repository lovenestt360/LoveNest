import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { Share2, Copy, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type MemberProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type CoupleState =
  | { status: "loading" }
  | { status: "no_house" }
  | { status: "has_house"; coupleSpaceId: string; inviteCode: string | null; members: MemberProfile[] };

// ── Minimal abstract visuals (consistent with onboarding language) ────────────

function TwoApartVisual() {
  return (
    <div className="relative w-32 h-24 mx-auto">
      <div className="absolute w-12 h-12 rounded-full bg-rose-100/80 top-2 left-4 animate-ob-float-a" />
      <div className="absolute w-10 h-10 rounded-full bg-rose-50 border border-rose-100 bottom-2 right-4 animate-ob-float-b"
        style={{ animationDelay: "-4s" }} />
    </div>
  );
}

function WaitingVisual() {
  return (
    <div className="relative w-32 h-24 mx-auto">
      {/* Present partner — filled */}
      <div className="absolute w-12 h-12 rounded-full bg-rose-200/80 top-2 left-8" />
      {/* Waiting space — outline only */}
      <div className="absolute w-10 h-10 rounded-full border-2 border-dashed border-rose-200 bottom-2 right-8 animate-ob-float-b"
        style={{ animationDelay: "-2s" }} />
    </div>
  );
}

function TogetherVisual() {
  return (
    <div className="relative w-32 h-20 mx-auto flex items-center justify-center">
      <div className="absolute w-12 h-12 rounded-full bg-rose-200/80 left-8" />
      <div className="absolute w-12 h-12 rounded-full bg-rose-100 border border-rose-200 right-8" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CoupleSpace() {
  // Pre-fill invite code from onboarding Phase 3
  const savedCode = sessionStorage.getItem("lovenest_ref") || localStorage.getItem("lovenest_ref") || "";
  const [inviteCodeInput, setInviteCodeInput] = useState(savedCode.toUpperCase());
  const [view, setView] = useState<"create" | "join">(savedCode ? "join" : "create");
  const [loadingAction, setLoadingAction] = useState(false);
  const [state, setState] = useState<CoupleState>({ status: "loading" });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const memberCount = useMemo(() => {
    if (state.status !== "has_house") return 0;
    return state.members.length;
  }, [state]);

  const myName = useMemo(() => {
    if (state.status !== "has_house") return null;
    const me = state.members.find(m => m.user_id === currentUserId);
    return me?.display_name?.split(" ")[0] ?? null;
  }, [state, currentUserId]);

  const partnerName = useMemo(() => {
    if (state.status !== "has_house") return null;
    const partner = state.members.find(m => m.user_id !== currentUserId);
    return partner?.display_name?.split(" ")[0] ?? null;
  }, [state, currentUserId]);

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) { navigate("/entrar", { replace: true }); return; }
    setCurrentUserId(user.id);

    const { data: coupleSpaceId, error: memberErr } = await supabase.rpc("get_user_couple_space_id");
    if (memberErr) { setState({ status: "no_house" }); return; }
    if (!coupleSpaceId) { setState({ status: "no_house" }); return; }

    const { data: spaceRow } = await supabase
      .from("couple_spaces").select("invite_code").eq("id", coupleSpaceId).maybeSingle();

    const { data: membersRows } = await supabase
      .rpc("get_couple_member_ids", { p_couple_space_id: coupleSpaceId });

    const userIds = (membersRows ?? []).map((m: { user_id: string }) => m.user_id);
    const ids = userIds.length > 0 ? userIds : [user.id];

    const { data: profilesRows } = await supabase
      .from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids);

    const byId = new Map((profilesRows ?? []).map((p: any) => [p.user_id, p]));
    const profiles: MemberProfile[] = ids.map((id: string) => {
      const p = byId.get(id) as any;
      return { user_id: id, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null };
    });

    setState({ status: "has_house", coupleSpaceId, inviteCode: spaceRow?.invite_code ?? null, members: profiles });
  }, [navigate]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-navigate to home if both partners connected
  useEffect(() => {
    if (state.status === "has_house" && memberCount >= 2) {
      // Small delay to let the "complete" state render first
      const t = setTimeout(() => navigate("/", { replace: true }), 2200);
      return () => clearTimeout(t);
    }
  }, [state.status, memberCount, navigate]);

  const handleCreateSpace = async () => {
    setLoadingAction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/entrar"); return; }

      const { data: existing } = await supabase
        .from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
      if (existing) { await refresh(); return; }

      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data: space, error: spaceError } = await supabase
        .from("couple_spaces").insert({ invite_code: inviteCode }).select().single();
      if (spaceError) throw spaceError;

      const { error: memberError } = await supabase.from("members")
        .insert({ couple_space_id: space.id, user_id: user.id });
      if (memberError) {
        if (memberError.code === "23505") {
          await supabase.from("couple_spaces").delete().eq("id", space.id);
          throw new Error("Já pertences a um espaço.");
        }
        throw memberError;
      }
      track("space_created");
      await refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao criar espaço", description: error.message });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinSpace = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoadingAction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/entrar"); return; }

      const code = inviteCodeInput.trim().toUpperCase();
      const { data: space, error: spaceError } = await supabase
        .from("couple_spaces").select("id").eq("invite_code", code).eq("status", "active").maybeSingle();
      if (spaceError) throw spaceError;
      if (!space) {
        toast({ variant: "destructive", title: "Código inválido", description: "Não encontrámos nenhum espaço com este código." });
        return;
      }

      const { error: joinError } = await supabase.from("members")
        .insert({ couple_space_id: space.id, user_id: user.id });
      if (joinError) {
        let msg = "Não foi possível entrar no espaço.";
        if (joinError.message.includes("couple_space_full")) msg = "Este espaço já tem dois membros.";
        else if (joinError.code === "23505") msg = "Já pertences a um espaço.";
        toast({ variant: "destructive", title: "Erro ao entrar", description: msg });
        return;
      }

      // Clean up stored code
      sessionStorage.removeItem("lovenest_ref");
      localStorage.removeItem("lovenest_ref");

      track("space_joined");
      await refresh();
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleShare = async () => {
    if (state.status !== "has_house" || !state.inviteCode) return;
    const code = state.inviteCode;
    const text = `Vem para o nosso espaço no LoveNest. Usa o código: ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "LoveNest", text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copiado", description: "Partilha o código com o teu par." });
      }
    } catch {}
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-rose-300 animate-spin" />
      </div>
    );
  }

  // ── No house — create or join ─────────────────────────────────────────────
  if (state.status === "no_house") {
    return (
      <div className="min-h-screen bg-white flex flex-col select-none">
        {/* Top bar */}
        <div className="px-6 pt-12 shrink-0 h-16 flex items-center">
          {view === "join" && (
            <button
              onClick={() => setView("create")}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-[#bbb]" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="w-full max-w-[320px] space-y-8">

            {/* Visual */}
            <div className="flex justify-center">
              <TwoApartVisual />
            </div>

            {view === "create" ? (
              <>
                {/* Copy */}
                <div className="text-center space-y-3">
                  <h1 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
                    O teu par ainda não chegou.
                  </h1>
                  <p className="text-[14px] text-[#888] leading-relaxed">
                    Cria o vosso espaço, recebe um código e partilha-o com o teu par para se juntarem.
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {/* Primary */}
                  <button
                    onClick={handleCreateSpace}
                    disabled={loadingAction}
                    className="w-full h-14 rounded-2xl bg-rose-500 text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(244,63,94,0.25)] flex items-center justify-center gap-2"
                  >
                    {loadingAction
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <> Criar o nosso espaço <ArrowRight className="w-4 h-4" strokeWidth={2} /> </>
                    }
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#f0f0f0]" />
                    <span className="text-[11px] text-[#ccc] font-medium">ou</span>
                    <div className="flex-1 h-px bg-[#f0f0f0]" />
                  </div>

                  {/* Secondary — visible, with border */}
                  <button
                    onClick={() => setView("join")}
                    className="w-full h-13 rounded-2xl border border-[#e8e8e8] bg-white text-[14px] font-semibold text-foreground hover:border-rose-200 hover:bg-rose-50/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 py-3.5"
                  >
                    Já tenho um código de convite
                  </button>
                </div>

                {/* Explanation */}
                <p className="text-center text-[11px] text-[#ccc] leading-relaxed">
                  O teu par vai entrar com o código que recebes após criar o espaço.
                </p>
              </>
            ) : (
              <>
                {/* Copy */}
                <div className="text-center space-y-3">
                  <h1 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
                    Entrar no espaço do teu par.
                  </h1>
                  <p className="text-[14px] text-[#888] leading-relaxed">
                    O teu par criou um espaço e partilhou um código contigo. Insere-o abaixo.
                  </p>
                </div>

                {/* Code input */}
                <form onSubmit={handleJoinSpace} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#999] px-1">
                      Código de convite
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 3L2BRUL2"
                      value={inviteCodeInput}
                      onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                      maxLength={12}
                      autoFocus
                      className="w-full h-14 rounded-2xl border border-[#eeeeee] bg-white text-center text-[18px] font-black text-foreground placeholder:text-[#d4d4d4] tracking-[0.2em] focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
                    />
                  </div>

                  {/* Primary */}
                  <button
                    type="submit"
                    disabled={loadingAction || inviteCodeInput.trim().length < 4}
                    className="w-full h-14 rounded-2xl bg-rose-500 text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(244,63,94,0.25)] flex items-center justify-center gap-2"
                  >
                    {loadingAction
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <> Entrar no espaço <ArrowRight className="w-4 h-4" strokeWidth={2} /> </>
                    }
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#f0f0f0]" />
                    <span className="text-[11px] text-[#ccc] font-medium">ou</span>
                    <div className="flex-1 h-px bg-[#f0f0f0]" />
                  </div>

                  {/* Secondary — create instead */}
                  <button
                    type="button"
                    onClick={() => setView("create")}
                    className="w-full h-13 rounded-2xl border border-[#e8e8e8] bg-white text-[14px] font-semibold text-foreground hover:border-rose-200 hover:bg-rose-50/30 active:scale-[0.98] transition-all flex items-center justify-center py-3.5"
                  >
                    Quero criar um novo espaço
                  </button>
                </form>

                <p className="text-center text-[11px] text-[#ccc] leading-relaxed">
                  Não tens código? Pede ao teu par que crie o espaço primeiro.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="pb-12 shrink-0" />
      </div>
    );
  }

  // ── Has house — waiting for partner ──────────────────────────────────────
  if (state.status === "has_house" && memberCount < 2) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 select-none">
        {/* Subtle ambient */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 blur-[90px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-[280px] text-center space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">

          <WaitingVisual />

          <div className="space-y-3">
            <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
              O vosso ninho está criado.
            </h1>
            <p className="text-[14px] text-[#888] leading-relaxed">
              Partilha o código com o teu par. Podes entrar na app enquanto esperas.
            </p>
          </div>

          {/* Invite code — prominent */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-[#bbb] uppercase tracking-wider">
              Código do vosso espaço
            </p>
            <div className="h-16 rounded-2xl border border-[#f0f0f0] bg-[#fafafa] flex items-center justify-center">
              <span className="text-[22px] font-black text-foreground tracking-[0.25em]">
                {state.inviteCode ?? "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 h-12 rounded-2xl bg-rose-500 text-white font-semibold text-[14px] active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(244,63,94,0.25)] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" strokeWidth={1.5} />
                Partilhar código
              </button>
              <button
                onClick={() => state.inviteCode && navigator.clipboard.writeText(state.inviteCode).then(() =>
                  toast({ title: "Código copiado" })
                )}
                className="h-12 w-12 rounded-2xl border border-[#eeeeee] bg-white flex items-center justify-center active:scale-95 transition-all"
              >
                <Copy className="w-4 h-4 text-[#bbb]" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Enter app — don't block user */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full h-13 rounded-2xl border border-[#e8e8e8] bg-white text-[14px] font-semibold text-foreground hover:border-rose-200 hover:bg-rose-50/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 py-3.5"
            >
              Entrar na app <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <p className="text-[11px] text-[#ccc] text-center animate-ob-hint">
              O teu par pode juntar-se depois com o código acima.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Has house — both connected (auto-navigates after 2.2s) ───────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 select-none">
      <div className="relative z-10 w-full max-w-[280px] text-center space-y-10 animate-in fade-in zoom-in-95 duration-500">
        <TogetherVisual />
        <div className="space-y-4">
          <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
            O vosso espaço está completo.
          </h1>
          <p className="text-[14px] text-[#999] leading-relaxed">
            {partnerName
              ? `Tu e ${partnerName} estão agora juntos no LoveNest.`
              : "Já podem começar a construir a vossa história."
            }
          </p>
        </div>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="w-full h-14 rounded-2xl bg-rose-500/90 text-white font-semibold text-[15px] active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(244,63,94,0.18)] flex items-center justify-center gap-2"
        >
          Entrar no LoveNest <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { Share2, Copy, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { COUNTRIES } from "@/data/countries";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { CountryStep } from "@/components/onboarding/steps/CountryStep";
import { GenderStep } from "@/components/onboarding/steps/GenderStep";
import { ReligionStep } from "@/components/onboarding/steps/ReligionStep";
import { UsageModeStep } from "@/components/onboarding/steps/UsageModeStep";
import { PrimaryGoalStep } from "@/components/onboarding/steps/PrimaryGoalStep";

type OnboardingDraft = {
  countryCode: string | null;
  gender: string | null;
  religion: string | null;
  usageMode: "solo" | "couple" | null;
  primaryGoal: string | null;
};

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

  // Onboarding V2 — questionário de personalização (país/género/espiritualidade/
  // modo/objetivo). Vive aqui porque /casa já é o gate obrigatório existente
  // para qualquer utilizador sem couple_space_id; respostas ficam em estado
  // local e só são persistidas no fim, para evitar ambiguidade de retoma
  // (gender=null tanto significa "ainda não respondido" como "prefiro não dizer").
  const { profile, loading: profileLoading, update: updateProfile, completeOnboarding, refresh: refreshProfile } = useProfile();
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({ countryCode: null, gender: null, religion: null, usageMode: null, primaryGoal: null });
  const [creatingSolo, setCreatingSolo] = useState(false);
  const [soloCreateFailed, setSoloCreateFailed] = useState(false);

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

  // Modo solo: cria um espaço de 1 membro em silêncio (reaproveita o mesmo
  // couple_space_id que toda a app já depende de — Biblioteca, Mood, trial,
  // etc. — sem ecrã de código/convite) e entra direto na app.
  const handleCreateSoloSpace = useCallback(async () => {
    setCreatingSolo(true);
    setSoloCreateFailed(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/entrar"); return; }

      const { data: existing } = await supabase
        .from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();

      if (!existing) {
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data: space, error: spaceError } = await supabase
          .from("couple_spaces").insert({ invite_code: inviteCode }).select().single();
        if (spaceError) throw spaceError;

        const { error: memberError } = await supabase.from("members")
          .insert({ couple_space_id: space.id, user_id: user.id });
        if (memberError && memberError.code !== "23505") throw memberError;
        track("space_created_solo");
      }

      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao preparar o teu espaço", description: error.message });
      setCreatingSolo(false);
      setSoloCreateFailed(true);
    }
  }, [navigate, toast]);

  // Assim que o questionário termina em modo solo, avança automaticamente —
  // não há ecrã de "à espera do parceiro" para quem escolheu usar sozinho.
  // soloCreateFailed evita um loop de tentativas automáticas sem fim caso a
  // criação do espaço falhe (ex: sem rede) — fica à espera de um novo toque.
  useEffect(() => {
    if (profile?.onboarding_completed && profile.usage_mode === "solo" && state.status === "no_house" && !creatingSolo && !soloCreateFailed) {
      handleCreateSoloSpace();
    }
  }, [profile?.onboarding_completed, profile?.usage_mode, state.status, creatingSolo, soloCreateFailed, handleCreateSoloSpace]);

  const finishOnboarding = async (primaryGoal: string) => {
    try {
      const countryName = COUNTRIES.find(c => c.code === draft.countryCode)?.name ?? null;
      await updateProfile({
        country: countryName,
        country_code: draft.countryCode,
        gender: draft.gender,
        religion: draft.religion,
        usage_mode: draft.usageMode,
        primary_goal: primaryGoal,
      });
      await completeOnboarding();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao guardar as tuas respostas", description: error.message });
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
      // O trigger fn_auto_couple_mode_on_join actualiza usage_mode='couple'
      // server-side. Fazemos refresh do perfil para a UI reflectir imediatamente.
      await Promise.all([refresh(), refreshProfile()]);
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
    const text = `Vem para o nosso espaço no LoveNest!\nUsa o código: ${code}\n${window.location.origin}`;

    // 1. Try native share sheet (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: "LoveNest", text, url: window.location.origin });
        return; // success — share sheet opened
      } catch (e: any) {
        // User cancelled (AbortError) or share failed — fall through to clipboard
        if (e?.name === "AbortError") return; // user cancelled intentionally
      }
    }

    // 2. Try clipboard API
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Código copiado!", description: "Cola e envia ao teu par." });
      return;
    } catch {}

    // 3. Last resort — execCommand (works in most desktop browsers)
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast({ title: "Código copiado!", description: "Cola e envia ao teu par." });
    } catch {
      // Nothing worked — show the code in a toast so user can copy manually
      toast({ title: `Código: ${code}`, description: "Copia e envia ao teu par manualmente." });
    }
  };

  // ── Loading (perfil ou espaço) ───────────────────────────────────────────
  if (profileLoading || state.status === "loading" || creatingSolo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-rose-300 animate-spin" />
      </div>
    );
  }

  // ── Onboarding V2 — questionário de personalização (uma pergunta por ecrã) ─
  if (profile && !profile.onboarding_completed) {
    const goBack = () => setOnboardingStep(s => Math.max(0, s - 1));

    switch (onboardingStep) {
      case 0:
        return <WelcomeStep onContinue={() => setOnboardingStep(1)} />;
      case 1:
        return (
          <CountryStep
            initialValue={draft.countryCode}
            onBack={goBack}
            onSubmit={(countryCode) => { setDraft(d => ({ ...d, countryCode })); setOnboardingStep(2); }}
          />
        );
      case 2:
        return (
          <GenderStep
            initialValue={draft.gender}
            onBack={goBack}
            onSubmit={(gender) => { setDraft(d => ({ ...d, gender })); setOnboardingStep(3); }}
          />
        );
      case 3:
        return (
          <ReligionStep
            initialValue={draft.religion}
            onBack={goBack}
            onSubmit={(religion) => { setDraft(d => ({ ...d, religion })); setOnboardingStep(4); }}
          />
        );
      case 4:
        return (
          <UsageModeStep
            initialValue={draft.usageMode}
            onBack={goBack}
            onSubmit={(usageMode) => { setDraft(d => ({ ...d, usageMode })); setOnboardingStep(5); }}
          />
        );
      default:
        return (
          <PrimaryGoalStep
            initialValue={draft.primaryGoal}
            onBack={goBack}
            continueLabel={draft.usageMode === "solo" ? "Entrar no LoveNest" : "Continuar"}
            onSubmit={(primaryGoal) => { setDraft(d => ({ ...d, primaryGoal })); finishOnboarding(primaryGoal); }}
          />
        );
    }
  }

  // ── No house — create or join ─────────────────────────────────────────────
  if (state.status === "no_house") {
    return (
      <div className="min-h-screen bg-background flex flex-col select-none">
        {/* Top bar */}
        <div className="px-6 pt-12 shrink-0 h-16 flex items-center">
          {view === "join" && (
            <button
              onClick={() => setView("create")}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground/65" strokeWidth={1.5} />
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
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
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
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground/50 font-medium">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Secondary — visible, with border */}
                  <button
                    onClick={() => setView("join")}
                    className="w-full h-13 rounded-2xl border border-border bg-card text-[14px] font-semibold text-foreground hover:border-rose-200 hover:bg-rose-50/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 py-3.5"
                  >
                    Já tenho um código de convite
                  </button>
                </div>

                {/* Explanation */}
                <p className="text-center text-[11px] text-muted-foreground/50 leading-relaxed">
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
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    O teu par criou um espaço e partilhou um código contigo. Insere-o abaixo.
                  </p>
                </div>

                {/* Code input */}
                <form onSubmit={handleJoinSpace} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-muted-foreground px-1">
                      Código de convite
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 3L2BRUL2"
                      value={inviteCodeInput}
                      onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                      maxLength={12}
                      autoFocus
                      className="w-full h-14 rounded-2xl border border-border bg-card text-center text-[18px] font-black text-foreground placeholder:text-muted-foreground/40 tracking-[0.2em] focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
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
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground/50 font-medium">ou</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Secondary — create instead */}
                  <button
                    type="button"
                    onClick={() => setView("create")}
                    className="w-full h-13 rounded-2xl border border-border bg-card text-[14px] font-semibold text-foreground hover:border-rose-200 hover:bg-rose-50/30 active:scale-[0.98] transition-all flex items-center justify-center py-3.5"
                  >
                    Quero criar um novo espaço
                  </button>
                </form>

                <p className="text-center text-[11px] text-muted-foreground/50 leading-relaxed">
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 select-none">
        {/* Subtle ambient */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-50/50 blur-[90px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-[280px] text-center space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">

          <WaitingVisual />

          <div className="space-y-3">
            <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
              O vosso ninho está criado.
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Partilha o código com o teu par. Podes entrar na app enquanto esperas.
            </p>
          </div>

          {/* Invite code — prominent */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground/65 uppercase tracking-wider">
              Código do vosso espaço
            </p>
            <div className="h-16 rounded-2xl border border-border bg-muted flex items-center justify-center">
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
                className="h-12 w-12 rounded-2xl border border-border bg-card flex items-center justify-center active:scale-95 transition-all"
              >
                <Copy className="w-4 h-4 text-muted-foreground/65" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Enter app — don't block user */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full h-13 rounded-2xl border border-border bg-card text-[14px] font-semibold text-foreground hover:border-rose-200 hover:bg-rose-50/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 py-3.5"
            >
              Entrar na app <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <p className="text-[11px] text-muted-foreground/50 text-center animate-ob-hint">
              O teu par pode juntar-se depois com o código acima.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Has house — both connected (auto-navigates after 2.2s) ───────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 select-none">
      <div className="relative z-10 w-full max-w-[280px] text-center space-y-10 animate-in fade-in zoom-in-95 duration-500">
        <TogetherVisual />
        <div className="space-y-4">
          <h1 className="text-[24px] font-bold text-foreground leading-tight tracking-tight">
            O vosso espaço está completo.
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
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

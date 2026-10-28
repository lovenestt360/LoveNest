import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@vercel/analytics";
import { Share2, Copy, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { Guardian, type GuardianHandle } from "@/features/entry/Guardian";
import { BackButton, ChatScript, EntryScreen } from "@/features/entry/EntryKit";
import { prefersReducedMotion } from "@/features/entry/entryUtils";

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

  // O questionário de personalização vive no onboarding (/inicio); aqui só
  // se lê o perfil para saber se falta responder e se o modo é solo.
  const { profile, loading: profileLoading, refresh: refreshProfile } = useProfile();
  const [creatingSolo, setCreatingSolo] = useState(false);
  const pet = useRef<GuardianHandle>(null);
  const [soloCreateFailed, setSoloCreateFailed] = useState(false);

  const memberCount = useMemo(() => {
    if (state.status !== "has_house") return 0;
    return state.members.length;
  }, [state]);

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

    const byId = new Map((profilesRows ?? []).map((p: MemberProfile) => [p.user_id, p]));
    const profiles: MemberProfile[] = ids.map((id: string) => {
      const p = byId.get(id) as MemberProfile | undefined;
      return { user_id: id, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null };
    });

    setState({ status: "has_house", coupleSpaceId, inviteCode: spaceRow?.invite_code ?? null, members: profiles });
  }, [navigate]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-navigate to home if both partners connected
  useEffect(() => {
    if (state.status === "has_house" && memberCount >= 2) {
      // Small delay to let the "complete" state render first
      const t = setTimeout(() => navigate("/", { replace: true }), prefersReducedMotion() ? 2200 : 3600);
      return () => clearTimeout(t);
    }
  }, [state.status, memberCount, navigate]);

  const handleCreateSpace = async () => {
    setLoadingAction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/entrar"); return; }

      // create_couple_space() gera o código, cria a casa e torna-te membro no
      // servidor; se já tens casa, devolve-a.
      const { data: existing } = await supabase
        .from("members").select("couple_space_id").eq("user_id", user.id).maybeSingle();
      if (existing) { await refresh(); return; }

      const { error: createError } = await supabase.rpc("create_couple_space" as any);
      if (createError) throw createError;
      track("space_created");
      await refresh();
    } catch (error) {
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
        const { error: createError } = await supabase.rpc("create_couple_space" as any);
        if (createError) throw createError;
        track("space_created_solo");
      }

      navigate("/", { replace: true });
    } catch (error) {
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

  const handleJoinSpace = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoadingAction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/entrar"); return; }

      // A procura do código e a entrada acontecem no servidor: as casas dos
      // outros não são legíveis a partir do browser.
      const code = inviteCodeInput.trim().toUpperCase();
      const { error: joinError } = await supabase.rpc("join_couple_space" as any, { p_code: code });
      if (joinError?.message.includes("invalid_code")) {
        pet.current?.react("shake");
        pet.current?.say("Hmm, este código não existe");
        toast({ variant: "destructive", title: "Código inválido", description: "Não encontrámos nenhum espaço com este código." });
        return;
      }
      if (joinError) {
        let msg = "Não foi possível entrar no espaço.";
        if (joinError.message.includes("couple_space_full")) msg = "Este espaço já tem dois membros.";
        else if (joinError.message.includes("already_member") || joinError.code === "23505") msg = "Já pertences a um espaço.";
        pet.current?.react("shake");
        toast({ variant: "destructive", title: "Erro ao entrar", description: msg });
        return;
      }

      // Clean up stored code
      sessionStorage.removeItem("lovenest_ref");
      localStorage.removeItem("lovenest_ref");

      track("space_joined");
      pet.current?.react("happy");
      pet.current?.hearts(10);
      // O trigger fn_auto_couple_mode_on_join actualiza usage_mode='couple'
      // server-side. Fazemos refresh do perfil para a UI reflectir imediatamente.
      await Promise.all([refresh(), refreshProfile()]);
      navigate("/", { replace: true });
    } catch (error) {
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
      } catch (e) {
        // User cancelled (AbortError) or share failed — fall through to clipboard
        if (e?.name === "AbortError") return; // user cancelled intentionally
      }
    }

    // 2. Try clipboard API
    try {
      await navigator.clipboard.writeText(text);
      pet.current?.react("happy");
      pet.current?.say("Copiado! Envia ao teu par 💌");
      toast({ title: "Código copiado!", description: "Cola e envia ao teu par." });
      return;
    } catch { /* segue para a cópia manual */ }

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
      <EntryScreen className="items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0B1324]/40" />
      </EntryScreen>
    );
  }

  // Ainda falta o questionário: é feito no onboarding.
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/inicio" replace />;
  }

  // ── Sem espaço: criar ou entrar com o código do par ──────────────────────
  if (state.status === "no_house") {
    return (
      <EntryScreen key={view} className="en-step">
        <div style={{ height: 40 }}>
          {view === "join" && <BackButton className="en-in" onClick={() => setView("create")} />}
        </div>
        <div className="en-duo" style={{ marginTop: 8 }}>
          <Guardian
            ref={pet}
            kind="faisca"
            width={128}
            sayAt="right"
            delay={1}
            tapLines={["Olá! 💕", "Estou à espera do teu par", "Vamos criar o vosso espaço?"]}
          />
          <div className="en-spot en-in" style={{ ["--d" as string]: 2 }} aria-hidden="true">?</div>
        </div>

        {view === "create" ? (
          <>
            <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 3, marginTop: 14 }}>O teu par ainda não chegou</h1>
            <p className="en-sub en-center en-in" style={{ ["--d" as string]: 4 }}>
              Cria o vosso espaço e recebe um código para partilhares com o teu par.
            </p>
            <div className="en-spacer" />
            <button
              type="button"
              className="en-btn en-in"
              style={{ ["--d" as string]: 5 }}
              disabled={loadingAction}
              onClick={() => { pet.current?.react("spin"); handleCreateSpace(); }}
            >
              {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Criar o nosso espaço <span className="en-arrow">→</span></>}
            </button>
            <div className="en-or en-in" style={{ ["--d" as string]: 6, margin: "16px 0" }}>ou</div>
            <button type="button" className="en-btn en-ghost en-in" style={{ ["--d" as string]: 7 }} onClick={() => setView("join")}>
              Tenho um código do meu par
            </button>
          </>
        ) : (
          <form onSubmit={handleJoinSpace} className="flex flex-1 flex-col" noValidate>
            <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 3, marginTop: 14 }}>Entrar no espaço do teu par</h1>
            <p className="en-sub en-center en-in" style={{ ["--d" as string]: 4 }}>
              Escreve o código que o teu par partilhou contigo.
            </p>
            <div className="en-in" style={{ ["--d" as string]: 5, marginTop: 22 }}>
              <label className="en-label" htmlFor="join-code">Código do espaço</label>
              <input
                id="join-code"
                className="en-field en-code-in"
                type="text"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="Ex: 3L2BRUL2"
                value={inviteCodeInput}
                maxLength={12}
                autoFocus
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setInviteCodeInput(v);
                  pet.current?.react("nod");
                  if (v.trim().length === 8) pet.current?.say("Parece certo ✨");
                }}
              />
            </div>
            <div className="en-spacer" />
            <button type="submit" className="en-btn en-in" style={{ ["--d" as string]: 6 }} disabled={loadingAction || inviteCodeInput.trim().length < 4}>
              {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar no espaço <span className="en-arrow">→</span></>}
            </button>
            <p className="en-small en-in" style={{ ["--d" as string]: 7, marginTop: 14 }}>
              Não tens código? <button type="button" onClick={() => setView("create")}>Criar um espaço</button>
            </p>
          </form>
        )}
      </EntryScreen>
    );
  }

  // ── Espaço criado: à espera do par ───────────────────────────────────────
  if (state.status === "has_house" && memberCount < 2) {
    return (
      <EntryScreen className="en-step">
        <div className="en-duo" style={{ marginTop: 24 }}>
          <Guardian
            ref={pet}
            kind="faisca"
            width={128}
            sayAt="right"
            delay={1}
            tapLines={["Ainda não chegou 🥺", "Já enviaste o código?", "Estou à espera 💕"]}
          />
          <div className="en-spot en-in" style={{ ["--d" as string]: 2 }} aria-hidden="true">?</div>
        </div>
        <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 3, marginTop: 14 }}>O vosso ninho está criado</h1>
        <ChatScript
          className="en-in"
          style={{ ["--d" as string]: 4, marginTop: 14 } as React.CSSProperties}
          start={700}
          script={[["app", "Agora envia o código ao teu par. Quando entrar, o Guardião do teu par aparece aqui ao meu lado 💙"]]}
        />
        <p className="en-k en-center en-in" style={{ ["--d" as string]: 5, marginTop: 22 }}>Código do vosso espaço</p>
        <div className="en-code en-in" style={{ ["--d" as string]: 5, marginTop: 8 }}>{state.inviteCode ?? "—"}</div>
        <div className="en-spacer" />
        <div className="en-row-btns en-in" style={{ ["--d" as string]: 6 }}>
          <button type="button" className="en-btn" onClick={handleShare}>
            <Share2 className="h-4 w-4" strokeWidth={1.75} /> Partilhar código
          </button>
          <button
            type="button"
            className="en-btn en-ghost en-square"
            aria-label="Copiar código"
            onClick={() => state.inviteCode && navigator.clipboard.writeText(state.inviteCode).then(() => {
              pet.current?.react("happy");
              pet.current?.say("Copiado ✓");
              toast({ title: "Código copiado" });
            })}
          >
            <Copy className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="en-small en-in" style={{ ["--d" as string]: 7, marginTop: 14 }}>
          <button type="button" className="en-quiet py-2" onClick={() => navigate("/", { replace: true })}>Entrar na app enquanto espero</button>
        </p>
      </EntryScreen>
    );
  }

  // ── Os dois juntos: os Guardiões encontram-se (segue sozinho para a app) ──
  return (
    <EntryScreen className="en-step">
      <div className="en-spacer" />
      <div className="en-duo" style={{ height: 210 }}>
        <div className="en-meet-l"><Guardian kind="faisca" width={130} delay={1} /></div>
        <div className="en-meet-r"><Guardian ref={pet} kind="guardiao" width={146} delay={1} /></div>
      </div>
      <h1 className="en-h1 en-center en-in" style={{ ["--d" as string]: 6, marginTop: 18 }}>O vosso espaço está completo</h1>
      <p className="en-sub en-center en-in" style={{ ["--d" as string]: 7 }}>
        {partnerName ? `Tu e ${partnerName} estão agora juntos no LoveNest.` : "Já podem começar a construir a vossa história."}
      </p>
      <div className="en-spacer" />
      <button type="button" className="en-btn en-in" style={{ ["--d" as string]: 9 }} onClick={() => navigate("/", { replace: true })}>
        Entrar no LoveNest <span className="en-arrow">→</span>
      </button>
      <TogetherCheer target={pet} />
    </EntryScreen>
  );
}

/** Quando os dois Guardiões se encontram: salto, corações e uma palavra. */
function TogetherCheer({ target }: { target: React.RefObject<GuardianHandle> }) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      target.current?.react("happy");
      target.current?.hearts(14);
      target.current?.say("Finalmente juntos 💕", 2600);
    }, prefersReducedMotion() ? 0 : 1300);
    return () => window.clearTimeout(t);
  }, [target]);
  return null;
}

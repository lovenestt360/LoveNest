import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Navigate } from "react-router-dom";
import { format, isPast, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft, Lock, Unlock, Plus, Loader2, Trash2,
  Clock, Sparkles, X, ImageIcon, CheckCircle2, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { awardLovePoints } from "@/lib/lovePoints";
import { notifyPartner } from "@/lib/notifyPartner";
import { cn } from "@/lib/utils";

function hasSeenReveal(userId: string, capsuleId: string): boolean {
  try { return (JSON.parse(localStorage.getItem(`ln_cap_rev_seen_${userId}`) ?? "[]") as string[]).includes(capsuleId); }
  catch { return false; }
}

function markRevealSeen(userId: string, capsuleId: string): void {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(`ln_cap_rev_seen_${userId}`) ?? "[]");
    if (!ids.includes(capsuleId)) {
      ids.push(capsuleId);
      localStorage.setItem(`ln_cap_rev_seen_${userId}`, JSON.stringify(ids.slice(-100)));
    }
  } catch {}
}

export default function TimeCapsule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [capsules, setCapsules] = useState<any[]>([]);
  const [houseId, setHouseId] = useState<string | null>(null);

  const [selectedCapsule, setSelectedCapsule] = useState<any | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealPhase, setRevealPhase] = useState<"idle" | "unlocking" | "revealed">("idle");

  const [isAdding, setIsAdding] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCapsules = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: member } = await supabase
        .from("members").select("couple_space_id")
        .eq("user_id", user.id).maybeSingle();
      if (!member) return;
      setHouseId(member.couple_space_id);
      const { data } = await supabase
        .from("time_capsule_messages").select("*")
        .eq("couple_space_id", member.couple_space_id)
        .order("unlock_date", { ascending: true });
      setCapsules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCapsules(); }, [loadCapsules]);

  useEffect(() => {
    if (!houseId) return;
    const ch = supabase
      .channel(`capsule-list-${houseId}`)
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: "time_capsule_messages",
        filter: `couple_space_id=eq.${houseId}`,
      }, () => loadCapsules())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [houseId, loadCapsules]);

  // Fallback: actualiza a lista via evento de window disparado pelo CapsuleRealtimeWatcher
  useEffect(() => {
    window.addEventListener("lovenest-capsule-changed", loadCapsules);
    return () => window.removeEventListener("lovenest-capsule-changed", loadCapsules);
  }, [loadCapsules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !unlockDate || !houseId || !user) return;
    try {
      setUploading(true);
      let publicUrl: string | null = null;
      if (selectedImage) {
        const ext = selectedImage.name.split(".").pop();
        const fileName = `${houseId}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("photos").upload(`capsules/${fileName}`, selectedImage);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("photos").getPublicUrl(`capsules/${fileName}`);
        publicUrl = data.publicUrl;
      }
      const sealedDate = new Date(unlockDate).toISOString();
      const { data: inserted, error } = await (supabase as any)
        .from("time_capsule_messages")
        .insert({
          couple_space_id: houseId, creator_id: user.id,
          message: newMessage, image_url: publicUrl,
          unlock_date: sealedDate, is_unlocked: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      awardLovePoints(houseId, 10, "capsula_tempo", "Cápsula do tempo criada", user.id);
      notifyPartner({ couple_space_id: houseId, title: "Cápsula do Tempo",
        body: "O teu par guardou uma memória para o futuro.", url: "/capsula", type: "memorias" });
      setNewMessage(""); setUnlockDate(""); setSelectedImage(null); setIsAdding(false);
      loadCapsules();
      window.dispatchEvent(new CustomEvent("lovenest-capsule-sealed", {
        detail: { imageUrl: publicUrl, unlockDate: sealedDate, capsuleId: inserted?.id ?? `${Date.now()}` },
      }));
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("time_capsule_messages")
        .delete().eq("id", confirmDeleteId);
      if (error) throw error;
      setCapsules(prev => prev.filter(c => c.id !== confirmDeleteId));
      if (selectedCapsule?.id === confirmDeleteId) setSelectedCapsule(null);
      setConfirmDeleteId(null);
      toast({ title: "Cápsula apagada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleReveal = async () => {
    if (!selectedCapsule || !houseId || !user) return;
    setRevealing(true);
    const alreadyUnlocked = selectedCapsule.is_unlocked;
    try {
      if (!alreadyUnlocked) {
        const { error } = await supabase.from("time_capsule_messages")
          .update({ is_unlocked: true }).eq("id", selectedCapsule.id);
        if (error) throw error;
        await loadCapsules();
        awardLovePoints(houseId, 15, "capsula_revelada", "Cápsula revelada", user.id);
        notifyPartner({
          couple_space_id: houseId, title: "Cápsula revelada!",
          body: "O vosso passado chegou ao presente.", url: "/capsula", type: "memorias",
        });
      }
      markRevealSeen(user.id, selectedCapsule.id);
      setRevealPhase("unlocking");
      setTimeout(() => { setRevealPhase("revealed"); setRevealing(false); }, 2600);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setRevealing(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedCapsule(null);
    setRevealPhase("idle");
  };

  if (!profileLoading && profile?.usage_mode === "solo") return <Navigate to="/" replace />;

  const today = format(new Date(), "yyyy-MM-dd");
  const userId = user?.id;

  // Tipo por utilizador: data passada + utilizador ainda não viu a revelação → "ready"
  const capsuleType = (c: any): "ready" | "locked" | "revealed" => {
    if (!isPast(new Date(c.unlock_date))) return "locked";
    if (userId && hasSeenReveal(userId, c.id)) return "revealed";
    return "ready";
  };

  const ready    = capsules.filter(c => capsuleType(c) === "ready");
  const locked   = capsules.filter(c => capsuleType(c) === "locked");
  const revealed = capsules.filter(c => capsuleType(c) === "revealed");

  return (
    <div className="flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-foreground leading-tight">Cápsula do Tempo</h1>
            {capsules.length > 0 && (
              <p className="text-[10px] text-muted-foreground leading-none">
                {capsules.length} cápsula{capsules.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => setIsAdding(true)}
          className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30 active:scale-90 transition-all"
          aria-label="Nova cápsula">
          <Plus className="w-[18px] h-[18px]" />
        </button>
      </header>

      {/* Compact list — scroll natural via body */}
      <div>
        <div className="pt-3 pb-6 space-y-3">

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : capsules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center mb-4 shadow-sm">
                <Clock className="w-7 h-7 text-violet-300 dark:text-violet-400" strokeWidth={1} />
              </div>
              <p className="text-base font-bold text-foreground mb-1.5">Sem cápsulas ainda</p>
              <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed mb-6">
                Guarda uma mensagem hoje para ser lida num momento especial do futuro
              </p>
              <button onClick={() => setIsAdding(true)}
                className="px-6 py-2.5 rounded-full bg-violet-500 text-white text-sm font-semibold shadow-md shadow-violet-500/20 active:scale-95 transition-all">
                Criar primeira cápsula
              </button>
            </div>
          ) : (
            <>
              {ready.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel icon={<Sparkles className="h-3 w-3 text-rose-400" strokeWidth={1.5} />}>
                    Prontas a abrir
                  </SectionLabel>
                  {ready.map(c => (
                    <CapsuleRow key={c.id} c={c} type="ready" userId={user?.id}
                      onTap={() => setSelectedCapsule(c)}
                      onDelete={() => setConfirmDeleteId(c.id)} />
                  ))}
                </section>
              )}
              {locked.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel icon={<Lock className="h-3 w-3 text-violet-400" strokeWidth={1.5} />}>
                    A aguardar
                  </SectionLabel>
                  {locked.map(c => (
                    <CapsuleRow key={c.id} c={c} type="locked" userId={user?.id}
                      onTap={() => setSelectedCapsule(c)}
                      onDelete={() => setConfirmDeleteId(c.id)} />
                  ))}
                </section>
              )}
              {revealed.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel icon={<Unlock className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />}>
                    Reveladas
                  </SectionLabel>
                  {revealed.map(c => (
                    <CapsuleRow key={c.id} c={c} type="revealed" userId={user?.id}
                      onTap={() => setSelectedCapsule(c)}
                      onDelete={() => setConfirmDeleteId(c.id)} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── DETAIL OVERLAYS ────────────────────────────── */}
      {/* Fluxo completo: ready → unlock animation → revealed */}
      {selectedCapsule && (revealPhase !== "idle" || capsuleType(selectedCapsule) === "ready") && (
        <CapsuleRevealFlow
          capsule={selectedCapsule} phase={revealPhase} revealing={revealing}
          onClose={handleCloseDetail} onReveal={handleReveal} />
      )}
      {selectedCapsule && revealPhase === "idle" && capsuleType(selectedCapsule) === "revealed" && (
        <RevealedDetailView capsule={selectedCapsule} onClose={handleCloseDetail} />
      )}
      {selectedCapsule && revealPhase === "idle" && capsuleType(selectedCapsule) === "locked" && (
        <LockedDetailView capsule={selectedCapsule} onClose={handleCloseDetail} />
      )}

      {/* ── CREATE SHEET ───────────────────────────────── */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => !uploading && setIsAdding(false)}>
          <div className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Nova Cápsula</h2>
              {!uploading && (
                <button onClick={() => setIsAdding(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="bg-muted rounded-2xl divide-y divide-border/50">
                <div className="px-4 py-2.5 flex items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Data</p>
                  <input type="date" value={unlockDate}
                    onChange={e => setUnlockDate(e.target.value)}
                    min={today} required
                    className="bg-transparent border-none outline-none text-sm text-foreground flex-1 text-right" />
                </div>
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mensagem</p>
                  <Textarea
                    placeholder="Escreve para o vosso eu do futuro..."
                    value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    rows={3} required
                    className="bg-transparent border-none p-0 resize-none text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50" />
                </div>
                <div className="px-4 py-2.5 flex items-center gap-3 cursor-pointer active:bg-muted/80 transition-colors"
                  onClick={() => document.getElementById("capsule-img")?.click()}>
                  <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className={cn("text-sm flex-1 truncate", selectedImage ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {selectedImage ? selectedImage.name : "Foto (opcional)"}
                  </span>
                  {selectedImage && (
                    <button type="button" onClick={e => { e.stopPropagation(); setSelectedImage(null); }}
                      className="w-6 h-6 rounded-full bg-border flex items-center justify-center shrink-0">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                  <input id="capsule-img" type="file" accept="image/*,video/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setSelectedImage(e.target.files[0]); }} />
                </div>
              </div>
              <button type="submit"
                disabled={uploading || !newMessage.trim() || !unlockDate}
                className="w-full h-12 rounded-2xl bg-violet-500 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" strokeWidth={1.5} />}
                {uploading ? "A selar..." : "Selar cápsula"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ─────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end"
          onClick={() => !deleting && setConfirmDeleteId(null)}>
          <div className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <p className="text-center text-base font-bold text-foreground">Apagar esta cápsula?</p>
            <p className="text-center text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              <Trash2 className="w-4 h-4" />
              {deleting ? "A apagar..." : "Apagar"}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
              className="w-full h-12 rounded-2xl bg-muted text-foreground font-semibold text-sm disabled:opacity-60">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared sub-components ────────────────────────────────── */

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      {icon}
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{children}</p>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function DeleteCell({ capsuleId, userId, creatorId, onDelete }: {
  capsuleId: string; userId?: string; creatorId: string; onDelete: () => void;
}) {
  if (creatorId !== userId) return null;
  return (
    <button type="button"
      onClick={e => { e.stopPropagation(); onDelete(); }}
      className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-all shrink-0">
      <Trash2 className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
    </button>
  );
}

/* ── Compact list rows ────────────────────────────────────── */

function CapsuleRow({ c, type, userId, onTap, onDelete }: {
  c: any; type: "ready" | "locked" | "revealed"; userId?: string;
  onTap: () => void; onDelete: () => void;
}) {
  const unlockDateObj = new Date(c.unlock_date);
  const daysDiff = Math.max(0, differenceInDays(unlockDateObj, new Date()));

  if (type === "ready") return (
    <div onClick={onTap}
      className="flex items-center gap-3 px-4 py-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl active:opacity-75 transition-opacity cursor-pointer">
      <div className="w-9 h-9 rounded-full bg-white dark:bg-card border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0 shadow-sm">
        <Unlock className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-500 leading-tight">O momento chegou</p>
        <p className="text-[10px] text-muted-foreground capitalize leading-tight mt-0.5 truncate">
          {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-bold text-white bg-rose-500 px-2.5 py-1 rounded-full">
        Revelar
      </span>
      <DeleteCell capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
    </div>
  );

  if (type === "locked") {
    const label = daysDiff === 0 ? "Hoje" : daysDiff === 1 ? "1 dia" : `${daysDiff} dias`;
    return (
      <div onClick={onTap}
        className="flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-2xl active:opacity-75 transition-opacity cursor-pointer">
        <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground capitalize truncate">
            {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-full border border-violet-100 dark:border-violet-900/40">
          {label}
        </span>
        <DeleteCell capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
      </div>
    );
  }

  // revealed
  const isImg = c.image_url && !/\.(mp4|webm|mov)(\?|$)/i.test(c.image_url);
  return (
    <div onClick={onTap}
      className="flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-2xl active:opacity-75 transition-opacity cursor-pointer">
      {isImg ? (
        <img src={c.image_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 border border-border/40" />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">
          {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
        <p className="text-xs text-foreground truncate leading-tight">{c.message}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
      <DeleteCell capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
    </div>
  );
}

/* ── Emotional copy pools ─────────────────────────────────── */

const REVEAL_QUOTES = [
  "O tempo guardou este momento para vocês.\nHoje é finalmente o dia de o reviver.",
  "Durante todo este tempo, esta memória esperou pacientemente por este instante.",
  "Nem todas as viagens são para novos lugares.\nAlgumas levam-nos de volta ao que mais amamos.",
  "Escreveram esta mensagem num dia diferente.\nHoje, esse dia chegou.",
];

const REVEALED_QUOTES = [
  "Há memórias que o tempo nunca consegue apagar.",
  "Hoje voltaram exatamente ao momento em que escreveram esta história.",
  "Esta foi a vossa forma de enviar uma carta para o futuro.\nE o futuro chegou.",
  "Algumas histórias são tão bonitas que merecem ser vividas duas vezes.",
];

function pickQuote(quotes: string[], id: string) {
  const n = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return quotes[n % quotes.length];
}

/* ── Portal overlay base — escapa qualquer stacking context do AppShell ── */

const PORTAL_BASE: React.CSSProperties = {
  position: "fixed",
  top: 0, left: 0,
  width: "100%", height: "100%",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  overscrollBehavior: "none",
};

/* ── Fluxo completo de revelação (idle → unlocking → revealed) ── */

const PARTICLES = [
  { dx:  0,   dy: -88 }, { dx:  62,  dy: -62 }, { dx:  88,  dy:  0  },
  { dx:  62,  dy:  62 }, { dx:  0,   dy:  88 }, { dx: -62,  dy:  62 },
  { dx: -88,  dy:  0  }, { dx: -62,  dy: -62 },
];

function CapsuleRevealFlow({ capsule, phase, revealing, onClose, onReveal }: {
  capsule: any;
  phase: "idle" | "unlocking" | "revealed";
  revealing: boolean;
  onClose: () => void;
  onReveal: () => void;
}) {
  const quote        = pickQuote(REVEAL_QUOTES,    capsule.id);
  const revealedQuote = pickQuote(REVEALED_QUOTES, capsule.id);
  const unlockDate   = new Date(capsule.unlock_date);
  const date         = format(unlockDate, "d 'de' MMMM 'de' yyyy", { locale: pt });
  const dayOfWeek    = format(unlockDate, "EEEE", { locale: pt });

  const diffDays  = Math.floor((Date.now() - unlockDate.getTime()) / 86_400_000);
  const relStr    = diffDays === 0 ? "Hoje"
    : diffDays === 1 ? "Ontem"
    : diffDays < 30  ? `Há ${diffDays} dias`
    : diffDays < 365 ? `Há ${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? "mês" : "meses"}`
    : `Há ${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? "ano" : "anos"}`;

  const isVideo  = /\.(mp4|webm|mov)(\?|$)/i.test(capsule.image_url || "");
  const hasPhoto = !!capsule.image_url && !isVideo;
  const hasMedia = !!capsule.image_url;

  return createPortal(
    <div style={{ ...PORTAL_BASE, background: "#08020e", overflow: "hidden" }}>

      {/* ═══════════════════ IDLE — pronto para revelar ═══════════════════ */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        opacity: phase === "idle" ? 1 : 0,
        transition: "opacity 400ms ease",
        pointerEvents: phase === "idle" ? "auto" : "none",
      }}>
        {/* Glow ambient */}
        <div style={{ position: "absolute", top: "28%", left: "50%", transform: "translateX(-50%)",
          width: 220, height: 220, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)",
          filter: "blur(52px)", pointerEvents: "none" }} />

        {/* X */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, zIndex: 2,
          width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} color="rgba(255,255,255,0.70)" strokeWidth={1.5} />
        </button>

        {/* Centro */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
          <div style={{ position: "relative", width: 148, height: 148,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
              border: "1px solid rgba(244,63,94,0.14)",
              animation: "capsule-ring 3.6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 16, borderRadius: "50%",
              border: "1px solid rgba(244,63,94,0.24)",
              animation: "capsule-ring 3.6s ease-in-out infinite 0.7s" }} />
            <div style={{ position: "relative", zIndex: 1, width: 80, height: 80, borderRadius: "50%",
              background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.26)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "capsule-float 4s ease-in-out infinite" }}>
              <Unlock size={34} color="rgba(251,113,133,0.95)" strokeWidth={1} />
            </div>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.5,
            marginBottom: 16, whiteSpace: "pre-line",
            animation: "capsule-fade-up 600ms 200ms both ease" }}>{quote}</p>
          <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "capitalize",
            color: "rgba(255,255,255,0.22)", animation: "capsule-fade-up 600ms 340ms both ease" }}>{date}</p>
        </div>

        {/* Botões */}
        <div style={{ padding: "0 24px", paddingBottom: "max(env(safe-area-inset-bottom,0px),44px)" }}>
          <p style={{ fontSize: 11, textAlign: "center", marginBottom: 18, lineHeight: 1.6,
            color: "rgba(255,255,255,0.20)" }}>
            Uma vez aberta, a mensagem fica visível para os dois permanentemente.
          </p>
          <button onClick={onReveal} disabled={revealing} style={{
            width: "100%", height: 56, borderRadius: 28, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#f43f5e 0%,#be123c 100%)",
            boxShadow: "0 16px 48px rgba(244,63,94,0.32)",
            color: "#fff", fontWeight: 700, fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: revealing ? 0.6 : 1,
          }}>
            {revealing
              ? <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              : <Unlock size={20} strokeWidth={1.5} />}
            {revealing ? "A revelar..." : "Revelar cápsula"}
          </button>
          <button onClick={onClose} disabled={revealing} style={{
            width: "100%", height: 44, background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.28)", fontWeight: 600, fontSize: 14, marginTop: 4,
          }}>Cancelar</button>
        </div>
      </div>

      {/* ═══════════════════ UNLOCKING — sequência cinematic ═════════════ */}
      {phase === "unlocking" && (
        <div style={{ position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Foto a materializar-se em desfoque */}
          {hasPhoto && (
            <img src={capsule.image_url} aria-hidden alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: 0.35,
              filter: "blur(28px) brightness(0.35)",
              transition: "opacity 1.6s ease",
            }} />
          )}

          {/* Burst rings */}
          <div style={{ position: "absolute", width: 88, height: 88, borderRadius: "50%",
            border: "2px solid rgba(244,63,94,0.70)",
            animation: "burst-ring 1100ms ease-out both" }} />
          <div style={{ position: "absolute", width: 88, height: 88, borderRadius: "50%",
            border: "1px solid rgba(244,63,94,0.45)",
            animation: "burst-ring 1100ms ease-out 220ms both" }} />

          {/* Partículas */}
          {PARTICLES.map((p, i) => (
            <div key={i} style={{
              position: "absolute", width: 5, height: 5, borderRadius: "50%",
              background: i % 2 === 0 ? "rgba(251,113,133,0.85)" : "rgba(244,63,94,0.65)",
              ["--dx" as any]: `${p.dx}px`, ["--dy" as any]: `${p.dy}px`,
              animation: `particle-out 900ms ${i * 60}ms ease-out both`,
            }} />
          ))}

          {/* Ícone cadeado aberto com escala */}
          <div style={{ position: "relative", zIndex: 2,
            width: 88, height: 88, borderRadius: "50%",
            background: "rgba(244,63,94,0.18)", border: "1px solid rgba(244,63,94,0.32)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "burst-icon 800ms ease both",
            boxShadow: "0 0 80px rgba(244,63,94,0.45)" }}>
            <Unlock size={38} color="rgba(251,113,133,1)" strokeWidth={1} />
          </div>
        </div>
      )}

      {/* ═══════════════════ REVEALED — a memória ════════════════════════ */}
      {phase === "revealed" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#000",
          animation: "capsule-fade-up 300ms ease both" }}>

          {/* X */}
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10,
            paddingTop: "env(safe-area-inset-top, 0px)" }}>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(0,0,0,0.60)", backdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={16} color="rgba(255,255,255,0.80)" strokeWidth={1.5} />
            </button>
          </div>

          {/* Foto — com photo-focus animation */}
          {hasPhoto && (
            <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={capsule.image_url} aria-hidden
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", filter: "blur(28px) brightness(0.22)", transform: "scale(1.10)" }} />
              <img src={capsule.image_url} alt="Memória"
                style={{ position: "relative", zIndex: 1,
                  maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto",
                  filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.55))",
                  animation: "photo-focus 1400ms ease both" }} />
            </div>
          )}

          {isVideo && (
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", background: "#000" }}>
              <video src={capsule.image_url} controls autoPlay
                style={{ width: "100%" }} />
            </div>
          )}

          {!hasMedia && (
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center",
              animation: "capsule-fade-up 500ms ease both" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%",
                background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Unlock size={36} color="rgba(251,113,133,0.80)" strokeWidth={1} />
              </div>
            </div>
          )}

          {/* Painel de informação — sobe com animação */}
          <div className="bg-card rounded-t-[2rem] px-5 pt-5 shrink-0 overflow-y-auto"
            style={{
              maxHeight: hasMedia ? "52svh" : "82svh",
              paddingBottom: "max(env(safe-area-inset-bottom,0px),1.5rem)",
              boxShadow: "0 -16px 48px rgba(0,0,0,0.28)",
              animation: "panel-slide-up 500ms 300ms ease both",
            }}>

            {/* Quote emocional */}
            <p className="text-sm italic text-rose-400 leading-relaxed mb-1 whitespace-pre-line"
              style={{ animation: "capsule-fade-up 400ms 600ms both ease" }}>
              {revealedQuote}
            </p>

            {/* Data + relativo */}
            <p className="text-xs text-muted-foreground capitalize mb-0.5"
              style={{ animation: "capsule-fade-up 400ms 720ms both ease" }}>
              {dayOfWeek}, {date}
            </p>
            <p className="text-[11px] font-semibold text-rose-400 mb-4"
              style={{ animation: "capsule-fade-up 400ms 780ms both ease" }}>
              {relStr}
            </p>

            {/* Separador */}
            <div className="h-px bg-border/50 mb-4"
              style={{ animation: "capsule-fade-up 400ms 820ms both ease" }} />

            {/* Mensagem */}
            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap mb-4"
              style={{ animation: "capsule-fade-up 400ms 900ms both ease" }}>
              {capsule.message}
            </p>

            {/* Rodapé */}
            <p className="text-[10px] text-muted-foreground/45 pt-3 border-t border-border/40 leading-relaxed"
              style={{ animation: "capsule-fade-up 400ms 1020ms both ease" }}>
              Esta memória faz parte da vossa história
            </p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function RevealedDetailView({ capsule, onClose }: { capsule: any; onClose: () => void }) {
  const quote = pickQuote(REVEALED_QUOTES, capsule.id);
  const unlockDate = new Date(capsule.unlock_date);
  const date = format(unlockDate, "d 'de' MMMM 'de' yyyy", { locale: pt });
  const dayOfWeek = format(unlockDate, "EEEE", { locale: pt });
  const diffDays = Math.floor((Date.now() - unlockDate.getTime()) / 86_400_000);
  const relativeStr = diffDays === 0 ? "Hoje" : diffDays === 1 ? "Ontem"
    : diffDays < 30 ? `Há ${diffDays} dias`
    : diffDays < 365 ? `Há ${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? "mês" : "meses"}`
    : `Há ${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? "ano" : "anos"}`;

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(capsule.image_url || "");
  const hasMedia = !!capsule.image_url;

  return createPortal(
    <div className="fixed inset-0 flex flex-col bg-black animate-in fade-in duration-150"
      style={{ zIndex: 9999 }}>

      {/* Top controls — exatamente como MemoryDetail */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center p-4"
        style={{ paddingTop: "max(env(safe-area-inset-top,0px),1rem)" }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          aria-label="Fechar">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* ── FOTO — flex-1, mesmo padrão de MemoryDetail ── */}
      {hasMedia && !isVideo && (
        <div className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center">
          {/* Ambient blur de fundo */}
          <img src={capsule.image_url} aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60 pointer-events-none" />
          {/* Foto real — nunca cortada, adaptada ao formato */}
          <img src={capsule.image_url} alt="Memória"
            style={{
              maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto",
              filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.55))",
            }}
            className="relative z-10 block" />
        </div>
      )}

      {hasMedia && isVideo && (
        <div className="flex-1 min-h-0 flex items-center bg-black">
          <video src={capsule.image_url} controls className="w-full" />
        </div>
      )}

      {/* Sem media: área emocional centralizada */}
      {!hasMedia && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
            <Unlock className="w-9 h-9 text-rose-400" strokeWidth={1} />
          </div>
          <p className="text-xs text-white/30 font-medium tracking-widest uppercase">Cápsula revelada</p>
        </div>
      )}

      {/* ── INFO PANEL — bg-card rounded-t, exatamente como MemoryDetail ── */}
      <div className="bg-card rounded-t-[2rem] px-5 pt-5 shrink-0 overflow-y-auto"
        style={{
          maxHeight: hasMedia ? "52svh" : "80svh",
          paddingBottom: "max(env(safe-area-inset-bottom,0px),1.25rem)",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.18)",
        }}>

        {/* Quote emocional */}
        <p className="text-sm italic text-rose-400 leading-relaxed mb-1 whitespace-pre-line">
          {quote}
        </p>

        {/* Data + relativo (como MemoryDetail) */}
        <p className="text-xs text-muted-foreground capitalize mb-0.5">
          {dayOfWeek}, {date}
        </p>
        <p className="text-[11px] font-semibold text-rose-400 mb-4">{relativeStr}</p>

        {/* Separador */}
        <div className="h-px bg-border/50 mb-4" />

        {/* Mensagem da cápsula */}
        <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap mb-4">
          {capsule.message}
        </p>

        {/* Footnote */}
        <p className="text-[10px] text-muted-foreground/45 pt-3 border-t border-border/40 leading-relaxed">
          Esta memória faz parte da vossa história
        </p>
      </div>
    </div>,
    document.body
  );
}

function LockedDetailView({ capsule, onClose }: { capsule: any; onClose: () => void }) {
  const unlockDateObj = new Date(capsule.unlock_date);
  const daysDiff = Math.max(0, differenceInDays(unlockDateObj, new Date()));
  const date = format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt });

  return createPortal(
    <div style={{ ...PORTAL_BASE, background: "#04020e" }}>

      {/* Glow suave — não tapa conteúdo */}
      <div style={{
        position: "absolute", top: "26%", left: "50%",
        transform: "translateX(-50%)",
        width: 240, height: 240, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)",
        filter: "blur(52px)", pointerEvents: "none",
      }} />

      <button onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 2,
          width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
        <X size={18} color="rgba(255,255,255,0.65)" strokeWidth={1.5} />
      </button>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 32px", textAlign: "center" }}>

        {/* Aneis + ícone */}
        <div style={{ position: "relative", width: 148, height: 148,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
            border: "1px solid rgba(139,92,246,0.16)",
            animation: "capsule-ring 3.6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 16, borderRadius: "50%",
            border: "1px solid rgba(139,92,246,0.24)",
            animation: "capsule-ring 3.6s ease-in-out infinite 0.7s" }} />
          <div style={{
            position: "relative", zIndex: 1, width: 80, height: 80, borderRadius: "50%",
            background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "capsule-float 4s ease-in-out infinite",
          }}>
            <Lock size={34} color="rgba(196,181,253,0.90)" strokeWidth={1} />
          </div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(167,139,250,0.45)", marginBottom: 14,
          animation: "capsule-fade-up 600ms 80ms both ease" }}>
          Esta memória ainda não está pronta
        </p>
        <p style={{ fontSize: 88, fontWeight: 800, color: "#fff", lineHeight: 1,
          marginBottom: 4, animation: "capsule-fade-up 600ms 180ms both ease" }}>
          {daysDiff}
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.30)", marginBottom: 12,
          animation: "capsule-fade-up 600ms 260ms both ease" }}>
          dia{daysDiff !== 1 ? "s" : ""} até poder ser aberta
        </p>
        <p style={{ fontSize: 12, textTransform: "capitalize", color: "rgba(255,255,255,0.16)",
          animation: "capsule-fade-up 600ms 340ms both ease" }}>
          {date}
        </p>
      </div>

      <div style={{ padding: "0 24px", paddingBottom: "max(env(safe-area-inset-bottom,0px),44px)" }}>
        <button onClick={onClose}
          style={{
            width: "100%", height: 48, borderRadius: 24, border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.40)",
            fontWeight: 600, fontSize: 14,
          }}>
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
}

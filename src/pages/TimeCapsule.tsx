import { useState, useEffect, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { format, isPast, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft, Lock, Unlock, Plus, Loader2, Trash2,
  Clock, Sparkles, X, ImageIcon, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { awardLovePoints } from "@/lib/lovePoints";
import { triggerCeremony } from "@/lib/ceremonies";
import { notifyPartner } from "@/lib/notifyPartner";
import { cn } from "@/lib/utils";
import { CapsuleSealCeremony } from "@/features/capsule/CapsuleSealCeremony";

interface CeremonyData {
  message: string;
  imageUrl: string | null;
  witnessMode?: boolean;
}

function getSeenCapsules(houseId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`ln_capsule_seen_${houseId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markCapsuleSeen(houseId: string, capsuleId: string) {
  try {
    const seen = getSeenCapsules(houseId);
    seen.add(capsuleId);
    localStorage.setItem(`ln_capsule_seen_${houseId}`, JSON.stringify([...seen]));
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

  const [isAdding, setIsAdding] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [revealTarget, setRevealTarget] = useState<any | null>(null);
  const [revealing, setRevealing] = useState(false);

  const [ceremony, setCeremony] = useState<CeremonyData | null>(null);

  // Deteção de cápsulas novas do par — mostra cerimónia em modo testemunha
  useEffect(() => {
    if (!user || !houseId || loading || capsules.length === 0 || ceremony) return;
    const MS_48H = 48 * 60 * 60 * 1000;
    const seen = getSeenCapsules(houseId);
    const newPartnerCapsule = capsules.find(c =>
      c.creator_id !== user.id &&
      !c.is_unlocked &&
      !seen.has(c.id) &&
      Date.now() - new Date(c.created_at).getTime() < MS_48H
    );
    if (newPartnerCapsule) {
      markCapsuleSeen(houseId, newPartnerCapsule.id);
      setCeremony({ message: "", imageUrl: null, witnessMode: true });
    }
  }, [capsules, houseId, user, loading, ceremony]);

  const loadCapsules = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: member } = await supabase
        .from("members")
        .select("couple_space_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) return;
      setHouseId(member.couple_space_id);

      const { data: capsData } = await supabase
        .from("time_capsule_messages")
        .select("*")
        .eq("couple_space_id", member.couple_space_id)
        .order("unlock_date", { ascending: true });

      setCapsules(capsData || []);
    } catch (error) {
      console.error("Erro a carregar cápsulas", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCapsules(); }, [loadCapsules]);

  useEffect(() => {
    if (!houseId) return;
    const channel = supabase
      .channel(`capsule-list-${houseId}`)
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: "time_capsule_messages",
        filter: `couple_space_id=eq.${houseId}`,
      }, () => loadCapsules())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [houseId, loadCapsules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !unlockDate || !houseId || !user) return;

    try {
      setUploading(true);
      let publicUrl: string | null = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${houseId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(`capsules/${fileName}`, selectedImage);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from("photos")
          .getPublicUrl(`capsules/${fileName}`);
        publicUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("time_capsule_messages").insert({
        couple_space_id: houseId,
        creator_id: user.id,
        message: newMessage,
        image_url: publicUrl,
        unlock_date: new Date(unlockDate).toISOString(),
        is_unlocked: false,
      });

      if (error) throw error;

      awardLovePoints(houseId, 10, "capsula_tempo", "Cápsula do tempo criada", user.id);
      notifyPartner({
        couple_space_id: houseId,
        title: "Cápsula do Tempo",
        body: "O teu par guardou uma memória para o futuro.",
        url: "/capsula",
        type: "memorias",
      });

      // Guarda o contexto da cerimónia antes de limpar o formulário
      const msgSnapshot = newMessage;
      const imgSnapshot = publicUrl;

      setNewMessage("");
      setUnlockDate("");
      setSelectedImage(null);
      setIsAdding(false);

      // Abre a cerimónia de selagem
      setCeremony({ message: msgSnapshot, imageUrl: imgSnapshot });

    } catch (error: any) {
      toast({ title: "Erro ao guardar", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCeremonyDone = () => {
    setCeremony(null);
    loadCapsules();
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("time_capsule_messages")
        .delete()
        .eq("id", confirmDeleteId);
      if (error) throw error;
      setCapsules(prev => prev.filter(c => c.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast({ title: "Cápsula apagada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleUnlock = async () => {
    if (!revealTarget || !houseId) return;
    setRevealing(true);
    try {
      const { error } = await supabase
        .from("time_capsule_messages")
        .update({ is_unlocked: true })
        .eq("id", revealTarget.id);
      if (error) throw error;
      await loadCapsules();
      setRevealTarget(null);
      triggerCeremony(houseId, "capsula", revealTarget.id, {
        type: "capsula",
        eyebrow: "Cápsula do tempo",
        title: "Uma cápsula foi aberta",
        subtitle: "O passado encontrou o presente.",
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setRevealing(false);
    }
  };

  if (!profileLoading && profile?.usage_mode === "solo") {
    return <Navigate to="/" replace />;
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const ready    = capsules.filter(c => !c.is_unlocked && isPast(new Date(c.unlock_date)));
  const locked   = capsules.filter(c => !c.is_unlocked && !isPast(new Date(c.unlock_date)));
  const revealed = capsules.filter(c => c.is_unlocked);

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* ── Cerimónia de selagem — overlay full-screen ── */}
      {ceremony && (
        <CapsuleSealCeremony
          message={ceremony.message}
          imageUrl={ceremony.imageUrl}
          witnessMode={ceremony.witnessMode}
          onDone={handleCeremonyDone}
        />
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3.5 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Cápsula do Tempo</h1>
            {capsules.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {capsules.length} cápsula{capsules.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 active:scale-90 transition-all duration-200"
          aria-label="Nova cápsula"
        >
          <Plus className="w-[18px] h-[18px]" />
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────── */}
      <main className="px-4 pt-5 space-y-6 max-w-md mx-auto">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : capsules.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center mb-5 shadow-sm">
              <Clock className="w-9 h-9 text-violet-300 dark:text-violet-400" strokeWidth={1} />
            </div>
            <p className="text-base font-bold text-foreground mb-2">Sem cápsulas ainda</p>
            <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed mb-7">
              Guarda uma mensagem hoje para ser lida juntos num momento especial do futuro
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-7 py-3 rounded-full bg-violet-500 text-white text-sm font-semibold shadow-md shadow-violet-500/20 active:scale-95 transition-all"
            >
              Criar primeira cápsula
            </button>
          </div>
        ) : (
          <>
            {/* ── Prontas a abrir ── */}
            {ready.length > 0 && (
              <div className="space-y-3">
                <SectionLabel icon={<Sparkles className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.5} />}>
                  Prontas a abrir
                </SectionLabel>
                {ready.map(c => (
                  <ReadyCard
                    key={c.id}
                    c={c}
                    userId={user?.id}
                    onReveal={() => setRevealTarget(c)}
                    onDelete={() => setConfirmDeleteId(c.id)}
                  />
                ))}
              </div>
            )}

            {/* ── A aguardar ── */}
            {locked.length > 0 && (
              <div className="space-y-3">
                <SectionLabel icon={<Lock className="h-3.5 w-3.5 text-violet-400" strokeWidth={1.5} />}>
                  A aguardar
                </SectionLabel>
                {locked.map(c => (
                  <LockedCard
                    key={c.id}
                    c={c}
                    userId={user?.id}
                    onDelete={() => setConfirmDeleteId(c.id)}
                  />
                ))}
              </div>
            )}

            {/* ── Reveladas ── */}
            {revealed.length > 0 && (
              <div className="space-y-3">
                <SectionLabel icon={<Unlock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />}>
                  Reveladas
                </SectionLabel>
                {revealed.map(c => (
                  <RevealedCard
                    key={c.id}
                    c={c}
                    userId={user?.id}
                    onDelete={() => setConfirmDeleteId(c.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Criar cápsula — bottom sheet ───────────────── */}
      {isAdding && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => !uploading && setIsAdding(false)}
        >
          <div
            className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Nova Cápsula</h2>
              {!uploading && (
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="bg-muted rounded-2xl divide-y divide-border/50">
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Para quando?</p>
                  <input
                    type="date"
                    value={unlockDate}
                    onChange={e => setUnlockDate(e.target.value)}
                    min={today}
                    required
                    className="bg-transparent border-none outline-none text-sm text-foreground w-full"
                  />
                </div>
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mensagem</p>
                  <Textarea
                    placeholder="Escreve para o vosso eu do futuro..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    rows={4}
                    required
                    className="bg-transparent border-none p-0 resize-none text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                </div>
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-muted/80 transition-colors"
                  onClick={() => document.getElementById("capsule-img")?.click()}
                >
                  <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className={cn(
                    "text-sm flex-1 truncate",
                    selectedImage ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {selectedImage ? selectedImage.name : "Foto (opcional)"}
                  </span>
                  {selectedImage && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelectedImage(null); }}
                      className="w-6 h-6 rounded-full bg-border flex items-center justify-center shrink-0"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                  <input
                    id="capsule-img"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setSelectedImage(e.target.files[0]); }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !newMessage.trim() || !unlockDate}
                className="w-full h-12 rounded-2xl bg-violet-500 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {uploading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Lock className="w-4 h-4" strokeWidth={1.5} />
                }
                {uploading ? "A selar..." : "Selar cápsula"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar reveal — bottom sheet ─────────────── */}
      {revealTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => !revealing && setRevealTarget(null)}>
          <div
            className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-2" />
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-rose-50 to-violet-50 dark:from-rose-950/30 dark:to-violet-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
              </div>
              <p className="text-base font-bold text-foreground">Revelar esta cápsula?</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Uma vez aberta, a mensagem fica visível para os dois permanentemente.
              </p>
            </div>
            <button
              onClick={handleUnlock}
              disabled={revealing}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all shadow-md shadow-rose-500/20"
            >
              {revealing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Unlock className="w-4 h-4" strokeWidth={1.5} />
              }
              {revealing ? "A revelar..." : "Revelar agora"}
            </button>
            <button
              onClick={() => setRevealTarget(null)}
              disabled={revealing}
              className="w-full h-11 rounded-2xl bg-muted text-foreground font-semibold text-sm disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmar apagar — bottom sheet ─────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => !deleting && setConfirmDeleteId(null)}>
          <div
            className="w-full bg-card rounded-t-[2rem] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <p className="text-center text-base font-bold text-foreground">Apagar esta cápsula?</p>
            <p className="text-center text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "A apagar..." : "Apagar"}
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              disabled={deleting}
              className="w-full h-12 rounded-2xl bg-muted text-foreground font-semibold text-sm disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      {icon}
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</p>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function DeleteButton({ capsuleId, userId, creatorId, onDelete }: {
  capsuleId: string; userId?: string; creatorId: string; onDelete: () => void;
}) {
  if (creatorId !== userId) return null;
  return (
    <button
      type="button"
      onClick={onDelete}
      className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-all"
    >
      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
    </button>
  );
}

function ReadyCard({ c, userId, onReveal, onDelete }: {
  c: any; userId?: string; onReveal: () => void; onDelete: () => void;
}) {
  const unlockDateObj = new Date(c.unlock_date);
  return (
    <div className="glass-card overflow-hidden animate-capsule-breathe-urgent">
      <div className="relative bg-gradient-to-br from-rose-50 to-rose-100/40 dark:from-rose-950/35 dark:to-rose-950/10 px-6 pt-8 pb-6 text-center border-b border-rose-100/60 dark:border-rose-900/30">
        <div className="absolute top-3 right-3">
          <DeleteButton capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
        </div>
        {/* Glow halo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 rounded-full bg-rose-400/15 dark:bg-rose-400/10 blur-2xl pointer-events-none" />
        <div className="relative w-14 h-14 mx-auto mb-4 rounded-full bg-white dark:bg-card border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shadow-md shadow-rose-200/50 dark:shadow-rose-900/20 animate-glow-pulse">
          <Sparkles className="w-6 h-6 text-rose-500" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-bold text-rose-500 mb-1">O momento chegou</p>
        <p className="text-xs text-muted-foreground">Esta cápsula está pronta a ser revelada</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-muted-foreground text-center capitalize">
          {format(unlockDateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
        <button
          onClick={onReveal}
          className="w-full h-12 rounded-2xl bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-rose-500/20"
        >
          <Unlock className="w-4 h-4" strokeWidth={1.5} />
          Revelar cápsula
        </button>
      </div>
    </div>
  );
}

function LockedCard({ c, userId, onDelete }: {
  c: any; userId?: string; onDelete: () => void;
}) {
  const unlockDateObj = new Date(c.unlock_date);
  const daysDiff = differenceInDays(unlockDateObj, new Date());

  // Urgency tiers: hoje/amanhã | 2-3 | 4-7 | 7+
  const isUrgent   = daysDiff <= 1;
  const isNearing  = daysDiff >= 2 && daysDiff <= 3;
  const isWeekAway = daysDiff >= 4 && daysDiff <= 7;

  return (
    <div className={cn(
      "glass-card overflow-hidden",
      isUrgent  && "animate-capsule-breathe-urgent",
      isNearing && "animate-capsule-breathe",
    )}>
      <div className={cn(
        "relative px-6 pt-8 pb-6 text-center border-b",
        isUrgent
          ? "bg-gradient-to-br from-rose-50/80 to-violet-50/50 dark:from-rose-950/25 dark:to-violet-950/20 border-rose-100/60 dark:border-rose-900/30"
          : isNearing
          ? "bg-gradient-to-br from-violet-50/90 to-rose-50/40 dark:from-violet-950/30 dark:to-rose-950/10 border-violet-100/70 dark:border-violet-900/35"
          : "bg-gradient-to-br from-violet-50 to-rose-50/30 dark:from-violet-950/30 dark:to-rose-950/10 border-violet-100/60 dark:border-violet-900/30"
      )}>
        <div className="absolute top-3 right-3">
          <DeleteButton capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
        </div>

        {/* Ambient halo for near-unlock */}
        {(isUrgent || isNearing) && (
          <div className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-28 h-16 rounded-full blur-2xl pointer-events-none",
            isUrgent ? "bg-rose-400/15 dark:bg-rose-400/12" : "bg-violet-400/15 dark:bg-violet-400/10"
          )} />
        )}

        {/* Lock icon */}
        <div className={cn(
          "relative w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center shadow-sm",
          isUrgent
            ? "bg-white dark:bg-card border border-rose-200 dark:border-rose-900/50 shadow-rose-100 dark:shadow-rose-900/20"
            : "bg-white dark:bg-card border border-violet-100 dark:border-violet-900/40"
        )}>
          <Lock
            className={cn(
              "w-6 h-6",
              isUrgent   && "text-rose-500 animate-capsule-lock-pulse",
              isNearing  && "text-violet-500 animate-capsule-lock-pulse",
              isWeekAway && "text-violet-400",
              !isUrgent && !isNearing && !isWeekAway && "text-violet-400"
            )}
            strokeWidth={1.5}
          />
        </div>

        {/* Countdown */}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {isUrgent && daysDiff === 0 ? "Abre hoje" : "Abre em"}
        </p>
        {daysDiff > 0 && (
          <>
            <p className={cn(
              "text-5xl font-bold tabular-nums leading-none",
              isUrgent  ? "text-rose-500"    : "text-foreground"
            )}>
              {daysDiff}
            </p>
            <p className={cn(
              "text-sm mt-1",
              isUrgent  ? "text-rose-400 font-medium" : "text-muted-foreground"
            )}>
              dia{daysDiff !== 1 ? "s" : ""}
            </p>
          </>
        )}

        {/* Proximity label */}
        {isWeekAway && (
          <p className="text-[10px] text-violet-400/70 font-medium mt-2">
            Mais {daysDiff} dias de espera
          </p>
        )}
      </div>
      <div className="px-5 py-4">
        <p className="text-xs text-muted-foreground text-center capitalize">
          {format(unlockDateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
    </div>
  );
}

function RevealedCard({ c, userId, onDelete }: {
  c: any; userId?: string; onDelete: () => void;
}) {
  const unlockDateObj = new Date(c.unlock_date);
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={1.5} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Revelada em {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        </div>
        <DeleteButton capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
      </div>

      {c.image_url && (
        <img src={c.image_url} alt="Cápsula" className="w-full max-h-72 object-cover" />
      )}

      <div className="px-5 py-4">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.message}</p>
      </div>

      <div className="px-5 pb-4">
        <p className="text-[10px] text-muted-foreground/45 pt-3 border-t border-border/40">
          Guardada para o futuro · Agora parte da vossa história
        </p>
      </div>
    </div>
  );
}

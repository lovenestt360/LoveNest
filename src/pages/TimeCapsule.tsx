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
      let publicUrl = null;

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

      setNewMessage("");
      setUnlockDate("");
      setSelectedImage(null);
      setIsAdding(false);
      toast({ title: "Cápsula selada", description: "Guardada até ao momento certo." });
      loadCapsules();
    } catch (error: any) {
      toast({ title: "Erro ao guardar", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-background pb-28">

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
      <main className="px-4 pt-4 space-y-4 max-w-md mx-auto">

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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                    {selectedImage ? selectedImage.name : "Foto ou vídeo (opcional)"}
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
                    accept="image/*,video/*"
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
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-rose-50 to-rose-50/30 dark:from-rose-950/30 dark:to-rose-950/10 border-b border-rose-100/60 dark:border-rose-900/30">
        <div className="w-10 h-10 rounded-full bg-white dark:bg-card border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shadow-sm shrink-0">
          <Sparkles className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-rose-500 leading-tight">O momento chegou</p>
          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
            {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
        </div>
        <DeleteButton capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
      </div>
      <div className="px-4 py-3">
        <button
          onClick={onReveal}
          className="w-full h-11 rounded-xl bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-rose-500/20"
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
  const daysDiff = Math.max(0, differenceInDays(unlockDateObj, new Date()));
  const countdownLabel = daysDiff === 0 ? "Hoje" : daysDiff === 1 ? "1 dia" : `${daysDiff} dias`;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-2xl">
      <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground capitalize truncate">
          {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}
        </p>
      </div>
      <span className="shrink-0 text-[11px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-full border border-violet-100 dark:border-violet-900/40">
        {countdownLabel}
      </span>
      <DeleteButton capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
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
        /\.(mp4|webm|mov)(\?|$)/i.test(c.image_url)
          ? <video src={c.image_url} controls className="w-full max-h-72 object-cover" />
          : <img src={c.image_url} alt="Cápsula" className="w-full max-h-72 object-cover" />
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

import { useState, useEffect, useCallback } from "react";
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

  const [selectedCapsule, setSelectedCapsule] = useState<any | null>(null);
  const [revealing, setRevealing] = useState(false);

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
      const { error } = await supabase.from("time_capsule_messages").insert({
        couple_space_id: houseId, creator_id: user.id,
        message: newMessage, image_url: publicUrl,
        unlock_date: new Date(unlockDate).toISOString(), is_unlocked: false,
      });
      if (error) throw error;
      awardLovePoints(houseId, 10, "capsula_tempo", "Cápsula do tempo criada", user.id);
      notifyPartner({ couple_space_id: houseId, title: "Cápsula do Tempo",
        body: "O teu par guardou uma memória para o futuro.", url: "/capsula", type: "memorias" });
      setNewMessage(""); setUnlockDate(""); setSelectedImage(null); setIsAdding(false);
      toast({ title: "Cápsula selada", description: "Guardada até ao momento certo." });
      loadCapsules();
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
    if (!selectedCapsule || !houseId) return;
    setRevealing(true);
    try {
      const { error } = await supabase.from("time_capsule_messages")
        .update({ is_unlocked: true }).eq("id", selectedCapsule.id);
      if (error) throw error;
      await loadCapsules();
      setSelectedCapsule(null);
      triggerCeremony(houseId, "capsula", selectedCapsule.id, {
        type: "capsula", eyebrow: "Cápsula do tempo",
        title: "Uma cápsula foi aberta", subtitle: "O passado encontrou o presente.",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRevealing(false);
    }
  };

  if (!profileLoading && profile?.usage_mode === "solo") return <Navigate to="/" replace />;

  const today = format(new Date(), "yyyy-MM-dd");
  const ready    = capsules.filter(c => !c.is_unlocked && isPast(new Date(c.unlock_date)));
  const locked   = capsules.filter(c => !c.is_unlocked && !isPast(new Date(c.unlock_date)));
  const revealed = capsules.filter(c => c.is_unlocked);

  const capsuleType = (c: any): "ready" | "locked" | "revealed" =>
    c.is_unlocked ? "revealed" : isPast(new Date(c.unlock_date)) ? "ready" : "locked";

  return (
    <div className="flex flex-col bg-background" style={{ height: "calc(100svh - 64px)" }}>

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/90 backdrop-blur-sm">
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

      {/* Compact list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 pt-3 pb-4 space-y-3 max-w-md mx-auto">

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
      {selectedCapsule && capsuleType(selectedCapsule) === "ready" && (
        <ReadyDetailView
          capsule={selectedCapsule} revealing={revealing}
          onClose={() => setSelectedCapsule(null)} onReveal={handleReveal} />
      )}
      {selectedCapsule && capsuleType(selectedCapsule) === "revealed" && (
        <RevealedDetailView capsule={selectedCapsule} onClose={() => setSelectedCapsule(null)} />
      )}
      {selectedCapsule && capsuleType(selectedCapsule) === "locked" && (
        <LockedDetailView capsule={selectedCapsule} onClose={() => setSelectedCapsule(null)} />
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
        <Sparkles className="w-4 h-4 text-rose-400" strokeWidth={1.5} />
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

/* ── Detail overlays (full-screen, no scroll needed) ─────── */

function ReadyDetailView({ capsule, revealing, onClose, onReveal }: {
  capsule: any; revealing: boolean; onClose: () => void; onReveal: () => void;
}) {
  const date = format(new Date(capsule.unlock_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(5,0,15,0.96)", backdropFilter: "blur(16px)" }}>
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10">
        <X className="w-5 h-5 text-white" strokeWidth={1.5} />
      </button>

      {/* Center — icon + title + date */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-7"
          style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.22)", boxShadow: "0 0 70px rgba(244,63,94,0.22)" }}>
          <Sparkles className="w-10 h-10 text-rose-400" strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">O momento chegou</h2>
        <p className="text-sm text-white/40 mb-1 leading-relaxed">Esta cápsula está pronta a ser revelada</p>
        <p className="text-xs text-white/22 capitalize">{date}</p>
      </div>

      {/* Bottom — actions always visible, no scroll */}
      <div className="shrink-0 px-6 space-y-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 36px)" }}>
        <p className="text-[11px] text-white/22 text-center leading-relaxed mb-4">
          Uma vez aberta, a mensagem fica visível para os dois permanentemente.
        </p>
        <button onClick={onReveal} disabled={revealing}
          className="w-full h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg,#f43f5e 0%,#be123c 100%)", boxShadow: "0 14px 40px rgba(244,63,94,0.30)" }}>
          {revealing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" strokeWidth={1.5} />}
          {revealing ? "A revelar..." : "Revelar cápsula"}
        </button>
        <button onClick={onClose} disabled={revealing}
          className="w-full h-11 rounded-2xl font-semibold text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function RevealedDetailView({ capsule, onClose }: { capsule: any; onClose: () => void }) {
  const date = format(new Date(capsule.unlock_date), "d 'de' MMMM 'de' yyyy", { locale: pt });
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(capsule.image_url || "");
  const hasMedia = !!capsule.image_url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <button onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
        <X className="w-5 h-5 text-white" strokeWidth={1.5} />
      </button>

      {/* Media — top 45% of screen when present */}
      {hasMedia && (
        <div className="shrink-0 overflow-hidden" style={{ height: "45svh" }}>
          {isVideo
            ? <video src={capsule.image_url} controls className="w-full h-full object-cover" />
            : <img src={capsule.image_url} alt="" className="w-full h-full object-cover" />
          }
        </div>
      )}

      {/* Content card — slides over photo, scrollable only for very long messages */}
      <div className={cn(
        "flex-1 overflow-y-auto bg-background",
        hasMedia && "rounded-t-[1.5rem] -mt-6 relative z-10"
      )}>
        <div className="px-5 pt-5" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}>

          {/* No media: icon */}
          {!hasMedia && (
            <div className="flex justify-center mb-5 pt-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-rose-400" strokeWidth={1.5} />
              </div>
            </div>
          )}

          {/* Date label */}
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={1.5} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Revelada em {date}
            </p>
          </div>

          {/* Message */}
          <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap">{capsule.message}</p>

          <p className="text-[10px] text-muted-foreground/35 mt-6 pt-3 border-t border-border/30">
            Guardada para o futuro · Agora parte da vossa história
          </p>
        </div>
      </div>
    </div>
  );
}

function LockedDetailView({ capsule, onClose }: { capsule: any; onClose: () => void }) {
  const unlockDateObj = new Date(capsule.unlock_date);
  const daysDiff = Math.max(0, differenceInDays(unlockDateObj, new Date()));
  const date = format(unlockDateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(5,3,20,0.97)", backdropFilter: "blur(16px)" }}>
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
        <X className="w-5 h-5 text-white" strokeWidth={1.5} />
      </button>

      {/* Center — countdown */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-7"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)", boxShadow: "0 0 70px rgba(139,92,246,0.22)" }}>
          <Lock className="w-10 h-10 text-violet-300" strokeWidth={1} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(167,139,250,0.55)" }}>
          Selada até
        </p>
        <p className="font-bold text-white tabular-nums leading-none" style={{ fontSize: 72 }}>{daysDiff}</p>
        <p className="text-sm mt-1 mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
          dia{daysDiff !== 1 ? "s" : ""}
        </p>
        <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.20)" }}>{date}</p>
      </div>

      {/* Bottom */}
      <div className="shrink-0 px-6" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 36px)" }}>
        <button onClick={onClose}
          className="w-full h-12 rounded-2xl font-semibold text-sm"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}

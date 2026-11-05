import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import { format, isPast, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Lock, Unlock, Plus, Loader2, Trash2,
  Clock, Sparkles, X, ImageIcon, CheckCircle2, ChevronRight, Heart, Mail, CalendarDays,
} from "lucide-react";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { hapticCelebrate, hapticLight, hapticSuccess } from "@/lib/haptic";
import { centerIn, createParticles, prefersReducedMotion, type Particles } from "@/components/celebration/particles";
import "@/components/celebration/celebration.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";
import { ScreenHeader } from "@/components/ScreenHeader";
import { cn } from "@/lib/utils";
import { signedMediaUrl } from "@/lib/privateMedia";
import { toJpegIfHeic } from "@/lib/heic";
import { useTimeTogether } from "@/hooks/useTimeTogether";
import faisca from "@/assets/flame/flame_01_faisca_thumb.png";

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
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfile();
  const { partner } = usePartnerProfile();
  const partnerName = partner?.display_name?.split(" ")[0] || "O teu par";
  const myName = profile?.display_name?.split(" ")[0] || "O teu par";

  const [loading, setLoading] = useState(true);
  const [capsules, setCapsules] = useState<any[]>([]);
  const [houseId, setHouseId] = useState<string | null>(null);

  const [selectedCapsule, setSelectedCapsule] = useState<any | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealPhase, setRevealPhase] = useState<"idle" | "unlocking" | "revealed">("idle");

  const [isAdding, setIsAdding] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [unlockDay,   setUnlockDay]   = useState("");
  const [unlockMonth, setUnlockMonth] = useState("");
  const [unlockYear,  setUnlockYear]  = useState("");
  const unlockDate = (unlockDay && unlockMonth && unlockYear)
    ? `${unlockYear}-${unlockMonth.padStart(2, "0")}-${unlockDay.padStart(2, "0")}`
    : "";
  const [customDate, setCustomDate] = useState(false);
  const time = useTimeTogether();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
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
      // As fotos abrem por links assinados (o bucket "photos" é privado).
      const rows = await Promise.all((data || []).map(async (c: any) =>
        c.image_url ? { ...c, image_url: await signedMediaUrl("photos", c.image_url) } : c));
      setCapsules(rows);
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
    // Validar data: dia pode ser inválido para o mês (ex: 31 de Fev)
    const parsedDate = new Date(parseInt(unlockYear), parseInt(unlockMonth) - 1, parseInt(unlockDay));
    const isValidDay =
      parsedDate.getFullYear() === parseInt(unlockYear) &&
      parsedDate.getMonth()    === parseInt(unlockMonth) - 1 &&
      parsedDate.getDate()     === parseInt(unlockDay);
    if (!isValidDay) {
      toast({ title: "Data inválida", description: "Verifica o dia e o mês selecionados.", variant: "destructive" });
      return;
    }
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    if (parsedDate <= todayMidnight) {
      toast({ title: "Data inválida", description: "Escolhe uma data futura.", variant: "destructive" });
      return;
    }
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
      toast({
        title: "Cápsula selada",
        description: `Será aberta a ${format(new Date(sealedDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}.`,
      });
      notifyPartner({ couple_space_id: houseId, title: "Cápsula do Tempo",
        body: "O teu par guardou uma memória para o futuro.", url: "/capsula", type: "memorias" });
      setNewMessage(""); setUnlockDay(""); setUnlockMonth(""); setUnlockYear(""); setSelectedImage(null); setIsAdding(false);
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

  const userId = user?.id;

  // Tipo por utilizador: data passada + utilizador ainda não viu a revelação → "ready"
  const capsuleType = (c: any): "ready" | "locked" | "revealed" => {
    if (!isPast(new Date(c.unlock_date))) return "locked";
    if (userId && hasSeenReveal(userId, c.id)) return "revealed";
    return "ready";
  };

  const authorOf = (c: any) => (c.creator_id === user?.id ? "Tu" : partnerName);
  const ready    = capsules.filter(c => capsuleType(c) === "ready");
  const locked   = capsules.filter(c => capsuleType(c) === "locked");
  const revealed = capsules.filter(c => capsuleType(c) === "revealed");

  return (
    <div className="flex flex-col">

      <ScreenHeader
        title="Cápsula do Tempo"
        subtitle={capsules.length > 0 ? `${capsules.length} cápsula${capsules.length !== 1 ? "s" : ""}` : "Mensagens para o vosso futuro"}
        action={
          <button onClick={() => setIsAdding(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B1324] text-white shadow-[0_10px_20px_-10px_rgba(11,19,36,0.7)] transition-transform active:scale-90 dark:bg-foreground dark:text-background" aria-label="Nova cápsula">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        }
      />

      {/* Compact list — scroll natural via body */}
      <div>
        <div className="pt-3 pb-6 space-y-3">

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : capsules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[22px] py-12 px-6 text-center bg-white border border-[#ECE8E3] shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:bg-card dark:border-border">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center mb-4 shadow-sm">
                <Clock className="w-7 h-7 text-violet-300 dark:text-violet-400" strokeWidth={1} />
              </div>
              <p className="text-base font-bold text-foreground mb-1.5">Sem cápsulas ainda</p>
              <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed mb-6">
                Guarda uma mensagem hoje para ser lida num momento especial do futuro
              </p>
              <button onClick={() => setIsAdding(true)}
                className="rounded-full bg-[#0B1324] px-6 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95 dark:bg-foreground dark:text-background">
                Criar primeira cápsula
              </button>
            </div>
          ) : (
            <>
              {locked[0] && (
                <NextCapsuleCard c={locked[0]} author={authorOf(locked[0])} onTap={() => setSelectedCapsule(locked[0])} />
              )}
              {ready.map(c => (
                <ReadyCard key={c.id} c={c} author={authorOf(c)} mine={c.creator_id === user?.id} onTap={() => setSelectedCapsule(c)} />
              ))}
              {locked.length > 0 && (
                <section>
                  <SectionLabel>A aguardar</SectionLabel>
                  <div className="mt-2 rounded-[22px] border border-[#ECE8E3] bg-white px-3.5 shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border dark:bg-card">
                    {locked.map(c => (
                      <CapsuleRow key={c.id} c={c} type="locked" author={authorOf(c)} userId={user?.id}
                        onTap={() => setSelectedCapsule(c)} onDelete={() => setConfirmDeleteId(c.id)} />
                    ))}
                  </div>
                </section>
              )}
              {revealed.length > 0 && (
                <section>
                  <SectionLabel>Abertas</SectionLabel>
                  <div className="mt-2 rounded-[22px] border border-[#ECE8E3] bg-white px-3.5 shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border dark:bg-card">
                    {revealed.map(c => (
                      <CapsuleRow key={c.id} c={c} type="revealed" author={authorOf(c)} userId={user?.id}
                        onTap={() => setSelectedCapsule(c)} onDelete={() => setConfirmDeleteId(c.id)} />
                    ))}
                  </div>
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
          userId={user?.id} partnerName={partnerName}
          onClose={handleCloseDetail} onReveal={handleReveal}
          onReply={() => { handleCloseDetail(); setIsAdding(true); }}
          onLove={() => {
            if (!houseId) return;
            notifyPartner({ couple_space_id: houseId, title: "Cápsula do Tempo",
              body: `${myName} amou a cápsula que lhe guardaste.`, url: "/capsula", type: "memorias" });
          }} />
      )}
      {selectedCapsule && revealPhase === "idle" && capsuleType(selectedCapsule) === "revealed" && (
        <RevealedDetailView capsule={selectedCapsule} onClose={handleCloseDetail} />
      )}
      {selectedCapsule && revealPhase === "idle" && capsuleType(selectedCapsule) === "locked" && (
        <LockedDetailView capsule={selectedCapsule} onClose={handleCloseDetail} author={authorOf(selectedCapsule)} />
      )}

      {/* ── CREATE SHEET ───────────────────────────────── */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => !uploading && setIsAdding(false)}>
          <div className="w-full max-w-md mx-auto bg-white dark:bg-card rounded-t-[26px] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-[#E2DED8] dark:bg-border mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">Nova cápsula</h2>
              {!uploading && (
                <button onClick={() => setIsAdding(false)}
                  className="w-8 h-8 rounded-full bg-[#F4F2EF] dark:bg-muted flex items-center justify-center" aria-label="Fechar">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-muted-foreground">Quando abre?</p>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_SHORTCUTS(time.startDate).map(sc => {
                    const on = !customDate && unlockDate === toIso(sc.date);
                    return (
                      <button key={sc.label} type="button"
                        onClick={() => { setCustomDate(false); setUnlockDay(String(sc.date.getDate())); setUnlockMonth(String(sc.date.getMonth() + 1)); setUnlockYear(String(sc.date.getFullYear())); }}
                        className={cn("h-[34px] rounded-full border px-3 text-[13px] font-semibold transition-colors",
                          on ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border dark:text-muted-foreground")}>
                        {sc.label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setCustomDate(true)}
                    className={cn("inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                      customDate ? "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#ECE8E3] text-[#4A5060] dark:border-border dark:text-muted-foreground")}>
                    <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} /> Outra data
                  </button>
                </div>
                {customDate && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-[14px] bg-[#F7F5F2] px-3 py-2.5 dark:bg-muted">
                    <div className="flex-1 flex items-center justify-end gap-1.5">
                    {/* Dia */}
                    <select value={unlockDay} onChange={e => setUnlockDay(e.target.value)}
                      className="appearance-none bg-white dark:bg-card border border-[#ECE8E3] dark:border-border rounded-xl px-2 py-1.5 text-sm text-foreground outline-none cursor-pointer text-center min-w-[44px]">
                      <option value="" disabled>Dia</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={String(d)}>{d}</option>
                      ))}
                    </select>
                    {/* Mês */}
                    <select value={unlockMonth} onChange={e => setUnlockMonth(e.target.value)}
                      className="appearance-none bg-white dark:bg-card border border-[#ECE8E3] dark:border-border rounded-xl px-2 py-1.5 text-sm text-foreground outline-none cursor-pointer text-center">
                      <option value="" disabled>Mês</option>
                      {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                        <option key={i + 1} value={String(i + 1)}>{m}</option>
                      ))}
                    </select>
                    {/* Ano */}
                    <select value={unlockYear} onChange={e => setUnlockYear(e.target.value)}
                      className="appearance-none bg-white dark:bg-card border border-[#ECE8E3] dark:border-border rounded-xl px-2 py-1.5 text-sm text-foreground outline-none cursor-pointer text-center min-w-[60px]">
                      <option value="" disabled>Ano</option>
                      {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() + i).map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  </div>
                )}
                {unlockDate && (
                  <div className="mt-2 flex items-center gap-2.5 rounded-[14px] bg-[#F7F5F2] px-3.5 py-2.5 text-[13.5px] dark:bg-muted">
                    <Lock className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                    <b className="font-semibold">Abre a {format(new Date(`${unlockDate}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: pt })}</b>
                  </div>
                )}
              </div>
              <div className="bg-white border border-[#ECE8E3] rounded-[18px] divide-y divide-[#ECE8E3] dark:bg-card dark:border-border dark:divide-border/50">
                <div className="px-4 py-3 space-y-1">
                  <p className="text-[12.5px] font-semibold text-muted-foreground">A mensagem</p>
                  <Textarea
                    placeholder="Quando leres isto…"
                    value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    rows={4} required
                    className="bg-transparent border-none p-0 resize-none text-[15px] leading-relaxed focus-visible:ring-0 placeholder:text-muted-foreground/50" />
                </div>
                <div className="px-4 py-2.5 flex items-center gap-3">
                  <div className="relative flex-1 flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity">
                    {preparingImage
                      ? <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" strokeWidth={1.5} />
                      : <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />}
                    <span className={cn("text-sm truncate", selectedImage ? "text-foreground font-medium" : "text-muted-foreground")} aria-live="polite">
                      {preparingImage ? "A preparar a foto…" : selectedImage ? selectedImage.name : "Foto (opcional)"}
                    </span>
                    {!preparingImage && (
                      <input type="file" accept="image/*,video/*" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        onChange={e => {
                          const f = e.target.files?.[0]; e.target.value = "";
                          if (!f) return;
                          setPreparingImage(true);
                          toJpegIfHeic(f).then(setSelectedImage, () => setSelectedImage(f)).finally(() => setPreparingImage(false));
                        }} />
                    )}
                  </div>
                  {selectedImage && (
                    <button type="button" onClick={() => setSelectedImage(null)}
                      className="w-6 h-6 rounded-full bg-border flex items-center justify-center shrink-0">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <button type="submit"
                disabled={uploading || preparingImage || !newMessage.trim() || !unlockDate}
                className="w-full h-[52px] rounded-[18px] bg-[#0B1324] text-white font-semibold text-[15px] disabled:opacity-40 active:scale-[0.99] transition-transform flex items-center justify-center gap-2 shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] dark:bg-foreground dark:text-background">
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
          <div className="w-full max-w-md mx-auto bg-white dark:bg-card rounded-t-[26px] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] animate-in slide-in-from-bottom duration-200 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-[#E2DED8] dark:bg-border mx-auto mb-4" />
            <p className="text-center text-base font-bold text-foreground">Apagar esta cápsula?</p>
            <p className="text-center text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full h-12 rounded-[16px] bg-rose-600 text-white font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              <Trash2 className="w-4 h-4" />
              {deleting ? "A apagar..." : "Apagar"}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
              className="w-full h-12 rounded-[16px] bg-[#F4F2EF] text-[#3A4150] font-semibold text-sm disabled:opacity-60 dark:bg-muted dark:text-foreground">
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
    <div className="flex items-center gap-2 px-1 pt-2">
      {icon}
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{children}</p>
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

/* ── Lista: cartões e linhas ─────────────────────────────── */

const CARD = "rounded-[22px] border border-[#ECE8E3] bg-white shadow-[0_1px_2px_rgba(11,19,36,0.04),0_10px_28px_-14px_rgba(11,19,36,0.16)] dark:border-border dark:bg-card";
const TILE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F2] text-[#0B1324] dark:bg-muted dark:text-foreground";

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Atalhos de data: 1 mês, 6 meses, 1 ano e o próximo aniversário da relação. */
function DATE_SHORTCUTS(startDate: string | null): { label: string; date: Date }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const plus = (m: number) => { const d = new Date(today); d.setMonth(d.getMonth() + m); return d; };
  const list = [{ label: "1 mês", date: plus(1) }, { label: "6 meses", date: plus(6) }, { label: "1 ano", date: plus(12) }];
  if (startDate) {
    const s = new Date(`${startDate}T00:00:00`);
    const next = new Date(today.getFullYear(), s.getMonth(), s.getDate());
    if (next <= today) next.setFullYear(next.getFullYear() + 1);
    list.push({ label: "Aniversário", date: next });
  }
  return list;
}

/** "há 6 meses", "há 12 dias" */
function agoLabel(iso?: string | null) {
  if (!iso) return "";
  const d = Math.max(0, differenceInDays(new Date(), new Date(iso)));
  if (d < 1) return "hoje";
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  if (d < 365) { const m = Math.floor(d / 30); return `há ${m} ${m === 1 ? "mês" : "meses"}`; }
  const y = Math.floor(d / 365); return `há ${y} ${y === 1 ? "ano" : "anos"}`;
}

function untilLabel(days: number) {
  if (days <= 0) return "Hoje";
  if (days < 60) return `${days} ${days === 1 ? "dia" : "dias"}`;
  if (days < 330) return `${Math.round(days / 30)} meses`;
  const y = Math.round(days / 365); return `${y} ${y === 1 ? "ano" : "anos"}`;
}

function NextCapsuleCard({ c, author, onTap }: { c: any; author: string; onTap: () => void }) {
  const unlock = new Date(c.unlock_date);
  const days = Math.max(0, differenceInDays(unlock, new Date()));
  const created = c.created_at ? new Date(c.created_at).getTime() : Date.now();
  const total = Math.max(1, unlock.getTime() - created);
  const pct = Math.min(100, Math.max(3, ((Date.now() - created) / total) * 100));
  return (
    <button type="button" onClick={onTap} className={cn(CARD, "relative block w-full overflow-hidden px-4 pb-3.5 pt-4 text-left active:scale-[0.99] transition-transform")}>
      <img src={faisca} alt="" className="pointer-events-none absolute right-1.5 top-2 w-[76px] animate-[ln-bob_3.6s_ease-in-out_infinite]" />
      <p className="text-[12px] font-semibold text-muted-foreground">A próxima abre em</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <b className="text-[40px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">{days}</b>
        <span className="text-[14px] text-[#4A5060] dark:text-muted-foreground">{days === 1 ? "dia" : "dias"}</span>
      </p>
      <p className="mt-1 text-[13px] text-[#4A5060] dark:text-muted-foreground">
        {format(unlock, "d 'de' MMMM", { locale: pt })} · {author === "Tu" ? "tua" : `do ${author}`}
      </p>
      <div className="relative mt-3.5 h-1 rounded-full bg-[#F0EDE9] dark:bg-muted">
        <i className="absolute inset-y-0 left-0 rounded-full bg-[#0B1324] dark:bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-muted-foreground">
        <span>{c.created_at ? `Selada a ${format(new Date(c.created_at), "d 'de' MMMM", { locale: pt })}` : "Selada"}</span>
        <span>{Math.round(pct)}% do caminho</span>
      </div>
    </button>
  );
}

function ReadyCard({ c, author, mine, onTap }: { c: any; author: string; mine: boolean; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} className={cn(CARD, "flex w-full items-center gap-3 px-3.5 py-3 text-left active:scale-[0.99] transition-transform")}>
      <span className={cn(TILE, "relative")}>
        <Unlock className="h-5 w-5" strokeWidth={1.7} />
        <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-[#E5466D] ring-2 ring-[#F7F5F2] dark:ring-muted" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-foreground">Uma cápsula está pronta</span>
        <span className="block text-[12.5px] text-muted-foreground">
          {mine ? "Guardaste-a" : `${author} guardou-a`} {agoLabel(c.created_at)}
        </span>
      </span>
      <span className="h-[34px] rounded-full bg-[#0B1324] px-3.5 text-[13px] font-semibold leading-[34px] text-white dark:bg-foreground dark:text-background">Abrir</span>
    </button>
  );
}

function CapsuleRow({ c, type, author, userId, onTap, onDelete }: {
  c: any; type: "locked" | "revealed"; author: string; userId?: string;
  onTap: () => void; onDelete: () => void;
}) {
  const unlockDateObj = new Date(c.unlock_date);
  const daysDiff = Math.max(0, differenceInDays(unlockDateObj, new Date()));

  if (type === "locked") return (
    <div onClick={onTap} className="flex cursor-pointer items-center gap-3 border-b border-[#F0EDE9] py-3 last:border-b-0 active:opacity-75 dark:border-border/60">
      <span className={TILE}><Lock className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold text-foreground">{author === "Tu" ? "A tua cápsula" : `Do ${author}`}</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">Abre a {format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt })}</span>
      </span>
      <span className="shrink-0 rounded-full bg-[#F7F5F2] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[#4A5060] dark:bg-muted dark:text-muted-foreground">
        {untilLabel(daysDiff)}
      </span>
      <DeleteCell capsuleId={c.id} userId={userId} creatorId={c.creator_id} onDelete={onDelete} />
    </div>
  );

  const isImg = c.image_url && !/\.(mp4|webm|mov)(\?|$)/i.test(c.image_url);
  return (
    <div onClick={onTap} className="flex cursor-pointer items-center gap-3 border-b border-[#F0EDE9] py-3 last:border-b-0 active:opacity-75 dark:border-border/60">
      {isImg
        ? <img src={c.image_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
        : <span className={TILE}><Mail className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold text-foreground">{c.message}</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
          {author === "Tu" ? "Tua" : `Do ${author}`} · aberta a {format(unlockDateObj, "d 'de' MMMM", { locale: pt })}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
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

/** Cadeado com a argola separada, para a ver saltar quando abre. */
function CapsuleLock({ size = 34, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="14" width="22" height="15" rx="3" />
      {open ? <path d="M10 14V9.5a6 6 0 0111.6-2.2" /> : <g className="cap-shackle"><path d="M10 14V9.5a6 6 0 0112 0V14" /></g>}
      <path d="M16 20v3" />
    </svg>
  );
}

const HOLD_MS = 1200;
const HOLD_LEN = 478;

function CapsuleRevealFlow({ capsule, phase, revealing, userId, partnerName, onClose, onReveal, onReply, onLove }: {
  capsule: any;
  phase: "idle" | "unlocking" | "revealed";
  revealing: boolean;
  userId: string | undefined;
  partnerName: string;
  onClose: () => void;
  onReveal: () => void;
  onReply: () => void;
  onLove: () => void;
}) {
  const quote        = pickQuote(REVEAL_QUOTES,    capsule.id);
  const revealedQuote = pickQuote(REVEALED_QUOTES, capsule.id);
  const unlockDate   = new Date(capsule.unlock_date);
  const date         = format(unlockDate, "d 'de' MMMM 'de' yyyy", { locale: pt });

  const isVideo  = /\.(mp4|webm|mov)(\?|$)/i.test(capsule.image_url || "");
  const hasPhoto = !!capsule.image_url && !isVideo;
  const hasMedia = !!capsule.image_url;

  const fromPartner = !!userId && capsule.creator_id !== userId;
  const author      = fromPartner ? partnerName : "ti";
  const createdAt   = capsule.created_at ? new Date(capsule.created_at) : null;
  const waitedDays  = createdAt ? Math.max(0, differenceInDays(new Date(), createdAt)) : null;
  const writtenOn   = createdAt ? format(createdAt, "d 'de' MMMM", { locale: pt }) : null;

  const rootRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconRef   = useRef<HTMLSpanElement>(null);
  const fx        = useRef<Particles | null>(null);
  const reduce    = prefersReducedMotion();

  // ── Mantém premido para abrir ──
  const [holdK, setHoldK]     = useState(0);
  const [holding, setHolding] = useState(false);
  const [opened, setOpened]   = useState(false);
  const holdRaf  = useRef<number | null>(null);
  const holdKRef = useRef(0);
  const setK = (k: number) => { holdKRef.current = k; setHoldK(k); };

  const finishHold = () => {
    setHolding(false);
    setOpened(true);
    hapticSuccess();
    setTimeout(onReveal, reduce ? 0 : 380);
  };
  const startHold = () => {
    if (opened || revealing) return;
    setHolding(true);
    hapticLight();
    const t0 = performance.now(), from = holdKRef.current;
    const step = (t: number) => {
      const k = Math.min(1, from + (t - t0) / HOLD_MS);
      setK(k);
      if (k >= 1) { holdRaf.current = null; finishHold(); return; }
      holdRaf.current = requestAnimationFrame(step);
    };
    holdRaf.current = requestAnimationFrame(step);
  };
  const endHold = () => {
    if (holdRaf.current === null) return;
    cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    setHolding(false);
    // Largou antes do fim: o anel volta para trás
    const t0 = performance.now(), from = holdKRef.current;
    const back = (t: number) => {
      if (holdRaf.current !== null) return;
      const k = Math.max(0, from - (t - t0) / 350);
      setK(k);
      if (k > 0) requestAnimationFrame(back);
    };
    requestAnimationFrame(back);
  };
  useEffect(() => () => { if (holdRaf.current !== null) cancelAnimationFrame(holdRaf.current); }, []);

  // Se a revelação falhar, o cadeado volta a fechar
  useEffect(() => {
    if (!revealing && phase === "idle" && opened) { setOpened(false); setK(0); }
  }, [revealing, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dias de espera a contar ──
  const [shownWait, setShownWait] = useState(reduce ? waitedDays ?? 0 : 0);
  useEffect(() => {
    if (waitedDays === null || reduce) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1300);
      setShownWait(Math.round(waitedDays * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [waitedDays, reduce]);

  // ── Corações na abertura ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fx.current = createParticles(canvas);
    return () => { fx.current?.destroy(); fx.current = null; };
  }, []);
  useEffect(() => {
    if (phase !== "unlocking") return;
    const id = setTimeout(() => {
      if (!rootRef.current || !iconRef.current) return;
      const [x, y] = centerIn(rootRef.current, iconRef.current);
      fx.current?.burst(x, y, { n: 60, colors: ["#FB7185", "#F43F5E", "#FDA4AF", "#FFE4E6", "#FDE68A"], shapes: ["heart", "heart", "spark", "dot"], speed: 8.5 });
      hapticCelebrate();
    }, 60);
    return () => clearTimeout(id);
  }, [phase]);

  // ── A mensagem escreve-se letra a letra ──
  const message: string = capsule.message ?? "";
  const [typed, setTyped] = useState(reduce ? message.length : 0);
  useEffect(() => {
    if (phase !== "revealed" || reduce) { if (phase === "revealed") setTyped(message.length); return; }
    setTyped(0);
    const perChar = Math.max(8, Math.min(26, 2400 / Math.max(1, message.length)));
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const start = setTimeout(function tick() {
      i++;
      setTyped(i);
      if (i < message.length) timer = setTimeout(tick, perChar);
    }, 1000);
    return () => { clearTimeout(start); clearTimeout(timer); };
  }, [phase, message, reduce]);
  const typingDone = typed >= message.length;

  const [loved, setLoved] = useState(false);
  const love = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (rootRef.current) {
      const r = rootRef.current.getBoundingClientRect(), b = e.currentTarget.getBoundingClientRect();
      fx.current?.burst(b.left - r.left + b.width / 2, b.top - r.top, { n: 16, colors: ["#FF4F7B", "#FDA4AF"], shapes: ["heart"], speed: 5, size: [8, 14] });
    }
    hapticLight();
    if (!loved) { setLoved(true); onLove(); }
  };

  return createPortal(
    <div ref={rootRef} style={{ ...PORTAL_BASE, background: "#08020e", overflow: "hidden" }}>
      <canvas ref={canvasRef} className="cap-fx" aria-hidden="true" />

      {/* ═══════════════════ IDLE — pronto para revelar ═══════════════════ */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        display: "flex", flexDirection: "column",
        opacity: phase === "idle" ? 1 : 0,
        transition: "opacity 400ms ease",
        pointerEvents: phase === "idle" ? "auto" : "none",
        visibility: phase === "revealed" ? "hidden" : "visible",
      }} className={opened ? "cap-opened" : undefined}>
        {/* Glow ambient */}
        <div style={{ position: "absolute", top: "28%", left: "50%", transform: "translateX(-50%)",
          width: 220, height: 220, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)",
          filter: "blur(52px)", pointerEvents: "none" }} />

        {/* X */}
        <button onClick={onClose} aria-label="Fechar" style={{
          position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", right: 16, zIndex: 2,
          width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} color="rgba(255,255,255,0.70)" strokeWidth={1.5} />
        </button>

        {/* Centro */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
          <div style={{ position: "relative", width: 148, height: 148,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 30 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
              border: "1px solid rgba(244,63,94,0.14)",
              animation: "capsule-ring 3.6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 16, borderRadius: "50%",
              border: "1px solid rgba(244,63,94,0.24)",
              animation: "capsule-ring 3.6s ease-in-out infinite 0.7s" }} />
            <svg className="cap-hold" viewBox="0 0 160 160" aria-hidden="true">
              <circle cx="80" cy="80" r="76" strokeDasharray={HOLD_LEN} strokeDashoffset={HOLD_LEN * (1 - holdK)} />
            </svg>
            <div className={holding && holdK > 0.04 ? "cap-tremble" : undefined} style={{ position: "relative", zIndex: 1, width: 80, height: 80, borderRadius: "50%",
              background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.26)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(251,113,133,0.95)",
              animation: "capsule-float 4s ease-in-out infinite" }}>
              <CapsuleLock size={36} />
            </div>
          </div>
          {waitedDays !== null && waitedDays > 0 && (
            <span className="cap-waited" style={{ animation: "capsule-fade-up 600ms 100ms both ease" }}>
              {fromPartner ? `${partnerName} guardou-a há` : "Guardaste-a há"} <b>{shownWait}</b> {waitedDays === 1 ? "dia" : "dias"}
            </span>
          )}
          <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.5,
            marginBottom: 16, whiteSpace: "pre-line",
            animation: "capsule-fade-up 600ms 200ms both ease" }}>{quote}</p>
          <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.22)", animation: "capsule-fade-up 600ms 340ms both ease" }}>{date}</p>
        </div>

        {/* Botões */}
        <div style={{ padding: "0 24px", paddingBottom: "max(env(safe-area-inset-bottom,0px),44px)" }}>
          <p style={{ fontSize: 11, textAlign: "center", marginBottom: 18, lineHeight: 1.6,
            color: "rgba(255,255,255,0.20)" }}>
            Uma vez aberta, a mensagem fica visível para os dois permanentemente.
          </p>
          <button
            type="button"
            className={`cap-btn${holding ? " cap-pressing" : ""}`}
            aria-label="Mantém premido para abrir a cápsula"
            disabled={revealing}
            onPointerDown={(e) => { e.preventDefault(); startHold(); }}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !holding) { e.preventDefault(); startHold(); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") endHold(); }}
            style={{
              width: "100%", height: 56, borderRadius: 28, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#f43f5e 0%,#be123c 100%)",
              boxShadow: "0 16px 48px rgba(244,63,94,0.32)",
              color: "#fff", fontWeight: 700, fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
            <span className="cap-btn-fill" style={{ transform: `scaleX(${holdK})` }} />
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10 }}>
              {revealing || opened
                ? <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />A abrir...</>
                : <><Heart size={18} fill="currentColor" strokeWidth={0} />Mantém premido para abrir</>}
            </span>
          </button>
          <button onClick={onClose} disabled={revealing} style={{
            width: "100%", height: 44, background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.28)", fontWeight: 600, fontSize: 14, marginTop: 4,
          }}>Cancelar</button>
        </div>
      </div>

      {/* ═══════════════════ UNLOCKING — sequência cinematic ═════════════ */}
      {phase === "unlocking" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2,
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

          <div className="cap-flash" />

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

          {/* Cadeado aberto com escala */}
          <span ref={iconRef} style={{ position: "relative", zIndex: 2,
            width: 88, height: 88, borderRadius: "50%",
            background: "rgba(244,63,94,0.18)", border: "1px solid rgba(244,63,94,0.32)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(251,113,133,1)",
            animation: "burst-icon 800ms ease both",
            boxShadow: "0 0 80px rgba(244,63,94,0.45)" }}>
            <CapsuleLock size={40} open />
          </span>
        </div>
      )}

      {/* ═══════════════════ REVEALED — a memória ════════════════════════ */}
      {phase === "revealed" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", background: "#000",
          animation: "capsule-fade-up 300ms ease both" }}>

          {/* X */}
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10,
            paddingTop: "env(safe-area-inset-top, 0px)" }}>
            <button onClick={onClose} aria-label="Fechar" style={{
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
              <img src={capsule.image_url} aria-hidden alt=""
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
                display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(251,113,133,0.80)" }}>
                <CapsuleLock size={36} open />
              </div>
            </div>
          )}

          {/* Painel de informação — sobe com animação */}
          <div className="bg-card rounded-t-[2rem] px-5 pt-5 shrink-0 overflow-y-auto"
            style={{
              maxHeight: hasMedia ? "56svh" : "82svh",
              paddingBottom: "max(env(safe-area-inset-bottom,0px),1.5rem)",
              boxShadow: "0 -16px 48px rgba(0,0,0,0.28)",
              animation: "panel-slide-up 500ms 300ms ease both",
            }}>

            {/* Quote emocional */}
            <p className="text-sm italic text-rose-400 leading-relaxed mb-2 whitespace-pre-line"
              style={{ animation: "capsule-fade-up 400ms 600ms both ease" }}>
              {revealedQuote}
            </p>

            {/* De quem e quando */}
            <p className="flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground mb-4"
              style={{ animation: "capsule-fade-up 400ms 720ms both ease" }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                style={{ background: fromPartner ? "#60A5FA" : "#FF4F7B" }}>
                {(fromPartner ? partnerName : "Tu").charAt(0).toUpperCase()}
              </span>
              {fromPartner ? `De ${author}, para ti` : "Escrita por ti"}
              {writtenOn && <> · {writtenOn}</>}
            </p>

            {/* Separador */}
            <div className="h-px bg-border/50 mb-4"
              style={{ animation: "capsule-fade-up 400ms 820ms both ease" }} />

            {/* Mensagem, letra a letra */}
            <p className="font-serif text-[15px] text-foreground leading-relaxed whitespace-pre-wrap mb-4" aria-label={message}
              style={{ animation: "capsule-fade-up 400ms 900ms both ease" }}>
              {message.slice(0, typed)}
              {!typingDone && <span className="cap-caret" />}
            </p>

            {/* Reagir */}
            <div className={`cap-reacts mb-4${typingDone ? " cap-on" : ""}`}>
              {fromPartner && (
                <button type="button" className="cap-react" onClick={love} aria-pressed={loved}>
                  <Heart size={14} fill="currentColor" strokeWidth={0} />{loved ? "Amaste" : "Amei"}
                </button>
              )}
              <button type="button" className="cap-react cap-ghost" onClick={onReply}>
                <Plus size={14} strokeWidth={2.4} />Responder com outra cápsula
              </button>
            </div>

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
        <p className="text-xs text-muted-foreground first-letter:uppercase mb-0.5">
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

function LockedDetailView({ capsule, onClose, author }: { capsule: any; onClose: () => void; author: string }) {
  const unlockDateObj = new Date(capsule.unlock_date);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const left = Math.max(0, unlockDateObj.getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const date = format(unlockDateObj, "d 'de' MMMM 'de' yyyy", { locale: pt });

  return createPortal(
    <div style={{ ...PORTAL_BASE }} className="bg-white dark:bg-background">
      <button onClick={onClose} aria-label="Fechar"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F5F2] text-muted-foreground dark:bg-muted">
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="text-[12px] font-semibold text-muted-foreground">Cápsula selada</p>
        <h2 className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.025em] text-foreground">
          {author === "Tu" ? "A tua cápsula" : `Do ${author}, para os dois`}
        </h2>
        {capsule.created_at && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">Guardada a {format(new Date(capsule.created_at), "d 'de' MMMM", { locale: pt })}</p>
        )}

        <div className="relative mt-5 flex h-[190px] w-[190px] items-center justify-center">
          <span className="absolute inset-[18px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,107,157,.14), transparent 68%)" }} />
          <img src={faisca} alt="A Faísca a guardar a cápsula" className="relative w-[150px] animate-[ln-bob_3.6s_ease-in-out_infinite]" />
          <span className="absolute bottom-[30px] right-[26px] flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#0B1324] shadow-[0_6px_16px_-8px_rgba(11,19,36,0.4)] ring-1 ring-[#ECE8E3] dark:bg-card dark:text-foreground dark:ring-border">
            <Lock className="h-5 w-5" strokeWidth={1.7} />
          </span>
        </div>
        <p className="relative mt-1 rounded-[14px] bg-[#F7F5F2] px-3.5 py-2 text-[13px] font-medium text-foreground dark:bg-muted">
          Ainda não! Eu guardo até ao dia.
        </p>

        <div className="mt-5 flex gap-2" aria-label={`Faltam ${d} dias, ${h} horas e ${m} minutos`}>
          {[[d, "dias"], [h, "horas"], [m, "min"]].map(([v, l]) => (
            <div key={l as string} className="w-[70px] rounded-2xl border border-[#ECE8E3] py-2.5 dark:border-border">
              <b className="block text-[24px] font-bold tracking-[-0.03em] tabular-nums text-foreground">{String(v).padStart(2, "0")}</b>
              <small className="text-[11px] font-semibold text-muted-foreground">{l}</small>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          Abre a {date}.<br />Avisamos os dois quando faltarem poucos dias.
        </p>
      </div>

      <div style={{ padding: "0 24px", paddingBottom: "max(env(safe-area-inset-bottom,0px),32px)" }}>
        <button onClick={onClose}
          className="h-[50px] w-full rounded-2xl bg-[#F7F5F2] text-[15px] font-semibold text-foreground dark:bg-muted">
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
}

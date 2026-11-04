import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar, Camera, Check, Heart, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_CONFIG, type RelationshipEvent, type RelationshipEventType } from "./types";
import type { CreateRelationshipEventInput } from "./useRelationshipEvents";
import { dayNumber, parseDateOnly } from "./story";
import { displayableUrl, toJpegIfHeic } from "@/lib/heic";
import "./story.css";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleSpaceId: string;
  userId: string;
  editingEvent?: RelationshipEvent | null;
  onCreate: (userId: string, input: CreateRelationshipEventInput) => Promise<{ error: any }>;
  onUpdate: (id: string, input: Partial<CreateRelationshipEventInput>) => Promise<{ error: any }>;
  onCreated?: (title: string) => void;
  defaultTitle?: string;
  defaultDate?: string;
  /** "Capítulo 10" no topo. */
  chapterNumber?: number;
  /** Para mostrar "dia 425" ao lado da data. */
  relationshipStart?: string | null;
  /** Com o nome do outro, aparece "Guardar como surpresa". */
  partnerName?: string | null;
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as RelationshipEventType[];
const todayIso = () => format(new Date(), "yyyy-MM-dd");

// ── Depois de guardar ─────────────────────────────────────────────────────────
function SavedScreen({ title, photoUrl, surpriseFor, onDone }: { title: string; photoUrl: string | null; surpriseFor: string | null; onDone: () => void }) {
  return (
    <div className="text-center px-2 pb-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-[150px] object-cover rounded-[18px] mt-1.5" />
      ) : (
        <div className="w-full h-[110px] rounded-[18px] mt-1.5" style={{ background: "linear-gradient(160deg, #FFE3EA, #FFF6F8)" }} />
      )}
      <div className="relative w-[46px] h-[46px] -mt-[23px] mx-auto rounded-full bg-[#FF4F7B] text-white flex items-center justify-center border-4 border-background">
        <Check className="w-[18px] h-[18px]" strokeWidth={3} />
      </div>
      <p className="font-serif text-[19px] font-bold mt-3.5">Mais um capítulo escrito</p>
      <p className="text-[12.5px] text-muted-foreground mt-2 leading-relaxed">
        "{title}"{" "}
        {surpriseFor ? `está guardado como surpresa. ${surpriseFor} recebe um aviso para o abrir.` : "já faz parte da vossa história."}
      </p>
      <button type="button" onClick={onDone} className="w-full h-[50px] rounded-2xl bg-muted text-foreground text-[14px] font-extrabold mt-5 active:scale-[0.98] transition-transform">
        Ver na história
      </button>
    </div>
  );
}

/** Folha que sobe de baixo para escrever (ou editar) um capítulo. */
export function AddRelationshipEventSheet({
  open,
  onOpenChange,
  coupleSpaceId,
  userId,
  editingEvent,
  onCreate,
  onUpdate,
  onCreated,
  defaultTitle,
  defaultDate,
  chapterNumber,
  relationshipStart,
  partnerName,
}: Props) {
  const { toast } = useToast();
  const dateRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<RelationshipEventType>("custom");
  const [description, setDescription] = useState("");
  const [surprise, setSurprise] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [removedPhoto, setRemovedPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [saved, setSaved] = useState<{ title: string; photo: string | null; surpriseFor: string | null } | null>(null);

  useEffect(() => {
    if (!open) { setSaved(null); return; }
    setTitle(editingEvent?.title ?? defaultTitle ?? "");
    setEventDate(editingEvent?.event_date ?? defaultDate ?? todayIso());
    setEventType(editingEvent?.event_type ?? "custom");
    setDescription(editingEvent?.description ?? "");
    setSurprise(false);
    setImageFile(null);
    setPreviewUrl(null);
    setPreparing(false);
    setRemovedPhoto(false);
    setSaved(null);

    setExistingUrl(null);
    if (editingEvent?.image_path) {
      supabase.storage
        .from("memories")
        .createSignedUrl(editingEvent.image_path, 3600)
        .then(({ data }) => { if (data) displayableUrl(data.signedUrl).then(setExistingUrl); });
    }
  }, [open, editingEvent, defaultTitle, defaultDate]);

  useEffect(() => {
    if (!imageFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const displayImg = previewUrl ?? (removedPhoto ? null : existingUrl);
  const isEditing = !!editingEvent;
  const canSurprise = !isEditing && !!partnerName;
  const dayN = eventDate ? dayNumber(relationshipStart ?? null, eventDate) : null;

  const close = () => onOpenChange(false);

  const pickFile = (f: File | null) => {
    if (!f) return;
    setPreparing(true);
    toJpegIfHeic(f).then(setImageFile, () => setImageFile(f)).finally(() => setPreparing(false));
  };

  const handleSave = async () => {
    if (!title.trim() || !eventDate || preparing) return;
    setSaving(true);
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${coupleSpaceId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("memories")
          .upload(path, imageFile, { contentType: imageFile.type });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const input: CreateRelationshipEventInput = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        event_date: eventDate,
        ...(imagePath ? { image_path: imagePath } : {}),
        ...(isEditing && removedPhoto && !imagePath ? { image_path: null } : {}),
        ...(canSurprise && surprise ? { is_surprise: true } : {}),
      };

      const { error } = editingEvent ? await onUpdate(editingEvent.id, input) : await onCreate(userId, input);
      if (error) {
        if (String(error?.message ?? "").includes("is_surprise")) {
          throw new Error("A surpresa ainda não está ativa. Desliga \"Guardar como surpresa\" e tenta outra vez.");
        }
        throw error;
      }

      if (!isEditing) {
        const t = title.trim();
        setSaved({ title: t, photo: previewUrl, surpriseFor: canSurprise && surprise ? partnerName! : null });
      } else {
        toast({ title: "Capítulo atualizado" });
        close();
      }
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div className="absolute inset-0 bg-[rgba(28,20,26,0.32)] animate-in fade-in duration-200" onClick={() => !saving && close()} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar capítulo" : "Novo capítulo"}
        className="relative w-full max-w-md bg-background rounded-t-[30px] px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[94dvh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom duration-300"
      >
        <div className="w-[38px] h-1 rounded-full bg-border mx-auto mb-3" />

        {saved ? (
          <SavedScreen
            title={saved.title}
            photoUrl={saved.photo}
            surpriseFor={saved.surpriseFor}
            onDone={() => { onCreated?.(saved.title); close(); }}
          />
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div>
                {chapterNumber && (
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#E8336A] dark:text-[#FF7A9B]">
                    Capítulo {chapterNumber}
                  </p>
                )}
                <p className="font-serif text-[18px] font-bold mt-1">{isEditing ? "Editar capítulo" : "Novo capítulo"}</p>
              </div>
              <button type="button" onClick={close} aria-label="Fechar" className="w-[30px] h-[30px] rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
                <X className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 mt-3.5">
              {/* Foto */}
              {preparing ? (
                <div className="ns-shine relative h-[136px] rounded-[18px] overflow-hidden bg-[#FFF0F4] dark:bg-rose-500/10 flex items-center justify-center gap-2.5" aria-live="polite">
                  <Loader2 className="w-[18px] h-[18px] text-[#FF4F7B] animate-spin" />
                  <div className="text-left">
                    <p className="text-[13px] font-extrabold">A preparar a foto…</p>
                    <p className="text-[11px] text-muted-foreground font-semibold">Só uns segundos</p>
                  </div>
                </div>
              ) : displayImg || (editingEvent?.image_path && !removedPhoto) ? (
                <div className="relative h-[136px] rounded-[18px] overflow-hidden bg-muted">
                  {displayImg && <img src={displayImg} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                    <label className="relative h-[26px] px-3 rounded-full bg-white/85 text-[#1C1A1D] text-[11px] font-extrabold flex items-center cursor-pointer">
                      Trocar
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; pickFile(f); }} />
                    </label>
                    <button type="button" onClick={() => { setImageFile(null); setExistingUrl(null); setRemovedPhoto(true); }} aria-label="Tirar a foto" className="w-[26px] h-[26px] rounded-full bg-white/85 text-[#1C1A1D] flex items-center justify-center">
                      <X className="w-3 h-3" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="relative h-[86px] rounded-[18px] border border-dashed border-border flex items-center justify-center gap-2.5 text-muted-foreground cursor-pointer active:bg-muted/50 transition-colors">
                  <Camera className="w-[18px] h-[18px] text-[#FF4F7B]" strokeWidth={1.8} />
                  <span className="text-[13px] font-semibold">Juntar uma foto <span className="font-normal">(opcional)</span></span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; pickFile(f); }} />
                </label>
              )}

              {/* Título */}
              <label className="block">
                <span className="text-[11px] font-bold text-muted-foreground">Que momento querem guardar?</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: A primeira viagem juntos"
                  maxLength={120}
                  className="w-full bg-transparent font-serif text-[16px] font-bold text-foreground placeholder:text-muted-foreground/50 placeholder:font-normal pt-1.5 pb-2 border-b border-border focus:border-[#FF4F7B] outline-none transition-colors"
                />
              </label>

              {/* Data */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { const el = dateRef.current; if (!el) return; try { el.showPicker(); } catch { el.focus(); el.click(); } }}
                  className="relative inline-flex items-center gap-2 text-[13px] font-bold text-foreground"
                >
                  <Calendar className="w-[15px] h-[15px] text-muted-foreground" strokeWidth={2} />
                  {eventDate ? format(parseDateOnly(eventDate), "d 'de' MMMM 'de' yyyy", { locale: pt }) : "Escolher a data"}
                  <input
                    ref={dateRef}
                    type="date"
                    value={eventDate}
                    max={todayIso()}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-label="Data em que aconteceu"
                  />
                </button>
                {dayN && <span className="text-[12px] text-muted-foreground">dia {dayN}</span>}
              </div>

              {/* Tipo */}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de momento">
                {EVENT_TYPES.map((type) => {
                  const sel = eventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => setEventType(type)}
                      className={cn(
                        "h-8 px-[13px] rounded-full text-[12px] border transition-colors",
                        sel
                          ? "bg-[#FFF0F4] dark:bg-rose-500/15 border-transparent text-[#E8336A] dark:text-[#FF7A9B] font-extrabold"
                          : "border-border text-foreground/70 font-bold active:bg-muted",
                      )}
                    >
                      {EVENT_TYPE_CONFIG[type].short}
                    </button>
                  );
                })}
              </div>

              {/* Texto */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conta como foi… (opcional)"
                rows={3}
                className="w-full rounded-[14px] bg-muted/60 px-3.5 py-3 font-serif text-[14px] leading-relaxed text-foreground placeholder:italic placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-[#FF4F7B]/25 resize-none"
              />

              {/* Surpresa */}
              {canSurprise && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={surprise}
                  onClick={() => setSurprise((s) => !s)}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="w-[34px] h-[34px] rounded-full bg-[#FFF0F4] dark:bg-rose-500/15 text-[#FF4F7B] flex items-center justify-center shrink-0">
                    <Heart className="w-[15px] h-[15px]" fill="currentColor" strokeWidth={0} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className="block text-[13.5px] font-extrabold">Guardar como surpresa</b>
                    <small className="block text-[11.5px] text-muted-foreground mt-px">{partnerName} só vê quando o abrir.</small>
                  </span>
                  <span className={cn("relative w-[42px] h-[26px] rounded-full shrink-0 transition-colors", surprise ? "bg-[#FF4F7B]" : "bg-muted-foreground/25")}>
                    <span className={cn("absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-[left] duration-200", surprise ? "left-[19px]" : "left-[3px]")} />
                  </span>
                </button>
              )}

              {/* Guardar */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || preparing || !title.trim() || !eventDate}
                className="h-[52px] rounded-2xl bg-[#FF4F7B] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 mt-0.5 disabled:opacity-45 active:scale-[0.98] transition-[transform,opacity]"
              >
                {preparing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> A preparar a foto…</>
                ) : saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> A guardar…</>
                ) : isEditing ? (
                  "Guardar alterações"
                ) : (
                  "Guardar capítulo"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

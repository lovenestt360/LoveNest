import { useEffect, useState } from "react";
import { Camera, X, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_CONFIG,
  EVENT_COLORS,
  type RelationshipEvent,
  type RelationshipEventType,
} from "./types";
import type { CreateRelationshipEventInput } from "./useRelationshipEvents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleSpaceId: string;
  userId: string;
  editingEvent?: RelationshipEvent | null;
  onCreate: (userId: string, input: CreateRelationshipEventInput) => Promise<{ error: any }>;
  onUpdate: (id: string, input: Partial<CreateRelationshipEventInput>) => Promise<{ error: any }>;
  onCreated?: (title: string) => void;
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as RelationshipEventType[];

const SHORT_LABELS: Record<RelationshipEventType, string> = {
  first_meeting: "1.º encontro",
  dating:        "Namoro",
  engagement:    "Noivado",
  marriage:      "Casamento",
  trip:          "Viagem",
  custom:        "Outro",
};

// ── Ecrã de celebração (dentro do modal) ──────────────────────────────────────
function SavedScreen({ title, photoUrl }: { title: string; photoUrl: string | null }) {
  return (
    <div className="p-7 flex flex-col items-center text-center animate-in fade-in duration-300">
      {photoUrl && (
        <div className="w-full rounded-2xl overflow-hidden mb-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <img src={photoUrl} alt="" className="w-full h-40 object-cover" />
        </div>
      )}
      <div className="relative w-[56px] h-[56px] mx-auto mb-4">
        <div className="absolute inset-0 rounded-full bg-rose-100 dark:bg-rose-900/20 animate-ping opacity-20" />
        <div className="relative w-full h-full rounded-full bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[9px] font-bold text-rose-400 uppercase tracking-[0.3em] mb-2">
        Novo capítulo
      </p>
      <p className="font-serif text-[20px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-tight">
        Mais um capítulo foi escrito.
      </p>
      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
        A vossa história continua a crescer.
      </p>
      {title && (
        <div className="mt-4 bg-rose-50/70 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/25 rounded-2xl px-4 py-3 w-full">
          <p className="font-serif text-[14px] font-semibold text-[#1A1A1A] dark:text-zinc-100">
            "{title}"
          </p>
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function AddRelationshipEventSheet({
  open,
  onOpenChange,
  coupleSpaceId,
  userId,
  editingEvent,
  onCreate,
  onUpdate,
  onCreated,
}: Props) {
  const { toast } = useToast();

  const [title, setTitle]             = useState("");
  const [eventDate, setEventDate]     = useState("");
  const [eventType, setEventType]     = useState<RelationshipEventType>("custom");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [savedTitle, setSavedTitle]   = useState("");
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setSaved(false); return; }
    setTitle(editingEvent?.title ?? "");
    setEventDate(editingEvent?.event_date ?? "");
    setEventType(editingEvent?.event_type ?? "custom");
    setDescription(editingEvent?.description ?? "");
    setImageFile(null);
    setPreviewUrl(null);
    setSaved(false);

    if (editingEvent?.image_path) {
      supabase.storage
        .from("memories")
        .createSignedUrl(editingEvent.image_path, 3600)
        .then(({ data }) => { if (data) setExistingUrl(data.signedUrl); });
    } else {
      setExistingUrl(null);
    }
  }, [open, editingEvent]);

  useEffect(() => {
    if (!imageFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const displayImg = previewUrl ?? existingUrl;

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setExistingUrl(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !eventDate) return;
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
      };

      const { error } = editingEvent
        ? await onUpdate(editingEvent.id, input)
        : await onCreate(userId, input);

      if (error) throw error;

      if (!editingEvent) {
        setSavedTitle(title.trim());
        setSavedPhotoUrl(previewUrl);
        setSaved(true);
        setTimeout(() => {
          onCreated?.(title.trim());
          onOpenChange(false);
        }, 2600);
      } else {
        toast({ title: "Capítulo atualizado" });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editingEvent;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      {/* Fundo desfocado */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => !saved && onOpenChange(false)}
      />

      {/* Cartão do modal */}
      <div className="relative w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="max-h-[88vh] overflow-y-auto">

          {saved ? (
            <SavedScreen title={savedTitle} photoUrl={savedPhotoUrl} />
          ) : (
            <>
              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-rose-400" strokeWidth={1.5} />
                  </div>
                  <p className="font-serif text-[15px] font-bold text-foreground">
                    {isEditing ? "Editar capítulo" : "Novo capítulo"}
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                </button>
              </div>

              {/* Formulário */}
              <div className="px-5 py-4 space-y-4">

                {/* 1 — Fotografia */}
                {displayImg ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                    <img src={displayImg} alt="" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90"
                    >
                      <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => document.getElementById("rel-event-img")?.click()}
                    className="w-full rounded-2xl border border-dashed border-border/50 bg-muted/10 py-3.5 px-4 flex items-center gap-3 active:bg-muted/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-rose-300" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold text-foreground leading-snug">
                        Escolhe uma fotografia
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        que conte este momento
                      </p>
                    </div>
                  </button>
                )}
                <input
                  id="rel-event-img"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />

                {/* 2 — Título */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Que momento foi este?
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Primeira viagem juntos"
                    className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-300 dark:focus:border-rose-700 transition-all"
                  />
                </div>

                {/* 3 — Categoria */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Que tipo de momento?
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {EVENT_TYPES.map((type) => {
                      const config = EVENT_TYPE_CONFIG[type];
                      const colors = EVENT_COLORS[type];
                      const Icon   = config.icon;
                      const sel    = eventType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEventType(type)}
                          className={cn(
                            "flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all",
                            sel
                              ? cn("border-transparent", colors.iconBg)
                              : "border-border/40 bg-muted/15 active:bg-muted/40"
                          )}
                        >
                          <Icon
                            className={cn("w-3.5 h-3.5", sel ? colors.iconText : "text-muted-foreground")}
                            strokeWidth={1.5}
                          />
                          <span
                            className={cn(
                              "text-[9px] font-bold leading-none",
                              sel ? colors.iconText : "text-muted-foreground"
                            )}
                          >
                            {SHORT_LABELS[type]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4 — Data */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Quando aconteceu?
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-300 dark:focus:border-rose-700 transition-all"
                  />
                </div>

                {/* 5 — Descrição */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    O que tornou este dia especial?
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Algumas palavras para nunca esquecer…"
                    rows={2}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-300 dark:focus:border-rose-700 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* CTA */}
                <Button
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !eventDate}
                  className="w-full h-12 rounded-2xl bg-[#C4788C] hover:bg-[#B56A7E] active:bg-[#A65C70] text-white font-semibold text-[14px] shadow-[0_4px_20px_rgba(196,120,140,0.28)] transition-all border-0 mb-1"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isEditing ? (
                    "Guardar alterações"
                  ) : (
                    "Guardar este momento"
                  )}
                </Button>

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

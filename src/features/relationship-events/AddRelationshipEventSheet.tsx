import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, BookOpen } from "lucide-react";
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
      {children}
    </label>
  );
}

function StyledInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-300 dark:focus:border-rose-700 transition-all"
    />
  );
}

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
  const [title, setTitle]           = useState("");
  const [eventDate, setEventDate]   = useState("");
  const [eventType, setEventType]   = useState<RelationshipEventType>("custom");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editingEvent?.title ?? "");
    setEventDate(editingEvent?.event_date ?? "");
    setEventType(editingEvent?.event_type ?? "custom");
    setDescription(editingEvent?.description ?? "");
    setImageFile(null);
    setPreviewUrl(null);

    if (editingEvent?.image_path) {
      supabase.storage
        .from("memories")
        .createSignedUrl(editingEvent.image_path, 3600)
        .then(({ data }) => { if (data) setExistingUrl(data.signedUrl); });
    } else {
      setExistingUrl(null);
    }
  }, [open, editingEvent]);

  // Preview URL for newly selected file
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

      if (!editingEvent) onCreated?.(title.trim());
      else toast({ title: "Capítulo atualizado" });

      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editingEvent;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2rem] max-h-[92vh] overflow-y-auto px-0 pb-0 pt-0"
      >
        {/* Accessibility title (hidden visually) */}
        <SheetTitle className="sr-only">
          {isEditing ? "Editar capítulo" : "Novo capítulo da vossa história"}
        </SheetTitle>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-rose-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-serif text-[17px] font-bold text-foreground leading-tight">
                {isEditing ? "Editar este capítulo" : "Guardar mais um momento"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isEditing
                  ? "Atualizem os detalhes deste momento especial"
                  : "A vossa história está sempre a crescer"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-5 pb-10">

          {/* ── Fotografia ─────────────────────────────── */}
          <div>
            <FieldLabel>Fotografia</FieldLabel>
            {displayImg ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={displayImg}
                  alt=""
                  className="w-full h-52 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-white" strokeWidth={2} />
                </button>
                <div className="absolute bottom-3 left-4">
                  <span className="text-[11px] text-white/70 font-medium">Foto adicionada</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("rel-event-img")?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-border bg-muted/20 py-8 flex flex-col items-center gap-3 active:bg-muted/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
                </div>
                <div className="text-center px-4">
                  <p className="text-[13px] font-semibold text-foreground">Adicionar fotografia</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Uma foto torna este momento inesquecível
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
          </div>

          {/* ── Título ─────────────────────────────────── */}
          <div>
            <FieldLabel>Que momento foi este?</FieldLabel>
            <StyledInput
              value={title}
              onChange={setTitle}
              placeholder="Ex: Primeira viagem juntos"
            />
          </div>

          {/* ── Data ───────────────────────────────────── */}
          <div>
            <FieldLabel>Quando aconteceu?</FieldLabel>
            <StyledInput
              type="date"
              value={eventDate}
              onChange={setEventDate}
            />
          </div>

          {/* ── Categoria ──────────────────────────────── */}
          <div>
            <FieldLabel>Que tipo de momento?</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
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
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all",
                      sel
                        ? cn("border-transparent", colors.iconBg)
                        : "border-border bg-muted/20 active:bg-muted/50"
                    )}
                  >
                    <Icon
                      className={cn("w-4 h-4", sel ? colors.iconText : "text-muted-foreground")}
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

          {/* ── Descrição ──────────────────────────────── */}
          <div>
            <FieldLabel>O que tornou este dia especial?</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escrevam algumas palavras para nunca esquecer este momento…"
              rows={3}
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-300 dark:focus:border-rose-700 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* ── CTA ────────────────────────────────────── */}
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !eventDate}
            className="w-full h-13 rounded-2xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-semibold text-[15px] shadow-[0_4px_20px_rgba(244,63,94,0.25)] transition-all"
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
      </SheetContent>
    </Sheet>
  );
}

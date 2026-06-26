import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EVENT_TYPE_CONFIG, type RelationshipEvent, type RelationshipEventType } from "./types";
import type { CreateRelationshipEventInput } from "./useRelationshipEvents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleSpaceId: string;
  userId: string;
  editingEvent?: RelationshipEvent | null;
  onCreate: (userId: string, input: CreateRelationshipEventInput) => Promise<{ error: any }>;
  onUpdate: (id: string, input: Partial<CreateRelationshipEventInput>) => Promise<{ error: any }>;
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as RelationshipEventType[];

export function AddRelationshipEventSheet({
  open,
  onOpenChange,
  coupleSpaceId,
  userId,
  editingEvent,
  onCreate,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<RelationshipEventType>("custom");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editingEvent?.title ?? "");
    setEventDate(editingEvent?.event_date ?? "");
    setEventType(editingEvent?.event_type ?? "custom");
    setDescription(editingEvent?.description ?? "");
    setImageFile(null);
  }, [open, editingEvent]);

  const handleSave = async () => {
    if (!title.trim() || !eventDate) return;
    setSaving(true);
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${coupleSpaceId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("memories").upload(path, imageFile, {
          contentType: imageFile.type,
        });
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

      toast({ title: editingEvent ? "Data atualizada" : "Data adicionada à vossa história" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{editingEvent ? "Editar data" : "Nova data importante"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Primeira viagem juntos" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Data</label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Categoria</label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as RelationshipEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EVENT_TYPE_CONFIG[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Descrição (opcional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Como foi este momento..."
              rows={3}
            />
          </div>

          <button
            type="button"
            onClick={() => document.getElementById("relationship-event-img")?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border text-muted-foreground active:bg-muted transition-colors"
          >
            <ImageIcon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.5} />
            <span className="text-[13px] font-medium truncate">
              {imageFile ? imageFile.name : editingEvent?.image_path ? "Substituir foto" : "Adicionar foto (opcional)"}
            </span>
            <input
              id="relationship-event-img"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </button>

          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !eventDate}
            className="w-full h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEvent ? "Guardar alterações" : "Adicionar à história"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

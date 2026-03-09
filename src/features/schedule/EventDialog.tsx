import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(100),
  event_date: z.string().min(1, "Data obrigatória"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(300).optional(),
});

export type EventFormValues = z.infer<typeof schema>;

export interface ScheduleEvent {
  id: string;
  couple_space_id: string;
  created_by: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (v: EventFormValues) => Promise<void>;
  event: ScheduleEvent | null;
  defaultDate?: string;
}

export function EventDialog({ open, onOpenChange, onSave, event, defaultDate }: Props) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", event_date: "", start_time: "", end_time: "", location: "", notes: "" },
  });

  useEffect(() => {
    if (open) {
      if (event) {
        form.reset({
          title: event.title,
          event_date: event.event_date,
          start_time: event.start_time?.slice(0, 5) ?? "",
          end_time: event.end_time?.slice(0, 5) ?? "",
          location: event.location ?? "",
          notes: event.notes ?? "",
        });
      } else {
        form.reset({ title: "", event_date: defaultDate ?? "", start_time: "", end_time: "", location: "", notes: "" });
      }
    }
  }, [open, event, defaultDate, form]);

  const onSubmit = async (v: EventFormValues) => {
    await onSave(v);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>Evento pontual do casal.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Date night" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="event_date" render={({ field }) => (
              <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Local</FormLabel><FormControl><Input placeholder="Opcional" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea rows={2} placeholder="Opcional" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" className="w-full">Guardar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CATEGORIES = [
  { value: "escola", label: "Escola/Faculdade" },
  { value: "trabalho", label: "Trabalho" },
  { value: "igreja", label: "Igreja" },
  { value: "estudo", label: "Estudo" },
  { value: "outro", label: "Outro" },
];

const schema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(100),
  category: z.string(),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, "Hora início obrigatória"),
  end_time: z.string().min(1, "Hora fim obrigatória"),
  location: z.string().max(200).optional(),
  notes: z.string().max(300).optional(),
});

export type BlockFormValues = z.infer<typeof schema>;

export interface ScheduleBlock {
  id: string;
  couple_space_id: string;
  user_id: string;
  title: string;
  category: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
  is_recurring: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (v: BlockFormValues) => Promise<void>;
  block: ScheduleBlock | null;
}

export function BlockDialog({ open, onOpenChange, onSave, block }: Props) {
  const form = useForm<BlockFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "outro", day_of_week: 1, start_time: "09:00", end_time: "10:00", location: "", notes: "" },
  });

  useEffect(() => {
    if (open) {
      if (block) {
        form.reset({
          title: block.title,
          category: block.category,
          day_of_week: block.day_of_week,
          start_time: block.start_time.slice(0, 5),
          end_time: block.end_time.slice(0, 5),
          location: block.location ?? "",
          notes: block.notes ?? "",
        });
      } else {
        form.reset({ title: "", category: "outro", day_of_week: 1, start_time: "09:00", end_time: "10:00", location: "", notes: "" });
      }
    }
  }, [open, block, form]);

  const onSubmit = async (v: BlockFormValues) => {
    await onSave(v);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{block ? "Editar rotina" : "Nova rotina"}</DialogTitle>
          <DialogDescription>Bloco semanal recorrente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Faculdade" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="day_of_week" render={({ field }) => (
                <FormItem><FormLabel>Dia</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>

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

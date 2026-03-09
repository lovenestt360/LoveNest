import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  assigned: z.enum(["me", "partner", "both"]),
  due_date: z.string().optional(),
  priority: z.number().min(1).max(3),
  notes: z.string().max(500).optional(),
});

export type TaskFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (v: TaskFormValues) => Promise<void>;
  task: { id: string; title: string; assigned_to: string | null; due_date: string | null; priority: number; notes: string | null } | null;
  userId: string;
}

export function TaskDialog({ open, onOpenChange, onSave, task, userId }: Props) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", assigned: "both", priority: 2, notes: "", due_date: "" },
  });

  useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          title: task.title,
          assigned: task.assigned_to === userId ? "me" : task.assigned_to ? "partner" : "both",
          due_date: task.due_date ?? "",
          priority: task.priority,
          notes: task.notes ?? "",
        });
      } else {
        form.reset({ title: "", assigned: "both", priority: 2, notes: "", due_date: "" });
      }
    }
  }, [open, task, userId, form]);

  const onSubmit = async (values: TaskFormValues) => {
    await onSave(values);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Preenche os detalhes da tarefa.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl><Input placeholder="Ex: Comprar flores" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="assigned" render={({ field }) => (
              <FormItem>
                <FormLabel>Atribuir a</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="me">Eu</SelectItem>
                    <SelectItem value="partner">Meu par</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="1">Alta</SelectItem>
                      <SelectItem value="2">Média</SelectItem>
                      <SelectItem value="3">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Opcional..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full">Guardar</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

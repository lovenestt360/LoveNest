import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Edit2, Check, X, Trash2 } from "lucide-react";
import { UseFastingReturn } from "./useFasting";
import { PLAN_TYPES } from "./types";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
    data: UseFastingReturn;
}

export function FastingPlan({ data }: Props) {
    const { profile, updatePlan, deletePlan } = data;
    const { toast } = useToast();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [planType, setPlanType] = useState(profile?.plan_type ?? "combined");
    const [untilHour, setUntilHour] = useState(profile?.until_hour ?? "");
    const [allowed, setAllowed] = useState(profile?.rules_allowed ?? "");
    const [forbidden, setForbidden] = useState(profile?.rules_forbidden ?? "");
    const [exceptions, setExceptions] = useState(profile?.rules_exceptions ?? "");

    if (!profile) {
        return (
            <div className="glass-card rounded-2xl p-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Ainda não tens um plano activo.</p>
                <p className="text-xs text-muted-foreground">Cria um plano na aba "Hoje".</p>
            </div>
        );
    }

    const handleSave = async () => {
        setSaving(true);
        await updatePlan({
            plan_type: planType,
            until_hour: planType === "until_hour" ? untilHour : null,
            rules_allowed: allowed || null,
            rules_forbidden: forbidden || null,
            rules_exceptions: exceptions || null,
        });
        setSaving(false);
        setEditing(false);
        toast({ title: "Plano actualizado ✓" });
    };

    const currentType = PLAN_TYPES.find(t => t.value === profile.plan_type);

    // Calculate 40-day calendar blocks
    const start = new Date(profile.start_date + "T00:00:00");
    const days = Array.from({ length: profile.total_days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d.toISOString().slice(0, 10);
    });

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="space-y-4">
            {/* Plan type */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-sm">{profile.plan_name}</p>
                        <p className="text-xs text-muted-foreground">{currentType?.label} — {currentType?.desc}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(e => !e)}>
                        {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                    </Button>
                </div>

                {editing ? (
                    <div className="space-y-3">
                        <Select value={planType} onValueChange={(v) => setPlanType(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PLAN_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label} — {t.desc}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {planType === "until_hour" && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Hora limite</label>
                                <Input type="time" value={untilHour} onChange={e => setUntilHour(e.target.value)} />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-green-600">✅ O que é permitido</label>
                            <Textarea value={allowed} onChange={e => setAllowed(e.target.value)} rows={2}
                                placeholder="Água, chá, fruta…" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-red-600">🚫 O que é proibido</label>
                            <Textarea value={forbidden} onChange={e => setForbidden(e.target.value)} rows={2}
                                placeholder="Doces, redes sociais, carne…" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-yellow-600">⚠️ Excepções</label>
                            <Textarea value={exceptions} onChange={e => setExceptions(e.target.value)} rows={2}
                                placeholder="Saúde, viagens, domingos…" />
                        </div>

                        <Button className="w-full" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Guardar
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="font-medium text-foreground">Início:</span>{" "}
                                {format(new Date(profile.start_date + "T12:00:00"), "d MMM yyyy", { locale: pt })}
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Fim:</span>{" "}
                                {format(new Date(profile.end_date + "T12:00:00"), "d MMM yyyy", { locale: pt })}
                            </div>
                        </div>
                        {profile.rules_allowed && (
                            <p><span className="text-green-600 font-medium">✅ Permitido:</span> {profile.rules_allowed}</p>
                        )}
                        {profile.rules_forbidden && (
                            <p><span className="text-red-600 font-medium">🚫 Proibido:</span> {profile.rules_forbidden}</p>
                        )}
                        {profile.rules_exceptions && (
                            <p><span className="text-yellow-600 font-medium">⚠️ Excepções:</span> {profile.rules_exceptions}</p>
                        )}
                    </div>
                )}
            </div>

            {/* 40-day mini calendar */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Percurso — {profile.total_days} dias
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {days.map((d, i) => {
                        const isT = d === today;
                        const past = d < today;
                        return (
                            <div
                                key={d}
                                title={`Dia ${i + 1}`}
                                className={cn(
                                    "h-5 w-5 rounded text-[9px] flex items-center justify-center font-bold transition-all",
                                    isT ? "ring-2 ring-primary bg-primary/20 text-primary" :
                                        past ? "bg-muted/80 text-muted-foreground" :
                                            "bg-muted/30 text-muted-foreground/40"
                                )}
                            >
                                {i + 1}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cancel Plan */}
            <div className="pt-4 pb-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-destructive hover:bg-red-50 hover:text-red-700 h-10 font-medium">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancelar Plano de Jejum
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar Jejum?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tens a certeza? O teu percurso e registos deste plano serão arquivados e não poderás voltar atrás.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full">Não, manter</AlertDialogCancel>
                            <AlertDialogAction onClick={deletePlan} className="bg-destructive hover:bg-destructive/90 rounded-full">
                                Sim, cancelar jejum
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Bell } from "lucide-react";
import { UseFastingReturn } from "./useFasting";
import { useToast } from "@/hooks/use-toast";

interface Props {
    data: UseFastingReturn;
}

const TOGGLES: { key: keyof Omit<ReturnType<typeof defaultReminders>, "id" | "user_id" | "updated_at">; label: string; desc: string }[] = [
    { key: "registar_dia", label: "Registar o dia", desc: "Lembrete diário para anotar o teu progresso" },
    { key: "oracao", label: "Oração", desc: "Hora de fazer a tua oração" },
    { key: "hora_terminar", label: "Hora de terminar", desc: "Alerta quando terminar o período de jejum" },
    { key: "reflexao_noturna", label: "Reflexão nocturna", desc: "Momento de reflexão antes de dormir" },
    { key: "motivacao_dia", label: "Motivação do dia", desc: "Uma mensagem curta de incentivo" },
    { key: "alerta_calendario", label: "Alerta de calendário", desc: "Ex: missa, celebrações, datas especiais" },
];

function defaultReminders() {
    return {
        registar_dia: false, oracao: false, hora_terminar: false,
        reflexao_noturna: false, motivacao_dia: false, alerta_calendario: false,
    };
}

export function FastingReminders({ data }: Props) {
    const { reminders, saveReminders } = data;
    const { toast } = useToast();

    const [prefs, setPrefs] = useState({
        ...defaultReminders(),
        ...(reminders ?? {}),
    });
    const [saving, setSaving] = useState(false);

    const toggle = (key: string) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    const handleSave = async () => {
        setSaving(true);
        await saveReminders(prefs);
        setSaving(false);
        toast({ title: "Lembretes guardados ✓" });
    };

    return (
        <div className="space-y-4">
            <div className="glass-card rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">Lembretes</p>
                </div>
                <p className="text-xs text-muted-foreground">
                    📌 Notificações sempre discretas, sem detalhes sensíveis.
                </p>

                <div className="space-y-4">
                    {TOGGLES.map(t => (
                        <div key={t.key} className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{t.label}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{t.desc}</p>
                            </div>
                            <Switch
                                checked={!!(prefs as any)[t.key]}
                                onCheckedChange={() => toggle(t.key)}
                            />
                        </div>
                    ))}
                </div>

                <Button className="w-full" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar lembretes
                </Button>
            </div>

            <div className="glass-card rounded-2xl p-4">
                <p className="text-xs text-muted-foreground text-center">
                    ℹ️ Os lembretes são configurados localmente. As notificações push requerem activação nas Definições do app.
                </p>
            </div>
        </div>
    );
}

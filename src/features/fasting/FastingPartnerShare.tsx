import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Lock, Share2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UseFastingReturn } from "./useFasting";
import { ShareLevel } from "./types";
import { useToast } from "@/hooks/use-toast";

interface Props {
    data: UseFastingReturn;
}

const LEVELS: { value: ShareLevel; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "privado", label: "Privado", desc: "O teu par não vê nada", icon: <Lock className="h-4 w-4" /> },
    { value: "streak", label: "Streak + %", desc: "Partilha dias seguidos e taxa de cumprimento", icon: <Share2 className="h-4 w-4" /> },
    { value: "checklist", label: "Totais da checklist", desc: "Partilha percentagem e totais (sem detalhes)", icon: <Users className="h-4 w-4" /> },
];

const SUPPORT_MESSAGES = [
    "Força hoje, falta pouco 💛",
    "Estou orgulhosa(o) de ti 🙏",
    "Juntos somos mais fortes 💪",
    "Cada dia é uma vitória 🌟",
    "Mantém o foco, vale a pena! ✨",
];

export function FastingPartnerShare({ data }: Props) {
    const { partnerShare, savePartnerShare, stats } = data;
    const { toast } = useToast();

    const [level, setLevel] = useState<ShareLevel>(partnerShare?.share_level ?? "privado");
    const [message, setMessage] = useState(partnerShare?.support_message ?? "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await savePartnerShare({ share_level: level, support_message: message || null });
        setSaving(false);
        toast({ title: "Preferências de partilha guardadas ✓" });
    };

    return (
        <div className="space-y-4">
            {/* Share level */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">Partilha com o par</p>
                </div>

                <div className="space-y-2">
                    {LEVELS.map(l => (
                        <button
                            key={l.value}
                            type="button"
                            onClick={() => setLevel(l.value)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                                level === l.value
                                    ? "border-primary/50 bg-primary/10 text-primary"
                                    : "border-border/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <span className={cn(level === l.value ? "text-primary" : "text-muted-foreground")}>
                                {l.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold">{l.label}</p>
                                <p className="text-xs text-muted-foreground">{l.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Support message */}
            <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">Mensagem de apoio</p>
                </div>
                <p className="text-xs text-muted-foreground">
                    O teu par verá esta mensagem no perfil de partilha.
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {SUPPORT_MESSAGES.map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMessage(m)}
                            className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <Textarea
                    placeholder="Escreve uma mensagem de apoio…"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={2}
                />
            </div>

            {/* Preview (if sharing) */}
            {level !== "privado" && (
                <div className="glass-card rounded-2xl p-4 space-y-2 bg-primary/5 border-primary/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Preview — o que o teu par verá
                    </p>
                    <div className="space-y-1 text-sm">
                        <p>🔥 <strong>{stats.streak} dias seguidos</strong></p>
                        <p>📈 <strong>{stats.completionRate}% de cumprimento</strong></p>
                        {level === "checklist" && (
                            <p>✅ <strong>{stats.loggedDays} dias registados</strong> de {stats.totalDays}</p>
                        )}
                        {message && <p className="italic text-muted-foreground mt-2">"{message}"</p>}
                    </div>
                </div>
            )}

            <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar preferências
            </Button>
        </div>
    );
}

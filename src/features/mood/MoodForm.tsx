import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MOOD_OPTIONS, SUB_EMOTIONS, ACTIVITIES, SLEEP_QUALITY_OPTIONS } from "./constants";
import { Loader2 } from "lucide-react";

interface MoodFormProps {
    moodKey: string;
    setMoodKey: (v: string) => void;
    moodPercent: number;
    setMoodPercent: (v: number) => void;
    emotions: string[];
    setEmotions: (v: string[]) => void;
    activities: string[];
    setActivities: (v: string[]) => void;
    sleepQuality: string | null;
    setSleepQuality: (v: string | null) => void;
    note: string;
    setNote: (v: string) => void;
    saving: boolean;
    onSave: () => void;
    isUpdate: boolean;
}

export function MoodForm({
    moodKey, setMoodKey,
    moodPercent, setMoodPercent,
    emotions, setEmotions,
    activities, setActivities,
    sleepQuality, setSleepQuality,
    note, setNote,
    saving, onSave,
    isUpdate
}: MoodFormProps) {

    const toggleEmotion = (e: string) => {
        setEmotions(emotions.includes(e) ? emotions.filter(x => x !== e) : [...emotions, e]);
    };

    const toggleActivity = (a: string) => {
        setActivities(activities.includes(a) ? activities.filter(x => x !== a) : [...activities, a]);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Como te sentes hoje?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Main Emotion */}
                    <div className="grid grid-cols-4 gap-2">
                        {MOOD_OPTIONS.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => setMoodKey(m.key)}
                                className={cn(
                                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                                    moodKey === m.key
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:bg-accent"
                                )}
                            >
                                <span className="text-2xl">{m.emoji}</span>
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Intensidade</span>
                            <span className="font-medium">{moodPercent}%</span>
                        </div>
                        <Slider
                            value={[moodPercent]}
                            onValueChange={([v]) => setMoodPercent(v)}
                            max={100}
                            step={1}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Sub emotions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-sm font-medium">Outros Sentimentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {SUB_EMOTIONS.map((e) => {
                            const active = emotions.includes(e);
                            return (
                                <Badge
                                    key={e}
                                    variant={active ? "default" : "secondary"}
                                    className={cn("cursor-pointer font-normal", !active && "bg-muted/50 text-muted-foreground")}
                                    onClick={() => toggleEmotion(e)}
                                >
                                    {e}
                                </Badge>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Activities */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-sm font-medium">Factores e Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {ACTIVITIES.map((act) => {
                            const active = activities.includes(act.key);
                            return (
                                <button
                                    key={act.key}
                                    type="button"
                                    onClick={() => toggleActivity(act.key)}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                                        active
                                            ? "border-primary bg-primary/10 text-primary font-medium"
                                            : "border-border text-muted-foreground hover:bg-accent"
                                    )}
                                >
                                    <span>{act.emoji}</span>
                                    <span>{act.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Sleep */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-sm font-medium">Qualidade do Sono</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                        {SLEEP_QUALITY_OPTIONS.map((sq) => {
                            const active = sleepQuality === sq.key;
                            return (
                                <button
                                    key={sq.key}
                                    type="button"
                                    onClick={() => setSleepQuality(active ? null : sq.key)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                                        active
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:bg-accent"
                                    )}
                                >
                                    <span className="text-lg">{sq.emoji}</span>
                                    <span>{sq.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Alguma nota sobre o dia de hoje?"
                        className="min-h-[80px] resize-none"
                        maxLength={500}
                    />
                    <Button onClick={onSave} disabled={saving} className="w-full">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUpdate ? "Actualizar Registo" : "Guardar Humor"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

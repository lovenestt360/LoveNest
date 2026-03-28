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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Como te sentes hoje?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Main Emotion */}
                    <div className="grid grid-cols-4 gap-3">
                        {MOOD_OPTIONS.map((m) => (
                            <button
                                key={m.key}
                                type="button"
                                onClick={() => setMoodKey(m.key)}
                                className={cn(
                                    "flex flex-col items-center gap-2 rounded-3xl py-4 transition-all duration-300",
                                    moodKey === m.key
                                        ? "bg-slate-900 text-white shadow-2xl shadow-slate-200 scale-105"
                                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 active:scale-95"
                                )}
                            >
                                <span className="text-3xl">{m.emoji}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4 px-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Intensidade</span>
                            <span className="text-xl font-black text-slate-900 tracking-tighter">{moodPercent}%</span>
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
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Sentimentos Complementares</h4>
                        <div className="flex flex-wrap gap-2">
                            {SUB_EMOTIONS.map((e) => {
                                const active = emotions.includes(e);
                                return (
                                    <Badge
                                        key={e}
                                        variant={active ? "default" : "secondary"}
                                        className={cn(
                                            "cursor-pointer px-4 py-2 rounded-full border-none transition-all",
                                            active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                        )}
                                        onClick={() => toggleEmotion(e)}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">{e}</span>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Activities */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Factores e Atividades</h4>
                        <div className="flex flex-wrap gap-2">
                            {ACTIVITIES.map((act) => {
                                const active = activities.includes(act.key);
                                return (
                                    <button
                                        key={act.key}
                                        type="button"
                                        onClick={() => toggleActivity(act.key)}
                                        className={cn(
                                            "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all",
                                            active
                                                ? "bg-slate-900 text-white shadow-lg shadow-slate-100"
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                    >
                                        <span>{act.emoji}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{act.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sleep */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Qualidade do Sono</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {SLEEP_QUALITY_OPTIONS.map((sq) => {
                                const active = sleepQuality === sq.key;
                                return (
                                    <button
                                        key={sq.key}
                                        type="button"
                                        onClick={() => setSleepQuality(active ? null : sq.key)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 rounded-[2rem] py-4 transition-all",
                                            active
                                                ? "bg-slate-900 text-white shadow-xl shadow-slate-100 scale-105"
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                    >
                                        <span className="text-2xl">{sq.emoji}</span>
                                        <span className="text-[8px] font-black uppercase tracking-tighter">{sq.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 space-y-6">
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Alguma nota sobre o dia de hoje?"
                        maxLength={500}
                    />
                    <Button onClick={onSave} disabled={saving} variant="apple" className="w-full h-14 rounded-3xl">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUpdate ? "Actualizar Registo" : "Guardar Humor"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

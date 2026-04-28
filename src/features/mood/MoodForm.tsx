import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
  isReady: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#717171] mb-3">
      {children}
    </p>
  );
}

export function MoodForm({
  moodKey, setMoodKey,
  moodPercent, setMoodPercent,
  emotions, setEmotions,
  activities, setActivities,
  sleepQuality, setSleepQuality,
  note, setNote,
  saving, onSave,
  isUpdate, isReady,
}: MoodFormProps) {

  const toggleEmotion  = (e: string) =>
    setEmotions(emotions.includes(e) ? emotions.filter(x => x !== e) : [...emotions, e]);

  const toggleActivity = (a: string) =>
    setActivities(activities.includes(a) ? activities.filter(x => x !== a) : [...activities, a]);

  return (
    <div className="space-y-5">

      {/* ── Como te sentes hoje? ── */}
      <div className="glass-card p-5">
        <SectionLabel>Como te sentes hoje?</SectionLabel>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {MOOD_OPTIONS.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMoodKey(m.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition-all duration-150 active:scale-95",
                moodKey === m.key
                  ? "border-rose-300 bg-rose-50 text-rose-500"
                  : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
              )}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Intensidade</span>
            <span className="text-sm font-semibold text-foreground">{moodPercent}%</span>
          </div>
          <Slider
            value={[moodPercent]}
            onValueChange={([v]) => setMoodPercent(v)}
            max={100}
            step={1}
          />
        </div>
      </div>

      {/* ── Outros sentimentos ── */}
      <div className="glass-card p-5">
        <SectionLabel>Outros Sentimentos</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {SUB_EMOTIONS.map(e => {
            const active = emotions.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggleEmotion(e)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 active:scale-95",
                  active
                    ? "border-rose-300 bg-rose-50 text-rose-500"
                    : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
                )}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Factores e Actividades ── */}
      <div className="glass-card p-5">
        <SectionLabel>Factores e Atividades</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map(act => {
            const active = activities.includes(act.key);
            return (
              <button
                key={act.key}
                type="button"
                onClick={() => toggleActivity(act.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 active:scale-95",
                  active
                    ? "border-rose-300 bg-rose-50 text-rose-500"
                    : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
                )}
              >
                <span>{act.emoji}</span>
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Qualidade do sono ── */}
      <div className="glass-card p-5">
        <SectionLabel>Qualidade do Sono</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {SLEEP_QUALITY_OPTIONS.map(sq => {
            const active = sleepQuality === sq.key;
            return (
              <button
                key={sq.key}
                type="button"
                onClick={() => setSleepQuality(active ? null : sq.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition-all duration-150 active:scale-95",
                  active
                    ? "border-rose-300 bg-rose-50 text-rose-500"
                    : "border-[#e5e5e5] text-[#717171] hover:bg-[#f5f5f5]"
                )}
              >
                <span className="text-2xl leading-none">{sq.emoji}</span>
                <span>{sq.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Nota do dia ── */}
      <div className="glass-card p-5">
        <SectionLabel>Nota do dia</SectionLabel>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Alguma nota sobre o dia de hoje?"
          className="min-h-[80px] resize-none border-[#e5e5e5] text-sm focus-visible:ring-rose-400/30"
          maxLength={500}
        />
      </div>

      {/* ── Botão guardar ── */}
      <button
        onClick={onSave}
        disabled={!isReady || saving}
        className="w-full py-3.5 rounded-2xl bg-rose-500 text-white font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isUpdate ? "Actualizar Registo" : "Guardar Humor"}
      </button>
    </div>
  );
}

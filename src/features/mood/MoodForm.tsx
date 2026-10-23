import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MOOD_OPTIONS, SUB_EMOTIONS, ACTIVITIES, SLEEP_QUALITY_OPTIONS } from "./constants";
import { Loader2 } from "lucide-react";
import { MoodFace, SleepMoon, ActivityTile } from "./MoodArt";
import { MOOD_TINT } from "./moodArtSvg";

// Escolhido: contorno a tinta; no humor, fundo com a cor da chama.
const TILE_ON = "border-[#0B1324] text-[#0B1324] ring-1 ring-inset ring-[#0B1324] dark:border-foreground dark:text-foreground dark:ring-foreground";
const TILE_OFF = "border-[#ECE8E3] text-muted-foreground hover:bg-[#F7F5F2] dark:border-border dark:hover:bg-muted";
const CHIP_ON = "border-[#0B1324] bg-[#0B1324] text-white dark:border-foreground dark:bg-foreground dark:text-background";
const CHIP_OFF = "border-[#ECE8E3] text-[#3A4150] hover:bg-[#F7F5F2] dark:border-border dark:text-muted-foreground dark:hover:bg-muted";

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
    <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground mb-3">
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
                "flex flex-col items-center gap-1 rounded-2xl border px-1 pb-2.5 pt-2 text-xs font-semibold transition-all duration-150 active:scale-95",
                moodKey === m.key ? TILE_ON : TILE_OFF
              )}
              style={moodKey === m.key ? { background: `color-mix(in srgb, ${MOOD_TINT[m.key]} 16%, transparent)` } : undefined}
            >
              <MoodFace key={moodKey === m.key ? "on" : "off"} mood={m.key} size={46} className={moodKey === m.key ? "animate-mood-pop" : undefined} />
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
                  active ? CHIP_ON : CHIP_OFF
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
                  "flex items-center gap-2 rounded-full border py-[5px] pl-[5px] pr-3 text-xs font-semibold transition-all duration-150 active:scale-95",
                  active ? CHIP_ON : CHIP_OFF
                )}
              >
                <ActivityTile activity={act.key} />
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
                  "flex flex-col items-center gap-1.5 rounded-2xl border px-1 pb-2.5 pt-2.5 text-xs font-semibold transition-all duration-150 active:scale-95",
                  active ? TILE_ON : TILE_OFF
                )}
                style={active ? { background: "color-mix(in srgb, #6A5CFF 14%, transparent)" } : undefined}
              >
                <SleepMoon key={active ? "on" : "off"} quality={sq.key} size={40} className={active ? "animate-mood-pop" : undefined} />
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
          className="min-h-[80px] resize-none rounded-[14px] border-[#ECE8E3] bg-[#F7F5F2] text-sm focus-visible:ring-[#0B1324]/15 dark:border-border dark:bg-muted"
          maxLength={500}
        />
      </div>

      {/* ── Botão guardar ── */}
      <button
        onClick={onSave}
        disabled={!isReady || saving}
        className="w-full h-[52px] rounded-[18px] bg-[#0B1324] text-white font-semibold text-[15px] shadow-[0_14px_28px_-14px_rgba(11,19,36,0.6)] disabled:opacity-40 active:scale-[0.99] transition-transform flex items-center justify-center gap-2 dark:bg-foreground dark:text-background"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isUpdate ? "Actualizar Registo" : "Guardar Humor"}
      </button>
    </div>
  );
}

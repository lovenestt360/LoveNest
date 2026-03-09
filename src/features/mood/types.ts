export interface MoodCheckin {
    id: string;
    couple_space_id: string;
    user_id: string;
    mood_key: string;
    mood_percent: number;
    note: string | null;
    day_key: string;
    created_at: string;
    emotions: string[];
    activities: string[];
    sleep_quality: string | null;
}

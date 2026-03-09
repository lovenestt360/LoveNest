
-- Create mood_checkins table
CREATE TABLE public.mood_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mood_key text NOT NULL,
  mood_percent integer NOT NULL CHECK (mood_percent >= 0 AND mood_percent <= 100),
  note text,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- One check-in per user per day per space
CREATE UNIQUE INDEX uq_mood_user_day ON public.mood_checkins (user_id, day_key, couple_space_id);

-- Query index
CREATE INDEX idx_mood_space_day ON public.mood_checkins (couple_space_id, day_key DESC);

-- Enable RLS
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT: members of same couple_space
CREATE POLICY "Members can view mood checkins"
ON public.mood_checkins
FOR SELECT
USING (public.is_member_of_couple_space(couple_space_id));

-- INSERT: own user_id only
CREATE POLICY "Users can insert own mood checkin"
ON public.mood_checkins
FOR INSERT
WITH CHECK (
  public.is_member_of_couple_space(couple_space_id)
  AND user_id = auth.uid()
);

-- UPDATE: own records only
CREATE POLICY "Users can update own mood checkin"
ON public.mood_checkins
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- No DELETE in MVP

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;

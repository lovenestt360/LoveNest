
-- ==========================================
-- Cycle Profiles
-- ==========================================
CREATE TABLE public.cycle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  share_summary boolean NOT NULL DEFAULT false,
  avg_cycle_length integer NOT NULL DEFAULT 28,
  avg_period_length integer NOT NULL DEFAULT 5,
  luteal_length integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_profiles ENABLE ROW LEVEL SECURITY;

-- Owner-only CRUD
CREATE POLICY "Owner can view own cycle profile"
  ON public.cycle_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own cycle profile"
  ON public.cycle_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));

CREATE POLICY "Owner can update own cycle profile"
  ON public.cycle_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Owner can delete own cycle profile"
  ON public.cycle_profiles FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_cycle_profiles_updated_at
  BEFORE UPDATE ON public.cycle_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Period Entries
-- ==========================================
CREATE TABLE public.period_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  flow_level text NOT NULL DEFAULT 'medium',
  pain_level integer NOT NULL DEFAULT 0,
  pms_level integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.period_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own period entries"
  ON public.period_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own period entries"
  ON public.period_entries FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));

CREATE POLICY "Owner can update own period entries"
  ON public.period_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Owner can delete own period entries"
  ON public.period_entries FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_period_entries_updated_at
  BEFORE UPDATE ON public.period_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Daily Symptoms
-- ==========================================
CREATE TABLE public.daily_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  nausea boolean NOT NULL DEFAULT false,
  cramps boolean NOT NULL DEFAULT false,
  headache boolean NOT NULL DEFAULT false,
  back_pain boolean NOT NULL DEFAULT false,
  fatigue boolean NOT NULL DEFAULT false,
  dizziness boolean NOT NULL DEFAULT false,
  breast_tenderness boolean NOT NULL DEFAULT false,
  mood_swings boolean NOT NULL DEFAULT false,
  acne boolean NOT NULL DEFAULT false,
  cravings boolean NOT NULL DEFAULT false,
  bloating boolean NOT NULL DEFAULT false,
  weakness boolean NOT NULL DEFAULT false,
  discharge text NOT NULL DEFAULT 'none',
  libido integer NOT NULL DEFAULT 5,
  temperature_c numeric,
  pain_level integer NOT NULL DEFAULT 0,
  tpm boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, couple_space_id, day_key)
);

ALTER TABLE public.daily_symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own daily symptoms"
  ON public.daily_symptoms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own daily symptoms"
  ON public.daily_symptoms FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));

CREATE POLICY "Owner can update own daily symptoms"
  ON public.daily_symptoms FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Owner can delete own daily symptoms"
  ON public.daily_symptoms FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_daily_symptoms_updated_at
  BEFORE UPDATE ON public.daily_symptoms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Summary RPC for partner (privacy-safe)
-- Returns: phase, next_period_date, today_status
-- Only works if share_summary = true
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_partner_cycle_summary(_partner_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _profile cycle_profiles%ROWTYPE;
  _last_period period_entries%ROWTYPE;
  _cycle_day integer;
  _phase text;
  _next_period date;
  _ovulation_day integer;
  _fertile_start integer;
  _fertile_end integer;
  _pms_start date;
  _today date := CURRENT_DATE;
BEGIN
  -- Verify caller is partner
  IF NOT are_users_in_same_couple_space(_partner_user_id) THEN
    RETURN NULL;
  END IF;

  -- Get profile, must have sharing on
  SELECT * INTO _profile FROM cycle_profiles WHERE user_id = _partner_user_id;
  IF NOT FOUND OR NOT _profile.share_summary THEN
    RETURN NULL;
  END IF;

  -- Latest period
  SELECT * INTO _last_period FROM period_entries
    WHERE user_id = _partner_user_id
    ORDER BY start_date DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('phase', 'sem dados', 'next_period', null, 'today_status', null);
  END IF;

  _next_period := _last_period.start_date + _profile.avg_cycle_length;
  _cycle_day := (_today - _last_period.start_date) + 1;
  _ovulation_day := _profile.avg_cycle_length - _profile.luteal_length;
  _fertile_start := _ovulation_day - 5;
  _fertile_end := _ovulation_day + 1;
  _pms_start := _next_period - 5;

  -- Determine phase
  IF _last_period.end_date IS NULL AND _today >= _last_period.start_date THEN
    _phase := 'Menstruação';
  ELSIF _last_period.end_date IS NOT NULL AND _today BETWEEN _last_period.start_date AND _last_period.end_date THEN
    _phase := 'Menstruação';
  ELSIF _cycle_day BETWEEN _fertile_start AND _fertile_end THEN
    _phase := 'Fértil';
  ELSIF _today >= _pms_start AND _today < _next_period THEN
    _phase := 'TPM';
  ELSE
    _phase := 'Folicular';
  END IF;

  -- Today status badge
  RETURN jsonb_build_object(
    'phase', _phase,
    'next_period', _next_period,
    'today_status', CASE
      WHEN _phase = 'Menstruação' THEN 'menstruada'
      WHEN _phase = 'TPM' THEN 'TPM'
      WHEN _phase = 'Fértil' THEN 'fértil'
      ELSE null
    END
  );
END;
$$;

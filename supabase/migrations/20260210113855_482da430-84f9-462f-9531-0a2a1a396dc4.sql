
-- ============================================================
-- CYCLE PRO: Schema upgrade
-- ============================================================

-- 1. Extend daily_symptoms with new tracking columns
ALTER TABLE public.daily_symptoms
  ADD COLUMN IF NOT EXISTS energy_level integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS sleep_hours numeric NULL,
  ADD COLUMN IF NOT EXISTS sleep_quality text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS stress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diarrhea boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS constipation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS irritability boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anxiety boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sadness boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sensitivity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crying boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leg_pain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS increased_appetite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discharge_type text NOT NULL DEFAULT 'seco';

-- 2. Unique constraint on daily_symptoms (user_id, day_key) for upsert safety
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_symptoms_user_day
  ON public.daily_symptoms (user_id, day_key);

-- 3. Modify cycle_profiles: add share_level and pms_days
ALTER TABLE public.cycle_profiles
  ADD COLUMN IF NOT EXISTS share_level text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS pms_days integer NOT NULL DEFAULT 5;

-- Migrate existing share_summary data to new share_level
UPDATE public.cycle_profiles
SET share_level = 'summary'
WHERE share_summary = true AND share_level = 'private';

-- Drop old share_summary column
ALTER TABLE public.cycle_profiles DROP COLUMN IF EXISTS share_summary;

-- 4. Replace get_partner_cycle_summary RPC with share_level support + signals
CREATE OR REPLACE FUNCTION public.get_partner_cycle_summary(_partner_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
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
  _share_level text;
  _result jsonb;
  _symptoms daily_symptoms%ROWTYPE;
BEGIN
  -- Verify caller is partner
  IF NOT are_users_in_same_couple_space(_partner_user_id) THEN
    RETURN NULL;
  END IF;

  -- Get profile, check share level
  SELECT * INTO _profile FROM cycle_profiles WHERE user_id = _partner_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  _share_level := _profile.share_level;
  IF _share_level = 'private' THEN
    RETURN jsonb_build_object('shared', false);
  END IF;

  -- Latest period
  SELECT * INTO _last_period FROM period_entries
    WHERE user_id = _partner_user_id
    ORDER BY start_date DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('shared', true, 'phase', 'sem dados', 'next_period', null);
  END IF;

  _next_period := _last_period.start_date + _profile.avg_cycle_length;
  _cycle_day := (_today - _last_period.start_date) + 1;
  _ovulation_day := _profile.avg_cycle_length - _profile.luteal_length;
  _fertile_start := _ovulation_day - 5;
  _fertile_end := _ovulation_day + 1;
  _pms_start := _next_period - _profile.pms_days;

  -- Determine phase
  IF _last_period.end_date IS NULL AND _today >= _last_period.start_date THEN
    _phase := 'Menstruação';
  ELSIF _last_period.end_date IS NOT NULL AND _today BETWEEN _last_period.start_date AND _last_period.end_date THEN
    _phase := 'Menstruação';
  ELSIF _cycle_day BETWEEN _fertile_start AND _fertile_end THEN
    _phase := 'Fértil';
  ELSIF _today >= _pms_start AND _today < _next_period THEN
    _phase := 'TPM';
  ELSIF _cycle_day > _ovulation_day + 1 THEN
    _phase := 'Lútea';
  ELSE
    _phase := 'Folicular';
  END IF;

  _result := jsonb_build_object(
    'shared', true,
    'phase', _phase,
    'next_period', _next_period,
    'cycle_day', _cycle_day,
    'today_badge', CASE
      WHEN _phase = 'Menstruação' THEN 'menstruada'
      WHEN _phase = 'TPM' THEN 'TPM'
      WHEN _phase = 'Fértil' THEN 'fértil'
      ELSE null
    END
  );

  -- If share_level is summary_signals, add bucketed signals (never raw values)
  IF _share_level = 'summary_signals' THEN
    SELECT * INTO _symptoms FROM daily_symptoms
      WHERE user_id = _partner_user_id AND day_key = _today;
    
    IF FOUND THEN
      _result := _result || jsonb_build_object(
        'pain_level', CASE
          WHEN _symptoms.pain_level <= 3 THEN 'baixa'
          WHEN _symptoms.pain_level <= 6 THEN 'media'
          ELSE 'alta'
        END,
        'energy_level', CASE
          WHEN _symptoms.energy_level <= 3 THEN 'baixa'
          WHEN _symptoms.energy_level <= 6 THEN 'media'
          ELSE 'alta'
        END
      );
    END IF;
  END IF;

  RETURN _result;
END;
$function$;

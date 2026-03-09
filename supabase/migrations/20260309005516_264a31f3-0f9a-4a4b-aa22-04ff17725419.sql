-- Recriar schema mínimo/completo para o app DK (Lovable Cloud)

-- ===================== 0) Base helpers =====================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ===================== 1) Core: profiles, couple_spaces, members =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,
  gender text,
  birthday date,
  timezone text DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.couple_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  relationship_start_date date,
  chat_wallpaper_url text,
  chat_wallpaper_opacity numeric NOT NULL DEFAULT 0.30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT couple_spaces_status_check CHECK (status IN ('active','archived'))
);

DROP TRIGGER IF EXISTS update_couple_spaces_updated_at ON public.couple_spaces;
CREATE TRIGGER update_couple_spaces_updated_at
BEFORE UPDATE ON public.couple_spaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_couple_space_id ON public.members(couple_space_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- ===================== 2) Security definer helpers =====================

CREATE OR REPLACE FUNCTION public.current_couple_space_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT couple_space_id
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_couple_space_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT couple_space_id
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE couple_space_id = _couple_space_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.are_users_in_same_couple_space(_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members me
    JOIN public.members other
      ON other.couple_space_id = me.couple_space_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = _other_user_id
  );
$$;

-- ===================== 3) Trigger: limite 2 membros por espaço =====================

CREATE OR REPLACE FUNCTION public.enforce_member_limit_per_couple_space()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count integer;
BEGIN
  PERFORM 1 FROM public.couple_spaces WHERE id = NEW.couple_space_id FOR UPDATE;
  SELECT COUNT(*) INTO member_count FROM public.members WHERE couple_space_id = NEW.couple_space_id;
  IF member_count >= 2 THEN
    RAISE EXCEPTION 'couple_space_full' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_limit_per_couple_space ON public.members;
CREATE TRIGGER trg_enforce_member_limit_per_couple_space
BEFORE INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_member_limit_per_couple_space();

-- ===================== 4) Feature tables =====================

-- Chat messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  image_url text,
  audio_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_edited boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_space_created ON public.messages (couple_space_id, created_at);

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Mood
CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mood_key text NOT NULL,
  mood_percent integer NOT NULL,
  note text,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  emotions text[] NOT NULL DEFAULT '{}',
  activities text[] NOT NULL DEFAULT '{}',
  sleep_quality text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mood_percent_range CHECK (mood_percent >= 0 AND mood_percent <= 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mood_user_day ON public.mood_checkins (user_id, day_key, couple_space_id);
CREATE INDEX IF NOT EXISTS idx_mood_space_day ON public.mood_checkins (couple_space_id, day_key DESC);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  notes text,
  due_date date,
  priority integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'open',
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_space_status_due ON public.tasks (couple_space_id, status, due_date, created_at);

-- Memories
CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  caption text,
  taken_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_photos_space_created ON public.photos (couple_space_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON public.photo_comments (photo_id, created_at);

-- Schedule
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  notes text,
  is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_dow_range CHECK (day_of_week >= 0 AND day_of_week <= 6)
);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_lookup ON public.schedule_blocks (couple_space_id, user_id, day_of_week, start_time);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_lookup ON public.events (couple_space_id, event_date, start_time);

-- Prayer
CREATE TABLE IF NOT EXISTS public.daily_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  prayer_text text NOT NULL,
  verse_ref text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, day_key)
);
CREATE INDEX IF NOT EXISTS idx_daily_prayers_lookup ON public.daily_prayers (couple_space_id, day_key DESC);

CREATE TABLE IF NOT EXISTS public.daily_spiritual_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  prayed_today boolean NOT NULL DEFAULT false,
  cried_today boolean NOT NULL DEFAULT false,
  gratitude_note text,
  reflection_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, user_id, day_key)
);

DROP TRIGGER IF EXISTS update_daily_spiritual_logs_updated_at ON public.daily_spiritual_logs;
CREATE TRIGGER update_daily_spiritual_logs_updated_at
BEFORE UPDATE ON public.daily_spiritual_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Complaints
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  feeling text,
  clear_request text,
  solution_note text,
  severity integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT complaints_severity_check CHECK (severity >= 1 AND severity <= 5)
);
CREATE INDEX IF NOT EXISTS idx_complaints_space_status ON public.complaints (couple_space_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.complaint_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_thread ON public.complaint_messages (complaint_id, created_at);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Routine
CREATE TABLE IF NOT EXISTS public.routine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  emoji text,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_routine_items_updated_at ON public.routine_items;
CREATE TRIGGER update_routine_items_updated_at
BEFORE UPDATE ON public.routine_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.routine_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day date NOT NULL,
  checked_item_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'unlogged',
  completion_rate numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

DROP TRIGGER IF EXISTS update_routine_day_logs_updated_at ON public.routine_day_logs;
CREATE TRIGGER update_routine_day_logs_updated_at
BEFORE UPDATE ON public.routine_day_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Cycle
CREATE TABLE IF NOT EXISTS public.cycle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  share_level text NOT NULL DEFAULT 'private',
  avg_cycle_length integer NOT NULL DEFAULT 28,
  avg_period_length integer NOT NULL DEFAULT 5,
  luteal_length integer NOT NULL DEFAULT 14,
  pms_days integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_cycle_profiles_updated_at ON public.cycle_profiles;
CREATE TRIGGER update_cycle_profiles_updated_at
BEFORE UPDATE ON public.cycle_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.period_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
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

DROP TRIGGER IF EXISTS update_period_entries_updated_at ON public.period_entries;
CREATE TRIGGER update_period_entries_updated_at
BEFORE UPDATE ON public.period_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.daily_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  -- Physical
  nausea boolean NOT NULL DEFAULT false,
  cramps boolean NOT NULL DEFAULT false,
  headache boolean NOT NULL DEFAULT false,
  back_pain boolean NOT NULL DEFAULT false,
  leg_pain boolean NOT NULL DEFAULT false,
  fatigue boolean NOT NULL DEFAULT false,
  dizziness boolean NOT NULL DEFAULT false,
  breast_tenderness boolean NOT NULL DEFAULT false,
  bloating boolean NOT NULL DEFAULT false,
  weakness boolean NOT NULL DEFAULT false,
  -- Emotional
  mood_swings boolean NOT NULL DEFAULT false,
  irritability boolean NOT NULL DEFAULT false,
  anxiety boolean NOT NULL DEFAULT false,
  sadness boolean NOT NULL DEFAULT false,
  sensitivity boolean NOT NULL DEFAULT false,
  crying boolean NOT NULL DEFAULT false,
  -- Digestive
  diarrhea boolean NOT NULL DEFAULT false,
  constipation boolean NOT NULL DEFAULT false,
  gas boolean NOT NULL DEFAULT false,
  -- Skin/Appetite
  acne boolean NOT NULL DEFAULT false,
  cravings boolean NOT NULL DEFAULT false,
  increased_appetite boolean NOT NULL DEFAULT false,
  -- Metrics
  discharge text NOT NULL DEFAULT 'none',
  discharge_type text NOT NULL DEFAULT 'seco',
  libido integer NOT NULL DEFAULT 5,
  temperature_c numeric,
  pain_level integer NOT NULL DEFAULT 0,
  energy_level integer NOT NULL DEFAULT 5,
  stress integer NOT NULL DEFAULT 0,
  sleep_hours numeric,
  sleep_quality text NOT NULL DEFAULT 'ok',
  tpm boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, couple_space_id, day_key)
);

DROP TRIGGER IF EXISTS update_daily_symptoms_updated_at ON public.daily_symptoms;
CREATE TRIGGER update_daily_symptoms_updated_at
BEFORE UPDATE ON public.daily_symptoms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Partner summary RPC
CREATE OR REPLACE FUNCTION public.get_partner_cycle_summary(_partner_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  IF NOT are_users_in_same_couple_space(_partner_user_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _profile FROM cycle_profiles WHERE user_id = _partner_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  _share_level := _profile.share_level;
  IF _share_level = 'private' THEN
    RETURN jsonb_build_object('shared', false);
  END IF;

  SELECT * INTO _last_period
  FROM period_entries
  WHERE user_id = _partner_user_id
  ORDER BY start_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('shared', true, 'phase', 'sem dados', 'next_period', null);
  END IF;

  _next_period := _last_period.start_date + _profile.avg_cycle_length;
  _cycle_day := (_today - _last_period.start_date) + 1;
  _ovulation_day := _profile.avg_cycle_length - _profile.luteal_length;
  _fertile_start := _ovulation_day - 5;
  _fertile_end := _ovulation_day + 1;
  _pms_start := _next_period - _profile.pms_days;

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

  IF _share_level = 'summary_signals' THEN
    SELECT * INTO _symptoms
    FROM daily_symptoms
    WHERE user_id = _partner_user_id AND day_key = _today;

    IF FOUND THEN
      _result := _result || jsonb_build_object(
        'pain_level', CASE WHEN _symptoms.pain_level <= 3 THEN 'baixa' WHEN _symptoms.pain_level <= 6 THEN 'media' ELSE 'alta' END,
        'energy_level', CASE WHEN _symptoms.energy_level <= 3 THEN 'baixa' WHEN _symptoms.energy_level <= 6 THEN 'media' ELSE 'alta' END
      );
    END IF;
  END IF;

  RETURN _result;
END;
$function$;

-- Fasting (alinhado ao código)
CREATE TABLE IF NOT EXISTS public.fasting_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_space_id uuid REFERENCES public.couple_spaces(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  plan_type text NOT NULL,
  until_hour text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  rules_allowed text,
  rules_forbidden text,
  rules_exceptions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_fasting_profiles_updated_at ON public.fasting_profiles;
CREATE TRIGGER update_fasting_profiles_updated_at
BEFORE UPDATE ON public.fasting_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fasting_abstentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.fasting_profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'alimentar',
  label text NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fasting_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.fasting_profiles(id) ON DELETE CASCADE,
  section text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fasting_template_section_check CHECK (section IN ('fazer','evitar'))
);

CREATE TABLE IF NOT EXISTS public.fasting_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.fasting_profiles(id) ON DELETE CASCADE,
  day_key date NOT NULL,
  day_number integer,
  result text,
  mood text,
  note text,
  finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, profile_id, day_key)
);

DROP TRIGGER IF EXISTS update_fasting_day_logs_updated_at ON public.fasting_day_logs;
CREATE TRIGGER update_fasting_day_logs_updated_at
BEFORE UPDATE ON public.fasting_day_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fasting_day_item_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_log_id uuid NOT NULL REFERENCES public.fasting_day_logs(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.fasting_checklist_templates(id) ON DELETE SET NULL,
  label text NOT NULL,
  section text NOT NULL,
  status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fasting_item_section_check CHECK (section IN ('fazer','evitar'))
);

DROP TRIGGER IF EXISTS update_fasting_day_item_logs_updated_at ON public.fasting_day_item_logs;
CREATE TRIGGER update_fasting_day_item_logs_updated_at
BEFORE UPDATE ON public.fasting_day_item_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fasting_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  registar_dia boolean NOT NULL DEFAULT true,
  oracao boolean NOT NULL DEFAULT true,
  hora_terminar boolean NOT NULL DEFAULT false,
  reflexao_noturna boolean NOT NULL DEFAULT false,
  motivacao_dia boolean NOT NULL DEFAULT false,
  alerta_calendario boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_fasting_reminders_updated_at ON public.fasting_reminders;
CREATE TRIGGER update_fasting_reminders_updated_at
BEFORE UPDATE ON public.fasting_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fasting_partner_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  couple_space_id uuid REFERENCES public.couple_spaces(id) ON DELETE SET NULL,
  share_level text NOT NULL DEFAULT 'privado',
  support_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_fasting_partner_shares_updated_at ON public.fasting_partner_shares;
CREATE TRIGGER update_fasting_partner_shares_updated_at
BEFORE UPDATE ON public.fasting_partner_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== 5) RLS (enable + policies) =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_spiritual_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_day_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_abstentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_day_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_day_item_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_partner_shares ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view partner profile"
ON public.profiles
FOR SELECT
USING (public.are_users_in_same_couple_space(public.profiles.user_id));

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Couple spaces
DROP POLICY IF EXISTS "Members can view their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "No direct inserts to couple_spaces" ON public.couple_spaces;

CREATE POLICY "Members can view their couple space"
ON public.couple_spaces
FOR SELECT
USING (public.is_member_of_couple_space(public.couple_spaces.id));

CREATE POLICY "Members can update their couple space"
ON public.couple_spaces
FOR UPDATE
USING (public.is_member_of_couple_space(public.couple_spaces.id));

CREATE POLICY "No direct inserts to couple_spaces"
ON public.couple_spaces
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Members
DROP POLICY IF EXISTS "Members can view members of their space" ON public.members;
DROP POLICY IF EXISTS "Users can insert themselves as member" ON public.members;

CREATE POLICY "Members can view members of their space"
ON public.members
FOR SELECT
USING (public.is_member_of_couple_space(public.members.couple_space_id));

CREATE POLICY "Users can insert themselves as member"
ON public.members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Members can pin messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can delete own messages" ON public.messages;

CREATE POLICY "Members can view messages"
ON public.messages
FOR SELECT
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND sender_user_id = auth.uid());

CREATE POLICY "Sender can update own messages"
ON public.messages
FOR UPDATE
USING (sender_user_id = auth.uid())
WITH CHECK (sender_user_id = auth.uid());

CREATE POLICY "Members can pin messages"
ON public.messages
FOR UPDATE
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Sender can delete own messages"
ON public.messages
FOR DELETE
USING (sender_user_id = auth.uid());

-- Mood
DROP POLICY IF EXISTS "Members can view mood checkins" ON public.mood_checkins;
DROP POLICY IF EXISTS "Users can insert own mood checkin" ON public.mood_checkins;
DROP POLICY IF EXISTS "Users can update own mood checkin" ON public.mood_checkins;

CREATE POLICY "Members can view mood checkins"
ON public.mood_checkins
FOR SELECT
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Users can insert own mood checkin"
ON public.mood_checkins
FOR INSERT
WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

CREATE POLICY "Users can update own mood checkin"
ON public.mood_checkins
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Tasks
DROP POLICY IF EXISTS "Members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can delete tasks" ON public.tasks;

CREATE POLICY "Members can view tasks"
ON public.tasks
FOR SELECT
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

CREATE POLICY "Members can update tasks"
ON public.tasks
FOR UPDATE
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can delete tasks"
ON public.tasks
FOR DELETE
USING (public.is_member_of_couple_space(couple_space_id));

-- Albums/Photos/Comments
DROP POLICY IF EXISTS "Members can view albums" ON public.albums;
DROP POLICY IF EXISTS "Members can create albums" ON public.albums;
DROP POLICY IF EXISTS "Members can update albums" ON public.albums;
DROP POLICY IF EXISTS "Members can delete albums" ON public.albums;

CREATE POLICY "Members can view albums" ON public.albums FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create albums" ON public.albums FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update albums" ON public.albums FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete albums" ON public.albums FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view photos" ON public.photos;
DROP POLICY IF EXISTS "Members can upload photos" ON public.photos;
DROP POLICY IF EXISTS "Members can update photos" ON public.photos;
DROP POLICY IF EXISTS "Members can delete photos" ON public.photos;

CREATE POLICY "Members can view photos" ON public.photos FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can upload photos" ON public.photos FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND uploaded_by = auth.uid());
CREATE POLICY "Members can update photos" ON public.photos FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete photos" ON public.photos FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Members can create comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Members can delete own comments" ON public.photo_comments;

CREATE POLICY "Members can view comments" ON public.photo_comments FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create comments" ON public.photo_comments FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Members can delete own comments" ON public.photo_comments FOR DELETE USING (user_id = auth.uid());

-- Schedule
DROP POLICY IF EXISTS "Members can view schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Members can create schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Members can update schedule blocks" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Members can delete schedule blocks" ON public.schedule_blocks;

CREATE POLICY "Members can view schedule blocks" ON public.schedule_blocks FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create schedule blocks" ON public.schedule_blocks FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Members can update schedule blocks" ON public.schedule_blocks FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete schedule blocks" ON public.schedule_blocks FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view events" ON public.events;
DROP POLICY IF EXISTS "Members can create events" ON public.events;
DROP POLICY IF EXISTS "Members can update events" ON public.events;
DROP POLICY IF EXISTS "Members can delete events" ON public.events;

CREATE POLICY "Members can view events" ON public.events FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create events" ON public.events FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update events" ON public.events FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete events" ON public.events FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

-- Prayer/logs
DROP POLICY IF EXISTS "Members can view prayers" ON public.daily_prayers;
DROP POLICY IF EXISTS "Members can create prayers" ON public.daily_prayers;
DROP POLICY IF EXISTS "Members can update prayers" ON public.daily_prayers;
DROP POLICY IF EXISTS "Members can delete prayers" ON public.daily_prayers;

CREATE POLICY "Members can view prayers" ON public.daily_prayers FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create prayers" ON public.daily_prayers FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update prayers" ON public.daily_prayers FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete prayers" ON public.daily_prayers FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view logs" ON public.daily_spiritual_logs;
DROP POLICY IF EXISTS "Users can insert own log" ON public.daily_spiritual_logs;
DROP POLICY IF EXISTS "Users can update own log" ON public.daily_spiritual_logs;
DROP POLICY IF EXISTS "Users can delete own log" ON public.daily_spiritual_logs;

CREATE POLICY "Members can view logs" ON public.daily_spiritual_logs FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Users can insert own log" ON public.daily_spiritual_logs FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Users can update own log" ON public.daily_spiritual_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own log" ON public.daily_spiritual_logs FOR DELETE USING (user_id = auth.uid());

-- Complaints
DROP POLICY IF EXISTS "Members can view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can update complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can delete complaints" ON public.complaints;

CREATE POLICY "Members can view complaints" ON public.complaints FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create complaints" ON public.complaints FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update complaints" ON public.complaints FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete complaints" ON public.complaints FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view complaint messages" ON public.complaint_messages;
DROP POLICY IF EXISTS "Members can send complaint messages" ON public.complaint_messages;
DROP POLICY IF EXISTS "Members can delete own complaint messages" ON public.complaint_messages;

CREATE POLICY "Members can view complaint messages" ON public.complaint_messages FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can send complaint messages" ON public.complaint_messages FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Members can delete own complaint messages" ON public.complaint_messages FOR DELETE USING (user_id = auth.uid());

-- Push subscriptions
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

-- Routine
DROP POLICY IF EXISTS "Users can view routine items" ON public.routine_items;
DROP POLICY IF EXISTS "Users can manage routine items" ON public.routine_items;

CREATE POLICY "Users can view routine items"
ON public.routine_items
FOR SELECT
USING (user_id = auth.uid() OR public.are_users_in_same_couple_space(user_id));

CREATE POLICY "Users can manage routine items"
ON public.routine_items
FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Users can update own routine items"
ON public.routine_items
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own routine items"
ON public.routine_items
FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view routine logs" ON public.routine_day_logs;
DROP POLICY IF EXISTS "Users can insert routine logs" ON public.routine_day_logs;
DROP POLICY IF EXISTS "Users can update routine logs" ON public.routine_day_logs;
DROP POLICY IF EXISTS "Users can delete routine logs" ON public.routine_day_logs;

CREATE POLICY "Users can view routine logs"
ON public.routine_day_logs
FOR SELECT
USING (user_id = auth.uid() OR public.are_users_in_same_couple_space(user_id));

CREATE POLICY "Users can insert routine logs"
ON public.routine_day_logs
FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Users can update routine logs"
ON public.routine_day_logs
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete routine logs"
ON public.routine_day_logs
FOR DELETE
USING (user_id = auth.uid());

-- Cycle
DROP POLICY IF EXISTS "Owner can view own cycle profile" ON public.cycle_profiles;
DROP POLICY IF EXISTS "Owner can insert own cycle profile" ON public.cycle_profiles;
DROP POLICY IF EXISTS "Owner can update own cycle profile" ON public.cycle_profiles;
DROP POLICY IF EXISTS "Owner can delete own cycle profile" ON public.cycle_profiles;

CREATE POLICY "Owner can view own cycle profile" ON public.cycle_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own cycle profile" ON public.cycle_profiles FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Owner can update own cycle profile" ON public.cycle_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own cycle profile" ON public.cycle_profiles FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can view own period entries" ON public.period_entries;
DROP POLICY IF EXISTS "Owner can insert own period entries" ON public.period_entries;
DROP POLICY IF EXISTS "Owner can update own period entries" ON public.period_entries;
DROP POLICY IF EXISTS "Owner can delete own period entries" ON public.period_entries;

CREATE POLICY "Owner can view own period entries" ON public.period_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own period entries" ON public.period_entries FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Owner can update own period entries" ON public.period_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own period entries" ON public.period_entries FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can view own daily symptoms" ON public.daily_symptoms;
DROP POLICY IF EXISTS "Owner can insert own daily symptoms" ON public.daily_symptoms;
DROP POLICY IF EXISTS "Owner can update own daily symptoms" ON public.daily_symptoms;
DROP POLICY IF EXISTS "Owner can delete own daily symptoms" ON public.daily_symptoms;

CREATE POLICY "Owner can view own daily symptoms" ON public.daily_symptoms FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own daily symptoms" ON public.daily_symptoms FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Owner can update own daily symptoms" ON public.daily_symptoms FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own daily symptoms" ON public.daily_symptoms FOR DELETE USING (user_id = auth.uid());

-- Fasting
DROP POLICY IF EXISTS fp_select ON public.fasting_profiles;
DROP POLICY IF EXISTS fp_insert ON public.fasting_profiles;
DROP POLICY IF EXISTS fp_update ON public.fasting_profiles;
DROP POLICY IF EXISTS fp_delete ON public.fasting_profiles;

CREATE POLICY fp_select ON public.fasting_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fp_insert ON public.fasting_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fp_update ON public.fasting_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fp_delete ON public.fasting_profiles FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fa_select ON public.fasting_abstentions;
DROP POLICY IF EXISTS fa_insert ON public.fasting_abstentions;
DROP POLICY IF EXISTS fa_update ON public.fasting_abstentions;
DROP POLICY IF EXISTS fa_delete ON public.fasting_abstentions;

CREATE POLICY fa_select ON public.fasting_abstentions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fa_insert ON public.fasting_abstentions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fa_update ON public.fasting_abstentions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fa_delete ON public.fasting_abstentions FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fct_select ON public.fasting_checklist_templates;
DROP POLICY IF EXISTS fct_insert ON public.fasting_checklist_templates;
DROP POLICY IF EXISTS fct_update ON public.fasting_checklist_templates;
DROP POLICY IF EXISTS fct_delete ON public.fasting_checklist_templates;

CREATE POLICY fct_select ON public.fasting_checklist_templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fct_insert ON public.fasting_checklist_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fct_update ON public.fasting_checklist_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fct_delete ON public.fasting_checklist_templates FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fdl_select ON public.fasting_day_logs;
DROP POLICY IF EXISTS fdl_insert ON public.fasting_day_logs;
DROP POLICY IF EXISTS fdl_update ON public.fasting_day_logs;
DROP POLICY IF EXISTS fdl_delete ON public.fasting_day_logs;

CREATE POLICY fdl_select ON public.fasting_day_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fdl_insert ON public.fasting_day_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fdl_update ON public.fasting_day_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fdl_delete ON public.fasting_day_logs FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fdil_select ON public.fasting_day_item_logs;
DROP POLICY IF EXISTS fdil_insert ON public.fasting_day_item_logs;
DROP POLICY IF EXISTS fdil_update ON public.fasting_day_item_logs;
DROP POLICY IF EXISTS fdil_delete ON public.fasting_day_item_logs;

CREATE POLICY fdil_select ON public.fasting_day_item_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fdil_insert ON public.fasting_day_item_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fdil_update ON public.fasting_day_item_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fdil_delete ON public.fasting_day_item_logs FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fr_select ON public.fasting_reminders;
DROP POLICY IF EXISTS fr_insert ON public.fasting_reminders;
DROP POLICY IF EXISTS fr_update ON public.fasting_reminders;
DROP POLICY IF EXISTS fr_delete ON public.fasting_reminders;

CREATE POLICY fr_select ON public.fasting_reminders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fr_insert ON public.fasting_reminders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fr_update ON public.fasting_reminders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fr_delete ON public.fasting_reminders FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS fps_select ON public.fasting_partner_shares;
DROP POLICY IF EXISTS fps_insert ON public.fasting_partner_shares;
DROP POLICY IF EXISTS fps_update ON public.fasting_partner_shares;
DROP POLICY IF EXISTS fps_delete ON public.fasting_partner_shares;

CREATE POLICY fps_select ON public.fasting_partner_shares
FOR SELECT
USING (user_id = auth.uid() OR (couple_space_id IS NOT NULL AND public.is_member_of_couple_space(couple_space_id)));

CREATE POLICY fps_insert ON public.fasting_partner_shares FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fps_update ON public.fasting_partner_shares FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fps_delete ON public.fasting_partner_shares FOR DELETE USING (user_id = auth.uid());

-- ===================== 6) Realtime publication (best-effort) =====================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_spaces;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_blocks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_prayers;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_spiritual_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== 7) Storage buckets/policies =====================
-- Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', false)
ON CONFLICT (id) DO NOTHING;

-- Policies (drop+create to stay idempotent)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Couple members can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete chat media" ON storage.objects;

CREATE POLICY "Couple members can upload chat media" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat media" ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Owner can delete chat media" ON storage.objects
FOR DELETE
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Members can read memory files" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload memory files" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete memory files" ON storage.objects;

CREATE POLICY "Members can read memory files" ON storage.objects
FOR SELECT
USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can upload memory files" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can delete memory files" ON storage.objects
FOR DELETE
USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

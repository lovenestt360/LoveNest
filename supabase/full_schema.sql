-- ============================================================
-- DK PWA — Schema Completo (para novo projecto Supabase)
-- Colar no SQL Editor e executar
-- ============================================================

-- ===================== 1. CORE: Profiles, Couple Spaces, Members =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  birthday DATE,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.couple_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  relationship_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(couple_space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_couple_space_id ON public.members(couple_space_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- ===================== 2. HELPER FUNCTIONS =====================

CREATE OR REPLACE FUNCTION public.current_couple_space_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT couple_space_id FROM public.members WHERE user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = _couple_space_id AND user_id = auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.are_users_in_same_couple_space(_other_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM public.members me JOIN public.members other ON other.couple_space_id = me.couple_space_id WHERE me.user_id = auth.uid() AND other.user_id = _other_user_id); $$;

CREATE OR REPLACE FUNCTION public.get_user_couple_space_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT couple_space_id FROM public.members WHERE user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.is_member_of_space(_couple_space_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = _couple_space_id AND user_id = _user_id); $$;

-- ===================== 3. TRIGGERS =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN INSERT INTO public.profiles (user_id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Member limit (max 2 per space)
CREATE OR REPLACE FUNCTION public.enforce_member_limit_per_couple_space()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE member_count integer; BEGIN PERFORM 1 FROM public.couple_spaces WHERE id = NEW.couple_space_id FOR UPDATE; SELECT COUNT(*) INTO member_count FROM public.members WHERE couple_space_id = NEW.couple_space_id; IF member_count >= 2 THEN RAISE EXCEPTION 'couple_space_full' USING ERRCODE = 'P0001'; END IF; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_enforce_member_limit_per_couple_space ON public.members;
CREATE TRIGGER trg_enforce_member_limit_per_couple_space BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.enforce_member_limit_per_couple_space();

-- ===================== 4. RLS: Core tables =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view partner profile" ON public.profiles FOR SELECT USING (public.are_users_in_same_couple_space(public.profiles.user_id));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Members can view their couple space" ON public.couple_spaces FOR SELECT USING (public.is_member_of_couple_space(public.couple_spaces.id));
CREATE POLICY "Members can update their couple space" ON public.couple_spaces FOR UPDATE USING (public.is_member_of_couple_space(public.couple_spaces.id));
CREATE POLICY "No direct inserts to couple_spaces" ON public.couple_spaces FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Members can view members of their space" ON public.members FOR SELECT USING (public.is_member_of_couple_space(public.members.couple_space_id));
CREATE POLICY "Users can insert themselves as member" ON public.members FOR INSERT WITH CHECK (user_id = auth.uid());

-- ===================== 5. MESSAGES (Chat) =====================

CREATE TABLE public.messages (
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

CREATE INDEX idx_messages_space_created ON public.messages (couple_space_id, created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.messages FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can send messages" ON public.messages FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND sender_user_id = auth.uid());
CREATE POLICY "Sender can update own messages" ON public.messages FOR UPDATE USING (sender_user_id = auth.uid()) WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "Members can pin messages" ON public.messages FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Sender can delete own messages" ON public.messages FOR DELETE USING (sender_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ===================== 6. MOOD CHECKINS =====================

CREATE TABLE public.mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mood_key text NOT NULL,
  mood_percent integer NOT NULL CHECK (mood_percent >= 0 AND mood_percent <= 100),
  note text,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_mood_user_day ON public.mood_checkins (user_id, day_key, couple_space_id);
CREATE INDEX idx_mood_space_day ON public.mood_checkins (couple_space_id, day_key DESC);
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mood checkins" ON public.mood_checkins FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Users can insert own mood checkin" ON public.mood_checkins FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Users can update own mood checkin" ON public.mood_checkins FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;

-- ===================== 7. TASKS =====================

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  created_by uuid NOT NULL, assigned_to uuid,
  title text NOT NULL, notes text, due_date date,
  priority integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'open',
  done_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_space_status_due ON public.tasks (couple_space_id, status, due_date, created_at);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete tasks" ON public.tasks FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- ===================== 8. MEMORIES (Albums, Photos, Comments) =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can read memory files" ON storage.objects FOR SELECT USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));
CREATE POLICY "Members can upload memory files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));
CREATE POLICY "Members can delete memory files" ON storage.objects FOR DELETE USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

CREATE TABLE public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  title text NOT NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view albums" ON public.albums FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create albums" ON public.albums FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update albums" ON public.albums FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete albums" ON public.albums FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL, file_path text NOT NULL, caption text, taken_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_space_created ON public.photos (couple_space_id, created_at DESC);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view photos" ON public.photos FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can upload photos" ON public.photos FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND uploaded_by = auth.uid());
CREATE POLICY "Members can update photos" ON public.photos FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete photos" ON public.photos FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

CREATE TABLE public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photo_comments_photo ON public.photo_comments (photo_id, created_at);
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view comments" ON public.photo_comments FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create comments" ON public.photo_comments FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Members can delete own comments" ON public.photo_comments FOR DELETE USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_comments;

-- ===================== 9. SCHEDULE & EVENTS =====================

CREATE TABLE public.schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, title text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL, end_time time NOT NULL,
  location text, notes text, is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_schedule_blocks_lookup ON public.schedule_blocks (couple_space_id, user_id, day_of_week, start_time);
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view schedule blocks" ON public.schedule_blocks FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create schedule blocks" ON public.schedule_blocks FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Members can update schedule blocks" ON public.schedule_blocks FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete schedule blocks" ON public.schedule_blocks FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  created_by uuid NOT NULL, title text NOT NULL,
  event_date date NOT NULL, start_time time, end_time time,
  location text, notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_lookup ON public.events (couple_space_id, event_date, start_time);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view events" ON public.events FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create events" ON public.events FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update events" ON public.events FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete events" ON public.events FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- ===================== 10. PRAYER & SPIRITUAL LOGS =====================

CREATE TABLE public.daily_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  prayer_text text NOT NULL, verse_ref text, created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, day_key)
);
ALTER TABLE public.daily_prayers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view prayers" ON public.daily_prayers FOR SELECT USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create prayers" ON public.daily_prayers FOR INSERT WITH CHECK (is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update prayers" ON public.daily_prayers FOR UPDATE USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete prayers" ON public.daily_prayers FOR DELETE USING (is_member_of_couple_space(couple_space_id));
CREATE INDEX idx_daily_prayers_lookup ON public.daily_prayers (couple_space_id, day_key DESC);

CREATE TABLE public.daily_spiritual_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, day_key date NOT NULL DEFAULT CURRENT_DATE,
  prayed_today boolean NOT NULL DEFAULT false, cried_today boolean NOT NULL DEFAULT false,
  gratitude_note text, reflection_note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, user_id, day_key)
);
ALTER TABLE public.daily_spiritual_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view logs" ON public.daily_spiritual_logs FOR SELECT USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Users can insert own log" ON public.daily_spiritual_logs FOR INSERT WITH CHECK (is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Users can update own log" ON public.daily_spiritual_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own log" ON public.daily_spiritual_logs FOR DELETE USING (user_id = auth.uid());
CREATE INDEX idx_daily_spiritual_logs_lookup ON public.daily_spiritual_logs (couple_space_id, day_key DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_prayers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_spiritual_logs;

-- ===================== 11. COMPLAINTS =====================

CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  created_by uuid NOT NULL, title text NOT NULL, description text NOT NULL,
  feeling text, clear_request text, solution_note text,
  severity integer NOT NULL DEFAULT 3, status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  CONSTRAINT complaints_severity_check CHECK (severity >= 1 AND severity <= 5)
);
CREATE INDEX idx_complaints_space_status ON public.complaints (couple_space_id, status, created_at DESC);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view complaints" ON public.complaints FOR SELECT USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create complaints" ON public.complaints FOR INSERT WITH CHECK (is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update complaints" ON public.complaints FOR UPDATE USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete complaints" ON public.complaints FOR DELETE USING (is_member_of_couple_space(couple_space_id));

CREATE TABLE public.complaint_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_complaint_messages_thread ON public.complaint_messages (complaint_id, created_at);
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view complaint messages" ON public.complaint_messages FOR SELECT USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can send complaint messages" ON public.complaint_messages FOR INSERT WITH CHECK (is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Members can delete own complaint messages" ON public.complaint_messages FOR DELETE USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_messages;

-- ===================== 12. PUSH SUBSCRIPTIONS =====================

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, endpoint text NOT NULL, p256dh text NOT NULL, auth text NOT NULL,
  user_agent text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;

-- ===================== 13. CYCLE (Profiles, Periods, Symptoms) =====================

CREATE TABLE public.cycle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  share_level text NOT NULL DEFAULT 'private',
  avg_cycle_length integer NOT NULL DEFAULT 28,
  avg_period_length integer NOT NULL DEFAULT 5,
  luteal_length integer NOT NULL DEFAULT 14,
  pms_days integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cycle_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own cycle profile" ON public.cycle_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own cycle profile" ON public.cycle_profiles FOR INSERT WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));
CREATE POLICY "Owner can update own cycle profile" ON public.cycle_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own cycle profile" ON public.cycle_profiles FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_cycle_profiles_updated_at BEFORE UPDATE ON public.cycle_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.period_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, start_date date NOT NULL, end_date date,
  flow_level text NOT NULL DEFAULT 'medium',
  pain_level integer NOT NULL DEFAULT 0, pms_level integer NOT NULL DEFAULT 0,
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.period_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own period entries" ON public.period_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own period entries" ON public.period_entries FOR INSERT WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));
CREATE POLICY "Owner can update own period entries" ON public.period_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own period entries" ON public.period_entries FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_period_entries_updated_at BEFORE UPDATE ON public.period_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL, day_key date NOT NULL DEFAULT CURRENT_DATE,
  nausea boolean NOT NULL DEFAULT false, cramps boolean NOT NULL DEFAULT false,
  headache boolean NOT NULL DEFAULT false, back_pain boolean NOT NULL DEFAULT false,
  fatigue boolean NOT NULL DEFAULT false, dizziness boolean NOT NULL DEFAULT false,
  breast_tenderness boolean NOT NULL DEFAULT false, mood_swings boolean NOT NULL DEFAULT false,
  acne boolean NOT NULL DEFAULT false, cravings boolean NOT NULL DEFAULT false,
  bloating boolean NOT NULL DEFAULT false, weakness boolean NOT NULL DEFAULT false,
  leg_pain boolean NOT NULL DEFAULT false, increased_appetite boolean NOT NULL DEFAULT false,
  irritability boolean NOT NULL DEFAULT false, anxiety boolean NOT NULL DEFAULT false,
  sadness boolean NOT NULL DEFAULT false, sensitivity boolean NOT NULL DEFAULT false,
  crying boolean NOT NULL DEFAULT false,
  diarrhea boolean NOT NULL DEFAULT false, constipation boolean NOT NULL DEFAULT false,
  gas boolean NOT NULL DEFAULT false,
  discharge text NOT NULL DEFAULT 'none', discharge_type text NOT NULL DEFAULT 'seco',
  libido integer NOT NULL DEFAULT 5, temperature_c numeric,
  pain_level integer NOT NULL DEFAULT 0, energy_level integer NOT NULL DEFAULT 5,
  stress integer NOT NULL DEFAULT 0,
  sleep_hours numeric, sleep_quality text NOT NULL DEFAULT 'ok',
  tpm boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, couple_space_id, day_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_symptoms_user_day ON public.daily_symptoms (user_id, day_key);
ALTER TABLE public.daily_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own daily symptoms" ON public.daily_symptoms FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own daily symptoms" ON public.daily_symptoms FOR INSERT WITH CHECK (user_id = auth.uid() AND is_member_of_couple_space(couple_space_id));
CREATE POLICY "Owner can update own daily symptoms" ON public.daily_symptoms FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own daily symptoms" ON public.daily_symptoms FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_daily_symptoms_updated_at BEFORE UPDATE ON public.daily_symptoms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cycle partner summary RPC
CREATE OR REPLACE FUNCTION public.get_partner_cycle_summary(_partner_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' SET row_security TO 'off'
AS $function$
DECLARE
  _profile cycle_profiles%ROWTYPE; _last_period period_entries%ROWTYPE;
  _cycle_day integer; _phase text; _next_period date; _ovulation_day integer;
  _fertile_start integer; _fertile_end integer; _pms_start date;
  _today date := CURRENT_DATE; _share_level text; _result jsonb;
  _symptoms daily_symptoms%ROWTYPE;
BEGIN
  IF NOT are_users_in_same_couple_space(_partner_user_id) THEN RETURN NULL; END IF;
  SELECT * INTO _profile FROM cycle_profiles WHERE user_id = _partner_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  _share_level := _profile.share_level;
  IF _share_level = 'private' THEN RETURN jsonb_build_object('shared', false); END IF;
  SELECT * INTO _last_period FROM period_entries WHERE user_id = _partner_user_id ORDER BY start_date DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('shared', true, 'phase', 'sem dados', 'next_period', null); END IF;
  _next_period := _last_period.start_date + _profile.avg_cycle_length;
  _cycle_day := (_today - _last_period.start_date) + 1;
  _ovulation_day := _profile.avg_cycle_length - _profile.luteal_length;
  _fertile_start := _ovulation_day - 5; _fertile_end := _ovulation_day + 1;
  _pms_start := _next_period - _profile.pms_days;
  IF _last_period.end_date IS NULL AND _today >= _last_period.start_date THEN _phase := 'Menstruação';
  ELSIF _last_period.end_date IS NOT NULL AND _today BETWEEN _last_period.start_date AND _last_period.end_date THEN _phase := 'Menstruação';
  ELSIF _cycle_day BETWEEN _fertile_start AND _fertile_end THEN _phase := 'Fértil';
  ELSIF _today >= _pms_start AND _today < _next_period THEN _phase := 'TPM';
  ELSIF _cycle_day > _ovulation_day + 1 THEN _phase := 'Lútea';
  ELSE _phase := 'Folicular'; END IF;
  _result := jsonb_build_object('shared', true, 'phase', _phase, 'next_period', _next_period, 'cycle_day', _cycle_day, 'today_badge', CASE WHEN _phase = 'Menstruação' THEN 'menstruada' WHEN _phase = 'TPM' THEN 'TPM' WHEN _phase = 'Fértil' THEN 'fértil' ELSE null END);
  IF _share_level = 'summary_signals' THEN
    SELECT * INTO _symptoms FROM daily_symptoms WHERE user_id = _partner_user_id AND day_key = _today;
    IF FOUND THEN _result := _result || jsonb_build_object('pain_level', CASE WHEN _symptoms.pain_level <= 3 THEN 'baixa' WHEN _symptoms.pain_level <= 6 THEN 'media' ELSE 'alta' END, 'energy_level', CASE WHEN _symptoms.energy_level <= 3 THEN 'baixa' WHEN _symptoms.energy_level <= 6 THEN 'media' ELSE 'alta' END); END IF;
  END IF;
  RETURN _result;
END;
$function$;

-- ===================== 14. STORAGE: Avatars =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===================== 15. STORAGE: Chat Media =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Couple members can upload chat media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view chat media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
CREATE POLICY "Owner can delete chat media" ON storage.objects FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===================== 16. FASTING (Jejum) =====================

CREATE TABLE IF NOT EXISTS fasting_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id uuid REFERENCES couple_spaces(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'Quaresma', plan_type text NOT NULL DEFAULT 'combined',
  until_hour text, start_date date NOT NULL, end_date date NOT NULL,
  total_days int NOT NULL DEFAULT 40,
  rules_allowed text, rules_forbidden text, rules_exceptions text,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fasting_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_select" ON fasting_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fp_insert" ON fasting_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fp_update" ON fasting_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fp_delete" ON fasting_profiles FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS fasting_abstentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'alimentar', title text NOT NULL,
  priority text NOT NULL DEFAULT 'normal', notes text, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fasting_abstentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fa_select" ON fasting_abstentions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fa_insert" ON fasting_abstentions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fa_update" ON fasting_abstentions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fa_delete" ON fasting_abstentions FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS fasting_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT 'fazer', title text NOT NULL,
  sort_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fasting_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fct_select" ON fasting_checklist_templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fct_insert" ON fasting_checklist_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fct_update" ON fasting_checklist_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fct_delete" ON fasting_checklist_templates FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS fasting_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  day_key date NOT NULL, result text NOT NULL DEFAULT 'pendente',
  mood text, notes text, finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_id, day_key)
);
ALTER TABLE fasting_day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fdl_select" ON fasting_day_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fdl_insert" ON fasting_day_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fdl_update" ON fasting_day_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fdl_delete" ON fasting_day_logs FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS fasting_day_item_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_log_id uuid NOT NULL REFERENCES fasting_day_logs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES fasting_checklist_templates(id) ON DELETE SET NULL,
  title text NOT NULL, done boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fasting_day_item_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fdil_select" ON fasting_day_item_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fdil_insert" ON fasting_day_item_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fdil_update" ON fasting_day_item_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fdil_delete" ON fasting_day_item_logs FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS fasting_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, enabled boolean NOT NULL DEFAULT true,
  time_of_day text, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fasting_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_select" ON fasting_reminders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fr_insert" ON fasting_reminders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fr_update" ON fasting_reminders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fr_delete" ON fasting_reminders FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS fasting_partner_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  share_level text NOT NULL DEFAULT 'resumo',
  show_streak boolean NOT NULL DEFAULT true, show_result boolean NOT NULL DEFAULT true,
  show_mood boolean NOT NULL DEFAULT false, support_msg text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fasting_partner_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fps_select" ON fasting_partner_shares FOR SELECT USING (user_id = auth.uid() OR public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "fps_insert" ON fasting_partner_shares FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fps_update" ON fasting_partner_shares FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fps_delete" ON fasting_partner_shares FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================

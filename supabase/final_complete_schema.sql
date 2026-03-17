-- ============================================================
-- LOVE NEST — SCHEMA COMPLETO E DEFINITIVO (V3)
-- Instruções: Cole este script integralmente no SQL Editor do Supabase e execute.
-- ============================================================

-- ===================== 0. EXTENSIONS & SETUP =====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== 1. CORE: Profiles & Spaces =====================

CREATE TABLE IF NOT EXISTS public.couple_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  relationship_start_date DATE,
  house_name TEXT DEFAULT 'LoveNest',
  partner1_name TEXT,
  partner2_name TEXT,
  initials TEXT,
  plan_id TEXT,
  subscription_status TEXT DEFAULT 'trial',
  streak_count INTEGER DEFAULT 0,
  last_streak_date DATE,
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  trial_used BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  chat_wallpaper_url TEXT,
  chat_wallpaper_opacity NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  birthday DATE,
  gender TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(couple_space_id, user_id)
);

-- ===================== 2. HELPER FUNCTIONS =====================

CREATE OR REPLACE FUNCTION public.current_couple_space_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT couple_space_id FROM public.members WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = _couple_space_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.are_users_in_same_couple_space(_other_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members me 
    JOIN public.members other ON other.couple_space_id = me.couple_space_id 
    WHERE me.user_id = auth.uid() AND other.user_id = _other_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (display_name ILIKE '%admin%' OR user_id IN (SELECT id FROM public.admin_users)));
END;
$$;

-- ===================== 3. TRIGGERS =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ===================== 4. CHAT & MESSAGES =====================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  image_url TEXT,
  audio_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 5. MOOD & TASKS =====================

CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mood_key TEXT NOT NULL,
  mood_percent INTEGER NOT NULL CHECK (mood_percent >= 0 AND mood_percent <= 100),
  note TEXT,
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  activities TEXT[] DEFAULT '{}',
  emotions TEXT[] DEFAULT '{}',
  sleep_quality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  created_by UUID NOT NULL, 
  assigned_to UUID,
  title TEXT NOT NULL, 
  notes TEXT, 
  due_date DATE,
  priority INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'open',
  done_at TIMESTAMPTZ, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 6. MEMORIES & STORAGE =====================

CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  title TEXT NOT NULL, 
  created_by UUID NOT NULL, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL, 
  file_path TEXT NOT NULL, 
  caption TEXT, 
  taken_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  user_id UUID NOT NULL, 
  content TEXT NOT NULL, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 7. SCHEDULE & EVENTS =====================

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  user_id UUID NOT NULL, 
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outro',
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL, 
  end_time TIME NOT NULL,
  location TEXT, 
  notes TEXT, 
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  created_by UUID NOT NULL, 
  title TEXT NOT NULL,
  event_date DATE NOT NULL, 
  start_time TIME, 
  end_time TIME,
  location TEXT, 
  notes TEXT, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 8. PRAYER, SPIRITUAL & COMPLAINTS =====================

CREATE TABLE IF NOT EXISTS public.daily_prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  prayer_text TEXT NOT NULL, 
  verse_ref TEXT, 
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, day_key)
);

CREATE TABLE IF NOT EXISTS public.daily_spiritual_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  user_id UUID NOT NULL, 
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  prayed_today BOOLEAN NOT NULL DEFAULT false, 
  cried_today BOOLEAN NOT NULL DEFAULT false,
  gratitude_note TEXT, 
  reflection_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, user_id, day_key)
);

CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  created_by UUID NOT NULL, 
  title TEXT NOT NULL, 
  description TEXT NOT NULL,
  feeling TEXT, 
  clear_request TEXT, 
  solution_note TEXT,
  severity INTEGER NOT NULL DEFAULT 3, 
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), 
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.complaint_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  user_id UUID NOT NULL, 
  content TEXT NOT NULL, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 9. CYCLE TRACKER =====================

CREATE TABLE IF NOT EXISTS public.cycle_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  share_level TEXT NOT NULL DEFAULT 'private',
  avg_cycle_length INTEGER NOT NULL DEFAULT 28,
  avg_period_length INTEGER NOT NULL DEFAULT 5,
  luteal_length INTEGER NOT NULL DEFAULT 14,
  pms_days INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.period_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  user_id UUID NOT NULL, 
  start_date DATE NOT NULL, 
  end_date DATE,
  flow_level TEXT NOT NULL DEFAULT 'medium',
  pain_level INTEGER NOT NULL DEFAULT 0, 
  pms_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), 
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
  user_id UUID NOT NULL, 
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  nausea BOOLEAN NOT NULL DEFAULT false, 
  cramps BOOLEAN NOT NULL DEFAULT false,
  headache BOOLEAN NOT NULL DEFAULT false, 
  back_pain BOOLEAN NOT NULL DEFAULT false,
  fatigue BOOLEAN NOT NULL DEFAULT false, 
  dizziness BOOLEAN NOT NULL DEFAULT false,
  breast_tenderness BOOLEAN NOT NULL DEFAULT false, 
  mood_swings BOOLEAN NOT NULL DEFAULT false,
  acne BOOLEAN NOT NULL DEFAULT false, 
  cravings BOOLEAN NOT NULL DEFAULT false,
  bloating BOOLEAN NOT NULL DEFAULT false, 
  weakness BOOLEAN NOT NULL DEFAULT false,
  leg_pain BOOLEAN NOT NULL DEFAULT false, 
  increased_appetite BOOLEAN NOT NULL DEFAULT false,
  irritability BOOLEAN NOT NULL DEFAULT false, 
  anxiety BOOLEAN NOT NULL DEFAULT false,
  sadness BOOLEAN NOT NULL DEFAULT false, 
  sensitivity BOOLEAN NOT NULL DEFAULT false,
  crying BOOLEAN NOT NULL DEFAULT false,
  diarrhea BOOLEAN NOT NULL DEFAULT false, 
  constipation BOOLEAN NOT NULL DEFAULT false,
  gas BOOLEAN NOT NULL DEFAULT false,
  discharge TEXT NOT NULL DEFAULT 'none', 
  discharge_type TEXT NOT NULL DEFAULT 'seco',
  libido INTEGER NOT NULL DEFAULT 5, 
  temperature_c NUMERIC,
  pain_level INTEGER NOT NULL DEFAULT 0, 
  energy_level INTEGER NOT NULL DEFAULT 5,
  stress INTEGER NOT NULL DEFAULT 0,
  sleep_hours NUMERIC, 
  sleep_quality TEXT NOT NULL DEFAULT 'ok',
  tpm BOOLEAN NOT NULL DEFAULT false, 
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), 
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 10. FASTING (Jejum) =====================

CREATE TABLE IF NOT EXISTS public.fasting_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Quaresma', 
  plan_type TEXT NOT NULL DEFAULT 'combined',
  until_hour TEXT, 
  start_date DATE NOT NULL, 
  end_date DATE NOT NULL,
  total_days INT NOT NULL DEFAULT 40,
  rules_allowed TEXT, 
  rules_forbidden TEXT, 
  rules_exceptions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fasting_abstentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.fasting_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'alimentar', 
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', 
  notes TEXT, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fasting_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.fasting_profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL, 
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0, 
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fasting_day_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.fasting_profiles(id) ON DELETE CASCADE,
  day_key DATE NOT NULL, 
  result TEXT NOT NULL DEFAULT 'pendente',
  day_number INTEGER,
  mood TEXT, 
  note TEXT, 
  finalized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_id, day_key)
);

CREATE TABLE IF NOT EXISTS public.fasting_day_item_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_log_id UUID NOT NULL REFERENCES public.fasting_day_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.fasting_checklist_templates(id) ON DELETE SET NULL,
  label TEXT NOT NULL, 
  status TEXT NOT NULL DEFAULT 'todo', 
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fasting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registar_dia BOOLEAN DEFAULT true,
  hora_terminar BOOLEAN DEFAULT true,
  alerta_calendario BOOLEAN DEFAULT true,
  motivacao_dia BOOLEAN DEFAULT true,
  oracao BOOLEAN DEFAULT true,
  reflexao_noturna BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fasting_partner_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  share_level TEXT NOT NULL DEFAULT 'resumo',
  support_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== 11. LOVE STREAKS & WRAPPED =====================

CREATE TABLE IF NOT EXISTS public.love_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date DATE,
  shield_remaining INTEGER NOT NULL DEFAULT 3,
  shield_monthly_reset DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  partner1_interacted_today BOOLEAN NOT NULL DEFAULT false,
  partner2_interacted_today BOOLEAN NOT NULL DEFAULT false,
  interaction_date DATE,
  level_title TEXT NOT NULL DEFAULT 'Iniciante',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.love_wrapped (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  messages_count INTEGER DEFAULT 0,
  mood_checkins INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  memories_count INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_space_id, user_id, day_key, interaction_type)
);

CREATE TABLE IF NOT EXISTS public.micro_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_text TEXT NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'general',
  points INTEGER NOT NULL DEFAULT 10,
  emoji TEXT DEFAULT '💕',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.micro_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.micro_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_space_id, challenge_id, user_id, day_key)
);

-- ===================== 12. BILLING & ADMIN =====================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  billing_type TEXT DEFAULT 'one_time',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
  plan_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  method TEXT NOT NULL,
  proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number TEXT,
  mpesa_number TEXT,
  emola_number TEXT,
  mkesh_number TEXT,
  account_name TEXT,
  whatsapp_message_template TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ===================== 13. SAAS FEATURES =====================

CREATE TABLE IF NOT EXISTS public.couple_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_capsule_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  unlock_date TIMESTAMPTZ NOT NULL,
  is_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== 14. ROUTINES =====================

CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, title)
);

CREATE TABLE IF NOT EXISTS public.routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time TIME,
  day_of_week INTEGER[], -- 0-6
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.routine_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  day_key DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(item_id, user_id, day_key)
);

-- ===================== 15. PUSH NOTIFICATIONS =====================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- ===================== 16. MISC =====================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.free_mode_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== 17. ROW LEVEL SECURITY (RLS) =====================

-- Enable RLS for ALL tables
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
ALTER TABLE public.love_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_wrapped ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_capsule_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_mode_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view partner profile" ON public.profiles FOR SELECT USING (public.are_users_in_same_couple_space(public.profiles.user_id));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- 2. Couple Spaces
CREATE POLICY "Members can view their couple space" ON public.couple_spaces FOR SELECT USING (public.is_member_of_couple_space(id));
CREATE POLICY "Members can update their couple space" ON public.couple_spaces FOR UPDATE USING (public.is_member_of_couple_space(id));
CREATE POLICY "Public can insert couple spaces" ON public.couple_spaces FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Members
CREATE POLICY "Members can view members of their space" ON public.members FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));
CREATE POLICY "Users can join spaces" ON public.members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 4. Messages
CREATE POLICY "Members can chat" ON public.messages FOR ALL USING (public.is_member_of_couple_space(couple_space_id));

-- 5. Universal Access for Couple Features (Mood, Tasks, Memories, Schedule, etc.)
DO $$ 
DECLARE 
    t text;
    tables_to_protect text[] := ARRAY[
        'mood_checkins', 'tasks', 'albums', 'photos', 'photo_comments', 
        'schedule_blocks', 'events', 'daily_prayers', 'daily_spiritual_logs', 
        'complaints', 'complaint_messages', 'daily_interactions', 
        'micro_challenge_completions', 'payments', 'couple_challenges', 
        'time_capsule_messages', 'love_wrapped', 'push_subscriptions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_protect
    LOOP
        EXECUTE format('CREATE POLICY "Members can manage %I" ON public.%I FOR ALL USING (public.is_member_of_couple_space(couple_space_id))', t, t);
    END LOOP;
END $$;

-- 6. Cycle Data (Stricter)
CREATE POLICY "Owner can manage cycle" ON public.cycle_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner can manage periods" ON public.period_entries FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner can manage symptoms" ON public.daily_symptoms FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Partner summary access" ON public.cycle_profiles FOR SELECT USING (public.are_users_in_same_couple_space(user_id));

-- 7. Fasting
CREATE POLICY "Owner manage fasting" ON public.fasting_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner manage abstentions" ON public.fasting_abstentions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner manage day logs" ON public.fasting_day_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner manage items" ON public.fasting_day_item_logs FOR ALL USING (user_id = auth.uid());

-- 8. Admin Tables
CREATE POLICY "Public select admin_users for auth" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admin setup" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public view announcements" ON public.admin_announcements FOR SELECT USING (active = true);
CREATE POLICY "Admin manage announcements" ON public.admin_announcements FOR ALL USING (public.is_admin());

-- ===================== 18. SEED DATA =====================

INSERT INTO public.micro_challenges (challenge_text, challenge_type, points, emoji) VALUES
  ('Enviem uma mensagem carinhosa um ao outro 💌', 'message', 10, '💌'),
  ('Enviem um emoji de coração no chat ❤️', 'message', 5, '❤️'),
  ('Adicionem uma memória juntos 📸', 'memory', 15, '📸'),
  ('Completem uma tarefa partilhada ✅', 'task', 15, '✅'),
  ('Atualizem o vosso humor de hoje 😊', 'mood', 10, '😊'),
  ('Escrevam uma oração juntos 🙏', 'prayer', 15, '🙏')
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plans (name, price, features) VALUES 
  ('LoveNest Mensal', '500 MZN / Mês', ARRAY['Acesso total às rotinas', 'Notificações diárias', 'Suporte via WhatsApp']),
  ('LoveNest Semestral', '2500 MZN / Semestre', ARRAY['Acesso total às rotinas', 'Notificações diárias', 'Desconto especial']),
  ('LoveNest Lifetime', '10.000 MZN / Único', ARRAY['Acesso vitalício', 'Atualizações grátis', 'Prioridade no suporte'])
ON CONFLICT DO NOTHING;

-- ===================== 19. BUCKETS =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

-- ===================== 20. REALTIME =====================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_announcements;

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================

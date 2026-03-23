-- Smart Notifications System Schema

-- 1. Notification Categories
-- Categories: 'engagement', 'emotion', 'partner', 'system'

-- 2. User Settings for Notifications
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  preferred_hour integer NOT NULL DEFAULT 10, -- Default to 10 AM
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category),
  CONSTRAINT preferred_hour_range CHECK (preferred_hour >= 0 AND preferred_hour <= 23),
  CONSTRAINT category_check CHECK (category IN ('engagement', 'emotion', 'partner', 'system'))
);

-- Index for quick lookup by edge function
CREATE INDEX IF NOT EXISTS idx_notif_settings_user_hour ON public.notification_settings (preferred_hour, enabled);

-- 3. Notification History (To limit spam)
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_history_user_date ON public.notification_history (user_id, sent_at DESC);

-- 4. RLS for notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.notification_settings;
CREATE POLICY "Users can view their own settings"
  ON public.notification_settings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own settings" ON public.notification_settings;
CREATE POLICY "Users can update their own settings"
  ON public.notification_settings FOR UPDATE
  USING (user_id = auth.uid());

-- Allow Admins to bypass RLS for settings/history
DROP POLICY IF EXISTS "Admins bypass RLS notification_settings" ON public.notification_settings;
CREATE POLICY "Admins bypass RLS notification_settings" 
    ON public.notification_settings FOR ALL 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins bypass RLS notification_history" ON public.notification_history;
CREATE POLICY "Admins bypass RLS notification_history" 
    ON public.notification_history FOR ALL 
    USING (public.is_admin());

-- 5. Helper function to get couple activity summary
CREATE OR REPLACE FUNCTION public.get_couple_activity_summary(_couple_space_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_msg timestamptz;
  last_mood timestamptz;
  last_task timestamptz;
  msgs_today integer;
  moods_today integer;
  open_tasks integer;
BEGIN
  -- Last activity dates
  SELECT MAX(created_at) INTO last_msg FROM public.messages WHERE couple_space_id = _couple_space_id;
  SELECT MAX(created_at) INTO last_mood FROM public.mood_checkins WHERE couple_space_id = _couple_space_id;
  SELECT MAX(created_at) INTO last_task FROM public.tasks WHERE couple_space_id = _couple_space_id;

  -- Today's metrics
  SELECT COUNT(*) INTO msgs_today FROM public.messages 
  WHERE couple_space_id = _couple_space_id AND created_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO moods_today FROM public.mood_checkins 
  WHERE couple_space_id = _couple_space_id AND day_key = CURRENT_DATE;

  SELECT COUNT(*) INTO open_tasks FROM public.tasks 
  WHERE couple_space_id = _couple_space_id AND status = 'open';

  RETURN jsonb_build_object(
    'last_message_at', last_msg,
    'last_mood_at', last_mood,
    'last_task_at', last_task,
    'messages_today', msgs_today,
    'moods_today', moods_today,
    'open_tasks_count', open_tasks
  );
END;
$$;

-- 6. Trigger to create default settings for new users (Optional but recommended)
-- For now, we'll handle defaults in the UI or fetch logic.

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

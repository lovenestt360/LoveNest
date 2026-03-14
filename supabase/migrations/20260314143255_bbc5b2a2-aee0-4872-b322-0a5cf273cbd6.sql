
-- LoveWrapped monthly summaries
CREATE TABLE public.love_wrapped (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  messages_count integer NOT NULL DEFAULT 0,
  memories_count integer NOT NULL DEFAULT 0,
  challenges_completed integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  mood_checkins integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(couple_space_id, month, year)
);

ALTER TABLE public.love_wrapped ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their wrapped" ON public.love_wrapped
  FOR SELECT TO authenticated USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Admins bypass RLS love_wrapped" ON public.love_wrapped
  FOR ALL TO public USING (is_admin());

-- Allow edge function (service role) to insert
CREATE POLICY "Service can insert wrapped" ON public.love_wrapped
  FOR INSERT TO public WITH CHECK (true);

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  new_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reward_given boolean NOT NULL DEFAULT false,
  UNIQUE(new_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (referrer_user_id = auth.uid());

CREATE POLICY "Anyone can insert referral" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (new_user_id = auth.uid());

CREATE POLICY "Admins bypass RLS referrals" ON public.referrals
  FOR ALL TO public USING (is_admin());

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing profiles
UPDATE public.profiles SET referral_code = SUBSTRING(md5(random()::text || user_id::text), 1, 8) WHERE referral_code IS NULL;

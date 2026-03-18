-- 2026.03.17 - Referral System implementation
-- Adds referral codes to profiles and implements reward logic.

-- 1. Update profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES auth.users(id);

-- 2. Function to generate a random referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code() 
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Update handle_new_user to generate referral_code and handle referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer_id UUID;
BEGIN
  -- Generate a unique referral code
  LOOP
    ref_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref_code);
  END LOOP;

  -- Check if a referral code was provided in metadata
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    SELECT user_id INTO referrer_id 
    FROM public.profiles 
    WHERE referral_code = (NEW.raw_user_meta_data->>'referred_by_code');
  END IF;

  INSERT INTO public.profiles (user_id, display_name, referral_code, referred_by_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    ref_code,
    referrer_id
  );
  
  RETURN NEW;
END;
$$;

-- 4. Function to reward points (called when a couple space is created/joined)
CREATE OR REPLACE FUNCTION public.award_referral_points(new_user_id UUID, target_space_id UUID)
RETURNS VOID AS $$
DECLARE
  referrer_id UUID;
  referrer_space_id UUID;
BEGIN
  -- Get the person who referred this user
  SELECT referred_by_id INTO referrer_id FROM public.profiles WHERE user_id = new_user_id;
  
  -- If there's a referrer, reward both
  IF referrer_id IS NOT NULL THEN
    -- 1. Reward the invited person's space (100 points)
    INSERT INTO public.love_streaks (couple_space_id, total_points)
    VALUES (target_space_id, 100)
    ON CONFLICT (couple_space_id) DO UPDATE SET total_points = public.love_streaks.total_points + 100;

    -- 2. Reward the referrer's space (50 points)
    SELECT couple_space_id INTO referrer_space_id FROM public.members WHERE user_id = referrer_id LIMIT 1;
    
    IF referrer_space_id IS NOT NULL THEN
      INSERT INTO public.love_streaks (couple_space_id, total_points)
      VALUES (referrer_space_id, 50)
      ON CONFLICT (couple_space_id) DO UPDATE SET total_points = public.love_streaks.total_points + 50;
    END IF;
    
    -- Clear the referral to prevent double dipping
    UPDATE public.profiles SET referred_by_id = NULL WHERE user_id = new_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger to award points when a member is added to a space
-- (Assuming points should be awarded when the house is fully set up or just created)
CREATE OR REPLACE FUNCTION public.on_member_joined_award_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_referral_points(NEW.user_id, NEW.couple_space_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_award_referral_points ON public.members;
CREATE TRIGGER trigger_award_referral_points
  AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.on_member_joined_award_points();

-- 6. Retroactively generate referral codes for existing users
DO $$
DECLARE
    r RECORD;
    new_code TEXT;
BEGIN
    FOR r IN SELECT user_id FROM public.profiles WHERE referral_code IS NULL LOOP
        LOOP
            new_code := generate_referral_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
        END LOOP;
        UPDATE public.profiles SET referral_code = new_code WHERE user_id = r.user_id;
    END LOOP;
END $$;

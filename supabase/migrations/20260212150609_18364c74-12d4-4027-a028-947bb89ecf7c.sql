
-- Add relationship_start_date to couple_spaces table
ALTER TABLE public.couple_spaces ADD COLUMN IF NOT EXISTS relationship_start_date date;

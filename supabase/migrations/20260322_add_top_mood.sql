
-- Add top_mood column to love_wrapped table
ALTER TABLE public.love_wrapped ADD COLUMN IF NOT EXISTS top_mood text;

-- Update existing records if any (optional, but good for consistency)
-- This is hard to do retroactively without complex subqueries, so we leave it as null for old ones.

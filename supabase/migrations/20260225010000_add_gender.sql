-- Add gender column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;

-- Update the TypeScript types
-- (Note: run `npm run types` locally later if needed, but the column is now live)

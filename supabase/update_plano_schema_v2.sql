-- Update Plano Items with extra fields
ALTER TABLE public.plano_items 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- Add index for priority sorting
CREATE INDEX IF NOT EXISTS idx_plano_items_is_important ON public.plano_items(is_important);

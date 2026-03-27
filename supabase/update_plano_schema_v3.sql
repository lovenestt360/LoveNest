-- Update Plano Items with assignment field
ALTER TABLE public.plano_items 
ADD COLUMN IF NOT EXISTS for_whom TEXT DEFAULT 'ambos'; -- 'ambos', 'me', 'partner'

-- Add index to help with filtering
CREATE INDEX IF NOT EXISTS idx_plano_items_for_whom ON public.plano_items(for_whom);

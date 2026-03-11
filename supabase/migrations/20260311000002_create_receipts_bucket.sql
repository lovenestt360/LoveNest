-- 20260311000002_create_receipts_bucket.sql

-- 1. Create the storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the receipts bucket
-- Allow public access to view receipts
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Allow authenticated users to upload receipts
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Allow users to update their own uploads (optional, but good practice)
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
CREATE POLICY "Users can update their own receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts' AND auth.uid() = owner);

-- Allow admins to delete or manage if needed
DROP POLICY IF EXISTS "Admins can manage receipts" ON storage.objects;
CREATE POLICY "Admins can manage receipts"
ON storage.objects FOR ALL
USING (bucket_id = 'receipts' AND public.is_admin());

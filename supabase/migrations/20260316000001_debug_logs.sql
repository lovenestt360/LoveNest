-- Create a simple logging table for Edge Function debugging
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name text NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS but allow inserts from service role (Edge Function)
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own logs (if we add user_id) or just allow all for now while debugging
CREATE POLICY "Enable read for authenticated users" ON public.edge_function_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for service role" ON public.edge_function_logs FOR INSERT WITH CHECK (true);

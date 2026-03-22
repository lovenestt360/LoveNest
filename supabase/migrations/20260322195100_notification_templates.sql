-- Create notification_templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL, -- notif_type
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone (or at least authenticated)
CREATE POLICY "Allow read for authenticated" ON public.notification_templates
    FOR SELECT TO authenticated USING (true);

-- Seed initial templates
INSERT INTO public.notification_templates (key, title, body, type)
VALUES 
    ('chat_inactivity', 'Falta um brilho aqui... 💛', 'Hoje ainda não falaram muito… tudo bem por aí? 💛', 'chat'),
    ('partner_mood', 'Ligação emocional ✨', 'O teu par registou o humor', 'humor'),
    ('streak_reminder', 'Quase lá! 🔥', 'Não deixem o streak cair hoje 🔥', 'streak'),
    ('small_gesture', 'Hora de um mimo 💌', 'Hora de um pequeno gesto 💌', 'chat')
ON CONFLICT (key) DO UPDATE 
SET title = EXCLUDED.title, body = EXCLUDED.body;

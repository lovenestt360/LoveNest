
-- Love Streaks table (per couple_space)
CREATE TABLE public.love_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_streak_date date,
  shield_remaining integer NOT NULL DEFAULT 3,
  shield_monthly_reset date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  partner1_interacted_today boolean NOT NULL DEFAULT false,
  partner2_interacted_today boolean NOT NULL DEFAULT false,
  interaction_date date,
  level_title text NOT NULL DEFAULT 'Iniciante',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.love_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their streak" ON public.love_streaks
  FOR SELECT TO public USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can update their streak" ON public.love_streaks
  FOR UPDATE TO public USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can insert their streak" ON public.love_streaks
  FOR INSERT TO public WITH CHECK (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Admins bypass RLS love_streaks" ON public.love_streaks
  FOR ALL TO public USING (is_admin());

-- Allow public select for ranking (only non-sensitive columns via views)
CREATE POLICY "Public can view streaks for ranking" ON public.love_streaks
  FOR SELECT TO authenticated USING (true);

-- Daily interactions log
CREATE TABLE public.daily_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  interaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(couple_space_id, user_id, day_key, interaction_type)
);

ALTER TABLE public.daily_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view interactions" ON public.daily_interactions
  FOR SELECT TO public USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can insert interactions" ON public.daily_interactions
  FOR INSERT TO public WITH CHECK (is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

-- Micro challenges (daily)
CREATE TABLE public.micro_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_text text NOT NULL,
  challenge_type text NOT NULL DEFAULT 'general',
  points integer NOT NULL DEFAULT 10,
  emoji text DEFAULT '💕',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view micro challenges" ON public.micro_challenges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage micro challenges" ON public.micro_challenges
  FOR ALL TO public USING (is_admin());

-- Micro challenge completions
CREATE TABLE public.micro_challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.micro_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(couple_space_id, challenge_id, user_id, day_key)
);

ALTER TABLE public.micro_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view completions" ON public.micro_challenge_completions
  FOR SELECT TO public USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can insert completions" ON public.micro_challenge_completions
  FOR INSERT TO public WITH CHECK (is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

-- Enable realtime for love_streaks
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_streaks;

-- Seed micro challenges
INSERT INTO public.micro_challenges (challenge_text, challenge_type, points, emoji) VALUES
  ('Enviem uma mensagem carinhosa um ao outro 💌', 'message', 10, '💌'),
  ('Enviem um emoji de coração no chat ❤️', 'message', 5, '❤️'),
  ('Adicionem uma memória juntos 📸', 'memory', 15, '📸'),
  ('Completem uma tarefa partilhada ✅', 'task', 15, '✅'),
  ('Atualizem o vosso humor de hoje 😊', 'mood', 10, '😊'),
  ('Escrevam uma oração juntos 🙏', 'prayer', 15, '🙏'),
  ('Digam 3 coisas que adoram no parceiro 💕', 'message', 20, '💕'),
  ('Planeiem uma atividade para o fim de semana 📅', 'task', 15, '📅'),
  ('Enviem uma mensagem de bom dia ☀️', 'message', 10, '☀️'),
  ('Partilhem uma memória favorita do casal 🌟', 'memory', 15, '🌟'),
  ('Façam um elogio sincero ao parceiro 🥰', 'message', 10, '🥰'),
  ('Completem um desafio de casal juntos 🏆', 'challenge', 20, '🏆'),
  ('Registem como se sentem hoje no humor 📝', 'mood', 10, '📝'),
  ('Enviem uma música que vos faz lembrar do parceiro 🎵', 'message', 10, '🎵'),
  ('Façam algo novo juntos hoje 🎯', 'adventure', 20, '🎯');

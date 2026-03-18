-- 2026.03.17 - Update Tasks and Ranking UI
-- 1. Add house_image to couple_spaces
ALTER TABLE public.couple_spaces ADD COLUMN IF NOT EXISTS house_image TEXT;

-- 2. Clear old challenges to insert updated ones with 15-30 points range
TRUNCATE TABLE public.micro_challenges CASCADE;

-- 3. Insert new, clearer and action-oriented challenges
INSERT INTO public.micro_challenges (challenge_text, challenge_type, points, emoji) VALUES
  ('Enviem um "Amo-te" no chat hoje 💌', 'message', 20, '💌'),
  ('Registem o vosso humor de hoje 😊', 'mood', 15, '😊'),
  ('Adicionem uma foto nova às memórias 📸', 'memory', 30, '📸'),
  ('Completem uma tarefa da vossa lista ✅', 'task', 20, '✅'),
  ('Escrevam uma oração curta juntos 🙏', 'prayer', 25, '🙏'),
  ('Digam 3 coisas que apreciam um no outro 🥰', 'message', 30, '🥰'),
  ('Partilhem um versículo que vos inspire 📖', 'message', 20, '📖'),
  ('Planeiem um encontro para esta semana 📅', 'task', 25, '📅'),
  ('Enviem um sticker ou emoji especial ❤️', 'message', 15, '❤️'),
  ('Revisitem uma memória antiga juntos 🌟', 'memory', 20, '🌟'),
  ('Façam um elogio surpresa ao parceiro ✨', 'message', 15, '✨'),
  ('Bebam um café ou chá juntos com calma ☕', 'adventure', 25, '☕'),
  ('Dêem um abraço de 20 segundos 🤗', 'adventure', 20, '🤗'),
  ('Partilhem uma música que vos defina 🎵', 'message', 15, '🎵'),
  ('Orem um pelo outro em silêncio 🤫', 'prayer', 30, '🤫');

-- 4. Ensure existing streaks have a level_title if missing (safety check)
UPDATE public.love_streaks SET level_title = 'Iniciante' WHERE level_title IS NULL;

-- Seed missions for LoveStreak system (Corrected schema)
-- Schema: title, description, emoji, points_reward, category
INSERT INTO public.love_missions (title, description, emoji, points_reward, category)
VALUES 
    ('Mensagem Carinhosa', 'Envia uma mensagem especial ou um elogio inesperado para o teu par agora mesmo.', '💌', 15, 'conexao'),
    ('Partilha de Humor', 'Diz ao teu par como te sentes hoje através da aba de Humor.', '😊', 10, 'conexao'),
    ('Memória Preciosa', 'Regista uma foto ou um momento especial que viveram recentemente.', '📸', 20, 'cuidado'),
    ('Oração em Casal', 'Tira 5 minutos para rezar um pelo outro ou em conjunto.', '🙏', 25, 'espiritual'),
    ('Gesto de Carinho', 'Faz um pequeno favor ou surpresa para o teu par durante o dia.', '🎁', 15, 'cuidado'),
    ('Planeamento Juntos', 'Conversem sobre um plano ou sonho para o vosso próximo encontro.', '🗺️', 10, 'conexao'),
    ('Agradecimento', 'Diz algo pelo qual és grato(a) na vossa relação hoje.', '✨', 15, 'espiritual')
ON CONFLICT (id) DO NOTHING;
-- Note: ON CONFLICT DO NOTHING without specifying conflict columns or an index is slightly risky but here we want to avoid duplicates if ID is same.
-- Given it is a seed, simple INSERT is usually fine.

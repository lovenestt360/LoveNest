-- Seed missions for LoveStreak system
INSERT INTO public.love_missions (title, description, reward_points)
VALUES 
    ('Mensagem Carinhosa', 'Envia uma mensagem especial ou um elogio inesperado para o teu par agora mesmo.', 15),
    ('Partilha de Humor', 'Diz ao teu par como te sentes hoje através da aba de Humor.', 10),
    ('Memória Preciosa', 'Regista uma foto ou um momento especial que viveram recentemente.', 20),
    ('Oração em Casal', 'Tira 5 minutos para rezar um pelo outro ou em conjunto.', 25),
    ('Gesto de Carinho', 'Faz um pequeno favor ou surpresa para o teu par durante o dia.', 15),
    ('Planeamento Juntos', 'Conversem sobre um plano ou sonho para o vosso próximo encontro.', 10),
    ('Agradecimento', 'Diz algo pelo qual és grato(a) na vossa relação hoje.', 15)
ON CONFLICT DO NOTHING;

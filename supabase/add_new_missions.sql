-- Add variety to love_missions
INSERT INTO public.love_missions (title, description, emoji, points_reward, category)
VALUES 
    ('Música do Momento', 'Partilha o link de uma música que te lembre o teu par no Chat.', '🎵', 15, 'conexao'),
    ('Elogio Sincero', 'Diz algo que admiras na personalidade do teu amor hoje.', '✨', 10, 'conexao'),
    ('Próximo Encontro', 'Sugerir um sítio novo para irem jantar ou passear no próximo fim de semana.', '🗺️', 10, 'conexao'),
    ('Amo-te Espontâneo', 'Não esperes por nada, diz "Amo-te" de uma forma criativa agora!', '❤️', 15, 'conexao'),
    ('Lanche Surpresa', 'Prepara ou encomenda um miminho para o teu par (mesmo que virtualmente).', '☕', 20, 'cuidado'),
    ('Foto Antiga', 'Encontra e partilha uma foto vossa de há mais de 1 ano.', '🕰️', 20, 'cuidado'),
    ('Mensagem de Voz', 'Envia um áudio de 15 segundos a dizer o que mais gostaste no dia de hoje.', '🎤', 15, 'conexao'),
    ('Abraço Virtual', 'Envia um GIF ou sticker que represente o abraço que gostarias de dar agora.', '🫂', 10, 'conexao')
ON CONFLICT (title) DO NOTHING;

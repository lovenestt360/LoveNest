-- ══════════════════════════════════════════════════════════════════════════
-- 2026-09-11 (parte 4) — pwa_tutorial_settings tinha uma policy antiga
-- "Enable all for all" (roles: public, USING true, WITH CHECK true) que
-- ficou esquecida de uma fase de protótipo. Como as policies do RLS se
-- SOMAM (não substituem), esta sozinha já deixava qualquer visitante —
-- mesmo sem sessão — inserir, atualizar ou apagar linhas desta tabela,
-- tornando as policies de is_admin() da migration anterior irrelevantes
-- para quem quisesse escrever diretamente.
--
-- "Enable read for all" (SELECT público) fica: a tabela só guarda URLs de
-- vídeo do tutorial PWA e é lida antes do login (PWATutorialContext.tsx
-- monta para visitantes não autenticados), por isso leitura pública é
-- inofensiva e necessária.
-- ══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Enable all for all" ON public.pwa_tutorial_settings;

NOTIFY pgrst, 'reload schema';

SELECT 'pwa_tutorial_settings: escrita pública fechada ✓' AS resultado;

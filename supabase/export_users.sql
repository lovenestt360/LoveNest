-- ============================================================
-- EXPORTAR DADOS DO SUPABASE ANTIGO (Lovable)
-- Corre isto no SQL Editor do Lovable e copia o resultado
-- ============================================================

-- Este script gera INSERT statements para cada tabela
-- Copia TUDO o que sair e cola no SQL Editor do novo Supabase

-- ===== 1. USERS (auth.users) =====
SELECT 'INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(COALESCE(instance_id::text, '00000000-0000-0000-0000-000000000000')) || ', ' ||
  quote_literal(COALESCE(aud, 'authenticated')) || ', ' ||
  quote_literal(COALESCE(role, 'authenticated')) || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(COALESCE(encrypted_password, '')) || ', ' ||
  COALESCE(quote_literal(email_confirmed_at::text), 'now()') || ', ' ||
  quote_literal(COALESCE(raw_app_meta_data::text, '{}')) || '::jsonb, ' ||
  quote_literal(COALESCE(raw_user_meta_data::text, '{}')) || '::jsonb, ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  quote_literal(COALESCE(confirmation_token, '')) || ', ' ||
  quote_literal(COALESCE(recovery_token, '')) || ', ' ||
  quote_literal(COALESCE(email_change_token_new, '')) || ', ' ||
  quote_literal(COALESCE(email_change, '')) ||
  ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM auth.users;

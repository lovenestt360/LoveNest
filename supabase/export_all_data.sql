-- ============================================================
-- EXPORTAR TODOS OS DADOS DO SUPABASE ANTIGO (Lovable)
-- ============================================================
-- INSTRUÇÕES:
-- 1. Abre o SQL Editor do Lovable (antigo)
-- 2. Cola este script inteiro e clica "Run"
-- 3. Copia TODO o resultado (coluna sql_statement)
-- 4. Cola no SQL Editor do NOVO Supabase e clica "Run"
-- ============================================================

-- ===== AUTH.USERS =====
SELECT 'INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES (' ||
  quote_literal(id) || '::uuid, ' ||
  quote_literal(COALESCE(instance_id::text, '00000000-0000-0000-0000-000000000000')) || '::uuid, ' ||
  quote_literal(COALESCE(aud, 'authenticated')) || ', ' ||
  quote_literal(COALESCE(role, 'authenticated')) || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(COALESCE(encrypted_password, '')) || ', ' ||
  COALESCE(quote_literal(email_confirmed_at::text) || '::timestamptz', 'now()') || ', ' ||
  quote_literal(COALESCE(raw_app_meta_data::text, '{"provider":"email","providers":["email"]}')) || '::jsonb, ' ||
  quote_literal(COALESCE(raw_user_meta_data::text, '{}')) || '::jsonb, ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  quote_literal(updated_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement FROM auth.users

UNION ALL SELECT '-- ===== AUTH.IDENTITIES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(COALESCE(identity_data::text, '{}')) || '::jsonb, ' ||
  quote_literal(COALESCE(provider, 'email')) || ', ' ||
  quote_literal(COALESCE(provider_id, '')) || ', ' ||
  COALESCE(quote_literal(last_sign_in_at::text) || '::timestamptz', 'now()') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  quote_literal(updated_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM auth.identities

UNION ALL SELECT '-- ===== PROFILES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.profiles (user_id, display_name, avatar_url, birthday, timezone, created_at, updated_at) VALUES (' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  COALESCE(quote_literal(display_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(avatar_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(birthday::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(timezone), '''America/Sao_Paulo''') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  quote_literal(updated_at::text) || '::timestamptz' ||
  ') ON CONFLICT (user_id) DO NOTHING;'
FROM public.profiles

UNION ALL SELECT '-- ===== COUPLE_SPACES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.couple_spaces (id, invite_code, status, relationship_start_date, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(invite_code) || ', ' ||
  quote_literal(COALESCE(status, 'active')) || ', ' ||
  COALESCE(quote_literal(relationship_start_date::text) || '::date', 'NULL') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.couple_spaces

UNION ALL SELECT '-- ===== MEMBERS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.members (id, couple_space_id, user_id, joined_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(joined_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.members

UNION ALL SELECT '-- ===== MESSAGES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.messages (id, couple_space_id, sender_user_id, content, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(sender_user_id::text) || '::uuid, ' ||
  quote_literal(content) || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.messages

UNION ALL SELECT '-- ===== MOOD_CHECKINS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.mood_checkins (id, couple_space_id, user_id, mood_key, mood_percent, note, day_key, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(mood_key) || ', ' ||
  mood_percent || ', ' ||
  COALESCE(quote_literal(note), 'NULL') || ', ' ||
  quote_literal(day_key::text) || '::date, ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.mood_checkins

UNION ALL SELECT '-- ===== TASKS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.tasks (id, couple_space_id, created_by, assigned_to, title, notes, due_date, priority, status, done_at, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(created_by::text) || '::uuid, ' ||
  COALESCE(quote_literal(assigned_to::text) || '::uuid', 'NULL') || ', ' ||
  quote_literal(title) || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(due_date::text) || '::date', 'NULL') || ', ' ||
  priority || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(done_at::text) || '::timestamptz', 'NULL') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.tasks

UNION ALL SELECT '-- ===== ALBUMS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.albums (id, couple_space_id, title, created_by, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(title) || ', ' ||
  quote_literal(created_by::text) || '::uuid, ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.albums

UNION ALL SELECT '-- ===== PHOTOS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.photos (id, couple_space_id, album_id, uploaded_by, file_path, caption, taken_on, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  COALESCE(quote_literal(album_id::text) || '::uuid', 'NULL') || ', ' ||
  quote_literal(uploaded_by::text) || '::uuid, ' ||
  quote_literal(file_path) || ', ' ||
  COALESCE(quote_literal(caption), 'NULL') || ', ' ||
  COALESCE(quote_literal(taken_on::text) || '::date', 'NULL') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.photos

UNION ALL SELECT '-- ===== PHOTO_COMMENTS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.photo_comments (id, photo_id, couple_space_id, user_id, content, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(photo_id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(content) || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.photo_comments

UNION ALL SELECT '-- ===== SCHEDULE_BLOCKS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.schedule_blocks (id, couple_space_id, user_id, title, category, day_of_week, start_time, end_time, location, notes, is_recurring, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(title) || ', ' ||
  quote_literal(category) || ', ' ||
  day_of_week || ', ' ||
  quote_literal(start_time::text) || '::time, ' ||
  quote_literal(end_time::text) || '::time, ' ||
  COALESCE(quote_literal(location), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  is_recurring || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.schedule_blocks

UNION ALL SELECT '-- ===== EVENTS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.events (id, couple_space_id, created_by, title, event_date, start_time, end_time, location, notes, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(created_by::text) || '::uuid, ' ||
  quote_literal(title) || ', ' ||
  quote_literal(event_date::text) || '::date, ' ||
  COALESCE(quote_literal(start_time::text) || '::time', 'NULL') || ', ' ||
  COALESCE(quote_literal(end_time::text) || '::time', 'NULL') || ', ' ||
  COALESCE(quote_literal(location), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.events

UNION ALL SELECT '-- ===== DAILY_PRAYERS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.daily_prayers (id, couple_space_id, day_key, prayer_text, verse_ref, created_by, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(day_key::text) || '::date, ' ||
  quote_literal(prayer_text) || ', ' ||
  COALESCE(quote_literal(verse_ref), 'NULL') || ', ' ||
  quote_literal(created_by::text) || '::uuid, ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.daily_prayers

UNION ALL SELECT '-- ===== DAILY_SPIRITUAL_LOGS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.daily_spiritual_logs (id, couple_space_id, user_id, day_key, prayed_today, cried_today, gratitude_note, reflection_note, updated_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(day_key::text) || '::date, ' ||
  prayed_today || ', ' ||
  cried_today || ', ' ||
  COALESCE(quote_literal(gratitude_note), 'NULL') || ', ' ||
  COALESCE(quote_literal(reflection_note), 'NULL') || ', ' ||
  quote_literal(updated_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.daily_spiritual_logs

UNION ALL SELECT '-- ===== COMPLAINTS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.complaints (id, couple_space_id, created_by, title, description, feeling, clear_request, solution_note, severity, status, created_at, resolved_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(created_by::text) || '::uuid, ' ||
  quote_literal(title) || ', ' ||
  quote_literal(description) || ', ' ||
  COALESCE(quote_literal(feeling), 'NULL') || ', ' ||
  COALESCE(quote_literal(clear_request), 'NULL') || ', ' ||
  COALESCE(quote_literal(solution_note), 'NULL') || ', ' ||
  severity || ', ' ||
  quote_literal(status) || ', ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  COALESCE(quote_literal(resolved_at::text) || '::timestamptz', 'NULL') ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.complaints

UNION ALL SELECT '-- ===== COMPLAINT_MESSAGES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.complaint_messages (id, complaint_id, couple_space_id, user_id, content, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(complaint_id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(content) || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.complaint_messages

UNION ALL SELECT '-- ===== CYCLE_PROFILES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.cycle_profiles (id, user_id, couple_space_id, share_level, avg_cycle_length, avg_period_length, luteal_length, pms_days, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(COALESCE(share_level, 'private')) || ', ' ||
  avg_cycle_length || ', ' ||
  avg_period_length || ', ' ||
  luteal_length || ', ' ||
  COALESCE(pms_days::text, '5') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  quote_literal(updated_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.cycle_profiles

UNION ALL SELECT '-- ===== PERIOD_ENTRIES =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.period_entries (id, couple_space_id, user_id, start_date, end_date, flow_level, pain_level, pms_level, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(start_date::text) || '::date, ' ||
  COALESCE(quote_literal(end_date::text) || '::date', 'NULL') || ', ' ||
  quote_literal(flow_level) || ', ' ||
  pain_level || ', ' ||
  pms_level || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz, ' ||
  quote_literal(updated_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.period_entries

UNION ALL SELECT '-- ===== PUSH_SUBSCRIPTIONS =====' AS sql_statement

UNION ALL
SELECT 'INSERT INTO public.push_subscriptions (id, couple_space_id, user_id, endpoint, p256dh, auth, user_agent, created_at) VALUES (' ||
  quote_literal(id::text) || '::uuid, ' ||
  quote_literal(couple_space_id::text) || '::uuid, ' ||
  quote_literal(user_id::text) || '::uuid, ' ||
  quote_literal(endpoint) || ', ' ||
  quote_literal(p256dh) || ', ' ||
  quote_literal(auth) || ', ' ||
  COALESCE(quote_literal(user_agent), 'NULL') || ', ' ||
  quote_literal(created_at::text) || '::timestamptz' ||
  ') ON CONFLICT (id) DO NOTHING;'
FROM public.push_subscriptions

UNION ALL SELECT '-- ===== FIM DA EXPORTAÇÃO =====' AS sql_statement;

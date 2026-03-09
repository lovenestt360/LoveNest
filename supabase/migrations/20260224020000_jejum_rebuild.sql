-- ================================================================
-- Módulo Jejum (Páscoa) — Schema completo
-- ================================================================

-- 1. Plano de jejum do utilizador
CREATE TABLE IF NOT EXISTS fasting_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id uuid REFERENCES couple_spaces(id) ON DELETE CASCADE,
  plan_name       text NOT NULL DEFAULT 'Quaresma',
  plan_type       text NOT NULL DEFAULT 'combined',
  -- plan_type: 'partial'|'until_hour'|'daniel'|'digital'|'combined'
  until_hour      text,          -- ex: '12:00', '15:00', '18:00'
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  total_days      int  NOT NULL DEFAULT 40,
  rules_allowed   text,
  rules_forbidden text,
  rules_exceptions text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fasting_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_profiles_own" ON fasting_profiles
  USING (user_id = auth.uid());
CREATE POLICY "fasting_profiles_insert" ON fasting_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_profiles_update" ON fasting_profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fasting_profiles_delete" ON fasting_profiles
  FOR DELETE USING (user_id = auth.uid());

-- 2. Abstenções pessoais
CREATE TABLE IF NOT EXISTS fasting_abstentions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  category        text NOT NULL,
  -- category: 'alimentar'|'comportamental'|'digital'
  label           text NOT NULL,
  priority        text NOT NULL DEFAULT 'media',
  -- priority: 'alta'|'media'|'baixa'
  note            text,
  sort_order      int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fasting_abstentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_abstentions_own" ON fasting_abstentions
  USING (user_id = auth.uid());
CREATE POLICY "fasting_abstentions_insert" ON fasting_abstentions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_abstentions_update" ON fasting_abstentions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fasting_abstentions_delete" ON fasting_abstentions
  FOR DELETE USING (user_id = auth.uid());

-- 3. Templates de itens de checklist
CREATE TABLE IF NOT EXISTS fasting_checklist_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  section     text NOT NULL,
  -- section: 'fazer'|'evitar'
  label       text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fasting_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_templates_own" ON fasting_checklist_templates
  USING (user_id = auth.uid());
CREATE POLICY "fasting_templates_insert" ON fasting_checklist_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_templates_update" ON fasting_checklist_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fasting_templates_delete" ON fasting_checklist_templates
  FOR DELETE USING (user_id = auth.uid());

-- 4. Registo diário
CREATE TABLE IF NOT EXISTS fasting_day_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES fasting_profiles(id) ON DELETE CASCADE,
  day_key     date NOT NULL,      -- YYYY-MM-DD
  day_number  int,                -- ex: 12 (de 40)
  result      text,               -- 'cumprido'|'parcial'|'falhei'
  mood        text,               -- 'otimo'|'bom'|'neutro'|'mau'
  note        text,
  finalized   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_id, day_key)
);

ALTER TABLE fasting_day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_day_logs_own" ON fasting_day_logs
  USING (user_id = auth.uid());
CREATE POLICY "fasting_day_logs_insert" ON fasting_day_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_day_logs_update" ON fasting_day_logs
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fasting_day_logs_delete" ON fasting_day_logs
  FOR DELETE USING (user_id = auth.uid());

-- 5. Estado de cada item da checklist por dia
CREATE TABLE IF NOT EXISTS fasting_day_item_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_log_id   uuid NOT NULL REFERENCES fasting_day_logs(id) ON DELETE CASCADE,
  template_id  uuid REFERENCES fasting_checklist_templates(id) ON DELETE SET NULL,
  label        text NOT NULL,
  section      text NOT NULL,
  status       text NOT NULL DEFAULT 'pendente',
  -- status: 'consegui'|'falhei'|'pulei'|'pendente'
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fasting_day_item_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_item_logs_own" ON fasting_day_item_logs
  USING (user_id = auth.uid());
CREATE POLICY "fasting_item_logs_insert" ON fasting_day_item_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_item_logs_update" ON fasting_day_item_logs
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fasting_item_logs_delete" ON fasting_day_item_logs
  FOR DELETE USING (user_id = auth.uid());

-- 6. Configuração de lembretes
CREATE TABLE IF NOT EXISTS fasting_reminders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  registar_dia          boolean NOT NULL DEFAULT false,
  oracao                boolean NOT NULL DEFAULT false,
  hora_terminar         boolean NOT NULL DEFAULT false,
  reflexao_noturna      boolean NOT NULL DEFAULT false,
  motivacao_dia         boolean NOT NULL DEFAULT false,
  alerta_calendario     boolean NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fasting_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_reminders_own" ON fasting_reminders
  USING (user_id = auth.uid());
CREATE POLICY "fasting_reminders_insert" ON fasting_reminders
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_reminders_update" ON fasting_reminders
  FOR UPDATE USING (user_id = auth.uid());

-- 7. Partilha com o par
CREATE TABLE IF NOT EXISTS fasting_partner_shares (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id uuid REFERENCES couple_spaces(id) ON DELETE CASCADE,
  share_level     text NOT NULL DEFAULT 'privado',
  -- share_level: 'privado'|'streak'|'checklist'
  support_message text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fasting_partner_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fasting_shares_own" ON fasting_partner_shares
  USING (user_id = auth.uid());
CREATE POLICY "fasting_shares_partner" ON fasting_partner_shares
  FOR SELECT USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "fasting_shares_insert" ON fasting_partner_shares
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fasting_shares_update" ON fasting_partner_shares
  FOR UPDATE USING (user_id = auth.uid());

-- LoveNest Notifications V2
-- Persist immediate-notification preferences so push delivery respects the
-- user's choices across browsers and future native clients.

BEGIN;

ALTER TABLE public.notification_settings
  DROP CONSTRAINT IF EXISTS category_check;

ALTER TABLE public.notification_settings
  ADD CONSTRAINT category_check CHECK (
    category IN (
      'engagement', 'emotion', 'partner', 'system',
      'ciclo_lembrete', 'ciclo_menstruacao', 'ciclo_fertil',
      'chat', 'humor', 'plano', 'memorias', 'oracao', 'conflitos',
      'ciclo_par', 'biblioteca', 'location'
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;

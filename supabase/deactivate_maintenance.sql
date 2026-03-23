-- DEACTIVATE ALL MAINTENANCE ANNOUNCEMENTS
UPDATE public.admin_announcements
SET active = false
WHERE title ILIKE '%manutencao%' OR content ILIKE '%manutencao%';

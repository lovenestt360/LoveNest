-- Disable specific notification templates to stop automated spam
UPDATE public.notification_templates
SET is_active = false
WHERE key IN ('mission_reminder', 'chat_inactivity', 'streak_reminder');

-- Clean up any scheduled rule executions if necessary (optional)
-- DELETE FROM public.notification_history WHERE sent_at > NOW() - INTERVAL '1 hour';

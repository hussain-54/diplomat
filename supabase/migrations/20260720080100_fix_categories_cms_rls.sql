-- Fix RLS for Categories CMS tables (re-runnable if columns/tables already exist).
-- Use app_hidden.has_permission — there is no public.has_permission.

ALTER TABLE public.category_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_module_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS category_activity_logs_staff ON public.category_activity_logs;
CREATE POLICY category_activity_logs_staff ON public.category_activity_logs
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'categories:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'categories:manage'));

DROP POLICY IF EXISTS category_module_settings_staff ON public.category_module_settings;
CREATE POLICY category_module_settings_staff ON public.category_module_settings
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'categories:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'categories:manage'));

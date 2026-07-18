-- Expanded newsroom settings: SEO defaults, integrations, notifications, security tables.
-- Apply after comment moderation migrations.

ALTER TABLE public.newsroom_settings
  ADD COLUMN IF NOT EXISTS seo_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newsroom_settings_seo_defaults_object'
  ) THEN
    ALTER TABLE public.newsroom_settings
      ADD CONSTRAINT newsroom_settings_seo_defaults_object
      CHECK (jsonb_typeof(seo_defaults) = 'object');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newsroom_settings_integrations_object'
  ) THEN
    ALTER TABLE public.newsroom_settings
      ADD CONSTRAINT newsroom_settings_integrations_object
      CHECK (jsonb_typeof(integrations) = 'object');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newsroom_settings_notification_prefs_object'
  ) THEN
    ALTER TABLE public.newsroom_settings
      ADD CONSTRAINT newsroom_settings_notification_prefs_object
      CHECK (jsonb_typeof(notification_prefs) = 'object');
  END IF;
END
$$;

UPDATE public.newsroom_settings
SET
  seo_defaults = COALESCE(seo_defaults, '{}'::jsonb) || jsonb_build_object(
    'meta_description', 'Independent reporting and analysis on diplomacy, geopolitics, embassies, and international affairs.',
    'title_template', '%s — Diplomacy Lens',
    'default_og_image_url', '',
    'robots_index', true,
    'robots_follow', true,
    'schema_type', 'NewsArticle',
    'twitter_card', 'summary_large_image',
    'sitemap_enabled', true,
    'rss_enabled', true
  ),
  integrations = COALESCE(integrations, '{}'::jsonb) || jsonb_build_object(
    'google_analytics_id', '',
    'google_search_console_meta', '',
    'google_ad_manager_network_code', '',
    'facebook', '',
    'linkedin', '',
    'twitter', '',
    'telegram', '',
    'whatsapp', '',
    'instagram', '',
    'youtube', ''
  ),
  notification_prefs = COALESCE(notification_prefs, '{}'::jsonb) || jsonb_build_object(
    'email_on_comment_pending', true,
    'email_on_article_review', true,
    'email_on_publish', false,
    'email_digest_daily', false,
    'notify_security_alerts', true
  )
WHERE id IS TRUE;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(trim(action)) BETWEEN 1 AND 120),
  entity_type text NOT NULL CHECK (char_length(trim(entity_type)) BETWEEN 1 AND 80),
  entity_id text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
  ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
  ON public.admin_audit_logs(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr text NOT NULL CHECK (char_length(trim(cidr)) BETWEEN 3 AND 64),
  label text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_ip_whitelist_cidr_unique UNIQUE (cidr)
);

CREATE TABLE IF NOT EXISTS public.admin_backup_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Manual checkpoint',
  notes text,
  status text NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('recorded', 'verified', 'failed')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_backup_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings managers read audit logs" ON public.admin_audit_logs;
CREATE POLICY "settings managers read audit logs"
ON public.admin_audit_logs FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'settings:manage'));

DROP POLICY IF EXISTS "settings managers write audit logs" ON public.admin_audit_logs;
CREATE POLICY "settings managers write audit logs"
ON public.admin_audit_logs FOR INSERT TO authenticated
WITH CHECK (app_hidden.has_permission(auth.uid(), 'settings:manage'));

DROP POLICY IF EXISTS "settings managers manage ip whitelist" ON public.admin_ip_whitelist;
CREATE POLICY "settings managers manage ip whitelist"
ON public.admin_ip_whitelist FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'settings:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'settings:manage'));

DROP POLICY IF EXISTS "settings managers manage backups" ON public.admin_backup_records;
CREATE POLICY "settings managers manage backups"
ON public.admin_backup_records FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'settings:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'settings:manage'));

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_ip_whitelist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_backup_records TO authenticated;

-- Enterprise newsroom CMS foundation.

DO $$ BEGIN
  CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL CHECK (bucket IN ('article-hero', 'avatars')),
  object_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type LIKE 'image/%'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  alt_text text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_created_idx
ON public.media_assets(created_at DESC);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 2 AND 80),
  author_email text NOT NULL CHECK (char_length(trim(author_email)) BETWEEN 5 AND 254),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 2 AND 4000),
  status public.comment_status NOT NULL DEFAULT 'pending',
  moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_status_created_idx
ON public.comments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_article_idx
ON public.comments(article_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.article_daily_metrics (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT current_date,
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (article_id, metric_date)
);

CREATE INDEX IF NOT EXISTS article_daily_metrics_date_idx
ON public.article_daily_metrics(metric_date DESC);

CREATE TABLE IF NOT EXISTS public.newsroom_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  publication_name text NOT NULL DEFAULT 'Diplomacy Lens',
  short_name text NOT NULL DEFAULT 'DL',
  tagline text NOT NULL DEFAULT 'Global affairs. Clear perspective.',
  contact_email text,
  timezone text NOT NULL DEFAULT 'UTC',
  default_article_status public.article_status NOT NULL DEFAULT 'draft',
  comments_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.newsroom_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsroom_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsroom reads media" ON public.media_assets;
CREATE POLICY "newsroom reads media"
ON public.media_assets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "newsroom uploads media" ON public.media_assets;
CREATE POLICY "newsroom uploads media"
ON public.media_assets FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "owners and editors update media" ON public.media_assets;
CREATE POLICY "owners and editors update media"
ON public.media_assets FOR UPDATE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  uploaded_by = auth.uid()
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "owners and editors delete media" ON public.media_assets;
CREATE POLICY "owners and editors delete media"
ON public.media_assets FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "public reads approved comments" ON public.comments;
CREATE POLICY "public reads approved comments"
ON public.comments FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS "editors read all comments" ON public.comments;
CREATE POLICY "editors read all comments"
ON public.comments FOR SELECT TO authenticated
USING (
  app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "public submits comments" ON public.comments;
CREATE POLICY "public submits comments"
ON public.comments FOR INSERT
WITH CHECK (
  status = 'pending'
  AND moderated_by IS NULL
  AND moderated_at IS NULL
  AND COALESCE((SELECT comments_enabled FROM public.newsroom_settings WHERE id = true), false)
);

DROP POLICY IF EXISTS "editors moderate comments" ON public.comments;
CREATE POLICY "editors moderate comments"
ON public.comments FOR UPDATE TO authenticated
USING (
  app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "editors delete comments" ON public.comments;
CREATE POLICY "editors delete comments"
ON public.comments FOR DELETE TO authenticated
USING (
  app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "editors read analytics" ON public.article_daily_metrics;
CREATE POLICY "editors read analytics"
ON public.article_daily_metrics FOR SELECT TO authenticated
USING (
  app_hidden.has_role(auth.uid(), 'section_editor')
  OR app_hidden.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "public reads newsroom settings" ON public.newsroom_settings;
CREATE POLICY "public reads newsroom settings"
ON public.newsroom_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "super admins update newsroom settings" ON public.newsroom_settings;
CREATE POLICY "super admins update newsroom settings"
ON public.newsroom_settings FOR ALL TO authenticated
USING (app_hidden.has_role(auth.uid(), 'super_admin'))
WITH CHECK (app_hidden.has_role(auth.uid(), 'super_admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT INSERT ON public.comments TO anon;
GRANT SELECT (id, article_id, author_name, body, created_at, status) ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.article_daily_metrics TO authenticated;
GRANT SELECT ON public.newsroom_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.newsroom_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_article_view(p_article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.articles
    WHERE id = p_article_id AND status = 'published'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.article_daily_metrics (article_id, metric_date, views)
  VALUES (p_article_id, current_date, 1)
  ON CONFLICT (article_id, metric_date)
  DO UPDATE SET views = public.article_daily_metrics.views + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_article_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_article_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_newsroom_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS newsroom_settings_touch ON public.newsroom_settings;
CREATE TRIGGER newsroom_settings_touch
BEFORE UPDATE ON public.newsroom_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_newsroom_settings();

NOTIFY pgrst, 'reload schema';

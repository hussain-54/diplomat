-- Categories CMS module: extend sections + activity logs + module settings.

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS category_type text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS seo_score int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS topic_cluster text,
  ADD COLUMN IF NOT EXISTS search_intent text,
  ADD COLUMN IF NOT EXISTS semantic_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS entities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_score int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS news_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS news_sitemap boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS news_priority int DEFAULT 5,
  ADD COLUMN IF NOT EXISTS breaking_news boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'CollectionPage',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS default_author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_mode text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS discover_eligible boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS sections_featured_idx ON public.sections (featured, sort_order);
CREATE INDEX IF NOT EXISTS sections_updated_at_idx ON public.sections (updated_at DESC);
CREATE INDEX IF NOT EXISTS sections_seo_score_idx ON public.sections (seo_score DESC);

CREATE OR REPLACE FUNCTION public.sections_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sections_updated_at ON public.sections;
CREATE TRIGGER sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.sections_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.category_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  ip text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS category_activity_logs_section_idx
  ON public.category_activity_logs (section_id, created_at DESC);
CREATE INDEX IF NOT EXISTS category_activity_logs_actor_idx
  ON public.category_activity_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS category_activity_logs_action_idx
  ON public.category_activity_logs (action, created_at DESC);

CREATE TABLE IF NOT EXISTS public.category_module_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  general jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  advanced jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.category_module_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.category_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_module_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS category_activity_logs_staff ON public.category_activity_logs;
CREATE POLICY category_activity_logs_staff ON public.category_activity_logs
  FOR ALL
  USING (public.has_permission(auth.uid(), 'categories:manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'categories:manage'));

DROP POLICY IF EXISTS category_module_settings_staff ON public.category_module_settings;
CREATE POLICY category_module_settings_staff ON public.category_module_settings
  FOR ALL
  USING (public.has_permission(auth.uid(), 'categories:manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'categories:manage'));

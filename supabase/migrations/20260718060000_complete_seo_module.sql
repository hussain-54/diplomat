-- Complete per-article SEO controls.
-- Apply after 20260718050000_complete_article_management.sql.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS robots_index boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_follow boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS schema_type text NOT NULL DEFAULT 'NewsArticle',
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS twitter_card text NOT NULL DEFAULT 'summary_large_image',
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS twitter_image_url text,
  ADD COLUMN IF NOT EXISTS rss_inclusion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hreflang jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_schema_type_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_schema_type_check
      CHECK (schema_type IN ('NewsArticle', 'Article', 'Review', 'Report'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_twitter_card_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_twitter_card_check
      CHECK (twitter_card IN ('summary', 'summary_large_image'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_hreflang_object_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_hreflang_object_check
      CHECK (jsonb_typeof(hreflang) = 'object');
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS articles_public_sitemap_idx
  ON public.articles (published_at DESC)
  WHERE status = 'published' AND robots_index = true;

CREATE OR REPLACE FUNCTION public.admin_update_article_seo(
  p_article_id uuid,
  p_seo_title text DEFAULT NULL,
  p_meta_description text DEFAULT NULL,
  p_focus_keyword text DEFAULT NULL,
  p_canonical_url text DEFAULT NULL,
  p_robots_index boolean DEFAULT true,
  p_robots_follow boolean DEFAULT true,
  p_schema_type text DEFAULT 'NewsArticle',
  p_og_title text DEFAULT NULL,
  p_og_description text DEFAULT NULL,
  p_og_image_url text DEFAULT NULL,
  p_twitter_card text DEFAULT 'summary_large_image',
  p_twitter_title text DEFAULT NULL,
  p_twitter_description text DEFAULT NULL,
  p_twitter_image_url text DEFAULT NULL,
  p_rss_inclusion boolean DEFAULT true,
  p_hreflang jsonb DEFAULT '{}'::jsonb
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.articles;
  result public.articles;
  may_edit boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing
  FROM public.articles
  WHERE id = p_article_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002';
  END IF;

  may_edit :=
    (
      app_hidden.has_permission(uid, 'articles:edit_all')
      AND existing.section_id IS NOT NULL
      AND app_hidden.can_edit_section(uid, existing.section_id)
    )
    OR (
      existing.author_id = uid
      AND app_hidden.has_permission(uid, 'articles:edit_own')
      AND existing.status IN ('draft', 'review')
    )
    OR (
      app_hidden.has_role(uid, 'fact_checker')
      AND existing.status IN ('draft', 'review')
    );

  IF NOT may_edit THEN
    RAISE EXCEPTION 'Editing permission required' USING ERRCODE = '42501';
  END IF;

  IF p_schema_type NOT IN ('NewsArticle', 'Article', 'Review', 'Report') THEN
    RAISE EXCEPTION 'Unsupported schema type' USING ERRCODE = '22023';
  END IF;

  IF p_twitter_card NOT IN ('summary', 'summary_large_image') THEN
    RAISE EXCEPTION 'Unsupported Twitter card type' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_hreflang, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'hreflang must be a JSON object' USING ERRCODE = '22023';
  END IF;

  UPDATE public.articles
  SET
    seo_title = NULLIF(trim(COALESCE(p_seo_title, '')), ''),
    meta_description = NULLIF(trim(COALESCE(p_meta_description, '')), ''),
    focus_keyword = NULLIF(trim(COALESCE(p_focus_keyword, '')), ''),
    canonical_url = NULLIF(trim(COALESCE(p_canonical_url, '')), ''),
    robots_index = COALESCE(p_robots_index, true),
    robots_follow = COALESCE(p_robots_follow, true),
    schema_type = p_schema_type,
    og_title = NULLIF(trim(COALESCE(p_og_title, '')), ''),
    og_description = NULLIF(trim(COALESCE(p_og_description, '')), ''),
    og_image_url = NULLIF(trim(COALESCE(p_og_image_url, '')), ''),
    twitter_card = p_twitter_card,
    twitter_title = NULLIF(trim(COALESCE(p_twitter_title, '')), ''),
    twitter_description = NULLIF(trim(COALESCE(p_twitter_description, '')), ''),
    twitter_image_url = NULLIF(trim(COALESCE(p_twitter_image_url, '')), ''),
    rss_inclusion = COALESCE(p_rss_inclusion, true),
    hreflang = COALESCE(p_hreflang, '{}'::jsonb)
  WHERE id = p_article_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_article_seo(
  uuid, text, text, text, text, boolean, boolean, text, text, text, text,
  text, text, text, text, boolean, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_update_article_seo(
  uuid, text, text, text, text, boolean, boolean, text, text, text, text,
  text, text, text, text, boolean, jsonb
) TO authenticated;

NOTIFY pgrst, 'reload schema';

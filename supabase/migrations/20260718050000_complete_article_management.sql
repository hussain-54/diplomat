-- Complete article workflow, revision history, and atomic bulk management.

CREATE TABLE IF NOT EXISTS public.article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, version)
);

CREATE INDEX IF NOT EXISTS article_revisions_article_changed_idx
ON public.article_revisions(article_id, changed_at DESC);

ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitted staff read article revisions" ON public.article_revisions;
CREATE POLICY "permitted staff read article revisions"
ON public.article_revisions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.articles article
    WHERE article.id = article_id
      AND (
        article.author_id = auth.uid()
        OR (
          app_hidden.has_role(auth.uid(), 'fact_checker')
          AND article.status IN ('draft', 'review')
        )
        OR (
          article.section_id IS NOT NULL
          AND app_hidden.has_permission(auth.uid(), 'articles:edit_all')
          AND app_hidden.can_edit_section(auth.uid(), article.section_id)
        )
      )
  )
);

GRANT SELECT ON public.article_revisions TO authenticated;
GRANT ALL ON public.article_revisions TO service_role;

CREATE OR REPLACE FUNCTION public.capture_article_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO public.article_revisions (
      article_id,
      version,
      snapshot,
      changed_by
    )
    VALUES (
      OLD.id,
      COALESCE((
        SELECT max(revision.version) + 1
        FROM public.article_revisions revision
        WHERE revision.article_id = OLD.id
      ), 1),
      to_jsonb(OLD),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_article_revision() FROM PUBLIC;

DROP TRIGGER IF EXISTS articles_capture_revision ON public.articles;
CREATE TRIGGER articles_capture_revision
BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.capture_article_revision();

-- Draft authors and fact checkers may only leave an article in Draft or Review.
-- Scheduling, publishing, and archiving require publishing permission.
DROP POLICY IF EXISTS "authorized create articles" ON public.articles;
CREATE POLICY "authorized create articles"
ON public.articles FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND app_hidden.has_permission(auth.uid(), 'articles:create')
  AND (
    status IN ('draft', 'review')
    OR (
      status IN ('scheduled', 'published', 'archived')
      AND section_id IS NOT NULL
      AND app_hidden.has_permission(auth.uid(), 'articles:publish')
      AND app_hidden.can_edit_section(auth.uid(), section_id)
    )
  )
);

DROP POLICY IF EXISTS "authorized update articles" ON public.articles;
CREATE POLICY "authorized update articles"
ON public.articles FOR UPDATE TO authenticated
USING (
  (
    section_id IS NOT NULL
    AND app_hidden.has_permission(auth.uid(), 'articles:edit_all')
    AND app_hidden.can_edit_section(auth.uid(), section_id)
  )
  OR (
    app_hidden.has_role(auth.uid(), 'fact_checker')
    AND status IN ('draft', 'review')
  )
  OR (
    author_id = auth.uid()
    AND app_hidden.has_permission(auth.uid(), 'articles:edit_own')
    AND status IN ('draft', 'review')
  )
)
WITH CHECK (
  (
    section_id IS NOT NULL
    AND app_hidden.has_permission(auth.uid(), 'articles:edit_all')
    AND app_hidden.can_edit_section(auth.uid(), section_id)
  )
  OR (
    status IN ('draft', 'review')
    AND (
      app_hidden.has_role(auth.uid(), 'fact_checker')
      OR (
        author_id = auth.uid()
        AND app_hidden.has_permission(auth.uid(), 'articles:edit_own')
      )
    )
  )
);

-- Add scheduling to the canonical article write RPC.
DROP FUNCTION IF EXISTS public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text,
  public.badge_type, text, text
);

CREATE OR REPLACE FUNCTION public.admin_upsert_article(
  p_title text,
  p_section_id uuid,
  p_status public.article_status DEFAULT 'draft',
  p_id uuid DEFAULT NULL,
  p_deck text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_badge_type public.badge_type DEFAULT 'none',
  p_hero_image_url text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result public.articles;
  existing public.articles;
  v_slug text;
  can_publish boolean;
  can_edit boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(trim(COALESCE(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Title is required' USING ERRCODE = '22023';
  END IF;
  IF p_section_id IS NULL THEN
    RAISE EXCEPTION 'Section is required' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'scheduled' AND (p_scheduled_at IS NULL OR p_scheduled_at <= now()) THEN
    RAISE EXCEPTION 'Scheduled articles require a future publication time'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id, name)
  VALUES (uid, split_part(COALESCE(auth.jwt() ->> 'email', 'staff'), '@', 1))
  ON CONFLICT (id) DO NOTHING;

  can_publish :=
    app_hidden.has_permission(uid, 'articles:publish')
    AND app_hidden.can_edit_section(uid, p_section_id);

  IF p_status IN ('scheduled', 'published', 'archived') AND NOT can_publish THEN
    RAISE EXCEPTION 'Publishing permission required' USING ERRCODE = '42501';
  END IF;

  v_slug := NULLIF(trim(COALESCE(p_slug, '')), '');
  IF v_slug IS NULL THEN
    v_slug := trim(both '-' from lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g')));
    IF v_slug IS NULL OR v_slug = '' THEN
      v_slug := 'post-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    END IF;
    v_slug := left(v_slug, 80);
  END IF;

  IF p_id IS NULL THEN
    IF NOT app_hidden.has_permission(uid, 'articles:create') THEN
      RAISE EXCEPTION 'Article creation permission required' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.articles (
      title, deck, body, section_id, region, badge_type, hero_image_url,
      status, slug, author_id, published_at, scheduled_at
    ) VALUES (
      trim(p_title), p_deck, p_body, p_section_id, p_region,
      COALESCE(p_badge_type, 'none'), p_hero_image_url,
      p_status, v_slug, uid,
      CASE WHEN p_status = 'published' THEN now() ELSE NULL END,
      CASE WHEN p_status = 'scheduled' THEN p_scheduled_at ELSE NULL END
    )
    RETURNING * INTO result;
  ELSE
    SELECT * INTO existing FROM public.articles WHERE id = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002';
    END IF;

    can_edit :=
      (
        app_hidden.has_permission(uid, 'articles:edit_all')
        AND existing.section_id IS NOT NULL
        AND app_hidden.can_edit_section(uid, existing.section_id)
        AND app_hidden.can_edit_section(uid, p_section_id)
      )
      OR (
        app_hidden.has_role(uid, 'fact_checker')
        AND existing.status IN ('draft', 'review')
        AND p_status IN ('draft', 'review')
        AND p_section_id = existing.section_id
      )
      OR (
        existing.author_id = uid
        AND app_hidden.has_permission(uid, 'articles:edit_own')
        AND existing.status IN ('draft', 'review')
        AND p_status IN ('draft', 'review')
      );

    IF NOT can_edit THEN
      RAISE EXCEPTION 'Editing permission required' USING ERRCODE = '42501';
    END IF;

    UPDATE public.articles SET
      title = trim(p_title),
      deck = p_deck,
      body = p_body,
      section_id = p_section_id,
      region = p_region,
      badge_type = COALESCE(p_badge_type, 'none'),
      hero_image_url = p_hero_image_url,
      status = p_status,
      slug = v_slug,
      published_at = CASE
        WHEN p_status = 'published' THEN COALESCE(existing.published_at, now())
        WHEN p_status = 'archived' THEN existing.published_at
        ELSE NULL
      END,
      scheduled_at = CASE
        WHEN p_status = 'scheduled' THEN p_scheduled_at
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text,
  public.badge_type, text, text, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text,
  public.badge_type, text, text, timestamptz
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_bulk_manage_articles(
  p_ids uuid[],
  p_action text,
  p_section_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  article public.articles;
  affected integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(array_length(p_ids, 1), 0) = 0 THEN
    RETURN 0;
  END IF;
  IF p_action NOT IN ('publish', 'archive', 'delete', 'reassign_category') THEN
    RAISE EXCEPTION 'Unsupported bulk action' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'reassign_category' AND p_section_id IS NULL THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;

  FOR article IN
    SELECT * FROM public.articles WHERE id = ANY(p_ids) FOR UPDATE
  LOOP
    IF p_action IN ('publish', 'archive') THEN
      IF article.section_id IS NULL
        OR NOT app_hidden.has_permission(uid, 'articles:publish')
        OR NOT app_hidden.can_edit_section(uid, article.section_id)
      THEN
        RAISE EXCEPTION 'Publishing permission required for article %', article.id
          USING ERRCODE = '42501';
      END IF;

      UPDATE public.articles
      SET status = CASE
            WHEN p_action = 'publish' THEN 'published'::public.article_status
            ELSE 'archived'::public.article_status
          END,
          published_at = CASE
            WHEN p_action = 'publish' THEN COALESCE(published_at, now())
            ELSE published_at
          END,
          scheduled_at = NULL,
          updated_at = now()
      WHERE id = article.id;
    ELSIF p_action = 'delete' THEN
      IF article.section_id IS NULL
        OR NOT app_hidden.has_permission(uid, 'articles:delete')
        OR NOT app_hidden.can_edit_section(uid, article.section_id)
      THEN
        RAISE EXCEPTION 'Delete permission required for article %', article.id
          USING ERRCODE = '42501';
      END IF;

      DELETE FROM public.articles WHERE id = article.id;
    ELSE
      IF article.section_id IS NULL
        OR NOT app_hidden.has_permission(uid, 'articles:edit_all')
        OR NOT app_hidden.can_edit_section(uid, article.section_id)
        OR NOT app_hidden.can_edit_section(uid, p_section_id)
      THEN
        RAISE EXCEPTION 'Category reassignment permission required for article %', article.id
          USING ERRCODE = '42501';
      END IF;

      UPDATE public.articles
      SET section_id = p_section_id, updated_at = now()
      WHERE id = article.id;
    END IF;

    affected := affected + 1;
  END LOOP;

  IF affected <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'One or more articles were not found or visible'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_manage_articles(uuid[], text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bulk_manage_articles(uuid[], text, uuid)
TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

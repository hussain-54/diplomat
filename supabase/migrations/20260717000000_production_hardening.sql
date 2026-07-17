-- Production hardening after the emergency publishing fixes.
-- This migration is environment-neutral: it never promotes a named user.

-- Keep role helpers out of the public API surface.
REVOKE ALL ON SCHEMA app_hidden FROM PUBLIC;
GRANT USAGE ON SCHEMA app_hidden TO authenticated, service_role;

REVOKE ALL ON FUNCTION app_hidden.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_hidden.can_edit_section(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_hidden.can_edit_section(uuid, uuid) TO authenticated, service_role;

-- Public visitors should only evaluate the simple active-ticker policy.
DROP POLICY IF EXISTS "ticker public read active" ON public.ticker_items;
CREATE POLICY "ticker public read active"
ON public.ticker_items
FOR SELECT
USING (active);

DROP POLICY IF EXISTS "editors read all ticker" ON public.ticker_items;
CREATE POLICY "editors read all ticker"
ON public.ticker_items
FOR SELECT
TO authenticated
USING (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
);

DROP POLICY IF EXISTS "authors view own drafts" ON public.articles;
CREATE POLICY "authors view own drafts"
ON public.articles
FOR SELECT
TO authenticated
USING (
  author_id = auth.uid()
  OR app_hidden.has_role(auth.uid(), 'super_admin')
  OR (
    section_id IS NOT NULL
    AND app_hidden.can_edit_section(auth.uid(), section_id)
  )
);

-- Make storage setup reproducible from migrations and enforce upload limits.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('article-hero', 'article-hero', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id IN ('article-hero', 'avatars');

-- Final canonical publishing RPC, independent of hidden helper execution.
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
  p_slug text DEFAULT NULL
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result public.articles;
  v_slug text;
  existing public.articles;
  can_publish boolean;
  can_edit boolean;
  is_super boolean;
  is_section_editor boolean;
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
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'No newsroom role assigned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, name)
  VALUES (uid, split_part(COALESCE(auth.jwt() ->> 'email', 'editor'), '@', 1))
  ON CONFLICT (id) DO NOTHING;

  is_super := EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'super_admin'
  );
  is_section_editor := EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'section_editor'
  );
  can_publish :=
    is_super
    OR is_section_editor
    OR EXISTS (
      SELECT 1 FROM public.editor_section_access
      WHERE profile_id = uid AND section_id = p_section_id
    );

  IF p_status = 'published' AND NOT can_publish THEN
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

  IF p_id IS NOT NULL THEN
    SELECT * INTO existing FROM public.articles WHERE id = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002';
    END IF;

    can_edit :=
      is_super
      OR is_section_editor
      OR EXISTS (
        SELECT 1 FROM public.editor_section_access
        WHERE profile_id = uid AND section_id = COALESCE(p_section_id, existing.section_id)
      )
      OR (
        existing.author_id = uid
        AND existing.status <> 'published'
        AND p_status <> 'published'
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
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO result;
  ELSE
    INSERT INTO public.articles (
      title, deck, body, section_id, region, badge_type, hero_image_url,
      status, slug, author_id, published_at
    ) VALUES (
      trim(p_title), p_deck, p_body, p_section_id, p_region,
      COALESCE(p_badge_type, 'none'), p_hero_image_url,
      p_status, v_slug, uid,
      CASE WHEN p_status = 'published' THEN now() ELSE NULL END
    )
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removing_super_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    removing_super_admin := OLD.role = 'super_admin';
  ELSE
    removing_super_admin := OLD.role = 'super_admin' AND NEW.role <> 'super_admin';
  END IF;

  IF removing_super_admin AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE role = 'super_admin' AND id <> OLD.id
     )
  THEN
    RAISE EXCEPTION 'At least one super admin is required' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_super_admin ON public.user_roles;
CREATE TRIGGER protect_last_super_admin
BEFORE DELETE OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_super_admin_removal();

NOTIFY pgrst, 'reload schema';

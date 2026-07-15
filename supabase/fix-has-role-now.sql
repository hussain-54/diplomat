-- Quick fix for: permission denied for function has_role
-- Run this entire script in Supabase SQL Editor.

GRANT USAGE ON SCHEMA app_hidden TO PUBLIC;
GRANT USAGE ON SCHEMA app_hidden TO anon, authenticated, service_role, postgres;

GRANT EXECUTE ON FUNCTION app_hidden.has_role(uuid, public.app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.has_role(uuid, public.app_role) TO anon, authenticated, service_role, postgres;

GRANT EXECUTE ON FUNCTION app_hidden.can_edit_section(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.can_edit_section(uuid, uuid) TO anon, authenticated, service_role, postgres;

-- Recreate publish RPC without calling has_role (uses direct table checks)
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
  v_published_at timestamptz;
  existing public.articles;
  can_publish boolean;
  can_edit boolean;
  is_super boolean;
  is_section_editor boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'No newsroom role assigned';
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
    RAISE EXCEPTION 'Contributors cannot publish. Need super_admin or section_editor.';
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
      RAISE EXCEPTION 'Article not found';
    END IF;

    can_edit :=
      is_super
      OR is_section_editor
      OR EXISTS (
        SELECT 1 FROM public.editor_section_access
        WHERE profile_id = uid AND section_id = COALESCE(p_section_id, existing.section_id)
      )
      OR (existing.author_id = uid AND existing.status <> 'published' AND p_status <> 'published');

    IF NOT can_edit THEN
      RAISE EXCEPTION 'You cannot edit this article';
    END IF;

    v_published_at := CASE
      WHEN p_status = 'published' THEN COALESCE(existing.published_at, now())
      ELSE NULL
    END;

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
      published_at = v_published_at,
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

ALTER FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'hussaindurrani92@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

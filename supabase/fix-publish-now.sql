-- FULL FIX: grants + policies + RPC publish + promote admin + reload API cache
-- Run entire script in Supabase SQL Editor (project for this app).

-- 0) Schema / table grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA app_hidden TO authenticated, service_role;

GRANT SELECT ON TABLE public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.articles TO authenticated;
GRANT ALL ON TABLE public.articles TO service_role;

GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT SELECT ON TABLE public.editor_section_access TO authenticated;
GRANT SELECT ON TABLE public.sections TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT EXECUTE ON FUNCTION app_hidden.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_hidden.can_edit_section(uuid, uuid) TO authenticated, service_role;

-- 1) Section edit helper
CREATE OR REPLACE FUNCTION app_hidden.can_edit_section(_user_id uuid, _section_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_hidden.has_role(_user_id,'super_admin')
      OR app_hidden.has_role(_user_id,'section_editor')
      OR EXISTS(SELECT 1 FROM public.editor_section_access WHERE profile_id = _user_id AND section_id = _section_id);
$$;

-- 2) Article RLS policies
DROP POLICY IF EXISTS "authorized create articles" ON public.articles;
CREATE POLICY "authorized create articles" ON public.articles FOR INSERT WITH CHECK (
  (author_id = auth.uid()) AND (
    app_hidden.has_role(auth.uid(), 'super_admin')
    OR app_hidden.has_role(auth.uid(), 'section_editor')
    OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
    OR (app_hidden.has_role(auth.uid(), 'contributor') AND status = 'draft'::public.article_status)
  )
);

DROP POLICY IF EXISTS "authorized update articles" ON public.articles;
CREATE POLICY "authorized update articles" ON public.articles FOR UPDATE
USING (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
  OR ((author_id = auth.uid()) AND (status <> 'published'::public.article_status))
)
WITH CHECK (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
  OR ((author_id = auth.uid()) AND (status <> 'published'::public.article_status))
);

DROP POLICY IF EXISTS "authorized delete articles" ON public.articles;
CREATE POLICY "authorized delete articles" ON public.articles FOR DELETE USING (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
);

-- 3) Reliable publish RPC (bypasses table privilege quirks; still enforces roles)
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
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'No newsroom role assigned' USING ERRCODE = '42501';
  END IF;

  -- ensure profile row exists (FK for author_id)
  INSERT INTO public.profiles (id, name)
  VALUES (uid, split_part(COALESCE(auth.jwt() ->> 'email', 'editor'), '@', 1))
  ON CONFLICT (id) DO NOTHING;

  can_publish :=
    app_hidden.has_role(uid, 'super_admin')
    OR app_hidden.has_role(uid, 'section_editor')
    OR EXISTS (
      SELECT 1 FROM public.editor_section_access
      WHERE profile_id = uid AND section_id = p_section_id
    );

  IF p_status = 'published' AND NOT can_publish THEN
    RAISE EXCEPTION 'Contributors cannot publish. Need super_admin or section_editor.'
      USING ERRCODE = '42501';
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
      app_hidden.has_role(uid, 'super_admin')
      OR app_hidden.has_role(uid, 'section_editor')
      OR EXISTS (
        SELECT 1 FROM public.editor_section_access
        WHERE profile_id = uid AND section_id = COALESCE(p_section_id, existing.section_id)
      )
      OR (existing.author_id = uid AND existing.status <> 'published' AND p_status <> 'published');

    IF NOT can_edit THEN
      RAISE EXCEPTION 'You cannot edit this article' USING ERRCODE = '42501';
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

GRANT EXECUTE ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) TO authenticated;

-- 4) Promote admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'hussaindurrani92@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, name)
SELECT id, split_part(email, '@', 1)
FROM auth.users
WHERE email = 'hussaindurrani92@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 5) Reload PostgREST so grants/functions take effect immediately
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 6) Verify (should show your email + super_admin, and INSERT privilege)
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'hussaindurrani92@gmail.com';

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'articles'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- Central permission matrix and database-enforced newsroom RBAC.

CREATE OR REPLACE FUNCTION app_hidden.has_permission(
  _user_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'super_admin'
    ) THEN true
    WHEN _permission IN ('dashboard:view', 'media:view') THEN EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    )
    WHEN _permission IN (
      'articles:view', 'articles:create', 'articles:edit_own'
    ) THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor',
          'reporter', 'contributor', 'translator'
        ])
    )
    WHEN _permission IN ('articles:edit_all', 'articles:publish', 'articles:delete') THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor'
        ])
    )
    WHEN _permission = 'articles:review' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor', 'fact_checker'
        ])
    )
    WHEN _permission = 'categories:manage' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission = 'media:upload' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor',
          'reporter', 'photographer', 'videographer'
        ])
    )
    WHEN _permission = 'media:manage_all' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission IN ('comments:moderate', 'analytics:view') THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor'
        ])
    )
    WHEN _permission = 'newsroom:manage' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission = 'videos:manage' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'videographer'
        ])
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION app_hidden.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.has_permission(uuid, text)
TO authenticated, service_role;

-- RLS alone is not enough: authenticated previously had SELECT-only table grants,
-- which blocked staff role assignment, section access, and category management.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editor_section_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION app_hidden.can_edit_section(
  _user_id uuid,
  _section_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    app_hidden.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'section_editor'
      )
      AND EXISTS (
        SELECT 1 FROM public.editor_section_access
        WHERE profile_id = _user_id AND section_id = _section_id
      )
    );
$$;

-- Role and section assignments remain Super Admin-only.
DROP POLICY IF EXISTS "super admins manage roles" ON public.user_roles;
CREATE POLICY "super admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

DROP POLICY IF EXISTS "editors view own access" ON public.editor_section_access;
CREATE POLICY "editors view own access"
ON public.editor_section_access FOR SELECT TO authenticated
USING (
  auth.uid() = profile_id
  OR app_hidden.has_permission(auth.uid(), 'staff:manage')
);

DROP POLICY IF EXISTS "super admins manage access" ON public.editor_section_access;
CREATE POLICY "super admins manage access"
ON public.editor_section_access FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

DROP POLICY IF EXISTS "staff managers update profiles" ON public.profiles;
CREATE POLICY "staff managers update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

DROP POLICY IF EXISTS "super admins manage sections" ON public.sections;
CREATE POLICY "category managers manage sections"
ON public.sections FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'categories:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'categories:manage'));

DROP POLICY IF EXISTS "editors manage tags" ON public.tags;
CREATE POLICY "article authors manage tags"
ON public.tags FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'articles:create'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'articles:create'));

DROP POLICY IF EXISTS "authors view own drafts" ON public.articles;
CREATE POLICY "newsroom views permitted articles"
ON public.articles FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR (
    app_hidden.has_role(auth.uid(), 'fact_checker')
    AND status <> 'published'
  )
  OR (
    section_id IS NOT NULL
    AND app_hidden.has_permission(auth.uid(), 'articles:edit_all')
    AND app_hidden.can_edit_section(auth.uid(), section_id)
  )
);

DROP POLICY IF EXISTS "authorized create articles" ON public.articles;
CREATE POLICY "authorized create articles"
ON public.articles FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND app_hidden.has_permission(auth.uid(), 'articles:create')
  AND (
    status <> 'published'
    OR (
      app_hidden.has_permission(auth.uid(), 'articles:publish')
      AND section_id IS NOT NULL
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
    AND status <> 'published'
  )
  OR (
    author_id = auth.uid()
    AND app_hidden.has_permission(auth.uid(), 'articles:edit_own')
    AND status <> 'published'
  )
)
WITH CHECK (
  (
    status <> 'published'
    AND (
      (
        section_id IS NOT NULL
        AND app_hidden.has_permission(auth.uid(), 'articles:edit_all')
        AND app_hidden.can_edit_section(auth.uid(), section_id)
      )
      OR app_hidden.has_role(auth.uid(), 'fact_checker')
      OR (
        author_id = auth.uid()
        AND app_hidden.has_permission(auth.uid(), 'articles:edit_own')
      )
    )
  )
  OR (
    status = 'published'
    AND section_id IS NOT NULL
    AND app_hidden.has_permission(auth.uid(), 'articles:publish')
    AND app_hidden.can_edit_section(auth.uid(), section_id)
  )
);

DROP POLICY IF EXISTS "authorized delete articles" ON public.articles;
CREATE POLICY "authorized delete articles"
ON public.articles FOR DELETE TO authenticated
USING (
  section_id IS NOT NULL
  AND app_hidden.has_permission(auth.uid(), 'articles:delete')
  AND app_hidden.can_edit_section(auth.uid(), section_id)
);

DROP POLICY IF EXISTS "editors manage article_tags" ON public.article_tags;
CREATE POLICY "article authors manage article tags"
ON public.article_tags FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'articles:create'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'articles:create'));

DROP POLICY IF EXISTS "editors manage ambassadors" ON public.ambassadors;
CREATE POLICY "newsroom managers manage ambassadors"
ON public.ambassadors FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'newsroom:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'newsroom:manage'));

DROP POLICY IF EXISTS "editors manage embassies" ON public.embassies;
CREATE POLICY "newsroom managers manage embassies"
ON public.embassies FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'newsroom:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'newsroom:manage'));

DROP POLICY IF EXISTS "editors manage war" ON public.war_monitor_items;
CREATE POLICY "newsroom managers manage war"
ON public.war_monitor_items FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'newsroom:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'newsroom:manage'));

DROP POLICY IF EXISTS "editors read all ticker" ON public.ticker_items;
CREATE POLICY "newsroom managers read all ticker"
ON public.ticker_items FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'newsroom:manage'));

DROP POLICY IF EXISTS "editors manage ticker" ON public.ticker_items;
CREATE POLICY "newsroom managers manage ticker"
ON public.ticker_items FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'newsroom:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'newsroom:manage'));

DROP POLICY IF EXISTS "editors manage videos" ON public.videos;
CREATE POLICY "video staff manage videos"
ON public.videos FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'videos:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'videos:manage'));

DROP POLICY IF EXISTS "newsroom reads media" ON public.media_assets;
CREATE POLICY "permitted staff read media"
ON public.media_assets FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'media:view'));

DROP POLICY IF EXISTS "newsroom uploads media" ON public.media_assets;
CREATE POLICY "permitted staff upload media"
ON public.media_assets FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND app_hidden.has_permission(auth.uid(), 'media:upload')
);

DROP POLICY IF EXISTS "owners and editors update media" ON public.media_assets;
CREATE POLICY "owners and media managers update media"
ON public.media_assets FOR UPDATE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
)
WITH CHECK (
  uploaded_by = auth.uid()
  OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
);

DROP POLICY IF EXISTS "owners and editors delete media" ON public.media_assets;
CREATE POLICY "owners and media managers delete media"
ON public.media_assets FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
);

DROP POLICY IF EXISTS "editors read all comments" ON public.comments;
CREATE POLICY "comment moderators read all comments"
ON public.comments FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'comments:moderate'));

DROP POLICY IF EXISTS "editors moderate comments" ON public.comments;
CREATE POLICY "comment moderators update comments"
ON public.comments FOR UPDATE TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'comments:moderate'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'comments:moderate'));

DROP POLICY IF EXISTS "editors delete comments" ON public.comments;
CREATE POLICY "comment moderators delete comments"
ON public.comments FOR DELETE TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'comments:moderate'));

DROP POLICY IF EXISTS "editors read analytics" ON public.article_daily_metrics;
CREATE POLICY "analytics staff read metrics"
ON public.article_daily_metrics FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'analytics:view'));

DROP POLICY IF EXISTS "super admins update newsroom settings" ON public.newsroom_settings;
CREATE POLICY "super admins update newsroom settings"
ON public.newsroom_settings FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'settings:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'settings:manage'));

-- Storage is protected independently from media_assets metadata.
DROP POLICY IF EXISTS "authed upload hero" ON storage.objects;
CREATE POLICY "permitted staff upload hero"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'article-hero'
  AND owner = auth.uid()
  AND app_hidden.has_permission(auth.uid(), 'media:upload')
);

DROP POLICY IF EXISTS "authed update hero editorial" ON storage.objects;
CREATE POLICY "owners and media managers update hero"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'article-hero'
  AND (
    owner = auth.uid()
    OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
  )
)
WITH CHECK (
  bucket_id = 'article-hero'
  AND (
    owner = auth.uid()
    OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
  )
);

DROP POLICY IF EXISTS "authed delete hero editorial" ON storage.objects;
CREATE POLICY "owners and media managers delete hero"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'article-hero'
  AND (
    owner = auth.uid()
    OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
  )
);

-- Canonical article RPC mirrors the RLS permission matrix.
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

  INSERT INTO public.profiles (id, name)
  VALUES (uid, split_part(COALESCE(auth.jwt() ->> 'email', 'staff'), '@', 1))
  ON CONFLICT (id) DO NOTHING;

  can_publish :=
    app_hidden.has_permission(uid, 'articles:publish')
    AND app_hidden.can_edit_section(uid, p_section_id);

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

  IF p_id IS NULL THEN
    IF NOT app_hidden.has_permission(uid, 'articles:create') THEN
      RAISE EXCEPTION 'Article creation permission required' USING ERRCODE = '42501';
    END IF;

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
        AND existing.status <> 'published'
        AND p_status <> 'published'
        AND p_section_id = existing.section_id
      )
      OR (
        existing.author_id = uid
        AND app_hidden.has_permission(uid, 'articles:edit_own')
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
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text,
  public.badge_type, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text,
  public.badge_type, text, text
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

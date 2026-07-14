
-- 1. Move helper functions out of the API-exposed public schema
CREATE SCHEMA IF NOT EXISTS app_hidden;
GRANT USAGE ON SCHEMA app_hidden TO authenticated, service_role;

-- Recreate has_role in app_hidden
CREATE OR REPLACE FUNCTION app_hidden.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION app_hidden.can_edit_section(_user_id uuid, _section_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_hidden.has_role(_user_id,'super_admin')
      OR EXISTS(SELECT 1 FROM public.editor_section_access WHERE profile_id = _user_id AND section_id = _section_id);
$$;

REVOKE ALL ON FUNCTION app_hidden.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_hidden.can_edit_section(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_hidden.can_edit_section(uuid, uuid) TO authenticated, service_role;

-- Rewrite all policies to use app_hidden.*
-- user_roles
DROP POLICY IF EXISTS "super admins manage roles" ON public.user_roles;
CREATE POLICY "super admins manage roles" ON public.user_roles
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin'));

-- sections
DROP POLICY IF EXISTS "super admins manage sections" ON public.sections;
CREATE POLICY "super admins manage sections" ON public.sections
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin'));

-- editor_section_access
DROP POLICY IF EXISTS "editors view own access" ON public.editor_section_access;
CREATE POLICY "editors view own access" ON public.editor_section_access
  FOR SELECT USING ((auth.uid() = profile_id) OR app_hidden.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "super admins manage access" ON public.editor_section_access;
CREATE POLICY "super admins manage access" ON public.editor_section_access
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin'));

-- tags
DROP POLICY IF EXISTS "editors manage tags" ON public.tags;
CREATE POLICY "editors manage tags" ON public.tags
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor'));

-- articles
DROP POLICY IF EXISTS "authors view own drafts" ON public.articles;
CREATE POLICY "authors view own drafts" ON public.articles
  FOR SELECT USING ((author_id = auth.uid()) OR app_hidden.has_role(auth.uid(),'super_admin') OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id)));

DROP POLICY IF EXISTS "authorized create articles" ON public.articles;
CREATE POLICY "authorized create articles" ON public.articles
  FOR INSERT WITH CHECK ((author_id = auth.uid()) AND (app_hidden.has_role(auth.uid(),'super_admin') OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id)) OR (app_hidden.has_role(auth.uid(),'contributor') AND (status = 'draft'::public.article_status))));

DROP POLICY IF EXISTS "authorized update articles" ON public.articles;
CREATE POLICY "authorized update articles" ON public.articles
  FOR UPDATE USING (app_hidden.has_role(auth.uid(),'super_admin') OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id)) OR ((author_id = auth.uid()) AND (status <> 'published'::public.article_status)))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id)) OR ((author_id = auth.uid()) AND (status <> 'published'::public.article_status)));

DROP POLICY IF EXISTS "authorized delete articles" ON public.articles;
CREATE POLICY "authorized delete articles" ON public.articles
  FOR DELETE USING (app_hidden.has_role(auth.uid(),'super_admin') OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id)));

-- article_tags
DROP POLICY IF EXISTS "editors manage article_tags" ON public.article_tags;
CREATE POLICY "editors manage article_tags" ON public.article_tags
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor'));

-- ambassadors
DROP POLICY IF EXISTS "editors manage ambassadors" ON public.ambassadors;
CREATE POLICY "editors manage ambassadors" ON public.ambassadors
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- embassies
DROP POLICY IF EXISTS "editors manage embassies" ON public.embassies;
CREATE POLICY "editors manage embassies" ON public.embassies
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- war_monitor_items
DROP POLICY IF EXISTS "editors manage war" ON public.war_monitor_items;
CREATE POLICY "editors manage war" ON public.war_monitor_items
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- ticker_items
DROP POLICY IF EXISTS "ticker public read active" ON public.ticker_items;
CREATE POLICY "ticker public read active" ON public.ticker_items
  FOR SELECT USING (active OR app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));
DROP POLICY IF EXISTS "editors manage ticker" ON public.ticker_items;
CREATE POLICY "editors manage ticker" ON public.ticker_items
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- videos
DROP POLICY IF EXISTS "editors manage videos" ON public.videos;
CREATE POLICY "editors manage videos" ON public.videos
  FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'))
  WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- Update handle_new_user trigger to still work (uses public.has_role — keep public shim removed by dropping)
-- Drop old public functions now that nothing references them
DROP FUNCTION IF EXISTS public.can_edit_section(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2. Storage policy fixes
-- Avatars: scope to user's own folder (path prefix must be auth.uid())
DROP POLICY IF EXISTS "authed upload avatars" ON storage.objects;
CREATE POLICY "authed upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Hero: only editorial roles may upload/modify
DROP POLICY IF EXISTS "authed upload hero" ON storage.objects;
CREATE POLICY "authed upload hero" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'article-hero' AND (
      app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
      OR app_hidden.has_role(auth.uid(),'contributor')
    )
  );

-- Update: owner-scoped (avatars = own folder; hero = editorial roles or original uploader)
DROP POLICY IF EXISTS "authed update hero" ON storage.objects;
CREATE POLICY "authed update avatars own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "authed update hero editorial" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'article-hero' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  )
  WITH CHECK (
    bucket_id = 'article-hero' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  );

DROP POLICY IF EXISTS "authed delete hero" ON storage.objects;
CREATE POLICY "authed delete avatars own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "authed delete hero editorial" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'article-hero' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  );

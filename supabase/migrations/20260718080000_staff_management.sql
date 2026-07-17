-- Complete newsroom staff profile fields and directory RPC.
-- Apply after 20260718070000_taxonomy_management.sql.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS byline_name text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('active', 'suspended', 'invited'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_social_links_object_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_social_links_object_check
      CHECK (jsonb_typeof(social_links) = 'object');
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

-- Keep profile email in sync when auth users are created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'invited', '') = 'true' THEN 'invited'
      ELSE 'active'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  IF COALESCE(NEW.raw_user_meta_data ->> 'invited', '') <> 'true' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'contributor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Directory for staff managers: profile fields + auth email + MFA + ban state.
CREATE OR REPLACE FUNCTION public.admin_list_staff()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT app_hidden.has_permission(uid, 'staff:manage') THEN
    RAISE EXCEPTION 'Staff management permission required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(staff)::jsonb ORDER BY staff.sort_name), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      p.id,
      p.name,
      COALESCE(p.email, u.email) AS email,
      p.byline_name,
      p.bio,
      p.avatar_url,
      p.social_links,
      p.status,
      p.created_at,
      COALESCE(p.name, p.byline_name, COALESCE(p.email, u.email), p.id::text) AS sort_name,
      COALESCE(
        (
          SELECT EXISTS (
            SELECT 1
            FROM auth.mfa_factors f
            WHERE f.user_id = p.id
              AND f.status = 'verified'
          )
        ),
        false
      ) AS mfa_enabled,
      (u.banned_until IS NOT NULL AND u.banned_until > now()) AS auth_banned,
      u.last_sign_in_at,
      u.email_confirmed_at,
      COALESCE(
        (
          SELECT jsonb_agg(r.role ORDER BY r.role)
          FROM public.user_roles r
          WHERE r.user_id = p.id
        ),
        '[]'::jsonb
      ) AS roles,
      COALESCE(
        (
          SELECT jsonb_agg(a.section_id ORDER BY a.section_id)
          FROM public.editor_section_access a
          WHERE a.profile_id = p.id
        ),
        '[]'::jsonb
      ) AS section_ids
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
  ) staff;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_staff() TO authenticated;

NOTIFY pgrst, 'reload schema';

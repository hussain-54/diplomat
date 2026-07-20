-- Users & Staff CMS module: org structure, invitations, activity, profile fields.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS activity_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, slug)
);

CREATE INDEX IF NOT EXISTS teams_department_idx ON public.teams (department_id, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_department_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_team_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS profiles_department_idx ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS profiles_team_idx ON public.profiles (team_id);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles (updated_at DESC);

CREATE OR REPLACE FUNCTION public.profiles_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  roles text[] NOT NULL DEFAULT '{}',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  name text,
  byline_name text,
  designation text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS staff_invitations_email_idx ON public.staff_invitations (lower(email));
CREATE INDEX IF NOT EXISTS staff_invitations_status_idx ON public.staff_invitations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_activity_logs_actor_idx
  ON public.staff_activity_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_logs_subject_idx
  ON public.staff_activity_logs (subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_logs_action_idx
  ON public.staff_activity_logs (action, created_at DESC);

INSERT INTO public.departments (name, slug, sort_order) VALUES
  ('Editorial', 'editorial', 1),
  ('Newsroom', 'newsroom', 2),
  ('Politics', 'politics', 3),
  ('Business', 'business', 4),
  ('Technology', 'technology', 5),
  ('Sports', 'sports', 6),
  ('International', 'international', 7),
  ('Multimedia', 'multimedia', 8),
  ('Marketing', 'marketing', 9),
  ('SEO', 'seo', 10),
  ('Management', 'management', 11)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.teams (department_id, name, slug, sort_order)
SELECT d.id, t.name, t.slug, t.sort_order
FROM public.departments d
JOIN (VALUES
  ('editorial', 'Senior Editors', 'senior-editors', 1),
  ('editorial', 'Copy Editors', 'copy-editors', 2),
  ('editorial', 'Journalists', 'journalists', 3),
  ('editorial', 'Contributors', 'contributors', 4),
  ('multimedia', 'Photo Desk', 'photo-desk', 1),
  ('multimedia', 'Video Desk', 'video-desk', 2),
  ('management', 'Leadership', 'leadership', 1)
) AS t(dept_slug, name, slug, sort_order) ON d.slug = t.dept_slug
ON CONFLICT (department_id, slug) DO NOTHING;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_staff ON public.departments;
CREATE POLICY departments_staff ON public.departments
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

DROP POLICY IF EXISTS teams_staff ON public.teams;
CREATE POLICY teams_staff ON public.teams
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

DROP POLICY IF EXISTS staff_invitations_staff ON public.staff_invitations;
CREATE POLICY staff_invitations_staff ON public.staff_invitations
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

DROP POLICY IF EXISTS staff_activity_logs_staff ON public.staff_activity_logs;
CREATE POLICY staff_activity_logs_staff ON public.staff_activity_logs
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'staff:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'staff:manage'));

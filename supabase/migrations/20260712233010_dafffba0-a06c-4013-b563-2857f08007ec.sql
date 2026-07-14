
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'section_editor', 'contributor');
CREATE TYPE public.article_status AS ENUM ('draft', 'review', 'published');
CREATE TYPE public.badge_type AS ENUM ('none','breaking','live','exclusive','opinion','premium','alert');
CREATE TYPE public.ambassador_status AS ENUM ('active','recalled','vacant');
CREATE TYPE public.embassy_status AS ENUM ('open','limited','closed','alert');
CREATE TYPE public.war_status AS ENUM ('active','ceasefire','tension');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are public readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "super admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ SECTIONS ============
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sections TO anon, authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections public read" ON public.sections FOR SELECT USING (true);
CREATE POLICY "super admins manage sections" ON public.sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ EDITOR SECTION ACCESS ============
CREATE TABLE public.editor_section_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, section_id)
);
GRANT SELECT ON public.editor_section_access TO authenticated;
GRANT ALL ON public.editor_section_access TO service_role;
ALTER TABLE public.editor_section_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editors view own access" ON public.editor_section_access FOR SELECT TO authenticated
  USING (auth.uid() = profile_id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admins manage access" ON public.editor_section_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.can_edit_section(_user_id UUID, _section_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id,'super_admin')
      OR EXISTS(SELECT 1 FROM public.editor_section_access WHERE profile_id = _user_id AND section_id = _section_id);
$$;

-- ============ TAGS ============
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags public read" ON public.tags FOR SELECT USING (true);
CREATE POLICY "editors manage tags" ON public.tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor') OR public.has_role(auth.uid(),'contributor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor') OR public.has_role(auth.uid(),'contributor'));

-- ============ ARTICLES ============
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  deck TEXT,
  body TEXT,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  region TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status article_status NOT NULL DEFAULT 'draft',
  badge_type badge_type NOT NULL DEFAULT 'none',
  hero_image_url TEXT,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.articles(section_id);
CREATE INDEX ON public.articles(status, published_at DESC);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published articles public" ON public.articles FOR SELECT USING (status = 'published');
CREATE POLICY "authors view own drafts" ON public.articles FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'super_admin')
      OR (section_id IS NOT NULL AND public.can_edit_section(auth.uid(), section_id)));
CREATE POLICY "authorized create articles" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(),'super_admin')
      OR (section_id IS NOT NULL AND public.can_edit_section(auth.uid(), section_id))
      OR (public.has_role(auth.uid(),'contributor') AND status = 'draft')
    )
  );
CREATE POLICY "authorized update articles" ON public.articles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR (section_id IS NOT NULL AND public.can_edit_section(auth.uid(), section_id))
    OR (author_id = auth.uid() AND status <> 'published')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR (section_id IS NOT NULL AND public.can_edit_section(auth.uid(), section_id))
    OR (author_id = auth.uid() AND status <> 'published')
  );
CREATE POLICY "authorized delete articles" ON public.articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')
      OR (section_id IS NOT NULL AND public.can_edit_section(auth.uid(), section_id)));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ARTICLE TAGS ============
CREATE TABLE public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY(article_id, tag_id)
);
GRANT SELECT ON public.article_tags TO anon, authenticated;
GRANT INSERT, DELETE ON public.article_tags TO authenticated;
GRANT ALL ON public.article_tags TO service_role;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "article_tags public read" ON public.article_tags FOR SELECT USING (true);
CREATE POLICY "editors manage article_tags" ON public.article_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor') OR public.has_role(auth.uid(),'contributor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor') OR public.has_role(auth.uid(),'contributor'));

-- ============ AMBASSADORS ============
CREATE TABLE public.ambassadors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  position TEXT,
  flag_emoji TEXT,
  avatar_url TEXT,
  quote TEXT,
  tags TEXT[] DEFAULT '{}',
  interview_url TEXT,
  status ambassador_status NOT NULL DEFAULT 'active',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ambassadors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ambassadors TO authenticated;
GRANT ALL ON public.ambassadors TO service_role;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ambassadors public read" ON public.ambassadors FOR SELECT USING (true);
CREATE POLICY "editors manage ambassadors" ON public.ambassadors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'));
CREATE TRIGGER ambassadors_touch BEFORE UPDATE ON public.ambassadors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ EMBASSIES ============
CREATE TABLE public.embassies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  ambassador_id UUID REFERENCES public.ambassadors(id) ON DELETE SET NULL,
  headline TEXT,
  status embassy_status NOT NULL DEFAULT 'open',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.embassies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.embassies TO authenticated;
GRANT ALL ON public.embassies TO service_role;
ALTER TABLE public.embassies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "embassies public read" ON public.embassies FOR SELECT USING (true);
CREATE POLICY "editors manage embassies" ON public.embassies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'));
CREATE TRIGGER embassies_touch BEFORE UPDATE ON public.embassies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ WAR MONITOR ============
CREATE TABLE public.war_monitor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_name TEXT NOT NULL,
  countries TEXT[] DEFAULT '{}',
  headline TEXT,
  status war_status NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.war_monitor_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.war_monitor_items TO authenticated;
GRANT ALL ON public.war_monitor_items TO service_role;
ALTER TABLE public.war_monitor_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "war public read" ON public.war_monitor_items FOR SELECT USING (true);
CREATE POLICY "editors manage war" ON public.war_monitor_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'));
CREATE TRIGGER war_touch BEFORE UPDATE ON public.war_monitor_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TICKER ============
CREATE TABLE public.ticker_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  tag TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticker_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticker_items TO authenticated;
GRANT ALL ON public.ticker_items TO service_role;
ALTER TABLE public.ticker_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticker public read active" ON public.ticker_items FOR SELECT USING (active OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'));
CREATE POLICY "editors manage ticker" ON public.ticker_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'));

-- ============ VIDEOS ============
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos public read" ON public.videos FOR SELECT USING (true);
CREATE POLICY "editors manage videos" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'section_editor'));

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles(id, name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'contributor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

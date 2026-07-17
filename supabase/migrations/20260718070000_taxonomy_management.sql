-- Nested taxonomy management for editorial categories (sections).
-- Apply after 20260718060000_complete_seo_module.sql.

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sections_visibility_check'
  ) THEN
    ALTER TABLE public.sections
      ADD CONSTRAINT sections_visibility_check
      CHECK (visibility IN ('public', 'hidden'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sections_parent_not_self'
  ) THEN
    ALTER TABLE public.sections
      ADD CONSTRAINT sections_parent_not_self
      CHECK (parent_id IS NULL OR parent_id <> id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS sections_parent_sort_idx
  ON public.sections (parent_id, sort_order, name);

CREATE INDEX IF NOT EXISTS sections_visibility_idx
  ON public.sections (visibility, sort_order);

-- Reject cycles: a category cannot be nested under one of its own descendants.
CREATE OR REPLACE FUNCTION public.sections_prevent_parent_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cursor_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A category cannot be its own parent' USING ERRCODE = '22023';
  END IF;

  cursor_id := NEW.parent_id;
  WHILE cursor_id IS NOT NULL LOOP
    IF cursor_id = NEW.id THEN
      RAISE EXCEPTION 'Category hierarchy cannot contain cycles' USING ERRCODE = '22023';
    END IF;
    SELECT parent_id INTO cursor_id
    FROM public.sections
    WHERE id = cursor_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sections_prevent_parent_cycle ON public.sections;
CREATE TRIGGER sections_prevent_parent_cycle
BEFORE INSERT OR UPDATE OF parent_id ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.sections_prevent_parent_cycle();

-- Bulk hierarchy update used by drag-and-drop taxonomy UI.
CREATE OR REPLACE FUNCTION public.admin_reorder_categories(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item jsonb;
  item_id uuid;
  item_parent uuid;
  item_order int;
  affected int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT app_hidden.has_permission(uid, 'categories:manage') THEN
    RAISE EXCEPTION 'Category management permission required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Reorder payload must be a JSON array' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_id := NULLIF(item ->> 'id', '')::uuid;
    item_parent := NULLIF(item ->> 'parent_id', '')::uuid;
    item_order := COALESCE((item ->> 'sort_order')::int, 0);

    IF item_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.sections
    SET
      parent_id = item_parent,
      sort_order = item_order
    WHERE id = item_id;

    IF FOUND THEN
      affected := affected + 1;
    END IF;
  END LOOP;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reorder_categories(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reorder_categories(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

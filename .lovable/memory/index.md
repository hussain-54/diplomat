# Project Memory

## Core
Editorial international news site (DiplomacyG). Palette: bg #FAFAF8, ink #14161C, navy #0E1524 authority, crimson #B31B2E reserved for LIVE/BREAKING/ALERT only, gold #B4893C for Opinion/Premium.
Serif headlines (Source Serif 4), Inter for UI. Uppercase letter-spaced eyebrows/nav.
Roles live in public.user_roles (super_admin, section_editor, contributor). Never store roles on profiles. Use has_role() SECURITY DEFINER helper in RLS.
Article publishing enforced by RLS via can_edit_section(); contributors can only insert drafts.
Public reads: server publishable client + narrow TO anon SELECT policies. Admin CRUD: createServerFn + requireSupabaseAuth.
Hero/avatar images live in public/images/ served as /images/...

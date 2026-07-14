
# DiplomacyG — Build Plan

A full-stack international news platform with public site + protected admin CMS, backed by Lovable Cloud (Supabase).

## Scope in one pass

Because this is large, I'll build it in a single coordinated pass rather than splitting it into approval cycles. Confirm the plan and I'll ship.

---

## 1. Backend (Lovable Cloud / Supabase)

**Enable Lovable Cloud**, then run one migration that creates:

- `profiles` (id → auth.users, name, avatar_url, bio, role: `super_admin | section_editor | contributor`)
- `sections` (id, slug, name, color, sort_order)
- `editor_section_access` (profile_id, section_id) — join table
- `articles` (id, title, slug, deck, body, section_id, region, author_id, status: `draft|review|published`, badge_type: `breaking|live|exclusive|opinion|premium|null`, hero_image_url, published_at, scheduled_at, created_at)
- `tags`, `article_tags` (M:N)
- `ambassadors` (id, name, country, position, flag_emoji, avatar_url, quote, tags[], interview_url, status: `active|recalled|vacant`, featured)
- `embassies` (id, country, ambassador_id, headline, status: `open|limited|closed|alert`, updated_at)
- `war_monitor_items` (conflict_name, countries[], headline, status: `active|ceasefire|tension`, updated_at)
- `ticker_items` (text, tag, active, sort_order)
- `videos` (title, category, thumbnail_url, video_url, duration, published_at)

**Security:**
- `has_role(uuid, app_role)` and `can_edit_section(uuid, uuid)` SECURITY DEFINER functions (avoid RLS recursion).
- RLS on `articles`: public SELECT where `status='published'`; INSERT/UPDATE requires super_admin OR (editor with matching `editor_section_access`); contributors can insert but cannot set `status='published'` (trigger enforces).
- RLS on admin tables: read for anon where public-facing (sections, published articles, ambassadors, embassies, war_monitor, active ticker, videos); write restricted to editors/admins.
- `editor_section_access`: only super_admin writes.
- Trigger `handle_new_user()` → auto-create profile with default role `contributor`.
- Explicit GRANTs on every public table.

**Storage buckets:** `article-hero`, `avatars` (public read, authenticated write).

**Seed data:** ~15 articles across sections, 4 ambassadors, 6 embassies, 4 war monitor items, 6 ticker items, 3 videos, sample tags.

---

## 2. Design System (`src/styles.css`)

Redefine tokens in oklch:
- `--background` #FAFAF8, `--foreground` #14161C
- `--primary` deep navy #0E1524 (authority)
- `--accent-crimson` #B31B2E (live/breaking only — new token)
- `--accent-gold` #B4893C (opinion/premium)
- Tinted category tokens: green/blue/amber/teal desaturated
- `--font-serif` (Source Serif 4) for headlines, `--font-sans` (Inter) for UI
- Fonts loaded via `<link>` in `__root.tsx`
- Utility classes: `.eyebrow` (uppercase tracked), `.headline-serif`, badge variants

Button variants: `default`, `crimson`, `navy`, `gold`, `ghost`.

---

## 3. Public Site Routes

```
/                          Home (hero + war monitor + ambassadors panel + latest + opinion + sports + video)
/latest                    Latest listing
/popular                   Popular listing
/section/$slug             Section listing (war, ambassadors, embassy-watch, pakistan, uae, india, world, business, sports, lifestyle, opinion, sci-tech)
/article/$slug             Article detail (hero, deck, byline, body, tags, related)
/ambassador/$id            Ambassador profile
/embassy/$id               Embassy profile
/video                     Video listing
/programs                  Programs listing
/about, /newsletter, /podcast, /epaper
/auth                      Sign in / magic link (public)
/sitemap.xml, robots.txt
```

Shared shell components: `TopStrip`, `Masthead` (logo, search, Sign In/Account, Subscribe), `MainNav` (sticky), `BreakingTicker` (auto-scroll from `ticker_items`), `Footer`.

Home sections built as composable components. All data via `createServerFn` + TanStack Query (`ensureQueryData` in loader, `useSuspenseQuery` in component). Each route has its own `head()` metadata.

---

## 4. Admin Dashboard (`/admin/*` under `_authenticated`)

Desktop-optimized layout: left sidebar nav + main content.

Routes:
- `/admin` — stats per section, pending review queue, recent activity
- `/admin/articles` — filterable table; create/edit form with rich body (textarea + markdown for scope; hero image upload to Storage; section/tags/badge/region/schedule); draft → review → publish workflow
- `/admin/ambassadors` — CRUD table + form (avatar upload)
- `/admin/embassies` — CRUD table + form
- `/admin/war-monitor` — CRUD + live status toggle
- `/admin/ticker` — add / reorder (up/down buttons) / activate
- `/admin/videos` — CRUD
- `/admin/access` — super_admin only; list editors, toggle section checkboxes → writes `editor_section_access`

All admin mutations use `createServerFn` with `requireSupabaseAuth`; RLS is the source of truth, UI hiding is defense-in-depth.

---

## 5. Auth

- Email/password + magic link on `/auth`
- Root `onAuthStateChange` listener → `router.invalidate()` + query invalidate
- Masthead reflects session (Sign In vs account menu with Sign Out + Admin link if role ≥ contributor)
- Managed `_authenticated/route.tsx` gate protects `/admin/*`

---

## 6. Technical Notes

- TanStack Start file-based routes; server fns in `*.functions.ts` client-safe modules
- Public reads use server publishable client (narrow `TO anon` SELECT policies) inside server fns; admin reads use `requireSupabaseAuth`
- Sitemap enumerates static routes + published articles + ambassadors + embassies
- Two hero images generated via imagegen for seed articles; other seed articles use category-appropriate generated images (kept minimal — ~3-4 total generated images reused)
- Responsive: mobile nav drawer, stacked hero on <md, admin sidebar collapses on <lg but is designed for desktop

---

## Out of scope (call out if you want them)

- Full WYSIWYG rich text editor (using markdown-style textarea instead — can upgrade later)
- Email delivery for magic links beyond Supabase defaults
- Payment/Subscribe flow (button is decorative)
- Comments, likes, personalization
- Search backend (search bar is decorative unless you want basic ilike search — say the word)

Reply "go" (or with tweaks) and I'll build it.

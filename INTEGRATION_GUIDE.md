# Supabase & Vercel Integration Guide

Step-by-step setup for the Diplomacy Lens database, local env, article publishing permissions, and Vercel deploy.

---

## Part 1: Supabase Database Setup

### Step 1: Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project**.
3. Enter a **Project Name**, set a secure **Database Password**, and choose a region.
4. Wait for provisioning to finish.

### Step 2: Apply Database Migrations

The files in `supabase/migrations/` are the production source of truth.

With the Supabase CLI linked to the project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

For a new local database, use `supabase db reset`.

`supabase/schema.sql` is a readable snapshot/reference, not a second deployment path. Do not
run old emergency fix scripts after the migration chain.

### Step 3: Promote Your First Super Admin
New signups receive the **contributor** role (drafts only). To publish and manage access, promote yourself once:

```sql
-- Replace with your auth user UUID from Authentication → Users
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UUID-HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Or by email:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'you@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

This is an explicit one-time operator action. Never commit a real email or user ID to a migration.

### Step 4: API Credentials
In **Project Settings → API**, copy:
- **Project URL**
- **anon / public** (or publishable) key

---

## Part 2: Local Development

Create `.env` in the project root:

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-or-publishable-key"
```

Then:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Newsroom: `http://localhost:5173/admin`.

### Publishing roles
| Role | Can publish articles? |
| :--- | :--- |
| `contributor` | No — draft / in review only |
| `section_editor` | Yes |
| `super_admin` | Yes + Manage Access |

---

## Part 3: Deploying to Vercel

1. Import the GitHub repository into Vercel.
2. Set these explicitly public environment variables:

| Key | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key |

Never create a `VITE_` variable containing a Supabase secret/service-role key.

3. Framework: **Vite** · Build: `npm run build` · Output: `dist`
4. Deploy, then in Supabase Auth set Site URL / redirect URLs to your Vercel domain.

### Auth redirect URLs
Supabase → Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**` and `http://localhost:5173/**`

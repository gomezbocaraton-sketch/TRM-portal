# TRM Partners Portal — Phase 1 (Admin-only)

This replaces the previous version, which included client logins and an
invite-email flow. This version is intentionally simpler: **one admin
account, full project tracking, no client login yet.** Client contact
info is stored as plain fields on each project.

## What changed from the previous version

- No client accounts, no invite emails, no `SUPABASE_SERVICE_ROLE_KEY`
- "Add Client" is now "Add Project" — a plain form, no email sent
- Login has no admin/client toggle — there's only one kind of account now
- Same milestone tracking, same 15-step template, same underlying tables
  for payments, change orders, documents, daily logs, etc. — all still
  here, just not all wired to pages yet (see below)

## Full undo/redo — three services, in order

### 1. Supabase — start from a fresh project

Don't try to modify your existing Supabase project; it has the old
schema with client-account references baked in, and untangling that is
more error-prone than starting clean.

1. In your existing Supabase project, you can leave it as-is or delete it
   (Settings → General → scroll to bottom → Delete Project) — up to you.
2. Create a **new** Supabase project.
3. In its SQL Editor, run these four files from this folder, **in order**:
   - `supabase/schema.sql`
   - `supabase/rls_policies.sql`
   - `supabase/functions.sql`
   - `supabase/seed.sql`
4. Go to Settings → API and copy the **Project URL** and **anon public
   key** — you'll need both in step 3 below. (No service role key needed
   this time.)

### 2. GitHub — replace the old code entirely

1. Go to your existing repository on GitHub.
2. Delete every file and folder in it (select all in the file browser,
   delete, commit).
3. Upload every file from this new project folder in its place — same
   drag-and-drop upload method you used the first time.
4. Commit.

### 3. Vercel — update settings and redeploy

1. Go to your Vercel project → Settings → Environment Variables.
2. Delete `SUPABASE_SERVICE_ROLE_KEY` if it's there — not needed anymore.
3. Update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   to the values from your **new** Supabase project (step 1.4 above).
4. While you're in Settings → General → Build & Development Settings,
   double check Install Command and Build Command are both **not**
   overridden (this tripped us up last time) — clear them or toggle
   Override off if either has stray text in it.
5. Go to Deployments → click the ⋯ menu on the latest one → Redeploy.

## Creating your admin account (same as before)

1. In the new Supabase project: Authentication → Users → Add user.
   Create yourself with an email and password.
2. Copy that user's ID (User UID).
3. SQL Editor → New query:
   ```sql
   insert into users (id, admin_role, full_name, email)
   values ('paste-your-user-id-here', 'owner', 'Your Name', 'you@trmpros.com');
   ```
4. Run it. Log in on your live Vercel URL with that email/password.

## What's built vs. what's next

Working: login, admin dashboard (real project list with live completion
%), Add Project.

Not yet built: the individual project detail page and its tabs
(Milestones, Financials, Change Orders, Documents, Matterport, Daily
Log, Selections, RFIs). The database tables for all of these already
exist in `schema.sql` — building each tab is a repeat of the exact
pattern in `src/app/admin/page.tsx`: a Supabase query plus the
corresponding UI from the HTML prototype. This is the right next task
to hand to Claude Code.

## Adding client logins back later

When you're ready: add a `client_id` column to `projects` referencing
`auth.users`, build an invite flow (the previous version's
`admin/clients/actions.ts` is a working reference for this), add
`SUPABASE_SERVICE_ROLE_KEY` back to your environment variables, and
extend the RLS policies to allow a client to see only their own
project's rows. Nothing in this phase needs to be redesigned to support
that — it's purely additive.

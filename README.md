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
   - `supabase/storage_setup.sql` — creates the file storage bucket
     used by photo/document/estimate/contract uploads
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

Working: login, admin dashboard, Add Project, and the full project
detail page with eight tabs — Overview, Milestones (with to-dos and
photos), Financials, Profitability, Change Orders, Documents,
Matterport, and Daily Log. Every one of these reads and writes real
rows in your Supabase database.

**Deliberately deferred to a later phase, since they're really
client-facing features and there's no client login yet:**

- **QuickBooks Online sync** — payments are recorded manually on the
  Financials tab instead, which works fine on its own. When this phase
  starts: register an app at developer.intuit.com, get a Client
  ID/Secret, and build an OAuth connect flow + webhook receiver.
- **Client e-signing on change orders** — the admin updates a change
  order's status directly (with a plain "approved by" name field for
  your own records) rather than a client signing it themselves.
- **Selections** — client-chosen finishes tracking. Removed for this
  phase; add back once clients can log in and choose their own options.
- **RFIs** — question/answer log, mainly useful once clients can
  answer questions directed at them. Removed for this phase.

Nothing about this deferral requires redesigning the database — the
relevant tables and columns (`qbo_connection`, `signed_by_name`,
`selections`, `rfis`, etc.) already exist in `schema.sql` for whenever
you're ready to build these out.

## Adding client logins back later

When you're ready: add a `client_id` column to `projects` referencing
`auth.users`, build an invite flow (the previous version's
`admin/clients/actions.ts` is a working reference for this), add
`SUPABASE_SERVICE_ROLE_KEY` back to your environment variables, and
extend the RLS policies to allow a client to see only their own
project's rows. Nothing in this phase needs to be redesigned to support
that — it's purely additive.

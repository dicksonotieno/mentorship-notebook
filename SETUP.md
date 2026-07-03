# Setup — from clone to a working dashboard

This takes about **20 minutes** and costs **nothing**. You need a browser and two
free accounts: **Supabase** (the database) and **Vercel** (the hosting). No
programming required — you'll paste one file and copy two values.

If you just want to *look* at the app first, skip everything and open
`index.html?demo=1` — see the [README](README.md#see-it-in-30-seconds-no-setup).

**The five steps:**

1. [Create the database (Supabase)](#step-1--create-the-database-supabase)
2. [Set the mentor email](#step-2--set-the-mentor-email-do-this-before-running-the-schema)
3. [Lock the door (turn off open signups)](#step-3--lock-the-door)
4. [Wire the app to your database (`config.js`)](#step-4--wire-the-app-to-your-database)
5. [Deploy the site (Vercel)](#step-5--deploy-the-site-vercel) → then [connect auth](#step-6--connect-auth-important) and [invite people](#step-7--invite-your-team)

At the end there's a [**Verify your install**](#verify-your-install) checklist.

---

## Step 1 — Create the database (Supabase)

1. Go to **[supabase.com](https://supabase.com)** → sign up (free) → **New
   project**.
2. Pick a name and a strong database password (you'll rarely need the password
   again — save it somewhere safe anyway).
3. **Region:** choose the one closest to your team, or the one matching your
   privacy/data-residency needs (for example, an EU region if you must comply
   with GDPR). This can't be changed later without recreating the project.
4. Wait ~2 minutes for the project to finish provisioning.

> **Don't run the schema yet** — do Step 2 first so the mentor email is correct
> before any table is created.

---

## Step 2 — Set the mentor email (do this BEFORE running the schema)

The database decides who is the **mentor** by matching the email they sign in
with. Open [`schema.sql`](schema.sql) and find this near the top:

```sql
create or replace function public.mentor_email() returns text
language sql immutable as $$ select 'mentor@example.com' $$;
```

Change `mentor@example.com` to the **exact email address the mentor will sign in
with**. Everyone who signs up with a *different* address automatically becomes a
**fellow**.

> Doing this later is possible but annoying (you'd re-run the function and fix the
> mentor's `profiles.role` by hand). Setting it now is one edit.

Now paste the schema in:

1. In Supabase, open **SQL Editor** (left sidebar) → **New query**.
2. Copy the **entire** contents of `schema.sql` and paste it into the editor.
3. Click **Run**.
4. **Success looks like:** a green **"Success. No rows returned"** message. The
   schema creates all the tables, security policies, public views, and seeds an
   example timetable.

> Re-running the whole `schema.sql` on an existing project can error on the
> `create table` statements (they already exist). That's expected — for changes
> to an existing database, use the files in [`migrations/`](migrations/) instead,
> which are safe to run repeatedly.

---

## Step 3 — Lock the door

By default, Supabase lets *anyone* sign up. You want an **invite-only**
programme, so turn public signups **off** — this is your allowlist.

1. Supabase → **Authentication** → **Sign In / Providers** (sometimes under
   **Authentication → Providers → Email**).
2. Find **"Allow new users to sign up"** and turn it **OFF**.

Now the only people who can ever get in are the ones you explicitly invite in
Step 7.

---

## Step 4 — Wire the app to your database

The app needs two values from Supabase: your project URL and the public anon key.

1. Supabase → **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`).
3. Under **Project API keys**, copy the **`anon` `public`** key. (It's the one
   labelled *public / anon* — **not** the `service_role` key, which must never
   leave the dashboard.)
4. Open [`config.js`](config.js) and paste both in:

```js
export const CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',   // ← your Project URL
  supabaseAnonKey: 'YOUR_ANON_PUBLIC_KEY',           // ← your anon public key
  programmeName: 'Mentorship Notebook',              // ← name it however you like
  programmeSub: 'Your organisation · Season 20XX',   // ← subtitle in the header
  sandboxUrl: 'https://example.com'                  // ← optional practice-bar link
};
```

> **Is it safe to publish the anon key?** Yes. It only grants what your RLS
> policies allow, which for a stranger is nothing. See [SECURITY.md](SECURITY.md).
> The `service_role` key is the dangerous one — keep it out of `config.js` and
> out of the repo entirely.

Save the file. If you want, test locally now: serve the folder and open it
without `?demo` — you should get a real sign-in screen (it won't sign you in
until auth is connected in Step 6, but "Supabase not configured" should be gone).

---

## Step 5 — Deploy the site (Vercel)

The project is a plain static site — any static host works, but Vercel is free
and handles the `/overview` and `/report` pretty-URLs via `vercel.json`.

**Option A — GitHub import (recommended; gives you auto-deploys):**

1. Push this folder to a GitHub repository.
2. Go to **[vercel.com](https://vercel.com)** → **Add New… → Project** → import
   your repo.
3. **Framework Preset:** *Other*. **Root Directory:** leave as the repo root
   (this project's files live at the top level). No build command, no output
   directory — it's static.
4. Click **Deploy**. You'll get a URL like `https://your-app.vercel.app`.

**Option B — Vercel CLI (no GitHub needed):**

```bash
cd mentorship-notebook
npx vercel login       # sign up / sign in, free
npx vercel --prod      # accept the defaults: set up new project → deploy
```

It prints your live URL when it's done.

> **Deploying without Vercel?** Any static host (Netlify, Cloudflare Pages,
> GitHub Pages, S3…) serves it. The only Vercel-specific niceties are the
> `/overview` and `/report` rewrites and the security headers in `vercel.json` —
> replicate those on your host, or just link to `/overview.html` and
> `/report.html` directly.

---

## Step 6 — Connect auth (important)

Magic-link emails need to know where to send people back. Skip this and the
links will try to open `localhost` and fail for everyone.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** set it to your deployed URL, e.g. `https://your-app.vercel.app`.
3. **Redirect URLs:** add the same URL. **Do not use a wildcard** — set your
   exact domain (this prevents an attacker redirecting someone's login token).

---

## Step 7 — Invite your team

1. Supabase → **Authentication** → **Users** → **Invite user** (or **Add user →
   Send invitation**).
2. Invite the **mentor's** email first — the exact one from Step 2. They become
   the mentor automatically on first sign-in.
3. Invite each **fellow's** email. They become fellows automatically.

Each person gets an email with a link. Clicking it signs them in. After that they
can return to your site any time and get a fresh magic link — no passwords, ever.

> **Only three fellows or fewer?** That's the sweet spot for the free tiers.
> More is fine too; just keep an eye on your Supabase usage meter.

---

## Step 8 — First run as the mentor

1. Open your live URL and sign in with the mentor email.
2. Use the **fellow switch** at the top to pick a fellow.
3. Write your first feedback, add a milestone or two, log a session. There's no
   project to configure — the programme timetable is already seeded.

Optionally set display names: as the mentor you can rename fellows (Supabase
dashboard → Table Editor → `profiles` → set `display_name`), which is what the
public overview shows.

---

## Verify your install

Tick these off — if all pass, you're live and safe:

- [ ] **Mentor sign-in works.** The mentor email logs in and sees the fellow
      switch at the top (fellows never see a switch).
- [ ] **Fellow isolation works.** Sign in as a fellow (or invite a test address):
      they see only *their own* milestones, feedback and notebook — no switch, no
      other fellow's data.
- [ ] **Public overview loads logged-out.** Open `/overview` in a private/incognito
      window. It shows progress counts and milestone titles only — **no emails, no
      feedback text, no notebook content**.
- [ ] **Magic link lands on the live site**, not localhost (that means Step 6 is
      correct).
- [ ] **Open signups are off** (Step 3) — an uninvited email cannot create an
      account.
- [ ] **Demo mode still works:** `index.html?demo=1` shows sample data and saves
      nothing.
- [ ] You have **read [SECURITY.md](SECURITY.md)** and applied its dashboard
      checklist.

Hit a snag on any of these? See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Going further

- Make it yours (name, dates, tracks, fellows): [CUSTOMIZATION.md](CUSTOMIZATION.md)
- Understand the security model in depth: [SECURITY.md](SECURITY.md)
- End-of-programme export: Supabase → **Table Editor** → each table → **Export as
  CSV**; hand each fellow their record, then delete the project for a clean exit.

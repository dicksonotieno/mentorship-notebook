# Troubleshooting

The problems people actually hit, and the fix for each. Most are Supabase
dashboard settings, not code.

---

### The sign-in email never arrives, or its link opens `localhost`

**Cause:** the auth redirect isn't set to your live site.

**Fix:** Supabase → **Authentication → URL Configuration** → set **Site URL** and
add a **Redirect URL** equal to your exact deployed domain (e.g.
`https://your-app.vercel.app`). No wildcards. See
[SETUP step 6](SETUP.md#step-6--connect-auth-important).

Also worth knowing: Supabase's built-in email sender is **rate-limited** (a few
messages per hour). If you're testing repeatedly and mails stop, wait, or plug in
a free SMTP provider under **Authentication → SMTP**.

---

### "Invalid API key" / the app can't reach the database

**Cause:** wrong or mistyped values in `config.js`.

**Fix:**
- Re-copy the **Project URL** and the **`anon` `public`** key from Supabase →
  **Project Settings → API** into [`config.js`](config.js).
- Make sure you used the **anon public** key — *not* the `service_role` key and
  *not* the database password.
- Confirm `supabaseUrl` has no trailing slash and still starts with `https://`.

---

### Nobody can sign in — not even the mentor

**Cause (usual):** open signups are off (correct!) but no one has been **invited**
yet. Invite-only means users must be added explicitly.

**Fix:** Supabase → **Authentication → Users → Invite user**. Invite the mentor
email first, then each fellow. See [SETUP step 7](SETUP.md#step-7--invite-your-team).

If you *want* people to self-serve during testing, you can temporarily turn
**"Allow new users to sign up"** back on (**Authentication → Sign In / Providers**)
— but turn it off again before going live.

---

### The person who should be the mentor logged in as a fellow

**Cause:** the email they used doesn't match `mentor_email()` in the schema.

**Fix (two parts):**
1. Update the function to their exact address and re-run just that statement in the
   **SQL Editor**:
   ```sql
   create or replace function public.mentor_email() returns text
   language sql immutable as $$ select 'their-real@email.com' $$;
   ```
2. Fix the already-created row: Supabase → **Table Editor → `profiles`** → set
   their `role` to `mentor`. (New sign-ins will be correct automatically; this
   step only repairs the account that already exists.)

---

### "permission denied for table …" or lists come back empty

**Cause:** row-level security is doing its job, but usually it means the schema
didn't fully run, or you're querying as the wrong role.

**Fix:**
- Re-run the **entire** [`schema.sql`](schema.sql) on a fresh project (SQL Editor →
  paste all → Run). A partial paste leaves some grants/policies missing.
- Empty results for a fellow trying to read another fellow's data are **correct** —
  that's RLS blocking a cross-boundary read, not a bug.
- On an **existing** database, run the files in [`migrations/`](migrations/) rather
  than the whole schema (they're safe to re-run).

---

### The public overview is blank or says "not available yet"

**Causes and fixes:**
- The `programme_overview` / `programme_milestones` views weren't created → re-run
  the schema (or the migration) so the anon-readable views exist.
- There are simply **no fellows yet** → invite users and add a milestone; the page
  fills in as data appears.
- A fellow shows no milestones on the overview → they may all be hidden
  (`milestones.show_on_overview = false`) or the `show_milestones` section is off in
  `mentor_settings`. See [CUSTOMIZATION → public overview](CUSTOMIZATION.md#the-public-overview).

---

### The app was working, now everything fails to load

**Cause:** Supabase **pauses free projects after ~1 week of inactivity**.

**Fix:** open your Supabase dashboard and click **Restore/Resume** on the project.
It takes a minute. Regular weekly use keeps it awake; there's nothing to change in
the code.

---

### Demo mode shows data but the real app is empty

That's expected. `?demo=1` (and the "Explore in demo mode" button) show **sample
data only** and never touch your database. Your real project starts empty until
you and your fellows add milestones, feedback, and notes. Remove `?demo=1` from the
URL to use the live app.

---

### `/overview` or `/report` gives a 404

**Cause:** those pretty URLs come from the rewrites in [`vercel.json`](vercel.json)
and only work on a host that applies them.

**Fix:**
- On Vercel, make sure `vercel.json` is at the deployed root and you didn't set a
  custom output directory.
- On another static host, either replicate the rewrites or just link to
  `/overview.html` and `/report.html` directly.

---

### Security headers / CSP seem to block something

The strict Content-Security-Policy in `vercel.json` allows only `'self'` scripts,
Supabase for data, and Google Fonts. If you add an external script, image host, or
API, you must widen the matching CSP directive (`script-src`, `img-src`,
`connect-src`, `font-src`). Keep it as tight as possible — see
[SECURITY.md](SECURITY.md).

---

Still stuck? Re-run the [SETUP.md](SETUP.md) **Verify your install** checklist —
it isolates which of the five steps didn't take.

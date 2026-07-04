# Troubleshooting

The problems people actually hit, and the fix for each. Most are Supabase
dashboard settings, not code.

---

### The site is stuck on "Loading the notebook…" forever

**Cause:** a syntax slip in [`config.js`](config.js) — a deleted quote `'` or
comma `,` from a recent edit. When that file can't be read, the app can't even
start, so no error is shown.

**Fix:** nothing is lost — GitHub keeps every version of every file. In your
repository, open `config.js` → click **History** (top right) → open the last
version from before the problem → copy its contents → edit the file and paste
them back. Then redo your change carefully: every value sits between two
quotes, every line inside the `{ }` ends with a comma. The same recipe rescues
any other file you edit (like the `timeline` block).

---

### The app says "a sign-in link is on its way" — but nothing ever arrives, for anyone

**Cause:** for privacy, the app shows the same calm message whether the send
worked or not (so nobody can probe which emails are on the programme). The
usual real causes:

- A wrong or mangled value in `config.js` — re-copy the **Project URL** and the
  **anon public** key (labelled **Publishable** on newer Supabase projects)
  with no spaces or line breaks around them.
- You've hit the free email rate limit (see the next-but-one entry).
- The **Email** provider was switched off entirely in Supabase — re-enable it
  under **Authentication → Sign In / Providers**; only "Allow new users to
  sign up" should be off.

---

### I pasted the `service_role` (Secret) key into `config.js` by mistake

**Cause:** the app may even appear to work — which is exactly the danger: that
key bypasses all privacy rules and is now visible to anyone who can see your
repository.

**Fix:** two steps, in this order. (1) Replace it in `config.js` with the
**anon public / Publishable** key. (2) In Supabase → **Project Settings → API**,
**rotate/revoke** the service_role key so the leaked one goes dead. Don't skip
step 2 — removing it from the file doesn't un-leak it from the repository's
history.

---

### The sign-in email never arrives, or its link opens `localhost`

**Cause:** the auth redirect isn't set to your live site.

**Fix:** Supabase → **Authentication → URL Configuration** → set **Site URL** and
add a **Redirect URL** equal to your exact deployed domain (e.g.
`https://your-app.vercel.app`). No wildcards. See
[SETUP step 6](SETUP.md#step-6--connect-auth-important).

Also worth knowing: Supabase's built-in email sender is **rate-limited** (a few
messages per hour). Inviting yourself plus several fellows in one sitting means
the later invites may silently never send — it looks like random spam-filtering
but is just the limit. Space invitations out — or, for higher limits and better
inbox delivery, send auth email from your own domain (see
[CUSTOMIZATION → Sending email from your own domain](CUSTOMIZATION.md#sending-email-from-your-own-domain-optional)).
And invitation links are **single-use and
expire after ~24 hours** — an expired or pre-opened link shows a clear
"expired or already used" message on the sign-in screen; the person just
requests a fresh link from the site with their email (no re-invite needed).

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

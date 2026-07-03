# Security audit — Mentorship Notebook

Scope: the whole app (`app.js`, `timeline.js`, `overview.js`, `report.js`,
`index.html`, `config.js`), the database rules (`schema.sql`), and the hosting
config (`vercel.json`). Threat model assumed below.

## Threat model — what we are defending against

The site is a **static page**. The Supabase **anon key is public** (it ships in
`config.js` and is visible to anyone). Therefore:

- **The browser is fully untrusted.** An attacker can open devtools and call the
  Supabase API directly with hand-made requests. Every `isMentor()` check in the
  JavaScript is for *convenience only* — it is **not** a security control.
- **All real security lives in two places:** Postgres row-level security (RLS)
  in `schema.sql`, and the Supabase Auth settings (allowlist + redirect URLs).

So the audit focuses there, and treats "what can a logged-in fellow do if they
go around the UI?" and "what can a random stranger with the URL do?" as the two
main questions.

## Verdict

After the fixes below, the app is **safe to go public** for its purpose
(a small group of invited users, private mentorship data) **provided the Supabase
settings in the checklist are applied.** The data perimeter is enforced by the
database, not the page.

---

## Findings & fixes

### FIXED — Critical: privilege escalation via profile update
An earlier policy let any user `UPDATE` their own `profiles` row. Nothing stopped
them setting `role = 'mentor'`, which would unlock everyone's data. **Fix:** the
`profiles` table now has *no* write policy at all. Names are set once by the
signup trigger; roles can only be changed in the Supabase dashboard. With RLS on
and no write policy, all browser writes to `profiles` are denied.

### FIXED — Medium: stored XSS via a resource link
Resource URLs were written straight into `<a href>`. A `javascript:…` URL would
run code when clicked. **Fix, three layers:** (1) the client only accepts
absolute `http(s)` links on input; (2) at render, a `safeUrl()` check means an
unsafe URL is shown as plain text with no link; (3) the database itself rejects
any `resources.url` that doesn't match `^https?://`. Verified: `javascript:` and
`data:` payloads are blocked at every layer.

### FIXED — Low: author spoofing on insert
`feedback` / `resources` inserts now require `author_id = auth.uid()`, so a row
can't be attributed to someone else.

### FIXED — Low: unbounded text → storage-exhaustion abuse
All text columns now have length limits (e.g. milestone title ≤ 300, feedback
≤ 10 000, notebook ≤ 20 000 chars). Stops a single account ballooning the free
tier with giant rows.

### FIXED — Low: missing hardening headers
`vercel.json` now sends `Content-Security-Policy` (strict `script-src 'self'` —
no inline scripts, no third-party script origins; `frame-ancestors 'none'`),
`X-Frame-Options: DENY` (clickjacking), `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy`, and HSTS.

### FIXED — Low: login user-enumeration
The login screen used to say "not on the programme list" for unknown emails,
revealing whether an address was registered. It now returns one neutral message
("if that email is on the programme, a link is on its way") whether the email
exists or not. Only non-revealing errors (rate limit, network) are surfaced.

### FIXED — Low: third-party runtime dependency (supply chain)
`supabase-js` used to load from `esm.sh` at runtime — third-party code with full
access to the session. It is now **vendored locally** (`vendor/supabase.umd.js`,
pinned to `@2.108.2`), so nothing third-party executes in the page, and the CSP
is tightened to `script-src 'self'`. To update the library later, replace that
one file with a newer pinned build.

## Added — 22 June 2026: mentor contact + communication log + overview controls

New tables `mentor_settings` and `communications`, plus `milestones.show_on_overview`
(migration: `migrations/2026-06-22-communication.sql`, also folded into `schema.sql`).
Audited as "malicious fellow" and "random stranger":

- **The contact email never reaches the public page.** `mentor_settings` is
  `revoke all … from anon` — the anon role cannot read the table at all. The
  public overview reads the `overview_settings` view, which selects only the four
  boolean section flags and **not** the email column. Confirmed in the browser:
  the rendered public overview contains no email string and no `mailto:` link.
- **Communication is private by default and curated in the DB.** A new
  `communications` row is forced (`WITH CHECK`) to be born `received_at IS NULL`
  and `show_on_overview = false` — a fellow cannot self-publish or fake a receipt.
  Only the mentor can `UPDATE` (so only the mentor sets "received" and toggles
  overview visibility). A fellow may delete their own row **only while unreceived**,
  so acknowledged history can't be erased.
- **Even when published, only counts + dates go public.** The
  `programme_communications` view exposes `messages_total`, `received_total`,
  `last_sent`, `last_received` — the **subject text is never selected**, so it
  cannot leak. The view is gated twice: per-row `show_on_overview` AND the
  section-wide `show_communication` flag.
- **Per-item overview control is enforced in the views, not the browser.**
  `programme_milestones` and the milestone counts in `programme_overview` now
  filter on `show_on_overview` and the `show_milestones` flag, so a hidden
  milestone is absent from the public page even for a hand-made API call.
- **Section toggles (`show_activity`, `show_mentor_impact`).** These hide
  count-only blocks the page already treated as public-safe; gating is in the
  page. No private content is behind them, so this is presentation, not a
  perimeter. (Milestones and communication — which carry titles/relationship
  data — are gated in the database, above.)
- **mailto safety.** The mailto link is built only from a regex-validated address
  via `mailtoHref()`; raw input is never concatenated into the URL. CSP is
  unaffected (mailto navigation isn't a fetch/`connect-src` directive).

## Reviewed and confirmed SOUND (no change needed)

- **RLS read isolation.** A fellow can only `SELECT` their own milestones,
  feedback (published-to-them), and notebook. Cross-fellow reads return nothing.
  Traced every policy as a "malicious fellow": cannot read, insert, update, or
  delete across the boundary.
- **Update can't move a row across the boundary.** The `UPDATE` policies omit
  `WITH CHECK`, which in Postgres means the `USING` clause is reused as the
  check — so a fellow can't reassign their milestone's `fellow_id` to someone
  else.
- **Anonymous strangers get nothing.** All policies are `to authenticated`. With
  RLS enabled and no `anon` policy, an unauthenticated caller with the anon key
  can read/write **zero** rows.
- **No SQL injection.** All queries use the Supabase client's parameterised
  filters; the `SECURITY DEFINER` functions use fixed logic + `auth.uid()` and
  set a fixed `search_path`.
- **No DOM XSS via names/titles/bodies.** All user text is rendered with
  `textContent`, never `innerHTML`. (The only `innerHTML` use, in `timeline.js`,
  renders hardcoded strings.)
- **Demo data is fully isolated** from real data — see the data-isolation note
  in the project; demo never touches the database.

## Residual risks you should know about (accepted, low)

- **The mentor's email is the master key.** Anyone who can read that inbox can
  request a magic link and become mentor. Keep that account secured (strong
  password + 2FA on the email itself).
- **Trusted-insider abuse.** A fellow can spam *their own* notebook/milestones
  (not another fellow's). Length limits cap per-row size; a determined insider
  could still create many rows. Acceptable for a small group of known users;
  watch the Supabase usage meter.
- **Demo mode is reachable in production** via `?demo=1` (shows fake data only,
  no login, nothing saved). Harmless, but can be disabled if you prefer.

---

## Required Supabase settings (the other half of security)

These are **not** in the code — you must set them in the dashboard, and they
matter as much as the RLS:

1. **Authentication → Providers / Sign In:** turn **OFF** "Allow new users to
   sign up". This is the allowlist — without it, anyone could create an account.
2. **Authentication → URL Configuration:** set **Site URL** and **Redirect URLs**
   to your exact deployed domain (e.g. `https://your-app.vercel.app`). This stops
   an attacker crafting a login link that redirects someone's token elsewhere.
   Do **not** use a wildcard.
3. **Run the current `schema.sql`** (it contains all the fixes above) for a fresh
   project. For an **existing** database, run `migrations/2026-06-22-communication.sql`
   once in the SQL Editor — it is idempotent and adds the mentor-contact,
   communication-log and overview-control objects without touching existing data.
4. **Never put the `service_role` key in `config.js`** or anywhere client-side —
   only the `anon` key belongs there. (Currently correct.)
5. **Region:** pick the Supabase region closest to your team, or the one that
   matches your data-residency / privacy obligations (e.g. an EU region for GDPR).

## How to re-verify after deploy

- Open the live site, sign in as a fellow, open devtools console, and run a
  cross-boundary read, e.g. try to select another fellow's notebook. It should
  return an empty list — RLS blocking it.
- Check the Network tab shows the security headers and CSP on the document.
- Confirm `?demo=1` shows only sample data and never writes.

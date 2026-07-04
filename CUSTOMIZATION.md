# Customization

Everything you can change, with the **exact file and what to edit**. None of this
requires a build step — edit, save, redeploy (or just refresh locally).

- [The basics (`config.js`)](#the-basics-configjs)
- [Programme dates and length](#programme-dates-and-length)
- [The coloured tracks](#the-coloured-tracks)
- [Fellows (add, remove, rename)](#fellows-add-remove-rename)
- [The public overview](#the-public-overview)
- [The practice bar](#the-practice-bar)
- [Colours and fonts](#colours-and-fonts)
- [Extending the database (add your own table)](#extending-the-database-add-your-own-table)

---

## The basics (`config.js`)

Everything in [`config.js`](config.js) is safe to edit freely:

| Field | What it does |
|---|---|
| `supabaseUrl` | Your Supabase Project URL. |
| `supabaseAnonKey` | Your Supabase **anon public** key (safe to publish). |
| `programmeName` | Shown in the app header, the report, and the overview. |
| `programmeSub` | The small subtitle under the name. |
| `sandboxUrl` | The link the [practice bar](#the-practice-bar) opens. |

If `supabaseUrl`/`supabaseAnonKey` still contain `YOUR-...`, the app runs in
**demo mode** — handy for previewing changes without a database.

---

## Programme dates and length

The whole timetable — dates, length, which months have a weekly rhythm, the launch
window, and the rail markers — is driven by **one block in [`config.js`](config.js)**.
Change it there and the journey map, the "% through" progress bar, the month
headings and the weekly grid all follow automatically. The default is a 7-month,
June–December 2026 programme; here it is set to a 5-month, January–May 2027 one:

```js
timeline: {
  start: '2027-01-15',      // first day of the programme (YYYY-MM-DD)
  end:   '2027-05-31',      // last day
  months: [
    { key: '2027-01', weekly: true, kickoff: true },   // launch month
    { key: '2027-02', weekly: true, flag: 'Mid-term' },// marker after February
    { key: '2027-03', weekly: true },
    { key: '2027-04', weekly: true },
    { key: '2027-05', weekly: false }                  // reporting month, no weekly rhythm
  ],
  startFlag: 'Launch',      // marker at the very start of the rail ('' hides it)
  endFlag:   'Closing',     // marker at the very end ('' hides it)
  kickoff: { day: 15, label: 'Programme kickoff', dates: '15–17 Jan' }
}
```

Field by field:

- **`start` / `end`** — the programme's first and last day. These drive the
  progress bar and the "Starts …" / "Complete" labels. Nothing else needs the year.
- **`months`** — one row per month on the rail, **in order**. `key` is `'YYYY-MM'`;
  the month name, abbreviation and year are derived from it, so you never repeat the
  year. `weekly: true` shows that month's feedback + check-in rhythm; `kickoff: true`
  marks the launch month; `flag: 'Text'` drops a labelled marker on the rail right
  after that month.
- **`startFlag` / `endFlag`** — the markers that bookend the rail. Set to `''` to
  hide either.
- **`kickoff`** — the highlighted launch window shown inside the kickoff month:
  `day` is the day the highlight attaches to, `label` and `dates` are the text.

**One database note.** The schema already accepts **any** year and month (the
`timeline_events.month_key` and `weekly_checks.week_key` checks in
[`schema.sql`](schema.sql) validate the `YYYY-MM` shape, not a specific year), so
you normally don't touch the database when you change dates. Only edit those two
`check` regexes if you want to *restrict* input to your exact range.

> The example activities seeded in `schema.sql` (the `insert into
> public.timeline_events …` block) and the demo data (`defaultTimeline()` in
> [`app.js`](app.js), `sampleTimeline()` in [`overview.js`](overview.js)) use the
> default 2026 month keys. If you change your dates, update those keys too so the
> seeded/demo activities line up with your new months (real activities you add in
> the app are unaffected).

---

## The coloured tracks

Every timetable activity belongs to a **track** — a colour + label. They're
defined once in [`timeline.js`](timeline.js):

```js
const TRACKS = {
  training:  { label: 'Training',   cls: 'training',  color: '#2f6fb2' },
  labs:      { label: 'Labs',       cls: 'labs',      color: '#d05a48' },
  programme: { label: 'Programme',  cls: 'programme', color: '#4f8a3d' },
  mentor:    { label: 'Mentorship', cls: 'mentor',    color: '#b07d10' },
  milestone: { label: 'Milestone',  cls: 'mile',      color: '#e8a512' }
};
```

**To rename a track:** change its `label` only. That updates the picker, the cards,
and the legend automatically. Also update the legend text in the same file (the
`.ainj-legend` block) and the picker options (the `[['training','Training'], …]`
array in the add-activity form) — they're spelled out for clarity rather than
generated.

**To recolour a track:** change its `color`, and the matching CSS variables at the
top of [`styles.css`](styles.css) (`--training`, `--training-bg`, `--training-ln`,
etc.). Note these colour tokens are also reused by general UI (buttons, pills,
states), so a track's colour is effectively part of the app palette.

**To add a brand-new track:** add a `TRACKS` entry with your own key, add a matching
set of `--yourkey` / `--yourkey-bg` / `--yourkey-ln` CSS variables in `styles.css`,
add the key to the `track in (...)` check in [`schema.sql`](schema.sql), and add it
to the legend and the add-activity picker in `timeline.js`.

---

## Fellows (add, remove, rename)

There is **no fixed number of fellows** and no list to edit — roles are assigned
automatically:

- **Add a fellow:** invite their email in Supabase → **Authentication → Users →
  Invite user**. Anyone who isn't the mentor email becomes a fellow on first
  sign-in.
- **The mentor** is whoever signs in with the address in `mentor_email()` (see
  [`schema.sql`](schema.sql) / [SETUP step 2](SETUP.md#step-2--set-the-mentor-email-do-this-before-running-the-schema)).
- **Remove someone:** delete the user in Supabase → **Authentication → Users**.
  Their rows cascade-delete (milestones, notebook, etc. are removed with them).
- **Rename what shows publicly:** as the mentor you can set a fellow's
  **display name** in the app; or edit `profiles.display_name` in the Supabase
  **Table Editor**. The public overview shows `display_name` (falling back to
  "Fellow").

> The names **Fellow A / Fellow B** you see with `?demo=1` are only demo data
> (`app.js`, `overview.js`, `report.js`). They never appear once real users sign in.

---

## The public overview

The mentor controls what the logged-out `/overview` page shows, via four toggles
stored in the `mentor_settings` table:

| Flag | Hides/shows |
|---|---|
| `show_milestones` | Milestone titles + progress bars (gated in the database). |
| `show_communication` | The "mentor contact" counts + dates (gated in the database). |
| `show_activity` | Weekly-task / feedback / notebook **counts** (presentation only). |
| `show_mentor_impact` | The "Mentor's contribution" block. |

Set them from the mentor's **Contact & public overview** panel in the app, or
directly in the Supabase **Table Editor** (`mentor_settings`, the single `id = 1`
row). Milestone
and communication visibility is enforced in the SQL **views**, not the browser, so
hidden items never reach the page even via a hand-made API call
([details in SECURITY.md](SECURITY.md)). Individual milestones can also be hidden
one-by-one (`milestones.show_on_overview`).

---

## The practice bar

The tappable bar under the header (an "always one tap away" link to any external
tool). To change it:

- **Where it points:** `sandboxUrl` in [`config.js`](config.js).
- **Its label/description:** the `.nb-sandbar-label` line in [`index.html`](index.html).
- **To remove it entirely:** delete the `<a id="sandbox-bar" …>…</a>` block in
  `index.html`.

---

## Colours and fonts

- **Colours** live as CSS variables at the top of [`styles.css`](styles.css)
  (`:root { … }`). The track palette is described [above](#the-coloured-tracks).
- **Font** is Archivo, loaded from Google Fonts in the `<head>` of each HTML file.
  Swap the `<link>` and the `font-family` in `styles.css` to change it. (If you
  self-host fonts instead, update the `font-src` in the `vercel.json` CSP.)

---

## Sending email from your own domain (optional)

By default, Supabase sends every magic link and invite through its own shared,
rate-limited mailer — fine for a small programme, but it caps at a handful of
emails per hour and its messages can land in spam. You can hand all of that email
to your own domain with a free provider like **Resend**. This is an **optional
upgrade** — the app works without it.

**Do you need it?** Probably not on day one. Reach for it when:

- you're inviting more than a handful of fellows (or all at once),
- invites landing in spam is unacceptable (e.g. fellows on strict work email),
- you run the programme across multiple cohorts, or
- you want a professional `from` address like `noreply@yourdomain.org`.

**What you need:** a domain you own plus access to its DNS settings, and a free
Resend account. About 20–30 minutes, plus some DNS-propagation waiting.

1. **Resend → add your domain.** Sign up at [resend.com](https://resend.com) →
   **Domains** → **Add Domain**. Prefer a sending subdomain (e.g.
   `send.yourdomain.org`) so this never affects your main domain's email reputation.
2. **Add the DNS records.** Resend shows a set of records (an SPF/MX record, a DKIM
   `resend._domainkey` TXT record, and an optional DMARC record). Add them wherever
   your domain's DNS is managed, then wait until Resend shows **Verified** (minutes
   to a few hours).
3. **Create an API key.** Resend → **API Keys** → create one. It doubles as your
   SMTP password. Your SMTP settings are: host `smtp.resend.com`, port `465`,
   username `resend`, password = the API key.
4. **Point Supabase at it.** Supabase → **Project Settings → Authentication → SMTP
   Settings** → enable **Custom SMTP** → sender `noreply@yourdomain.org` (must be on
   the verified domain), a sender name, then the host / port / username / password
   above. Save.
5. **Raise the rate limit.** Supabase → **Authentication → Rate Limits** → increase
   "emails per hour". The low default was tied to the built-in mailer; bump it now
   or you'll still be throttled.
6. **Test it.** Invite a throwaway address and confirm the email arrives from your
   domain and lands in the inbox, not spam.

> **Security:** the Resend API key is a secret. It lives only in Supabase's SMTP
> settings — never in `config.js`, never in your repository. (Same rule as the
> `service_role` key.)

**If it misbehaves:**

- *Domain won't verify* — DNS records take time to propagate; re-check each record
  was pasted exactly (watch for trailing dots some hosts add automatically).
- *Emails still land in spam* — add the DMARC record Resend suggests and send a few
  real messages to warm up the domain.
- *"Sender not allowed" / rejected* — the sender address must be on the exact domain
  you verified (a subdomain counts).

---

## Extending the database (add your own table)

Building on top? Follow the same pattern the existing tables use so RLS keeps
protecting you. Minimal recipe for a fellow-owned table:

```sql
-- 1) the table, owned by a fellow
create table public.my_thing (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- 2) turn RLS ON and grant the base table privileges
alter table public.my_thing enable row level security;
grant select, insert, update, delete on public.my_thing to authenticated;
revoke all on public.my_thing from anon;   -- strangers get nothing

-- 3) policies: the mentor sees all; a fellow sees/edits only their own
create policy "my_thing_select" on public.my_thing for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "my_thing_write" on public.my_thing for insert
  to authenticated with check (public.is_mentor() or fellow_id = auth.uid());
```

Key rules of thumb (all demonstrated in `schema.sql`):

- **Always** `enable row level security` **and** `revoke all … from anon`.
- Use the helper `public.is_mentor()` for mentor-only access.
- For anything you want on the **public overview**, don't expose the table to
  `anon` — create a **view** that selects only the safe columns and
  `grant select … to anon`, exactly like `programme_overview` does.
- Add read-only calls in the page via `sb.from('my_thing').select(...)`.

When changing an existing database, put your SQL in a new file under
[`migrations/`](migrations/) and make it idempotent (`create table if not exists`,
`create or replace`, `drop policy if exists`) so it's safe to re-run — mirror the
style of `migrations/2026-06-22-communication.sql`.

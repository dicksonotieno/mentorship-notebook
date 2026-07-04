# Mentorship Notebook

A tiny, private notebook for running a **mentorship programme** — one mentor and
a small group of fellows. Track each fellow's journey, exchange feedback, keep a
private notebook, share resources, and publish a clean read-only overview for
organisers. It runs entirely on **free tiers** (a static site + a Supabase
database) and has **no backend to maintain**.

Built by **[Dickson Otieno](https://dicksonotieno.com)**.

> **Privacy is enforced by the database, not the page.** Postgres row-level
> security (RLS) means one fellow can never read another's data — even if they
> tamper with the browser. See [`SECURITY.md`](SECURITY.md).

---

## See it in 30 seconds (no setup)

Open **`index.html?demo=1`** in a browser — or click **"Explore in demo mode"**
on the sign-in screen. You get sample data, three personas to switch between
(Mentor, Fellow A, Fellow B), and nothing is saved. This is the fastest way to
understand what the app does before you set anything up.

To serve it locally with any static server:

```bash
# from the project folder — pick whichever you have
python3 -m http.server 8000      # then open http://localhost:8000/?demo=1
# or
npx serve                        # then open the printed URL with ?demo=1
```

(Opening `index.html` directly as a `file://` also works for a quick look, but a
local server is closer to how it runs in production.)

---

## What's inside — four tabs

| Tab | What a **fellow** sees | What the **mentor** sees |
|---|---|---|
| **Journey** | Where they are, what's next, the full programme timetable, and their own milestones to add and tick off | Pick a fellow at the top, then see their progress, milestones and the timetable; add/remove timetable activities |
| **Feedback** | Reads the mentor's notes to them | Writes feedback to the chosen fellow |
| **Notebook** | Their own private space to log progress and jot ideas | Reads the chosen fellow's notebook (read-only) |
| **Resources** | Reads links shared by the mentor | Adds links for everyone |

Plus:

- **Public overview** (`/overview`) — a read-only, no-login page showing each
  fellow's progress **counts** and milestone titles only. No feedback text, no
  notebook content, no emails. Everything on it is curated in the database.
- **Mentor report** (`/report`) — a printable "impact at a glance" summary for
  the mentor (sessions logged, hours, feedback written, milestones guided).
- **Practice bar** — an always-visible, tappable link under the header pointing
  at any external tool you want your team to use (configurable).

---

## How it works (architecture at a glance)

```
Browser (static HTML/CSS/JS)  ──►  Supabase (Postgres + Auth)
        │                                  │
        │  supabase-js (vendored)          ├─ Row-level security = the real perimeter
        │  no build step, no framework     ├─ Magic-link auth (passwordless)
        └─ config.js holds the public      └─ Anon public key only (never service_role)
           anon key + your project URL
```

- **No backend of your own.** The pages talk directly to Supabase. All access
  rules live in Postgres RLS policies ([`schema.sql`](schema.sql)), so the
  untrusted browser can only ever do what the database allows.
- **The anon key is meant to be public.** It ships in
  [`config.js`](config.js) and grants a stranger *nothing* — RLS denies all
  anonymous reads/writes except the curated public-overview views.
- **No build, no framework, no trackers.** Plain ES modules and one vendored
  library ([`vendor/supabase.umd.js`](vendor/supabase.umd.js), MIT).

**Cost:** Vercel Hobby + Supabase Free comfortably cover a small programme
forever. (Supabase pauses a free project after ~1 week of no activity; one click
un-pauses it.)

---

## Get started

0. **[WALKTHROUGH.md](WALKTHROUGH.md)** — **never used GitHub before? Start
   here.** A zero-jargon, browser-only walkthrough that takes a first-timer
   from creating a GitHub account to a live dashboard with fellows signed in.
1. **[SETUP.md](SETUP.md)** — the condensed walkthrough for people comfortable
   with GitHub/deploys: create the database, deploy the site, connect auth,
   invite your team. ~20 minutes, all free. Ends with a "verify your install"
   checklist.
2. **[CUSTOMIZATION.md](CUSTOMIZATION.md)** — rename the programme, change the
   dates, rename the coloured tracks, add or remove fellows, tune the public
   overview, and extend the database.
3. **[SECURITY.md](SECURITY.md)** — the security model and the **Supabase
   dashboard settings you must apply by hand** before going live. Read this
   before inviting anyone.
4. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — fixes for the problems
   first-timers actually hit (magic link goes to localhost, "Invalid API key",
   nobody can sign in, paused project, and more).

---

## Project layout

```
index.html          Sign-in + the four-tab app
overview.html       Public read-only overview        → served at /overview
report.html         Printable mentor report          → served at /report
config.js           Your Supabase URL + anon key + programme name  ← edit this
app.js              The app (auth, tabs, data layer, demo data)
overview.js         Public overview logic
report.js           Mentor report logic
timeline.js         The journey/timetable component + track definitions
styles.css          All styling (one file, CSS variables at the top)
schema.sql          The whole database — run once in Supabase
migrations/         Idempotent migrations for an existing database
vendor/             supabase-js, vendored locally (no runtime CDN)
vercel.json         Rewrites (/overview, /report) + security headers/CSP
```

---

## Credits

Designed and built by **[Dickson Otieno](https://dicksonotieno.com)**.

Uses [supabase-js](https://github.com/supabase/supabase-js) (MIT), vendored
locally in `vendor/`.

## License

[MIT](LICENSE) © 2026 Dickson Otieno. Free to use, modify, and build upon.

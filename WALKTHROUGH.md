# The complete beginner's walkthrough

**From "I've never used GitHub" to "my fellows just signed in to our dashboard."**

This guide assumes **zero** technical background. You don't need to install
anything, you won't type a single command, and everything happens in your web
browser. If you can fill in a form and copy-paste, you can do this.

> Already comfortable with GitHub and deploys? [SETUP.md](SETUP.md) is the
> shorter, denser version of this. (It does the same steps in a slightly
> different order — both orders work.) This page is the scenic route with
> guardrails.

**What you'll have at the end:** your own private mentorship dashboard, at your
own web address, where you (the mentor) and your fellows sign in with just their
email — no passwords — and outsiders can see only a tidy read-only progress page.

**What you need:**

- An email address you control (this becomes your "mentor key" — guard it well)
- Your fellows' email addresses
- About **45–60 minutes**, once, and it's free — no credit card anywhere

**The journey, at a glance:**

| Part | What happens | Time |
|---|---|---|
| [1. Create your accounts](#part-1--create-your-accounts) | One GitHub account unlocks everything | ~5 min |
| [2. Get your own copy](#part-2--get-your-own-copy-of-the-dashboard) | "Fork" the dashboard to your GitHub | ~2 min |
| [3. Put it on the internet](#part-3--put-it-on-the-internet) | Deploy to Vercel — see it live in demo mode | ~5 min |
| [4. Create the database](#part-4--create-the-database) | Supabase project + one big copy-paste | ~10 min |
| [5. Lock the door](#part-5--lock-the-door) | Make it invite-only | ~2 min |
| [6. Connect site ↔ database](#part-6--connect-your-site-to-your-database) | Two values into one file, in the browser | ~5 min |
| [7. Teach sign-in where home is](#part-7--teach-the-sign-in-emails-where-home-is) | So magic links land on *your* site | ~3 min |
| [8. Invite your team](#part-8--invite-yourself-then-your-fellows) | You first, then your fellows | ~5 min |
| [9. Check everything](#part-9--the-final-checks) | A short checklist proves it's private | ~5 min |
| [10. Make it yours](#part-10--make-it-yours) | Your programme name, your dates | ~10 min |

---

## Words you'll meet (a tiny glossary)

You'll see these five words a lot. Here's all you need to know:

- **GitHub** — a website where people store and share project files. The
  dashboard's files live there. Think "Google Drive for app code".
- **Repository** (or "repo") — GitHub's word for one project's folder of files.
  The dashboard is one repository.
- **Fork** — GitHub's word for "make me my own copy of this repository". Your
  fork is yours; changing it never affects the original.
- **Deploy** — turning those files into a real, live website with an address.
- **Vercel** — the (free) service that does the deploying and hosts your site.
- **Supabase** — the (free) service that stores your data — who's signed up,
  milestones, feedback, notebook entries — and handles email sign-in.
- **Magic link** — instead of a password, the site emails you a special link;
  clicking it signs you in. That's how everyone gets into your dashboard.

That's the whole vocabulary. Everything else is clicking buttons.

> One heads-up on a confusing word: Vercel and Supabase each call their own
> control page a "dashboard" too. In this guide, "the dashboard" always means
> the mentorship dashboard you're building — for the other two we'll say
> "your Vercel home page" and "the Supabase control panel".

---

## Part 1 — Create your accounts

You'll create **one** account with a password (GitHub), then use it to sign in
to the other two services. One key, three doors.

### 1a. GitHub

1. Go to **[github.com](https://github.com)** and click **Sign up**.
2. Use your normal email, pick a username (this appears in your dashboard's web
   address later, e.g. `github.com/sunrise-mentor` — so pick something you're
   happy seeing in a link) and a strong password.
3. Verify the email GitHub sends you. (Can't find it? Check spam — you must
   verify before Part 2 will let you fork.)

### 1b. Vercel — sign in *with* GitHub

1. Go to **[vercel.com](https://vercel.com)** and click **Sign Up**.
2. Choose the **Hobby** (free) plan if asked. Vercel may ask a couple of other
   questions (your name, what you're building) — any honest answer is fine;
   none of it matters here.
3. Click **Continue with GitHub**. A GitHub page will appear saying Vercel
   wants to access your account — **this is normal and safe**; it's how the
   two services link up. Click the green **Authorize** button. No new password
   to remember.
   - *Accidentally signed up with email instead?* No harm done — Vercel will
     offer to connect GitHub later, in Part 3.

### 1c. Supabase — same trick

1. Go to **[supabase.com](https://supabase.com)** → **Start your project**.
2. Click **Continue with GitHub** and **Authorize** — the same approval screen
   as before, equally safe.

> ✅ **Checkpoint:** you can open github.com, vercel.com and supabase.com and
> you're signed in on all three. That was the boring part — done forever.

---

## Part 2 — Get your own copy of the dashboard

> 💡 Do this part (and Part 6) **on a computer** if you can — GitHub's phone
> layout hides the buttons we need. If a phone is all you have, open your
> browser's menu and tick "Request desktop site" first.

1. Open the dashboard's home:
   **[github.com/dicksonotieno/mentorship-notebook](https://github.com/dicksonotieno/mentorship-notebook)**
2. Near the top-right, click the **Fork** button.
3. On the "Create a new fork" page, leave everything as it is and click
   **Create fork**.
4. After a few seconds you land on **your** copy — the address bar now says
   `github.com/YOUR-USERNAME/mentorship-notebook`.
5. **Bookmark this page** — you'll come back to it in Parts 4, 6 and 10. (Lost
   it anyway? On github.com, click your picture in the top-right → **Your
   repositories** → **mentorship-notebook**. Always glance at the address bar:
   it should show *your* username, not `dicksonotieno` — otherwise you're
   looking at the original, and edits there won't reach your site.)

That's it. You now own a complete copy of the dashboard. You can't break the
original, and nobody else can touch yours.

> 💡 **Worried about privacy?** The files themselves contain no data — data will
> live in *your* Supabase database, which is never public. Your fork can stay
> public (simplest) or you can make it private later in the fork's
> **Settings → General**, in the section GitHub melodramatically calls the
> "Danger Zone" → **Change visibility**. (Despite the name, it's reversible.)
> Either way works; the app's privacy does not depend on it (see
> [SECURITY.md](SECURITY.md)).

> ✅ **Checkpoint:** the page title reads `YOUR-USERNAME/mentorship-notebook`,
> with "forked from dicksonotieno/mentorship-notebook" under it.

---

## Part 3 — Put it on the internet

Here's the fun part: we deploy **before** doing any database work, because the
dashboard has a built-in **demo mode** — it runs with sample people ("Fellow A",
"Fellow B") until it's connected to a real database. You get to see and click
around your live site within minutes.

1. Go to **[vercel.com](https://vercel.com)** → you're on your Vercel home
   page.
2. Click **Add New…** (top right) → **Project**.
3. Vercel shows a list of your GitHub repositories. Find
   **mentorship-notebook** and click **Import**.
   - *Don't see it in the list?* Click **Adjust GitHub App Permissions** (or
     "Configure GitHub App"). A GitHub page opens: choose **Only select
     repositories**, pick **mentorship-notebook** from the dropdown, and click
     **Save**. You'll be sent back to Vercel and the repository now appears.
4. On the "Configure Project" screen you shouldn't need to touch anything. The
   one thing to glance at: if **Framework Preset** shows something other than
   **Other**, change it to **Other** (this project has no framework). Ignore
   every other setting on the page.
5. Click **Deploy** and watch it go. ~30 seconds.
6. Click through to your new project (the button is usually **Continue to
   Dashboard**; naming varies) and open the site with the **Visit** button.
   It opens at an address like
   `https://mentorship-notebook-abc123.vercel.app`.

You'll see a sign-in screen with a yellow note: **"Setup needed: Supabase keys
are not configured yet…"**. That's expected — no database yet.

7. Click **Explore in demo mode**. Welcome to your dashboard! Click through
   **Journey**, **Feedback**, **Notebook**, **Resources**. Use the switch links
   in the banner to view it as the Mentor, Fellow A, or Fellow B. Nothing here
   is saved — it's a preview with sample data.

> 💡 **Bookmark your site's address now** — it's your dashboard's permanent
> home. Use the address the **Visit** button opens (the short one) — not any
> longer address with extra random words you may see on the build screen;
> those point to one frozen snapshot, not your living site. (You can add a
> prettier custom domain later in Vercel → Settings → Domains, but the free
> `.vercel.app` address works forever.)

> ✅ **Checkpoint:** you clicked around your own live site in demo mode. If the
> page is blank or errors, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Part 4 — Create the database

Now the engine room. Supabase gives you a private database; you'll set it up
with one big copy-paste.

### 4a. New project

1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)** (the
   Supabase control panel).
   - If Supabase first asks you to create an **organization**, that's just its
     word for "your workspace" — give it any name, keep the **Free** plan, and
     continue.
2. Click **New project** and fill in:
   - **Name:** anything — e.g. `mentorship-db`
   - **Database Password:** click **Generate a password**, then copy it
     somewhere safe (a password manager). You'll almost never need it, but
     don't lose it.
   - **Region:** pick the one closest to you and your fellows. (If your
     organisation has data-residency rules — e.g. GDPR — pick a region that
     satisfies them. This can't be changed later.)
3. Click **Create new project** and wait ~2 minutes while Supabase sets it up
   (you'll see a progress screen).

### 4b. The one big copy-paste (with ONE edit)

The whole database — tables, privacy rules, a starter timetable — is defined in
a single file called `schema.sql`. You'll paste it into Supabase and run it.

1. In a **new browser tab**, open your fork on GitHub and click the file
   **`schema.sql`**.
2. Click the **copy button** (two overlapping squares, top-right of the file
   view) — this copies the entire file.
3. Back in Supabase: left sidebar → **SQL Editor** → **New query** (or the `+`).
4. Paste everything into the big text box.
5. **THE ONE EDIT — do not skip this.** Near the very top of what you pasted,
   find this line:

   ```sql
   language sql immutable as $$ select 'mentor@example.com' $$;
   ```

   Change `mentor@example.com` to **the exact email YOU will sign in with** —
   typed in **all lowercase**, with no spaces before or after it. This is how
   the database recognises you as the mentor: anyone signing in with this
   address becomes the mentor; everyone else becomes a fellow. **Use exactly
   this same spelling when you invite yourself in Part 8.**

   *Example:* if you'll sign in as `amara@sunrisefellowship.org`, the line
   becomes:

   ```sql
   language sql immutable as $$ select 'amara@sunrisefellowship.org' $$;
   ```

   💡 Use **Ctrl+F** (Mac: **Cmd+F**) inside the editor and search for
   `mentor@example.com`. **You'll find it twice** — change **both**. The first
   (near the top, in the `mentor_email()` line shown above) is the important
   one that makes you the mentor. The second, much further down (a
   `mentor_settings` line), is just the default contact email your fellows
   will see — worth fixing now, but also changeable later inside the app.

6. Click **Run** (bottom right of the editor, or Ctrl/Cmd+Enter).
7. **Success looks like:** a green **"Success. No rows returned"** message.
   (That odd phrase just means "everything was created; there was nothing to
   display" — it's the good outcome.)

> ⚠️ If you see an error mentioning something "already exists", you probably ran
> the file twice. That's harmless for you at this stage — the database is
> already set up. Carry on. Any **other** red error almost always means the
> paste or the email edit went slightly wrong (a lost quote mark, an
> incomplete paste). Nothing is broken — select everything in the editor,
> delete it, and repeat steps 1–6 fresh.

> ✅ **Checkpoint:** in Supabase, open **Table Editor** (left sidebar) — you
> should see tables named `profiles`, `milestones`, `feedback`, `notebook`,
> `resources` and more. That's your dashboard's filing cabinet, ready and empty.

---

## Part 5 — Lock the door

Out of the box, Supabase lets anyone create an account. You want a guest list,
not an open door.

1. In Supabase: left sidebar → **Authentication**.
2. Open **Sign In / Providers** (on some versions this is under **Providers →
   Email** or "Sign In / Up").
3. Find the toggle **"Allow new users to sign up"** and switch it **OFF**.
4. Save if asked.

> ⚠️ Turn off only **"Allow new users to sign up"** — leave the **Email**
> provider itself switched **ON**. If Email is off, nobody (including you) can
> receive sign-in links at all.

From this moment, the *only* people who can ever get in are the ones you
explicitly invite in Part 8. Everyone else — even with the link, even with the
app's public key — gets nothing.

> ✅ **Checkpoint:** the signup toggle shows off/disabled.

---

## Part 6 — Connect your site to your database

Your live site and your database don't know each other yet. Introducing them
takes two copied values and one file edit — all in the browser.

### 6a. Copy two values from Supabase

1. In Supabase: **Project Settings** (gear icon, bottom of left sidebar) →
   **API**. Depending on your Supabase version, the two values below live on
   this one page or on two neighbouring ones (**Data API** for the URL,
   **API Keys** for the key) — check both if you only find one.
2. You need exactly two things:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - the **public** API key — a long string of letters and numbers. Depending
     on the version it's labelled **`anon` `public`** or **Publishable** (and
     starts with `sb_publishable_` or `eyJ`). Same thing; that's your key.
3. ⚠️ **Do NOT copy the key labelled `service_role` or `Secret`.** That one is
   the master key to your raw data and must never leave the Supabase control
   panel. The public/anon key, by contrast, is *designed* to be shared — it
   only lets people do what the privacy rules you installed in Part 4 allow
   (which, for strangers, is nothing).

### 6b. Edit `config.js` on GitHub — with the pencil

1. Open your fork on GitHub and click the file **`config.js`**.
2. Click the **pencil icon** (✏️, top right of the file view) — the file
   becomes editable right in your browser.
3. Find these two lines (there's a comment line between them in the file):

   ```js
   supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
   supabaseAnonKey: 'YOUR_ANON_PUBLIC_KEY',
   ```

   Replace the placeholder text **between the quotes** with your two values —
   paste carefully, with no spaces or line breaks around them. Keep the quotes
   and the commas exactly as they are. Afterwards it looks like (yours will
   differ):

   ```js
   supabaseUrl: 'https://abcdefghijkl.supabase.co',
   supabaseAnonKey: 'sb_publishable_AbC123...the-rest-of-your-key',
   ```

4. While you're here, you may also personalise (optional, more in Part 10):

   ```js
   programmeName: 'Sunrise Storytelling Fellowship',
   programmeSub: 'Sunrise Media Lab · Feb – Jul 2027',
   ```

5. Click the green **Commit changes…** button (top right). A box appears —
   make sure **"Commit directly to the `main` branch"** is selected (not
   "Create a new branch"), ignore the other fields, and click **Commit
   changes**. ("Commit" is GitHub's word for "save".)
   - Quick sanity check first: the address bar should say
     **YOUR-USERNAME**/mentorship-notebook. If it says `dicksonotieno`, you're
     editing the *original* by mistake — go to your fork (Part 2, step 5) and
     redo the edit there.

> ⚠️ **If your site ever shows only "Loading the notebook…" and never
> finishes,** you almost certainly lost a quote `'` or comma `,` while editing
> this file. Don't panic — GitHub keeps every version, so nothing is ever
> lost: open `config.js` in your fork → click **History** (top right) → open
> the last version that worked → copy its contents → edit the file and paste
> them back, then redo your changes carefully. This is the universal undo for
> any file edit in this guide.

### 6c. Watch the magic

Because Vercel is connected to your GitHub, **saving the file automatically
re-deploys your site**. Give it a minute, then open your Vercel URL again
(hard-refresh: Ctrl+Shift+R, Mac: Cmd+Shift+R).

> ✅ **Checkpoint:** the yellow "Setup needed" note is **gone** from your sign-in
> screen. The site is now talking to your database. (Don't try to sign in yet —
> two short steps first.)
>
> *Note still there?* Wait two more minutes and hard-refresh again — Vercel may
> still be building. If it persists: re-open `config.js` on GitHub and check
> both values sit between the quotes with no extra spaces, and that your commit
> went to the `main` branch of **your** fork (step 5 above). Still stuck? See
> [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Part 7 — Teach the sign-in emails where home is

When someone signs in, they get an email with a **magic link**. Supabase needs
to know your site's address, or those links will try to open the wrong place.

1. In Supabase: **Authentication** → **URL Configuration**.
2. **Site URL:** paste your Vercel address, e.g.
   `https://mentorship-notebook-abc123.vercel.app` — exactly as it appears in
   your browser, no trailing slash needed.
3. Under **Redirect URLs**, click **Add URL** and add the same address.
4. Save.

> ⚠️ Use your **exact** address. No wildcards (`*`), no typos — this exactness
> is a security feature: it stops attackers redirecting sign-in links to their
> own sites.

> ✅ **Checkpoint:** Site URL shows your real Vercel address.

---

## Part 8 — Invite yourself, then your fellows

Remember: signups are off. Invitations are the only way in — and you send them
from Supabase, not from the app.

> ⚠️ **Did you do Part 7 first?** If not, the invitation links below will open
> the wrong address and waste themselves. Set the Site URL, then come back.

1. In Supabase: **Authentication** → **Users** → **Add user** → **Send
   invitation** (wording varies slightly; you want the *invite* option, not
   "create user").
   - *Clicked "Create user" by mistake?* No email gets sent — but nothing's
     broken: that person can simply go to your site, type their email, and
     request a sign-in link themselves.
2. **Invite yourself first**, using the *exact* mentor email from Part 4b —
   same spelling, same address, no aliases.
3. Open your inbox, find the Supabase invitation, click **Accept the invite**
   (check spam if it's not there within a couple of minutes). You'll land on
   your dashboard — **signed in as the mentor**. You'll know it worked when
   you see a **Mentor** tab in the header, the footer says *"Signed in as
   mentor"*, and the Journey tab shows a friendly *"No fellows yet"* notice.
   (The fellow-switcher appears only after your first fellow is invited —
   that's next.)
   - 🚨 **No Mentor tab — you came in as a fellow?** The email you invited
     doesn't exactly match the one in Part 4b. The fix takes two minutes:
     [TROUBLESHOOTING → "The person who should be the mentor logged in as a
     fellow"](TROUBLESHOOTING.md).
4. Now invite each fellow's email the same way. When they click their invite,
   they'll land on the dashboard as fellows — each seeing only their own space.

> ⚠️ **Invite a few, then pause.** Supabase's free built-in email sender only
> delivers a handful of emails per hour. If you have more than two or three
> fellows, space the invitations out (send the rest in an hour or tomorrow) —
> otherwise the later invites simply never arrive and it *looks* like spam
> filtering. Nothing is broken; wait, then invite the rest.

> 💡 **Invitation links work once and expire after about a day.** If a fellow
> says their link "does nothing" (some work email systems secretly pre-open
> links), there's no need to re-invite: they just go to your site, type their
> email, and use the fresh sign-in link it sends. Once invited, always in.

> 💡 **Tell your fellows what to expect:** "You'll get an email from Supabase —
> click the link inside and you're in. No password. Next time, go to
> [your URL], type your email, and click the sign-in link it sends you."

> ⚠️ **Your mentor email is now the key to everything.** Anyone who can read
> that inbox can become you. Make sure that email account itself has a strong
> password and two-factor verification — the "enter the code we texted you"
> second check; search your email provider's name plus "two-step verification"
> to switch it on.

> ✅ **Checkpoint:** you're signed in with the **Mentor** tab showing; your
> fellows appear under **Authentication → Users** in Supabase as
> invited/confirmed.

---

## Part 9 — The final checks

Five minutes now saves confusion later. For several of these you'll want a
**private window** — Ctrl+Shift+N in Chrome/Edge, Ctrl+Shift+P in Firefox
(Mac: Cmd instead of Ctrl). A private window isn't signed in to anything, so
it shows your site exactly as a stranger (or a fellow on their own laptop)
sees it — a normal second tab would still be signed in as you.

Tick each one:

- [ ] **You see the mentor view.** Signed in with your mentor email, you have
      the **Mentor** tab, a fellow-switcher on the Journey tab (now that
      fellows exist), and you can write feedback.
- [ ] **A fellow sees only themselves.** In a private window (or on another
      device), sign in as a fellow — or ask one to — and confirm: no
      fellow-switcher, no other fellow's data, anywhere.
- [ ] **Strangers see only the overview.** In a private window, add
      `/overview` to the end of your address — e.g.
      `https://mentorship-notebook-abc123.vercel.app/overview` — and check it
      shows progress numbers and milestone titles only; no feedback text, no
      notebook content, no email addresses. Then visit the main address: just
      a sign-in form that won't let outsiders in.
- [ ] **Uninvited people stay out.** Still in the private window, type an
      email you never invited into the sign-in form. It should politely say a
      link is "on its way" (deliberately — the site never reveals who's on the
      list), but no working link will ever arrive for that address.
- [ ] **Magic links land on your site** — the link in the email opens your
      real `.vercel.app` address, not an error page and not an address
      starting with `localhost`. That's Part 7 working.
- [ ] **Demo mode still works** — add `?demo=1` to your address, e.g.
      `https://mentorship-notebook-abc123.vercel.app/?demo=1` — handy for
      showing people around without exposing real data. (It's clearly
      banner-labelled and saves nothing.)

All five ticked? **You're live.** 🎉 Before you pour the coffee, skim
[SECURITY.md](SECURITY.md) once — you've already done its big items (signups
off, exact redirect URL), and it explains *why* they matter.

Something failed? [TROUBLESHOOTING.md](TROUBLESHOOTING.md) covers every one of
these, symptom by symptom.

---

## Part 10 — Make it yours

Your dashboard currently wears the default outfit. Everything below is edited
the same way as Part 6b: open the file in your fork → pencil icon → change →
**Commit changes** → Vercel redeploys in about a minute.

> 💡 **You cannot permanently break anything.** GitHub keeps every version of
> every file. If the site ever misbehaves after an edit — worst case, a blank
> page stuck on "Loading the notebook…" — use the recovery recipe from Part
> 6b: open the file → **History** → restore the previous version.

### Your name and subtitle — `config.js`

```js
programmeName: 'Sunrise Storytelling Fellowship',
programmeSub: 'Sunrise Media Lab · Feb – Jul 2027',
```

These appear in the header of the app, the public overview, and the printable
mentor report.

### Your dates — `config.js`, the `timeline` block

The Journey tab's month rail, progress bar, launch window and markers are all
driven by one block. Say your programme runs **February to July 2027**, kicking
off on 3 February, with a mid-term review after April:

```js
timeline: {
  start: '2027-02-03',
  end:   '2027-07-31',
  months: [
    { key: '2027-02', weekly: true, kickoff: true },
    { key: '2027-03', weekly: true },
    { key: '2027-04', weekly: true, flag: 'Mid-term' },
    { key: '2027-05', weekly: true },
    { key: '2027-06', weekly: true },
    { key: '2027-07', weekly: false }
  ],
  startFlag: 'Launch',
  endFlag:   'Closing',
  kickoff: { day: 3, label: 'Programme kickoff', dates: '3–5 Feb' }
}
```

⚠️ One missing comma in this block blanks the whole site — edit carefully, and
if it happens, use the Part 6b recovery recipe (file → **History** → restore).

Every field is explained in
[CUSTOMIZATION.md → Programme dates and length](CUSTOMIZATION.md#programme-dates-and-length).
One footnote lives there too: the *example activities* seeded into your
timetable use the default 2026 months — the easiest fix is to delete them in
the app (each card shows an × to the mentor) and add your own with the
**+ Add to ⟨month⟩** button.

### Your fellows' display names

The public overview shows a display name you control (never their email). As
the mentor, set it in the app — or in Supabase → **Table Editor** → `profiles`
→ edit the `display_name` column.

### The practice bar

That teal bar under the header can point anywhere — a shared drive, a tools
page, a course. Change `sandboxUrl` in `config.js`; change its label text in
`index.html` (look for `Practice space`); or delete that whole `<a id="sandbox-bar" …>`
block to remove the bar.

### Everything else

Colours, track names, adding fellows, hiding things from the public overview,
even extending the database — it's all in
[CUSTOMIZATION.md](CUSTOMIZATION.md), written for the same
edit-in-browser workflow.

---

## You did it

Take stock of what you just built, without writing a line of code:

- A live dashboard at your own address, deployed from your own GitHub copy
- A private database with **row-level security** — privacy enforced by the
  database itself, not by hopes and good manners
- Passwordless sign-in, invite-only, for exactly the people you chose
- A public progress page that shares numbers, never content

**Day-to-day from here:** you and your fellows just visit the URL and sign in.
You write feedback and log sessions; they tick milestones and keep their
notebooks; organisers watch the overview. The dashboard stays awake as long as
it's used weekly (Supabase pauses *free* projects after ~1 week of total
inactivity — if that happens, one click on **Restore** in the Supabase
dashboard wakes it up).

**When the programme ends:** export each table as CSV (Supabase → Table Editor
→ Export), hand each fellow their record, and delete the Supabase project.
Clean exit, nothing lingering.

---

*Built by [Dickson Otieno](https://dicksonotieno.com). If this walkthrough got
you all the way here, it did its job — and your fellows are lucky to have a
mentor who builds them things.*

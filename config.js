/*
 * Mentorship Notebook — configuration
 * Built by Dickson Otieno — https://dicksonotieno.com
 *
 * Fill these in from your Supabase project: Settings → API.
 * The anon key is safe to publish — row-level security in the database
 * is what protects the data, not this key. (See SECURITY.md.)
 *
 * Leave the YOUR-... placeholders in place to run the app in demo mode
 * (open any page with ?demo=1 — no database needed).
 */
export const CONFIG = {
  // From Supabase → Project Settings → API → Project URL
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  // From Supabase → Project Settings → API → Project API keys → "anon public"
  supabaseAnonKey: 'YOUR_ANON_PUBLIC_KEY',

  // Shown in the header and reports. Make these your own.
  programmeName: 'Mentorship Notebook',
  programmeSub: 'Your organisation · Season 20XX',

  // Optional "practice space" link shown as a tappable bar under the header,
  // one tap from every screen. Point it at any tool you want your team to use;
  // set the label in index.html. Change this URL or remove the bar entirely
  // (see CUSTOMIZATION.md → "The practice bar").
  sandboxUrl: 'https://example.com',

  // ── The programme timetable (the "Journey" tab) ──────────────────────────
  // This is fully yours to change: any dates, any length. Edit it here and the
  // whole journey map, progress bar, and weekly rhythm follow automatically.
  // (The activities inside each month are added later in the app, not here.)
  // Full guide: CUSTOMIZATION.md → "Programme dates and length".
  timeline: {
    start: '2026-06-09',   // first day of the programme (YYYY-MM-DD)
    end:   '2026-12-31',   // last day of the programme (YYYY-MM-DD)

    // One row per month on the rail, in order. `key` is 'YYYY-MM'.
    //   weekly:  show that month's weekly feedback + check-in rhythm
    //   kickoff: this is the launch month (highlights the launch window below)
    //   flag:    put a labelled marker on the rail right AFTER this month
    months: [
      { key: '2026-06', weekly: true, kickoff: true },
      { key: '2026-07', weekly: true },
      { key: '2026-08', weekly: true },
      { key: '2026-09', weekly: true, flag: 'Mid-term' },
      { key: '2026-10', weekly: true },
      { key: '2026-11', weekly: true },
      { key: '2026-12', weekly: false }
    ],

    startFlag: 'Launch',    // marker at the very start of the rail ('' hides it)
    endFlag:   'Closing',   // marker at the very end of the rail ('' hides it)

    // The highlighted launch window shown inside the kickoff month's week grid.
    kickoff: { day: 9, label: 'Programme kickoff', dates: '9–12 Jun' }
  }
};

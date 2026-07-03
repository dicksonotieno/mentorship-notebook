-- =====================================================================
-- Mentorship Notebook — Communication log + mentor contact + overview controls
-- Built by Dickson Otieno — https://dicksonotieno.com
-- Migration date: 2026-06-22.
--
-- HOW TO RUN (one time):
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
--   It is idempotent (safe to run more than once): every statement uses
--   IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT / DROP POLICY IF EXISTS.
--
-- WHAT IT ADDS (privacy enforced by the database, not the browser):
--   * mentor_settings  — the mentor's editable contact email + which sections
--                        appear on the PUBLIC overview. The contact email is
--                        readable only by signed-in users; the public overview
--                        sees the on/off flags ONLY, never the email.
--   * communications   — a fellow logs "I emailed the mentor"; the mentor marks
--                        it received. Both sides see the thread. PRIVATE by
--                        default — only the mentor can publish a single entry to
--                        the public overview, and even then only counts + dates
--                        are exposed there (never the subject text).
--   * milestones.show_on_overview — the mentor can hide an individual milestone
--                        from the public overview (existing ones stay visible).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) mentor_settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.mentor_settings (
  id int primary key default 1 check (id = 1),
  contact_email text check (
    contact_email is null
    or (char_length(contact_email) <= 200
        and contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  show_milestones    boolean not null default true,
  show_activity      boolean not null default true,
  show_communication boolean not null default true,
  show_mentor_impact boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.mentor_settings enable row level security;
grant select, insert, update on public.mentor_settings to authenticated;
revoke all on public.mentor_settings from anon;   -- the public NEVER reads this table directly

-- the signed-in team may read settings (fellows need the contact email);
-- only the mentor may create or change them.
drop policy if exists "settings_select" on public.mentor_settings;
create policy "settings_select" on public.mentor_settings for select
  to authenticated using (true);
drop policy if exists "settings_insert_mentor" on public.mentor_settings;
create policy "settings_insert_mentor" on public.mentor_settings for insert
  to authenticated with check (public.is_mentor() and id = 1);
drop policy if exists "settings_update_mentor" on public.mentor_settings;
create policy "settings_update_mentor" on public.mentor_settings for update
  to authenticated using (public.is_mentor());

-- seed the starting contact email (does nothing if the row already exists)
insert into public.mentor_settings (id, contact_email)
values (1, 'mentor@example.com')
on conflict (id) do nothing;

-- anon-readable view of the section flags ONLY — the email column is never
-- selected here, so it cannot reach the public overview.
create or replace view public.overview_settings as
select show_milestones, show_activity, show_communication, show_mentor_impact
from public.mentor_settings where id = 1;
grant select on public.overview_settings to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) communications (the email log)
-- ---------------------------------------------------------------------
create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  subject text check (subject is null or char_length(subject) <= 200),
  sent_at timestamptz not null default now(),     -- set when the fellow logs the send
  received_at timestamptz,                          -- set by the mentor on "Mark received"
  show_on_overview boolean not null default false,  -- private until the mentor publishes it
  created_at timestamptz not null default now()
);

alter table public.communications enable row level security;
grant select, insert, update, delete on public.communications to authenticated;
revoke all on public.communications from anon;   -- the public NEVER reads this table directly

-- select: the mentor sees every fellow's thread; a fellow sees only their own.
drop policy if exists "comm_select" on public.communications;
create policy "comm_select" on public.communications for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());

-- insert: a fellow logs their OWN send; the mentor may also log against a fellow.
-- A new row can never be born already "received" or already "public" — those are
-- the mentor's to grant later, so we forbid them here.
drop policy if exists "comm_insert" on public.communications;
create policy "comm_insert" on public.communications for insert
  to authenticated with check (
    (public.is_mentor() or fellow_id = auth.uid())
    and received_at is null
    and show_on_overview = false
  );

-- update: ONLY the mentor — they own "received", overview visibility and edits.
drop policy if exists "comm_update_mentor" on public.communications;
create policy "comm_update_mentor" on public.communications for update
  to authenticated using (public.is_mentor()) with check (public.is_mentor());

-- delete: the mentor may remove any; a fellow may retract their own ONLY while it
-- is still unreceived (so acknowledged history can't be erased).
drop policy if exists "comm_delete" on public.communications;
create policy "comm_delete" on public.communications for delete
  to authenticated using (
    public.is_mentor() or (fellow_id = auth.uid() and received_at is null)
  );

-- public communication summary: COUNTS + DATES only, per fellow. No subject text
-- ever leaves the database. Gated twice: a row must be individually published
-- (show_on_overview) AND the whole section must be on (show_communication).
create or replace view public.programme_communications as
select
  c.fellow_id,
  count(*)::int as messages_total,
  count(*) filter (where c.received_at is not null)::int as received_total,
  max(c.sent_at) as last_sent,
  max(c.received_at) as last_received
from public.communications c
join public.profiles p on p.id = c.fellow_id and p.role = 'fellow'
where c.show_on_overview
  and coalesce((select show_communication from public.mentor_settings where id = 1), true)
group by c.fellow_id;
grant select on public.programme_communications to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) per-milestone overview control + refreshed public views
-- ---------------------------------------------------------------------
alter table public.milestones
  add column if not exists show_on_overview boolean not null default true;

-- public milestone list: titles + status only, and ONLY milestones the mentor
-- has left visible, with the whole section gated by show_milestones.
create or replace view public.programme_milestones as
select m.fellow_id, m.title, m.status, m.due_label, m.created_at
from public.milestones m
join public.profiles p on p.id = m.fellow_id and p.role = 'fellow'
where m.show_on_overview
  and coalesce((select show_milestones from public.mentor_settings where id = 1), true);
grant select on public.programme_milestones to anon, authenticated;

-- per-fellow progress: the milestone counts now match the visible milestone list
-- (hidden milestones are excluded from the public progress bar too). Activity
-- counts are unchanged — the page hides that block when show_activity is off.
create or replace view public.programme_overview as
select
  p.id as fellow_id,
  coalesce(nullif(trim(p.display_name), ''), 'Fellow') as name,
  (select count(*) from public.milestones m where m.fellow_id = p.id and m.show_on_overview) as milestones_total,
  (select count(*) from public.milestones m where m.fellow_id = p.id and m.show_on_overview and m.status = 'done') as milestones_done,
  (select count(*) from public.weekly_checks w where w.fellow_id = p.id) as weekly_done,
  (select count(*) from public.feedback f where f.fellow_id = p.id) as feedback_count,
  (select max(f.created_at) from public.feedback f where f.fellow_id = p.id) as last_feedback,
  (select count(*) from public.notebook n where n.fellow_id = p.id) as notebook_count,
  (select max(n.created_at) from public.notebook n where n.fellow_id = p.id) as last_notebook,
  greatest(
    coalesce((select max(m.created_at) from public.milestones m where m.fellow_id = p.id), 'epoch'),
    coalesce((select max(w.created_at) from public.weekly_checks w where w.fellow_id = p.id), 'epoch'),
    coalesce((select max(n.created_at) from public.notebook n where n.fellow_id = p.id), 'epoch'),
    coalesce((select max(c.sent_at)    from public.communications c where c.fellow_id = p.id and c.show_on_overview), 'epoch')
  ) as last_active
from public.profiles p
where p.role = 'fellow';
grant select on public.programme_overview to anon, authenticated;

-- =====================================================================
-- Done. Reload the app — the mentor sees a Contact & overview panel, fellows
-- see a "Your mentor" card with the email + an "I emailed the mentor" button.
-- =====================================================================

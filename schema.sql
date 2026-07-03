-- =====================================================================
-- Mentorship Notebook — database schema
-- Built by Dickson Otieno — https://dicksonotieno.com
-- Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Privacy model (enforced by the database, not the app):
--   * mentor sees and manages everything
--   * each fellow sees only their OWN milestones, feedback and notebook
--   * resources are shared with everyone; only the mentor can add them
-- Data hangs directly off each fellow (a profile id) — no "projects" step.
-- =====================================================================

-- >>> CHANGE THIS to the email the MENTOR will sign in with. Whoever signs
-- >>> up with this exact address becomes the mentor; everyone else is a fellow.
create or replace function public.mentor_email() returns text
language sql immutable as $$ select 'mentor@example.com' $$;

-- ---------------------------------------------------------------------
-- profiles: one row per signed-up user, created automatically on signup
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  display_name text check (display_name is null or char_length(display_name) <= 80),
  role text not null default 'fellow' check (role in ('mentor','fellow')),
  created_at timestamptz not null default now()
);

-- mentor-only setter for display names. SECURITY DEFINER so it can update the
-- row, but it ONLY ever touches display_name (never role) and only for a mentor.
create or replace function public.set_display_name(target uuid, new_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_mentor() then raise exception 'only the mentor can set names'; end if;
  if char_length(coalesce(new_name, '')) > 80 then raise exception 'name too long'; end if;
  update public.profiles set display_name = nullif(trim(new_name), '') where id = target;
end $$;
grant execute on function public.set_display_name(uuid, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', initcap(split_part(new.email, '@', 1))),
    case when lower(new.email) = lower(public.mentor_email()) then 'mentor' else 'fellow' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_mentor() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'mentor') $$;

-- ---------------------------------------------------------------------
-- milestones: the fellow's own progress markers
-- ---------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  due_label text check (due_label is null or char_length(due_label) <= 60),
  show_on_overview boolean not null default true,  -- mentor can hide one from the public overview
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- feedback: mentor writes, the fellow reads
-- ---------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- notebook: the fellow writes, the mentor can read
-- ---------------------------------------------------------------------
create table public.notebook (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- resources: shared shelf — only the mentor adds
-- ---------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles,
  title text not null check (char_length(title) between 1 and 300),
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- timeline_events: the shared programme timetable. Everyone reads it;
-- only the mentor adds/removes activities (the month rail itself is fixed).
-- ---------------------------------------------------------------------
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  month_key text not null check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),  -- any year/month; keep in sync with config.js timeline
  week int check (week is null or week between 1 and 6),
  track text not null check (track in ('training','labs','programme','mentor','milestone')),
  title text not null check (char_length(title) between 1 and 200),
  detail text check (detail is null or char_length(detail) <= 200),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- weekly_checks: a fellow ticks the recurring weekly tasks (did the
-- weekly feedback / checked in with mentor) per week. A row = done.
-- ---------------------------------------------------------------------
create table public.weekly_checks (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  week_key text not null check (week_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])-[1-6]$'),  -- any year/month + week 1-6
  task text not null check (task in ('feedback','checkin')),
  created_at timestamptz not null default now(),
  unique (fellow_id, week_key, task)
);

-- =====================================================================
-- Row-level security
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.milestones enable row level security;
alter table public.feedback   enable row level security;
alter table public.notebook   enable row level security;
alter table public.resources  enable row level security;
alter table public.timeline_events enable row level security;
alter table public.weekly_checks enable row level security;

-- Table-level grants: the logged-in (authenticated) role needs these before the
-- RLS policies below can take effect. The anonymous role is granted NOTHING, so
-- strangers can't read or write anything regardless of policies.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.milestones, public.feedback, public.notebook,
  public.resources, public.timeline_events, public.weekly_checks
  to authenticated;
revoke all on
  public.profiles, public.milestones, public.feedback, public.notebook,
  public.resources, public.timeline_events, public.weekly_checks
  from anon;

-- profiles: the whole (tiny) team can see each other's names + role.
-- No update/insert/delete policy on purpose — names are set by the signup
-- trigger, and roles must NOT be editable from the browser (that would let a
-- fellow promote themselves to mentor). To rename someone, edit the row in the
-- Supabase dashboard. With RLS on and no write policy, all client writes are denied.
create policy "profiles_select" on public.profiles for select
  to authenticated using (true);

-- milestones: fellow owns their own; mentor can view + help manage
create policy "milestones_select" on public.milestones for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "milestones_insert" on public.milestones for insert
  to authenticated with check (public.is_mentor() or fellow_id = auth.uid());
create policy "milestones_update" on public.milestones for update
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "milestones_delete" on public.milestones for delete
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());

-- feedback: mentor writes; fellow reads only their own
create policy "feedback_select" on public.feedback for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "feedback_insert_mentor" on public.feedback for insert
  to authenticated with check (public.is_mentor() and author_id = auth.uid());
create policy "feedback_delete_mentor" on public.feedback for delete
  to authenticated using (public.is_mentor());

-- notebook: fellow writes their own; mentor can read
create policy "notebook_select" on public.notebook for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "notebook_insert_own" on public.notebook for insert
  to authenticated with check (fellow_id = auth.uid());
create policy "notebook_delete_own" on public.notebook for delete
  to authenticated using (fellow_id = auth.uid());

-- resources: everyone reads; only the mentor adds or removes
create policy "resources_select" on public.resources for select
  to authenticated using (true);
create policy "resources_insert_mentor" on public.resources for insert
  to authenticated with check (public.is_mentor() and author_id = auth.uid());
create policy "resources_delete_mentor" on public.resources for delete
  to authenticated using (public.is_mentor());

-- timeline: everyone reads; only the mentor adds/edits/removes
create policy "timeline_select" on public.timeline_events for select
  to authenticated using (true);
create policy "timeline_insert_mentor" on public.timeline_events for insert
  to authenticated with check (public.is_mentor());
create policy "timeline_update_mentor" on public.timeline_events for update
  to authenticated using (public.is_mentor());
create policy "timeline_delete_mentor" on public.timeline_events for delete
  to authenticated using (public.is_mentor());

-- weekly checks: a fellow ticks their own; the mentor can view + tick any fellow's
create policy "wc_select" on public.weekly_checks for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "wc_insert" on public.weekly_checks for insert
  to authenticated with check (public.is_mentor() or fellow_id = auth.uid());
create policy "wc_delete" on public.weekly_checks for delete
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());

-- =====================================================================
-- Public overview (read-only, NO login). Anonymous visitors can read ONLY:
--   * the programme timetable (no personal data), and
--   * two curated views below that expose names you set + progress numbers +
--     milestone titles — and NOTHING else (no emails, no feedback/notebook text).
-- The raw tables stay fully denied to anon, so the page physically cannot fetch
-- anything beyond these. Curation happens in the database, not the browser.
-- =====================================================================

-- timetable is public-suitable (it's the shared schedule)
create policy "timeline_anon_read" on public.timeline_events for select to anon using (true);
grant select on public.timeline_events to anon;

-- per-fellow progress + activity COUNTS (no content, no email, name you set only)
create or replace view public.programme_overview as
select
  p.id as fellow_id,
  coalesce(nullif(trim(p.display_name), ''), 'Fellow') as name,
  (select count(*) from public.milestones m where m.fellow_id = p.id) as milestones_total,
  (select count(*) from public.milestones m where m.fellow_id = p.id and m.status = 'done') as milestones_done,
  (select count(*) from public.weekly_checks w where w.fellow_id = p.id) as weekly_done,
  (select count(*) from public.feedback f where f.fellow_id = p.id) as feedback_count,
  (select max(f.created_at) from public.feedback f where f.fellow_id = p.id) as last_feedback,
  (select count(*) from public.notebook n where n.fellow_id = p.id) as notebook_count,
  (select max(n.created_at) from public.notebook n where n.fellow_id = p.id) as last_notebook,
  greatest(
    coalesce((select max(m.created_at) from public.milestones m where m.fellow_id = p.id), 'epoch'),
    coalesce((select max(w.created_at) from public.weekly_checks w where w.fellow_id = p.id), 'epoch'),
    coalesce((select max(n.created_at) from public.notebook n where n.fellow_id = p.id), 'epoch')
  ) as last_active
from public.profiles p
where p.role = 'fellow';

-- milestone TITLES + status only (you chose to show these). No other content.
create or replace view public.programme_milestones as
select m.fellow_id, m.title, m.status, m.due_label, m.created_at
from public.milestones m
join public.profiles p on p.id = m.fellow_id and p.role = 'fellow';

grant select on public.programme_overview to anon, authenticated;
grant select on public.programme_milestones to anon, authenticated;

-- ---------------------------------------------------------------------
-- mentor_plan: the mentor's outline (approach, structure, focus, tools,
-- notes). Single row. The whole team can read it; only the mentor edits.
-- ---------------------------------------------------------------------
create table public.mentor_plan (
  id int primary key default 1 check (id = 1),
  approach text check (approach is null or char_length(approach) <= 4000),
  structure text check (structure is null or char_length(structure) <= 4000),
  focus_areas text check (focus_areas is null or char_length(focus_areas) <= 4000),
  tools text check (tools is null or char_length(tools) <= 4000),
  notes text check (notes is null or char_length(notes) <= 4000),
  updated_at timestamptz not null default now()
);
alter table public.mentor_plan enable row level security;
grant select, insert, update on public.mentor_plan to authenticated;
revoke all on public.mentor_plan from anon;
create policy "plan_select" on public.mentor_plan for select
  to authenticated using (true);
create policy "plan_insert_mentor" on public.mentor_plan for insert
  to authenticated with check (public.is_mentor() and id = 1);
create policy "plan_update_mentor" on public.mentor_plan for update
  to authenticated using (public.is_mentor());

-- ---------------------------------------------------------------------
-- mentor_sessions: the mentor's log of work — 1:1 sessions, platform
-- build, workshops, admin. Private to the mentor (evidence for reports).
-- fellow_id is nullable (programme-wide entries like building the platform).
-- ---------------------------------------------------------------------
create table public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  fellow_id uuid references public.profiles on delete set null,
  minutes int check (minutes is null or (minutes >= 0 and minutes <= 100000)),
  kind text not null default 'session' check (kind in ('session','build','workshop','admin','other')),
  title text not null check (char_length(title) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.mentor_sessions enable row level security;
grant select, insert, update, delete on public.mentor_sessions to authenticated;
revoke all on public.mentor_sessions from anon;
create policy "sessions_select_mentor" on public.mentor_sessions for select
  to authenticated using (public.is_mentor());
create policy "sessions_insert_mentor" on public.mentor_sessions for insert
  to authenticated with check (public.is_mentor());
create policy "sessions_update_mentor" on public.mentor_sessions for update
  to authenticated using (public.is_mentor());
create policy "sessions_delete_mentor" on public.mentor_sessions for delete
  to authenticated using (public.is_mentor());

-- public mentor summary (one row): activity COUNTS + the plan text. No session
-- notes, no fellow content. Anon-readable for the "Mentor's contribution" block.
create or replace view public.mentor_public as
select
  (select count(*) from public.feedback)         as feedback_total,
  (select count(*) from public.milestones)        as milestones_total,
  (select count(*) from public.resources)         as resources_total,
  (select count(*) from public.weekly_checks)     as weekly_total,
  (select count(*) from public.mentor_sessions)   as sessions_total,
  (select coalesce(sum(minutes),0) from public.mentor_sessions) as session_minutes,
  (select count(*) from public.mentor_sessions where kind='session') as one_to_one_total,
  (select min(session_date) from public.mentor_sessions) as active_since,
  (select approach    from public.mentor_plan where id=1) as approach,
  (select structure   from public.mentor_plan where id=1) as structure,
  (select focus_areas from public.mentor_plan where id=1) as focus_areas,
  (select tools       from public.mentor_plan where id=1) as tools,
  (select notes       from public.mentor_plan where id=1) as notes;
grant select on public.mentor_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed an example starting timetable. Safe to run once; edit these rows to
-- match your own programme, or remove this block to start empty.
-- ---------------------------------------------------------------------
insert into public.timeline_events (month_key, week, track, title, detail) values
  ('2026-06', null, 'labs', 'Kickoff workshop', null),
  ('2026-06', null, 'programme',    'Agreement signed', null),
  ('2026-06', null, 'programme',    'Project plan confirmed', null),
  ('2026-07', null, 'training',    'Skills session', 'Monthly session'),
  ('2026-07', null, 'programme',    'Planning check-in', null),
  ('2026-07', null, 'programme',    'Monthly check-in', null),
  ('2026-07', 1,    'labs', 'Lab — Session 1', null),
  ('2026-07', 2,    'labs', 'Lab — Session 2', null),
  ('2026-07', 3,    'labs', 'Lab — Session 3', null),
  ('2026-07', 4,    'labs', 'Lab — Session 4', null),
  ('2026-08', null, 'training',    'Skills session', 'Monthly session'),
  ('2026-08', null, 'labs', 'Clinic 1', 'August clinic'),
  ('2026-08', null, 'programme',    'Monthly check-in', null),
  ('2026-09', null, 'training',    'Skills session', 'Monthly session'),
  ('2026-09', null, 'labs', 'Clinic 2', 'September clinic'),
  ('2026-09', null, 'programme',    'Monthly check-in', null),
  ('2026-10', null, 'training',    'Skills session', 'Monthly session'),
  ('2026-10', null, 'labs', 'Clinic 3', 'October clinic'),
  ('2026-10', null, 'programme',    'Mid-programme review', null),
  ('2026-10', null, 'programme',    'Monthly check-in', null),
  ('2026-11', null, 'training',    'Skills session', 'Monthly session'),
  ('2026-11', null, 'labs', 'Clinic 4', 'November clinic'),
  ('2026-11', null, 'programme',    'Monthly check-in', null),
  ('2026-12', null, 'programme',    'Closing report', null);

-- =====================================================================
-- Mentor contact + communication log + public-overview controls.
-- (Also shipped as migrations/2026-06-22-communication.sql for existing DBs.)
--   * mentor_settings   — editable contact email + which sections show publicly.
--                         Email is readable by the signed-in team only; the
--                         public overview sees the on/off flags ONLY.
--   * communications    — fellow logs "I emailed the mentor"; mentor marks it
--                         received. Private by default; only the mentor can
--                         publish an entry, and only counts/dates go public.
-- =====================================================================

create table public.mentor_settings (
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
revoke all on public.mentor_settings from anon;
create policy "settings_select" on public.mentor_settings for select
  to authenticated using (true);
create policy "settings_insert_mentor" on public.mentor_settings for insert
  to authenticated with check (public.is_mentor() and id = 1);
create policy "settings_update_mentor" on public.mentor_settings for update
  to authenticated using (public.is_mentor());
insert into public.mentor_settings (id, contact_email)
values (1, 'mentor@example.com') on conflict (id) do nothing;

-- anon sees the section flags only — never the email column.
create or replace view public.overview_settings as
select show_milestones, show_activity, show_communication, show_mentor_impact
from public.mentor_settings where id = 1;
grant select on public.overview_settings to anon, authenticated;

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  fellow_id uuid not null references public.profiles on delete cascade,
  subject text check (subject is null or char_length(subject) <= 200),
  sent_at timestamptz not null default now(),
  received_at timestamptz,
  show_on_overview boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.communications enable row level security;
grant select, insert, update, delete on public.communications to authenticated;
revoke all on public.communications from anon;
create policy "comm_select" on public.communications for select
  to authenticated using (public.is_mentor() or fellow_id = auth.uid());
create policy "comm_insert" on public.communications for insert
  to authenticated with check (
    (public.is_mentor() or fellow_id = auth.uid())
    and received_at is null and show_on_overview = false
  );
create policy "comm_update_mentor" on public.communications for update
  to authenticated using (public.is_mentor()) with check (public.is_mentor());
create policy "comm_delete" on public.communications for delete
  to authenticated using (
    public.is_mentor() or (fellow_id = auth.uid() and received_at is null)
  );

-- public communication summary: counts + dates only, gated per-row AND per-section.
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

-- refresh the two public views so they respect per-milestone visibility +
-- the show_milestones section flag (mentor_settings now exists above).
create or replace view public.programme_milestones as
select m.fellow_id, m.title, m.status, m.due_label, m.created_at
from public.milestones m
join public.profiles p on p.id = m.fellow_id and p.role = 'fellow'
where m.show_on_overview
  and coalesce((select show_milestones from public.mentor_settings where id = 1), true);
grant select on public.programme_milestones to anon, authenticated;

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
    coalesce((select max(c.sent_at) from public.communications c where c.fellow_id = p.id and c.show_on_overview), 'epoch')
  ) as last_active
from public.profiles p
where p.role = 'fellow';
grant select on public.programme_overview to anon, authenticated;

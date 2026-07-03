/*
 * Mentorship Notebook — main application (sign-in, tabs, data layer)
 * Built by Dickson Otieno — https://dicksonotieno.com
 */
import { CONFIG } from './config.js';
import { initTimeline, journeyStatus } from './timeline.js?v=4';

const CONFIGURED = !CONFIG.supabaseUrl.includes('YOUR-') && !CONFIG.supabaseAnonKey.includes('YOUR-');
const DEMO_PARAM = new URLSearchParams(location.search).has('demo');

let sb = null;          // supabase client (null in demo mode)
let DEMO = false;

const S = {
  userId: null,
  profile: null,        // { id, full_name, role }
  profiles: [],
  viewFellowId: null,   // mentor: which fellow is on screen. fellow: themselves.
  tab: 'journey'
};

/* ================= demo data ================= */
// The starting programme timetable (also the seed for schema.sql). Used in
// demo mode; the real app reads/writes the timeline_events table.
function defaultTimeline() {
  const E = (month_key, week, track, title, detail) =>
    ({ id: 'tl-' + month_key + '-' + (week || 0) + '-' + title.slice(0, 6), month_key, week, track, title, detail: detail || null, sort_order: 0, created_at: '2026-06-01T00:00:00Z' });
  return [
    E('2026-06', null, 'labs', 'Kickoff workshop'),
    E('2026-06', null, 'programme', 'Agreement signed'),
    E('2026-06', null, 'programme', 'Project plan confirmed'),
    E('2026-07', null, 'training', 'Skills session', 'Monthly session'),
    E('2026-07', null, 'programme', 'Planning check-in'),
    E('2026-07', null, 'programme', 'Monthly check-in'),
    E('2026-07', 1, 'labs', 'Lab — Session 1'),
    E('2026-07', 2, 'labs', 'Lab — Session 2'),
    E('2026-07', 3, 'labs', 'Lab — Session 3'),
    E('2026-07', 4, 'labs', 'Lab — Session 4'),
    E('2026-08', null, 'training', 'Skills session', 'Monthly session'),
    E('2026-08', null, 'labs', 'Clinic 1', 'August clinic'),
    E('2026-08', null, 'programme', 'Monthly check-in'),
    E('2026-09', null, 'training', 'Skills session', 'Monthly session'),
    E('2026-09', null, 'labs', 'Clinic 2', 'September clinic'),
    E('2026-09', null, 'programme', 'Monthly check-in'),
    E('2026-10', null, 'training', 'Skills session', 'Monthly session'),
    E('2026-10', null, 'labs', 'Clinic 3', 'October clinic'),
    E('2026-10', null, 'programme', 'Mid-programme review'),
    E('2026-10', null, 'programme', 'Monthly check-in'),
    E('2026-11', null, 'training', 'Skills session', 'Monthly session'),
    E('2026-11', null, 'labs', 'Clinic 4', 'November clinic'),
    E('2026-11', null, 'programme', 'Monthly check-in'),
    E('2026-12', null, 'programme', 'Closing report')
  ];
}

const demo = {
  userId: 'u-mentor',
  profiles: [
    { id: 'u-mentor', full_name: 'Mentor', role: 'mentor' },
    { id: 'u-fellow-a', full_name: 'Fellow A', role: 'fellow' },
    { id: 'u-fellow-b', full_name: 'Fellow B', role: 'fellow' }
  ],
  milestones: [
    { id: 'm1', fellow_id: 'u-fellow-a', title: 'Sign agreement & refine plan', status: 'done', due_label: 'Jun', created_at: '2026-06-09T08:00:00Z' },
    { id: 'm2', fellow_id: 'u-fellow-a', title: 'Complete first project draft', status: 'in_progress', due_label: 'Jun', created_at: '2026-06-10T08:00:00Z' },
    { id: 'm3', fellow_id: 'u-fellow-a', title: 'Milestone planning with mentor', status: 'todo', due_label: 'Jul wk 1', created_at: '2026-06-10T09:00:00Z' },
    { id: 'm4', fellow_id: 'u-fellow-b', title: 'Sign agreement & refine plan', status: 'done', due_label: 'Jun', created_at: '2026-06-09T08:00:00Z' },
    { id: 'm5', fellow_id: 'u-fellow-b', title: 'Outline the project workflow', status: 'todo', due_label: 'Jun', created_at: '2026-06-11T08:00:00Z' }
  ],
  feedback: [
    { id: 'f1', fellow_id: 'u-fellow-a', author_id: 'u-mentor', body: 'Great start. Narrow the scope before the July planning session — a tighter focus will make the first draft far more manageable.', created_at: '2026-06-11T09:00:00Z' },
    { id: 'f2', fellow_id: 'u-fellow-b', author_id: 'u-mentor', body: 'Good instincts in the exercise. Try a small pilot before you build out the full workflow.', created_at: '2026-06-10T10:00:00Z' }
  ],
  notebook: [
    { id: 'n1', fellow_id: 'u-fellow-a', body: 'Kickoff session was great. Blocked on access to a tool — flagging it for the August clinic. Idea: sketch the outline this week.', created_at: '2026-06-12T09:10:00Z' }
  ],
  resources: [
    { id: 'r1', author_id: 'u-mentor', title: 'Getting-started guide', url: 'https://example.com', note: 'Background reading before the July session.', created_at: '2026-06-10T08:00:00Z' }
  ],
  timeline: defaultTimeline(),
  weeklyChecks: [
    { id: 'wc1', fellow_id: 'u-fellow-a', week_key: '2026-06-2', task: 'feedback', created_at: '2026-06-12T09:00:00Z' },
    { id: 'wc2', fellow_id: 'u-fellow-a', week_key: '2026-06-2', task: 'checkin', created_at: '2026-06-12T09:00:00Z' }
  ],
  settings: {
    id: 1, contact_email: 'mentor@example.com',
    show_milestones: true, show_activity: true, show_communication: true, show_mentor_impact: true
  },
  communications: [
    { id: 'c1', fellow_id: 'u-fellow-a', subject: 'Draft plan for review', sent_at: '2026-06-11T07:30:00Z', received_at: '2026-06-11T09:15:00Z', show_on_overview: true, created_at: '2026-06-11T07:30:00Z' },
    { id: 'c2', fellow_id: 'u-fellow-a', subject: 'Question about tool access', sent_at: '2026-06-13T06:00:00Z', received_at: null, show_on_overview: false, created_at: '2026-06-13T06:00:00Z' }
  ],
  plan: {
    id: 1,
    approach: 'Hands-on and feedback-driven. I work alongside each fellow on their real project, reviewing drafts, and pushing them to ship.',
    structure: 'Bi-weekly 1:1 check-ins (30 min each), plus async feedback and a weekly rhythm, all tracked on this platform.',
    focus_areas: 'Core skills, responsible use of tools, and getting a project from idea to finished work.',
    tools: 'This notebook platform (journey, milestones, feedback, weekly tasks), plus the practice space and monthly skills sessions.',
    notes: 'Flexible to each fellow’s project phase. Urgent clinics available any time; escalated to the programme coordinator when out of scope.'
  },
  sessions: [
    { id: 's1', session_date: '2026-05-20', fellow_id: null, minutes: 1200, kind: 'build', title: 'Set up the mentorship platform', notes: 'Journey, milestones, feedback, weekly tasks, public overview — configured for the fellows.', created_at: '2026-05-20T08:00:00Z' },
    { id: 's2', session_date: '2026-06-09', fellow_id: null, minutes: 180, kind: 'workshop', title: 'Launch — onboarding session', notes: 'Walked both fellows through the platform and the programme map.', created_at: '2026-06-09T08:00:00Z' },
    { id: 's3', session_date: '2026-06-12', fellow_id: 'u-fellow-a', minutes: 30, kind: 'session', title: '1:1 — project scope', notes: 'Reviewed the plan; agreed to narrow the scope before July.', created_at: '2026-06-12T08:00:00Z' },
    { id: 's4', session_date: '2026-06-13', fellow_id: 'u-fellow-b', minutes: 30, kind: 'session', title: '1:1 — project workflow', notes: 'Outlined the workflow; set the first milestone.', created_at: '2026-06-13T08:00:00Z' }
  ],
  seq: 100
};

const SESSION_KINDS = [
  ['session', '1:1 session'],
  ['build', 'Platform / build'],
  ['workshop', 'Workshop'],
  ['admin', 'Admin'],
  ['other', 'Other']
];

const PLAN_SECTIONS = [
  ['approach', 'Mentorship approach'],
  ['structure', 'Structure of mentorship'],
  ['focus_areas', 'Key topics & focus areas'],
  ['tools', 'Tools & platforms'],
  ['notes', 'Notes & special considerations']
];
const demoId = () => 'demo-' + (++demo.seq);

/* ================= data layer ================= */
const api = {
  async loadAll() {
    if (DEMO) {
      S.userId = demo.userId;
      S.profiles = demo.profiles;
      S.profile = demo.profiles.find(p => p.id === demo.userId);
      return;
    }
    const { data: { user } } = await sb.auth.getUser();
    S.userId = user.id;
    const { data, error } = await sb.from('profiles').select('*').order('full_name');
    if (error) throw error;
    S.profiles = data;
    S.profile = data.find(p => p.id === user.id) || null;
  },

  async listMilestones(fid) {
    if (DEMO) return demo.milestones.filter(m => m.fellow_id === fid);
    const { data, error } = await sb.from('milestones').select('*').eq('fellow_id', fid).order('created_at');
    if (error) throw error;
    return data;
  },
  async addMilestone(fid, title, due_label) {
    if (DEMO) { demo.milestones.push({ id: demoId(), fellow_id: fid, title, status: 'todo', due_label, created_at: new Date().toISOString() }); return; }
    const { error } = await sb.from('milestones').insert({ fellow_id: fid, title, due_label });
    if (error) throw error;
  },
  async setMilestoneStatus(id, status) {
    if (DEMO) { const m = demo.milestones.find(x => x.id === id); if (m) m.status = status; return; }
    const { error } = await sb.from('milestones').update({ status }).eq('id', id);
    if (error) throw error;
  },
  async deleteMilestone(id) {
    if (DEMO) { demo.milestones = demo.milestones.filter(m => m.id !== id); return; }
    const { error } = await sb.from('milestones').delete().eq('id', id);
    if (error) throw error;
  },
  async setMilestoneOverview(id, show) {
    if (DEMO) { const m = demo.milestones.find(x => x.id === id); if (m) m.show_on_overview = show; return; }
    const { error } = await sb.from('milestones').update({ show_on_overview: show }).eq('id', id);
    if (error) throw error;
  },

  async listFeedback(fid) {
    if (DEMO) return demo.feedback.filter(f => f.fellow_id === fid).sort(byNewest);
    const { data, error } = await sb.from('feedback').select('*').eq('fellow_id', fid).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addFeedback(fid, body) {
    if (DEMO) { demo.feedback.push({ id: demoId(), fellow_id: fid, author_id: S.userId, body, created_at: new Date().toISOString() }); return; }
    const { error } = await sb.from('feedback').insert({ fellow_id: fid, body });
    if (error) throw error;
  },
  async deleteFeedback(id) {
    if (DEMO) { demo.feedback = demo.feedback.filter(f => f.id !== id); return; }
    const { error } = await sb.from('feedback').delete().eq('id', id);
    if (error) throw error;
  },

  async listNotebook(fid) {
    if (DEMO) return demo.notebook.filter(n => n.fellow_id === fid).sort(byNewest);
    const { data, error } = await sb.from('notebook').select('*').eq('fellow_id', fid).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addNotebook(fid, body) {
    if (DEMO) { demo.notebook.push({ id: demoId(), fellow_id: fid, body, created_at: new Date().toISOString() }); return; }
    const { error } = await sb.from('notebook').insert({ fellow_id: fid, body });
    if (error) throw error;
  },
  async deleteNotebook(id) {
    if (DEMO) { demo.notebook = demo.notebook.filter(n => n.id !== id); return; }
    const { error } = await sb.from('notebook').delete().eq('id', id);
    if (error) throw error;
  },

  async listResources() {
    if (DEMO) return demo.resources.slice().sort(byNewest);
    const { data, error } = await sb.from('resources').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async addResource(title, url, note) {
    if (DEMO) { demo.resources.push({ id: demoId(), author_id: S.userId, title, url, note, created_at: new Date().toISOString() }); return; }
    const { error } = await sb.from('resources').insert({ title, url, note });
    if (error) throw error;
  },
  async deleteResource(id) {
    if (DEMO) { demo.resources = demo.resources.filter(r => r.id !== id); return; }
    const { error } = await sb.from('resources').delete().eq('id', id);
    if (error) throw error;
  },

  async listTimeline() {
    if (DEMO) return demo.timeline.slice();
    const { data, error } = await sb.from('timeline_events').select('*').order('sort_order').order('created_at');
    if (error) {
      // table not created yet — show the built-in default so Journey still renders
      console.warn('timeline_events unavailable, showing defaults:', error.message);
      return defaultTimeline();
    }
    return data;
  },
  async addTimelineEvent(ev) {
    if (DEMO) { const row = { id: demoId(), ...ev, sort_order: 0, created_at: new Date().toISOString() }; demo.timeline.push(row); return row; }
    const { data, error } = await sb.from('timeline_events').insert(ev).select().single();
    if (error) throw error;
    return data;
  },
  async deleteTimelineEvent(id) {
    if (DEMO) { demo.timeline = demo.timeline.filter(e => e.id !== id); return; }
    const { error } = await sb.from('timeline_events').delete().eq('id', id);
    if (error) throw error;
  },

  async listWeeklyChecks(fid) {
    if (DEMO) return demo.weeklyChecks.filter(c => c.fellow_id === fid);
    const { data, error } = await sb.from('weekly_checks').select('*').eq('fellow_id', fid);
    if (error) { console.warn('weekly_checks unavailable:', error.message); return []; }
    return data;
  },
  async addWeeklyCheck(fid, week_key, task) {
    if (DEMO) { demo.weeklyChecks.push({ id: demoId(), fellow_id: fid, week_key, task, created_at: new Date().toISOString() }); return; }
    const { error } = await sb.from('weekly_checks').insert({ fellow_id: fid, week_key, task });
    if (error) throw error;
  },
  async removeWeeklyCheck(fid, week_key, task) {
    if (DEMO) { demo.weeklyChecks = demo.weeklyChecks.filter(c => !(c.fellow_id === fid && c.week_key === week_key && c.task === task)); return; }
    const { error } = await sb.from('weekly_checks').delete().eq('fellow_id', fid).eq('week_key', week_key).eq('task', task);
    if (error) throw error;
  },

  async setDisplayName(target, name) {
    const clean = name.trim() || null;
    if (!DEMO) {
      const { error } = await sb.rpc('set_display_name', { target, new_name: name });
      if (error) throw error;
    }
    const p = S.profiles.find(x => x.id === target);
    if (p) p.display_name = clean;
  },

  async getPlan() {
    if (DEMO) return demo.plan || null;
    const { data, error } = await sb.from('mentor_plan').select('*').eq('id', 1).maybeSingle();
    if (error) { console.warn('mentor_plan unavailable:', error.message); return null; }
    return data;
  },
  async savePlan(fields) {
    if (DEMO) { demo.plan = Object.assign({ id: 1 }, demo.plan, fields); return; }
    const { error } = await sb.from('mentor_plan').upsert(Object.assign({ id: 1, updated_at: new Date().toISOString() }, fields));
    if (error) throw error;
  },

  async listSessions() {
    if (DEMO) return demo.sessions.slice().sort((a, b) => a.session_date < b.session_date ? 1 : -1);
    const { data, error } = await sb.from('mentor_sessions').select('*').order('session_date', { ascending: false });
    if (error) { console.warn('mentor_sessions unavailable:', error.message); return []; }
    return data;
  },
  async addSession(s) {
    if (DEMO) { demo.sessions.push(Object.assign({ id: demoId(), created_at: new Date().toISOString() }, s)); return; }
    const { error } = await sb.from('mentor_sessions').insert(s);
    if (error) throw error;
  },
  async deleteSession(id) {
    if (DEMO) { demo.sessions = demo.sessions.filter(s => s.id !== id); return; }
    const { error } = await sb.from('mentor_sessions').delete().eq('id', id);
    if (error) throw error;
  },
  async mentorStats() {
    if (DEMO) {
      const fb = demo.feedback.length, ms = demo.milestones.length, rs = demo.resources.length,
        wk = demo.weeklyChecks.length, ss = demo.sessions.length,
        mins = demo.sessions.reduce((a, s) => a + (s.minutes || 0), 0),
        o2o = demo.sessions.filter(s => s.kind === 'session').length,
        since = demo.sessions.map(s => s.session_date).sort()[0] || null;
      return { feedback_total: fb, milestones_total: ms, resources_total: rs, weekly_total: wk, sessions_total: ss, session_minutes: mins, one_to_one_total: o2o, active_since: since };
    }
    // one query: the mentor_public view already aggregates all of these
    const { data, error } = await sb.from('mentor_public').select('*').maybeSingle();
    if (error || !data) { console.warn('mentor_public unavailable:', error && error.message); return { feedback_total: 0, milestones_total: 0, resources_total: 0, weekly_total: 0, sessions_total: 0, session_minutes: 0, one_to_one_total: 0, active_since: null }; }
    return {
      feedback_total: data.feedback_total || 0, milestones_total: data.milestones_total || 0,
      resources_total: data.resources_total || 0, weekly_total: data.weekly_total || 0,
      sessions_total: data.sessions_total || 0, session_minutes: data.session_minutes || 0,
      one_to_one_total: data.one_to_one_total || 0, active_since: data.active_since || null
    };
  },

  async getSettings() {
    if (DEMO) return Object.assign({}, demo.settings);
    const { data, error } = await sb.from('mentor_settings').select('*').eq('id', 1).maybeSingle();
    if (error) { console.warn('mentor_settings unavailable:', error.message); return null; }
    return data;
  },
  async saveSettings(fields) {
    if (DEMO) { demo.settings = Object.assign({ id: 1 }, demo.settings, fields); return; }
    const { error } = await sb.from('mentor_settings').upsert(Object.assign({ id: 1, updated_at: new Date().toISOString() }, fields));
    if (error) throw error;
  },

  async listCommunications(fid) {
    if (DEMO) return demo.communications.filter(c => c.fellow_id === fid).sort((a, b) => a.sent_at < b.sent_at ? 1 : -1);
    const { data, error } = await sb.from('communications').select('*').eq('fellow_id', fid).order('sent_at', { ascending: false });
    if (error) { console.warn('communications unavailable:', error.message); return []; }
    return data;
  },
  async addCommunication(fid, subject) {
    if (DEMO) { demo.communications.push({ id: demoId(), fellow_id: fid, subject: subject || null, sent_at: new Date().toISOString(), received_at: null, show_on_overview: false, created_at: new Date().toISOString() }); return; }
    const { error } = await sb.from('communications').insert({ fellow_id: fid, subject: subject || null });
    if (error) throw error;
  },
  async setCommunicationReceived(id, received) {
    const received_at = received ? new Date().toISOString() : null;
    if (DEMO) { const c = demo.communications.find(x => x.id === id); if (c) c.received_at = received_at; return; }
    const { error } = await sb.from('communications').update({ received_at }).eq('id', id);
    if (error) throw error;
  },
  async setCommunicationOverview(id, show) {
    if (DEMO) { const c = demo.communications.find(x => x.id === id); if (c) c.show_on_overview = show; return; }
    const { error } = await sb.from('communications').update({ show_on_overview: show }).eq('id', id);
    if (error) throw error;
  },
  async deleteCommunication(id) {
    if (DEMO) { demo.communications = demo.communications.filter(c => c.id !== id); return; }
    const { error } = await sb.from('communications').delete().eq('id', id);
    if (error) throw error;
  },

  async signOut() {
    if (DEMO) { location.href = location.pathname; return; }
    await sb.auth.signOut();
  }
};

function byNewest(a, b) { return a.created_at < b.created_at ? 1 : -1; }

/* ================= helpers ================= */
const $ = sel => document.querySelector(sel);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function isMentor() { return S.profile && S.profile.role === 'mentor'; }
function fellows() { return S.profiles.filter(p => p.role === 'fellow'); }
function mentorId() { const m = S.profiles.find(p => p.role === 'mentor'); return m ? m.id : null; }
function nameOf(id) { const p = S.profiles.find(x => x.id === id); return p ? (p.display_name || p.full_name) : 'Member'; }
function initialsOf(id) { return nameOf(id).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear();
}
function currentFellowId() {
  if (!isMentor()) return S.userId;
  if (!S.viewFellowId) { const f = fellows()[0]; S.viewFellowId = f ? f.id : null; }
  return S.viewFellowId;
}
function flash(err) { console.error(err); alert('Something went wrong: ' + (err && err.message ? err.message : err)); }
// Only ever allow http(s) links. Blocks javascript:/data: URLs that would run
// code when clicked. Returns a normalised URL string, or null if unsafe.
function safeUrl(u) {
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return null;   // must be an absolute http(s) link
  try {
    const p = new URL(s);
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : null;
  } catch { return null; }
}
// Validate a plain email address. Returns the trimmed address, or null.
function safeEmail(e) {
  const s = String(e || '').trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 200 ? s : null;
}
// Build a mailto: link only from a validated address (never inject raw input).
function mailtoHref(email, subject) {
  const addr = safeEmail(email);
  if (!addr) return null;
  let href = 'mailto:' + encodeURIComponent(addr).replace(/%40/g, '@');
  if (subject) href += '?subject=' + encodeURIComponent(subject);
  return href;
}

/* ================= shell ================= */
const TABS = [
  { id: 'journey', label: 'Journey' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'resources', label: 'Resources' }
];

function renderShell() {
  $('#brand-sub').textContent = CONFIG.programmeSub;
  $('#foot-note').textContent = isMentor() ? 'Signed in as mentor' : 'Signed in as fellow';
  $('#user-chip').textContent = (S.profile ? (S.profile.display_name || S.profile.full_name) : '?') + (isMentor() ? ' · Mentor' : '');
  const tabs = $('#tabs');
  tabs.innerHTML = '';
  const tabList = isMentor() ? TABS.concat([{ id: 'mentor', label: 'Mentor' }]) : TABS;
  tabList.forEach(t => {
    const b = el('button', 'nb-tab', t.label);
    b.setAttribute('aria-selected', S.tab === t.id ? 'true' : 'false');
    b.addEventListener('click', () => { S.tab = t.id; renderShell(); renderMain(); });
    tabs.appendChild(b);
  });
}

async function renderMain() {
  const main = $('#main');
  main.innerHTML = '';
  try {
    if (S.tab === 'journey') await renderJourney(main);
    else if (S.tab === 'feedback') await renderFeedback(main);
    else if (S.tab === 'notebook') await renderNotebook(main);
    else if (S.tab === 'mentor') await renderMentor(main);
    else await renderResources(main);
  } catch (err) { flash(err); }
}

// The fellow switcher — ONLY used inside per-fellow sections, clearly labelled,
// so general areas (timetable, resources, mentor) never look fellow-scoped.
function fellowSwitcher(labelText) {
  const bar = el('div', 'nb-fellows');
  bar.appendChild(el('span', 'nb-fellows-lbl', labelText || 'Fellow'));
  fellows().forEach(f => {
    const chip = el('button', 'nb-fellowchip');
    chip.appendChild(el('span', 'nb-avatar', initialsOf(f.id)));
    chip.appendChild(el('span', null, nameOf(f.id)));
    chip.setAttribute('aria-selected', f.id === currentFellowId() ? 'true' : 'false');
    chip.addEventListener('click', async () => { S.viewFellowId = f.id; const y = window.scrollY; await renderMain(); window.scrollTo(0, y); });
    bar.appendChild(chip);
  });
  return bar;
}
function noFellowsNotice() {
  return notice('No fellows yet', 'Invite your fellows from Supabase (Authentication → Users → Invite user). Anyone you invite who is not the mentor becomes a fellow and appears here.');
}

function notice(title, body) {
  const p = el('div', 'nb-panel');
  p.appendChild(el('h2', 'nb-h2', title));
  p.appendChild(el('p', 'nb-sub', body));
  return p;
}

/* ================= journey ================= */
async function renderJourney(main) {
  if (isMentor()) await renderMentorJourney(main);
  else await renderFellowJourney(main);
}

function positionStrip(title, st) {
  const strip = el('div', 'nb-panel');
  const h = el('div', 'nb-row');
  h.appendChild(el('h2', 'nb-h2', title));
  h.appendChild(el('span', 'nb-spacer'));
  h.appendChild(el('span', 'nb-pill nb-pill-now', st.beforeStart ? st.startLabel : st.pct + '% through'));
  strip.appendChild(h);
  const nn = el('div', 'nb-nownext');
  nn.appendChild(nowNextCard('Happening now', st.current.name + ' ' + st.current.year, st.current.titles.slice(0, 3), 'now'));
  if (st.next) nn.appendChild(nowNextCard('Up next', st.next.name + ' ' + st.next.year, st.next.titles.slice(0, 3), 'next'));
  strip.appendChild(nn);
  return strip;
}

// FELLOW: their position, their mentor's plan, their milestones, their interactive timeline
async function renderFellowJourney(main) {
  const fid = S.userId;
  const [milestones, timelineEvents, weekChecks, plan, settings, comms] = await Promise.all([
    api.listMilestones(fid), api.listTimeline(), api.listWeeklyChecks(fid), api.getPlan(),
    api.getSettings(), api.listCommunications(fid)
  ]);
  main.appendChild(positionStrip('Where you are', journeyStatus(timelineEvents)));

  if (plan && PLAN_SECTIONS.some(([k]) => plan[k])) {
    const pc = el('details', 'nb-panel nb-plan-card');
    const sm = document.createElement('summary'); sm.className = 'nb-plan-summary'; sm.textContent = 'How your mentor works';
    pc.appendChild(sm);
    PLAN_SECTIONS.forEach(([key, label]) => { if (!plan[key]) return; pc.appendChild(el('div', 'nb-plan-h', label)); pc.appendChild(el('p', 'nb-plan-b', plan[key])); });
    main.appendChild(pc);
  }

  main.appendChild(buildContactCard(settings, fid, comms));

  const mp = el('div', 'nb-panel');
  mp.appendChild(el('p', 'nb-sectitle', 'My milestones'));
  mp.appendChild(el('p', 'nb-hint', 'Tap the circle on the left of each step to mark your progress: empty → half (doing) → tick (done). Use “+ Add” to write your own.'));
  const done = milestones.filter(m => m.status === 'done').length;
  if (milestones.length) {
    const bar = el('div', 'nb-progress'); const fill = el('div', 'nb-progress-fill'); fill.style.width = Math.round(done / milestones.length * 100) + '%'; bar.appendChild(fill); mp.appendChild(bar);
    mp.appendChild(el('p', 'nb-sub', done + ' of ' + milestones.length + ' done'));
  }
  mp.appendChild(buildMilestoneList(fid, milestones));
  main.appendChild(mp);

  const jp = el('div', 'nb-panel');
  jp.appendChild(el('p', 'nb-sectitle', 'The full programme journey'));
  jp.appendChild(el('p', 'nb-hint', 'Tap any month to open it. Each week, tap “Weekly feedback” and “Check-in with mentor” once you’ve done them. Swipe the row sideways to see all months.'));
  const root = el('div'); root.id = 'ainj-root'; jp.appendChild(root); main.appendChild(jp);
  const checks = new Set(weekChecks.map(c => c.week_key + '|' + c.task));
  initTimeline(root, { events: timelineEvents, isMentor: false, checks, toggleCheck: (wk, t, d) => d ? api.addWeeklyCheck(fid, wk, t) : api.removeWeeklyCheck(fid, wk, t) });
}

// MENTOR: general programme position + the shared editable timetable (no fellow),
// then a clearly-separated per-fellow progress section with the switcher.
async function renderMentorJourney(main) {
  const timelineEvents = await api.listTimeline();
  main.appendChild(positionStrip('Programme journey', journeyStatus(timelineEvents)));

  const jp = el('div', 'nb-panel');
  jp.appendChild(el('p', 'nb-sectitle', 'Programme timetable — shared with everyone'));
  jp.appendChild(el('p', 'nb-hint', 'The shared calendar — not tied to any one fellow. Tap a month, then add or remove activities with “+ Add” and the × on each card; every fellow sees the change.'));
  const root = el('div'); root.id = 'ainj-root'; jp.appendChild(root); main.appendChild(jp);
  initTimeline(root, { events: timelineEvents, isMentor: true, addEvent: ev => api.addTimelineEvent(ev), deleteEvent: id => api.deleteTimelineEvent(id), readonlyChips: true });

  if (!fellows().length) { main.appendChild(noFellowsNotice()); return; }
  const fid = currentFellowId();
  const [milestones, weekChecks, comms] = await Promise.all([api.listMilestones(fid), api.listWeeklyChecks(fid), api.listCommunications(fid)]);
  main.appendChild(fellowSwitcher('Each fellow’s progress'));
  const mp = el('div', 'nb-panel');
  mp.appendChild(el('p', 'nb-sectitle', nameOf(fid) + '’s milestones'));
  mp.appendChild(el('p', 'nb-hint', 'These belong to ' + nameOf(fid) + '. “+ Add” assigns a milestone; ' + nameOf(fid) + ' ticks it off as they go. (Each fellow keeps their own.)'));
  const done = milestones.filter(m => m.status === 'done').length;
  const wk = weekChecks.length + ' weekly check-in' + (weekChecks.length === 1 ? '' : 's') + ' logged';
  if (milestones.length) {
    const bar = el('div', 'nb-progress'); const fill = el('div', 'nb-progress-fill'); fill.style.width = Math.round(done / milestones.length * 100) + '%'; bar.appendChild(fill); mp.appendChild(bar);
    mp.appendChild(el('p', 'nb-sub', done + ' of ' + milestones.length + ' done · ' + wk));
  } else {
    mp.appendChild(el('p', 'nb-sub', wk));
  }
  mp.appendChild(buildMilestoneList(fid, milestones));
  main.appendChild(mp);

  main.appendChild(buildMentorCommPanel(fid, comms));
}

function nowNextCard(kind, title, items, tone) {
  const c = el('div', 'nb-nncard nb-nn-' + tone);
  c.appendChild(el('div', 'nb-nnk', kind));
  c.appendChild(el('div', 'nb-nnt', title));
  if (items.length) c.appendChild(el('div', 'nb-nni', items.join(' · ')));
  return c;
}

const MST_NEXT = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
const MST_ICON = { todo: '○', in_progress: '◐', done: '✓' };
const MST_LABEL = { todo: 'to do', in_progress: 'in progress', done: 'done' };

function buildMilestoneList(fid, milestones) {
  const wrap = el('div');
  const ul = el('ul', 'nb-mst');
  // fellow edits own; mentor can also help manage
  const canEdit = isMentor() || fid === S.userId;
  if (!milestones.length) ul.appendChild(el('p', 'nb-empty', 'No milestones yet' + (canEdit ? ' — add the first one below.' : ' yet.')));
  milestones.forEach(m => {
    const li = el('li');
    const cls = 'nb-mststate' + (m.status === 'done' ? ' is-done' : m.status === 'in_progress' ? ' is-progress' : '');
    const st = el('button', cls, MST_ICON[m.status]);
    st.title = 'Status: ' + MST_LABEL[m.status] + (canEdit ? ' — tap to change' : '');
    st.setAttribute('aria-label', st.title);
    if (canEdit) st.addEventListener('click', async () => {
      try { await api.setMilestoneStatus(m.id, MST_NEXT[m.status]); renderMain(); } catch (err) { flash(err); }
    }); else st.disabled = true;
    li.appendChild(st);
    li.appendChild(el('span', 'nb-msttitle' + (m.status === 'done' ? ' is-done' : ''), m.title));
    if (m.due_label) li.appendChild(el('span', 'nb-mstmeta', m.due_label));
    // mentor controls whether this milestone appears on the public overview
    if (isMentor()) {
      const onOv = m.show_on_overview !== false;
      const eye = el('button', 'nb-msteye' + (onOv ? '' : ' is-off'), onOv ? '◉' : '◌');
      eye.title = onOv ? 'Shown on public overview — tap to hide' : 'Hidden from public overview — tap to show';
      eye.setAttribute('aria-label', eye.title);
      eye.addEventListener('click', async () => {
        try { await api.setMilestoneOverview(m.id, !onOv); renderMain(); } catch (err) { flash(err); }
      });
      li.appendChild(eye);
    }
    if (canEdit) {
      const del = el('button', 'nb-mstdel', '✕');
      del.setAttribute('aria-label', 'Delete milestone');
      del.addEventListener('click', async () => {
        if (!confirm('Delete this milestone?')) return;
        try { await api.deleteMilestone(m.id); renderMain(); } catch (err) { flash(err); }
      });
      li.appendChild(del);
    }
    ul.appendChild(li);
  });
  wrap.appendChild(ul);

  if (canEdit) {
    const add = el('div', 'nb-addrow');
    const t = el('input'); t.type = 'text'; t.placeholder = 'Add a milestone…';
    const due = el('input'); due.type = 'text'; due.placeholder = 'When? (e.g. Jul wk 2)'; due.style.maxWidth = '150px';
    const btn = el('button', 'nb-btn', '+ Add');
    async function add1() {
      const v = t.value.trim(); if (!v) return;
      try { await api.addMilestone(fid, v, due.value.trim()); renderMain(); } catch (err) { flash(err); }
    }
    btn.addEventListener('click', add1);
    t.addEventListener('keydown', e => { if (e.key === 'Enter') add1(); });
    add.appendChild(t); add.appendChild(due); add.appendChild(btn);
    wrap.appendChild(add);
  }
  return wrap;
}

/* ================= communication (fellow ↔ mentor email log) ================= */
// One logged email. mentor=true adds the received / show-on-overview controls.
function commItem(c, mentor) {
  const card = el('div', 'nb-entry');
  const top = el('div', 'nb-row');
  top.appendChild(el('span', 'nb-comm-subj', c.subject || 'Email to mentor'));
  top.appendChild(el('span', 'nb-spacer'));
  top.appendChild(c.received_at
    ? el('span', 'nb-pill nb-pill-done', '✓ Received')
    : el('span', 'nb-pill nb-pill-new', 'Sent'));
  card.appendChild(top);
  card.appendChild(el('div', 'nb-entry-meta', 'Sent ' + fmtDate(c.sent_at) +
    (c.received_at ? ' · received ' + fmtDate(c.received_at) : ' · awaiting reply')));

  const ctl = el('div', 'nb-row'); ctl.style.marginTop = '8px';
  if (mentor) {
    const rcv = el('button', 'nb-btn nb-btn-small', c.received_at ? 'Unmark received' : 'Mark received');
    if (!c.received_at) rcv.classList.add('nb-btn-accent');
    rcv.addEventListener('click', async () => { try { await api.setCommunicationReceived(c.id, !c.received_at); renderMain(); } catch (e) { flash(e); } });
    ctl.appendChild(rcv);
    const ov = el('button', 'nb-btn nb-btn-small', c.show_on_overview ? 'On overview ✓' : 'Show on overview');
    if (c.show_on_overview) ov.classList.add('nb-btn-accent');
    ov.title = c.show_on_overview ? 'Visible on the public overview (date + count only) — tap to hide' : 'Hidden from the public overview — tap to show (date + count only, never the subject)';
    ov.addEventListener('click', async () => { try { await api.setCommunicationOverview(c.id, !c.show_on_overview); renderMain(); } catch (e) { flash(e); } });
    ctl.appendChild(ov);
  }
  // delete: mentor any time; a fellow only before it is marked received
  if (mentor || !c.received_at) {
    const del = el('button', 'nb-btn nb-btn-small', 'Delete');
    del.addEventListener('click', async () => { if (!confirm('Delete this entry?')) return; try { await api.deleteCommunication(c.id); renderMain(); } catch (e) { flash(e); } });
    ctl.appendChild(del);
  }
  if (ctl.childNodes.length) card.appendChild(ctl);
  return card;
}

// FELLOW: a "Your mentor" card — contact email, a mail button, a log control,
// and the history of emails they've logged.
function buildContactCard(settings, fid, comms) {
  const email = settings && safeEmail(settings.contact_email);
  const mname = mentorId() ? nameOf(mentorId()) : 'your mentor';
  const p = el('div', 'nb-panel');
  p.appendChild(el('p', 'nb-sectitle', 'Your mentor'));
  p.appendChild(el('p', 'nb-sub', 'Email ' + mname + ' any time. After you send one, tap “I emailed the mentor” to log it here — ' + mname + ' will mark it received.'));

  if (email) {
    const row = el('div', 'nb-row'); row.style.marginTop = '10px';
    const myName = S.profile.display_name || S.profile.full_name;
    const mailBtn = el('a', 'nb-btn nb-btn-accent', '✉ Email ' + mname);
    mailBtn.href = mailtoHref(email, CONFIG.programmeName + ' — message from ' + myName) || '#';
    mailBtn.style.textDecoration = 'none';
    row.appendChild(mailBtn);
    row.appendChild(el('span', 'nb-contact-email', email));
    p.appendChild(row);

    const logWrap = el('div'); logWrap.style.marginTop = '10px';
    const logBtn = el('button', 'nb-btn', '＋ I emailed the mentor');
    const form = el('div', 'nb-addrow nb-hidden');
    const subj = el('input'); subj.type = 'text'; subj.placeholder = 'What was it about? (optional)'; subj.maxLength = 200;
    const save = el('button', 'nb-btn nb-btn-accent', 'Log it');
    async function doLog() { save.disabled = true; try { await api.addCommunication(fid, subj.value.trim()); renderMain(); } catch (e) { flash(e); save.disabled = false; } }
    save.addEventListener('click', doLog);
    subj.addEventListener('keydown', e => { if (e.key === 'Enter') doLog(); });
    logBtn.addEventListener('click', () => { form.classList.toggle('nb-hidden'); if (!form.classList.contains('nb-hidden')) subj.focus(); });
    form.appendChild(subj); form.appendChild(save);
    logWrap.appendChild(logBtn); logWrap.appendChild(form);
    p.appendChild(logWrap);
  } else {
    p.appendChild(el('p', 'nb-empty', mname + ' hasn’t added a contact email yet.'));
  }

  if (comms.length) {
    const h = el('p', 'nb-sectitle', 'Your emails to your mentor'); h.style.marginTop = '16px';
    p.appendChild(h);
    comms.forEach(c => p.appendChild(commItem(c, false)));
  }
  return p;
}

// MENTOR: the communication log for one fellow, with received / overview controls.
function buildMentorCommPanel(fid, comms) {
  const p = el('div', 'nb-panel');
  p.appendChild(el('p', 'nb-sectitle', 'Communication with ' + nameOf(fid)));
  p.appendChild(el('p', 'nb-hint', nameOf(fid) + ' logs each email they send you. Tap “Mark received” to confirm you got it. “Show on overview” publishes only the date and a count to the public page — never the subject.'));
  if (!comms.length) p.appendChild(el('p', 'nb-empty', 'No emails logged yet.'));
  comms.forEach(c => p.appendChild(commItem(c, true)));
  return p;
}

/* ================= feedback (mentor writes → fellow reads) ================= */
async function renderFeedback(main) {
  if (isMentor()) {
    if (!fellows().length) { main.appendChild(noFellowsNotice()); return; }
    main.appendChild(fellowSwitcher('Feedback for'));
  }
  const fid = currentFellowId();
  const mine = !isMentor();
  const items = await api.listFeedback(fid);
  const p = el('div', 'nb-panel');
  p.appendChild(el('h2', 'nb-h2', mine ? 'Feedback from your mentor' : 'Feedback for ' + nameOf(fid)));
  p.appendChild(el('p', 'nb-sub', mine
    ? 'Notes and guidance from your mentor on your project.'
    : 'Write guidance for ' + nameOf(fid) + '. They see it straight away.'));

  if (!items.length) p.appendChild(el('p', 'nb-empty', mine ? 'No feedback yet.' : 'No feedback written yet — add the first below.'));
  items.forEach(f => {
    const card = el('div', 'nb-entry');
    card.appendChild(el('p', 'nb-entry-body', f.body));
    const meta = el('div', 'nb-row');
    meta.appendChild(el('span', 'nb-entry-meta', nameOf(f.author_id) + ' · ' + fmtDate(f.created_at)));
    if (isMentor()) {
      meta.appendChild(el('span', 'nb-spacer'));
      const del = el('button', 'nb-btn nb-btn-small', 'Delete');
      del.addEventListener('click', async () => {
        if (!confirm('Delete this feedback?')) return;
        try { await api.deleteFeedback(f.id); renderMain(); } catch (err) { flash(err); }
      });
      meta.appendChild(del);
    }
    card.appendChild(meta);
    p.appendChild(card);
  });

  if (isMentor()) {
    const comp = el('div', 'nb-composer');
    const ta = el('textarea');
    ta.placeholder = 'Write feedback for ' + nameOf(fid) + '…';
    const send = el('button', 'nb-btn nb-btn-accent', 'Post feedback');
    send.addEventListener('click', async () => {
      const v = ta.value.trim(); if (!v) return;
      send.disabled = true;
      try { await api.addFeedback(fid, v); renderMain(); } catch (err) { flash(err); send.disabled = false; }
    });
    comp.appendChild(ta); comp.appendChild(send);
    p.appendChild(comp);
  }
  main.appendChild(p);
}

/* ================= notebook (fellow writes → mentor reads) ================= */
async function renderNotebook(main) {
  if (isMentor()) {
    if (!fellows().length) { main.appendChild(noFellowsNotice()); return; }
    main.appendChild(fellowSwitcher('Notebook of'));
  }
  const fid = currentFellowId();
  const mine = !isMentor();
  const items = await api.listNotebook(fid);
  const p = el('div', 'nb-panel');
  p.appendChild(el('h2', 'nb-h2', mine ? 'My notebook' : nameOf(fid) + "'s notebook"));
  p.appendChild(el('p', 'nb-sub', mine
    ? 'Your space — log progress, jot ideas, note what is blocking you. Your mentor can read this to follow along.'
    : 'What ' + nameOf(fid) + ' has logged. This is their space — read only.'));

  if (!items.length) p.appendChild(el('p', 'nb-empty', mine ? 'Nothing yet — write your first entry below.' : 'Nothing logged yet.'));
  items.forEach(n => {
    const card = el('div', 'nb-entry');
    card.appendChild(el('p', 'nb-entry-body', n.body));
    const meta = el('div', 'nb-row');
    meta.appendChild(el('span', 'nb-entry-meta', fmtDate(n.created_at)));
    if (mine) {
      meta.appendChild(el('span', 'nb-spacer'));
      const del = el('button', 'nb-btn nb-btn-small', 'Delete');
      del.addEventListener('click', async () => {
        if (!confirm('Delete this entry?')) return;
        try { await api.deleteNotebook(n.id); renderMain(); } catch (err) { flash(err); }
      });
      meta.appendChild(del);
    }
    card.appendChild(meta);
    p.appendChild(card);
  });

  if (mine) {
    const comp = el('div', 'nb-composer');
    const ta = el('textarea');
    ta.placeholder = 'What did you do, learn, or get stuck on? Any idea to share?';
    const send = el('button', 'nb-btn nb-btn-accent', 'Add entry');
    send.addEventListener('click', async () => {
      const v = ta.value.trim(); if (!v) return;
      send.disabled = true;
      try { await api.addNotebook(fid, v); renderMain(); } catch (err) { flash(err); send.disabled = false; }
    });
    comp.appendChild(ta); comp.appendChild(send);
    p.appendChild(comp);
  }
  main.appendChild(p);
}

/* ================= resources (mentor adds → everyone reads) ================= */
async function renderResources(main) {
  const items = await api.listResources();
  const p = el('div', 'nb-panel');
  p.appendChild(el('h2', 'nb-h2', 'Resources'));
  p.appendChild(el('p', 'nb-sub', isMentor()
    ? 'Links, tools and readings you share with both fellows.'
    : 'Links, tools and readings shared by your mentor.'));
  main.appendChild(p);

  const list = el('div');
  if (!items.length) list.appendChild(el('p', 'nb-empty', 'Nothing shared yet.'));
  items.forEach(r => {
    const card = el('div', 'nb-res');
    const t = el('p', 'nb-res-title');
    const safe = safeUrl(r.url);
    if (safe) {
      const a = el('a', null, r.title);
      a.href = safe; a.target = '_blank'; a.rel = 'noopener noreferrer';
      t.appendChild(a);
    } else {
      // never render an unsafe URL as a clickable link
      t.appendChild(el('span', null, r.title));
      t.appendChild(el('span', 'nb-res-note', ' (link hidden — not a valid web address)'));
    }
    card.appendChild(t);
    if (r.note) card.appendChild(el('p', 'nb-res-note', r.note));
    const meta = el('div', 'nb-res-meta');
    meta.appendChild(el('span', null, nameOf(r.author_id) + ' · ' + fmtDate(r.created_at)));
    if (isMentor()) {
      const del = el('button', 'nb-btn nb-btn-small', 'Remove');
      del.addEventListener('click', async () => {
        if (!confirm('Remove this resource?')) return;
        try { await api.deleteResource(r.id); renderMain(); } catch (err) { flash(err); }
      });
      meta.appendChild(del);
    }
    card.appendChild(meta);
    list.appendChild(card);
  });
  main.appendChild(list);

  if (isMentor()) {
    const fp = el('div', 'nb-panel');
    fp.appendChild(el('p', 'nb-sectitle', 'Add a resource'));
    const form = el('form', 'nb-form');
    const title = el('input'); title.type = 'text'; title.placeholder = 'Title'; title.required = true;
    const url = el('input'); url.type = 'url'; url.placeholder = 'https://…'; url.required = true;
    const note = el('input'); note.type = 'text'; note.placeholder = 'Why it is useful (optional)';
    const btn = el('button', 'nb-btn nb-btn-accent', 'Share resource'); btn.type = 'submit';
    form.appendChild(title); form.appendChild(url); form.appendChild(note); form.appendChild(btn);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const safe = safeUrl(url.value);
      if (!safe) { alert('Please enter a valid web link starting with http:// or https://'); return; }
      try { await api.addResource(title.value.trim(), safe, note.value.trim()); renderMain(); }
      catch (err) { flash(err); }
    });
    fp.appendChild(form);
    main.appendChild(fp);
  }
}

/* ================= mentor area (plan + names) ================= */
function kindLabel(k) { const r = SESSION_KINDS.find(x => x[0] === k); return r ? r[1] : k; }

async function renderMentor(main) {
  if (!isMentor()) { main.appendChild(notice('Mentor only', 'This area is for the mentor.')); return; }

  const [stats, sessions] = await Promise.all([api.mentorStats(), api.listSessions()]);

  // --- impact summary + printable report ---
  const sum = el('div', 'nb-panel');
  const sh = el('div', 'nb-row');
  sh.appendChild(el('h2', 'nb-h2', 'Your impact'));
  sh.appendChild(el('span', 'nb-spacer'));
  const rep = el('a', 'nb-btn nb-btn-accent', 'Open printable report ↗');
  rep.href = 'report'; rep.target = '_blank'; rep.rel = 'noopener noreferrer'; rep.style.textDecoration = 'none';
  sh.appendChild(rep);
  sum.appendChild(sh);
  sum.appendChild(el('p', 'nb-sub', 'A live tally of everything you’ve done — from building the platform to every session. Open the report to export a branded PDF for the programme.'));
  const grid = el('div', 'nb-ovstats');
  grid.style.gridTemplateColumns = 'repeat(auto-fit,minmax(118px,1fr))';
  const hrs = Math.round(stats.session_minutes / 60 * 10) / 10;
  [['Sessions logged', stats.sessions_total], ['Hours mentored', hrs], ['1:1 sessions', stats.one_to_one_total],
   ['Feedback notes', stats.feedback_total], ['Milestones guided', stats.milestones_total],
   ['Resources shared', stats.resources_total], ['Check-ins', stats.weekly_total]].forEach(([l, v]) => {
    const s = el('div', 'nb-ovstat'); s.appendChild(el('div', 'nb-ovstat-n', String(v))); s.appendChild(el('div', 'nb-ovstat-l', l)); grid.appendChild(s);
  });
  sum.appendChild(grid);
  if (stats.active_since) sum.appendChild(el('p', 'nb-sub', 'Active since ' + fmtDate(stats.active_since)));
  main.appendChild(sum);

  // --- session & work log ---
  const sl = el('div', 'nb-panel');
  sl.appendChild(el('p', 'nb-sectitle', 'Session & work log'));
  sl.appendChild(el('p', 'nb-sub', 'Log every session and piece of work — 1:1s, the platform build, workshops, admin. This is your evidence trail; include everything from when you started building.'));
  if (!sessions.length) sl.appendChild(el('p', 'nb-empty', 'Nothing logged yet — add your first entry below (e.g. building this platform).'));
  sessions.forEach(s => {
    const row = el('div', 'nb-entry');
    const top = el('div', 'nb-row');
    top.appendChild(el('span', 'nb-sess-date', fmtDate(s.session_date)));
    top.appendChild(el('span', 'nb-pill nb-sess-kind', kindLabel(s.kind)));
    top.appendChild(el('span', 'nb-sess-meta', (s.fellow_id ? nameOf(s.fellow_id) : 'Programme') + (s.minutes ? ' · ' + s.minutes + ' min' : '')));
    top.appendChild(el('span', 'nb-spacer'));
    const del = el('button', 'nb-btn nb-btn-small', 'Delete');
    del.addEventListener('click', async () => { if (!confirm('Delete this log entry?')) return; try { await api.deleteSession(s.id); renderMain(); } catch (err) { flash(err); } });
    top.appendChild(del);
    row.appendChild(top);
    row.appendChild(el('div', 'nb-sess-title', s.title));
    if (s.notes) row.appendChild(el('p', 'nb-entry-body', s.notes));
    sl.appendChild(row);
  });
  const sf = el('form', 'nb-form');
  const r1 = el('div', 'nb-formrow');
  const dt = el('input'); dt.type = 'date'; dt.required = true;
  const kd = el('select'); SESSION_KINDS.forEach(([v, l]) => kd.appendChild(new Option(l, v)));
  const wh = el('select'); wh.appendChild(new Option('Whole programme', '')); fellows().forEach(f => wh.appendChild(new Option(nameOf(f.id), f.id)));
  const mn = el('input'); mn.type = 'number'; mn.min = '0'; mn.placeholder = 'Minutes';
  r1.appendChild(dt); r1.appendChild(kd); r1.appendChild(wh); r1.appendChild(mn);
  const ti = el('input'); ti.type = 'text'; ti.placeholder = 'What did you do? (e.g. 1:1 — proposal review)'; ti.required = true; ti.maxLength = 200;
  const nt = el('textarea'); nt.placeholder = 'Notes (optional)'; nt.maxLength = 4000;
  const addBtn = el('button', 'nb-btn nb-btn-accent', 'Add to log'); addBtn.type = 'submit';
  sf.appendChild(r1); sf.appendChild(ti); sf.appendChild(nt); sf.appendChild(addBtn);
  sf.addEventListener('submit', async e => {
    e.preventDefault();
    const s = { session_date: dt.value, kind: kd.value, fellow_id: wh.value || null, minutes: mn.value ? parseInt(mn.value, 10) : null, title: ti.value.trim(), notes: nt.value.trim() || null };
    if (!s.session_date || !s.title) return;
    try { await api.addSession(s); renderMain(); } catch (err) { flash(err); }
  });
  sl.appendChild(sf);
  main.appendChild(sl);

  // mentorship plan (the 5 outline sections)
  const plan = (await api.getPlan()) || {};
  const pl = el('div', 'nb-panel');
  pl.appendChild(el('h2', 'nb-h2', 'Your mentorship plan'));
  pl.appendChild(el('p', 'nb-sub', 'Your approach, structure, focus areas, tools and notes. Your fellows can read this so they know how you work. (These are the sections the programme asks every mentor for.)'));
  const inputs = {};
  PLAN_SECTIONS.forEach(([key, label]) => {
    pl.appendChild(el('p', 'nb-sectitle', label));
    const ta = el('textarea');
    ta.value = plan[key] || '';
    ta.maxLength = 4000;
    ta.style.cssText = 'width:100%;min-height:70px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;background:#fff;resize:vertical;margin-bottom:6px;';
    pl.appendChild(ta);
    inputs[key] = ta;
  });
  const saveBtn = el('button', 'nb-btn nb-btn-accent', 'Save plan');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const fields = {};
    PLAN_SECTIONS.forEach(([key]) => { fields[key] = inputs[key].value.trim() || null; });
    try { await api.savePlan(fields); saveBtn.textContent = 'Saved ✓'; setTimeout(() => { saveBtn.textContent = 'Save plan'; saveBtn.disabled = false; }, 1500); }
    catch (err) { flash(err); saveBtn.disabled = false; }
  });
  pl.appendChild(saveBtn);
  main.appendChild(pl);

  // contact email + what shows on the public overview
  const settings = (await api.getSettings()) || {};
  const cs = el('div', 'nb-panel');
  cs.appendChild(el('h2', 'nb-h2', 'Contact & public overview'));
  cs.appendChild(el('p', 'nb-sub', 'Your contact email is shown to your fellows so they can reach you (never on the public page). Choose which sections appear on the read-only public overview.'));

  cs.appendChild(el('p', 'nb-sectitle', 'Contact email — your fellows see this'));
  const emailIn = el('input'); emailIn.type = 'email'; emailIn.maxLength = 200;
  emailIn.value = settings.contact_email || '';
  emailIn.placeholder = 'you@example.com';
  emailIn.style.cssText = 'width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:14px;background:#fff;';
  cs.appendChild(emailIn);

  cs.appendChild(el('p', 'nb-sectitle', 'Show on the public overview')).style.marginTop = '14px';
  const OV_TOGGLES = [['show_milestones', 'Milestones (titles + status)'], ['show_activity', 'Activity counts'], ['show_communication', 'Communication (dates + counts)'], ['show_mentor_impact', 'My contribution']];
  const checks = {};
  OV_TOGGLES.forEach(([k, label]) => {
    const lab = el('label', 'nb-check');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = settings[k] !== false;
    lab.appendChild(cb); lab.appendChild(el('span', null, label));
    checks[k] = cb; cs.appendChild(lab);
  });
  const csSave = el('button', 'nb-btn nb-btn-accent', 'Save settings'); csSave.style.marginTop = '12px';
  csSave.addEventListener('click', async () => {
    const email = emailIn.value.trim();
    if (email && !safeEmail(email)) { alert('Please enter a valid email address (name@example.com).'); return; }
    csSave.disabled = true;
    const fields = { contact_email: email || null };
    OV_TOGGLES.forEach(([k]) => { fields[k] = checks[k].checked; });
    try { await api.saveSettings(fields); csSave.textContent = 'Saved ✓'; setTimeout(() => { csSave.textContent = 'Save settings'; csSave.disabled = false; }, 1500); }
    catch (err) { flash(err); csSave.disabled = false; }
  });
  cs.appendChild(csSave);
  main.appendChild(cs);

  const p = el('div', 'nb-panel');
  p.appendChild(el('h2', 'nb-h2', 'Display names'));
  p.appendChild(el('p', 'nb-sub', 'Set how each person appears in the app and on the public overview. This replaces the email-based name, so no email is ever shown.'));

  const order = S.profiles.slice().sort((a, b) => (a.role === 'mentor' ? -1 : 1) - (b.role === 'mentor' ? -1 : 1));
  order.forEach(prof => {
    const row = el('div', 'nb-row');
    row.style.marginTop = '12px';
    const av = el('span', 'nb-avatar', initialsOf(prof.id));
    row.appendChild(av);
    const col = el('div'); col.style.flex = '1'; col.style.minWidth = '160px';
    col.appendChild(el('div', null, prof.role === 'mentor' ? 'You (mentor)' : 'Fellow'));
    const input = el('input'); input.type = 'text'; input.maxLength = 80;
    input.placeholder = 'Display name';
    input.value = prof.display_name || prof.full_name || '';
    input.style.cssText = 'width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:10px;font-size:14px;margin-top:4px;background:#fff;';
    col.appendChild(input);
    row.appendChild(col);
    const save = el('button', 'nb-btn nb-btn-accent', 'Save');
    save.addEventListener('click', async () => {
      save.disabled = true;
      try { await api.setDisplayName(prof.id, input.value); renderShell(); renderMain(); }
      catch (err) { flash(err); save.disabled = false; }
    });
    row.appendChild(save);
    p.appendChild(row);
  });
  main.appendChild(p);

  const note = el('div', 'nb-panel');
  note.appendChild(el('p', 'nb-sectitle', 'Public overview'));
  note.appendChild(el('p', 'nb-sub', 'There is a read-only public link an organiser can open without signing in. It shows names, progress and milestone titles only — never emails, feedback text, notebook entries or the subject of any email. Use the toggles in “Contact & public overview” above to choose which sections appear, and the ◉/◌ button on each milestone (and “Show on overview” on each logged email) to publish or hide individual items. Because milestone titles are public there, avoid putting anything sensitive in a milestone title.'));
  const link = el('a', 'nb-btn', 'Open the public overview ↗');
  link.href = 'overview'; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.style.cssText = 'display:inline-flex;margin-top:10px;text-decoration:none;';
  note.appendChild(link);
  main.appendChild(note);
}

/* ================= auth & boot ================= */
function show(id) { ['boot', 'login', 'app'].forEach(x => $('#' + x).classList.toggle('nb-hidden', x !== id)); }

async function enterApp() {
  await api.loadAll();
  if (!S.profile) {
    show('login');
    const msg = $('#login-msg');
    msg.textContent = 'Your account exists but has no profile yet. Ask your mentor to re-run the database setup or invite you again.';
    msg.classList.add('nb-err');
    return;
  }
  const banner = $('#demo-banner');
  banner.classList.toggle('nb-hidden', !DEMO);
  if (DEMO) {
    banner.innerHTML = '';
    banner.appendChild(document.createTextNode('Demo mode — nothing is saved. Viewing as ' + S.profile.full_name + '. Switch: '));
    [['Mentor', '1'], ['Fellow A', 'a'], ['Fellow B', 'b']].forEach(([label, q], i) => {
      if (i) banner.appendChild(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = '?demo=' + q; a.textContent = label;
      banner.appendChild(a);
    });
  }
  show('app');
  renderShell();
  renderMain();
}

async function startDemo() {
  DEMO = true;
  const who = (new URLSearchParams(location.search).get('demo') || '').toLowerCase();
  if (who === 'a') demo.userId = 'u-fellow-a';
  else if (who === 'b') demo.userId = 'u-fellow-b';
  await enterApp();
}

async function boot() {
  if (CONFIG.sandboxUrl) $('#sandbox-bar').href = CONFIG.sandboxUrl;

  if (!CONFIGURED || DEMO_PARAM) {
    show('login');
    if (!CONFIGURED) $('#setup-note').classList.remove('nb-hidden');
    $('#login-form').addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('#login-msg');
      msg.textContent = CONFIGURED ? '' : 'Supabase is not configured yet — use demo mode below, or follow the README.';
      msg.classList.add('nb-err');
    });
    $('#demo-btn').addEventListener('click', startDemo);
    if (DEMO_PARAM) startDemo();
    return;
  }

  // supabase-js is vendored locally (see index.html) — nothing loads from a CDN at runtime.
  if (!window.supabase || !window.supabase.createClient) {
    show('login');
    $('#login-msg').textContent = 'The app failed to load a required library. Please refresh.';
    $('#login-msg').classList.add('nb-err');
    return;
  }
  sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

  const { data: { session } } = await sb.auth.getSession();
  if (session) { await enterApp(); }
  else {
    show('login');
    $('#login-form').addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('#login-email').value.trim();
      const btn = $('#login-btn'), msg = $('#login-msg');
      msg.classList.remove('nb-err');
      btn.disabled = true; msg.textContent = 'Sending the link…';
      const { error } = await sb.auth.signInWithOtp({
        email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname }
      });
      btn.disabled = false;
      // Never reveal whether an email is registered (no user enumeration):
      // a "not on the list" error and a real send get the SAME neutral reply.
      // Only surface errors that don't leak account existence (rate limit, network).
      if (error && error.status === 429) {
        msg.classList.add('nb-err');
        msg.textContent = 'Too many sign-in attempts. Please wait a minute, then try again.';
      } else if (error && /network|fetch|failed to|connection/i.test(error.message || '')) {
        msg.classList.add('nb-err');
        msg.textContent = 'Could not reach the server. Check your connection and try again.';
      } else {
        msg.textContent = 'If that email is on the programme, a sign-in link is on its way. Check your inbox (and your spam folder).';
      }
    });
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' && !S.profile) enterApp().catch(flash);
    if (event === 'SIGNED_OUT') location.reload();
  });
}

$('#signout-btn').addEventListener('click', () => api.signOut().catch(flash));
boot().catch(err => {
  console.error(err);
  $('#boot').textContent = 'Could not start the notebook: ' + (err.message || err);
});

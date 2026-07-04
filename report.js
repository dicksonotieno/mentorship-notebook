/*
 * Mentorship Notebook — printable mentor report
 * Built by Dickson Otieno — https://dicksonotieno.com
 */
import { CONFIG } from './config.js';

const CONFIGURED = !/YOUR[-_]/.test(CONFIG.supabaseUrl) && !/YOUR[-_]/.test(CONFIG.supabaseAnonKey);
const $ = s => document.querySelector(s);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d) || d.getFullYear() < 2000) return '—';
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear();
}
const KIND = { session: '1:1 session', build: 'Platform / build', workshop: 'Workshop', admin: 'Admin', other: 'Other' };
const MST = { todo: '○', in_progress: '◐', done: '✓' };

function fail(msg, showSignin) {
  const b = $('#rep-boot');
  b.innerHTML = '';
  b.appendChild(el('p', null, msg));
  if (showSignin) { const a = el('a', 'nb-btn', 'Sign in'); a.href = '/'; a.style.cssText = 'display:inline-flex;margin-top:10px;text-decoration:none;'; b.appendChild(a); }
}

const DEMO = new URLSearchParams(location.search).has('demo') || !CONFIGURED;

function sampleReport() {
  return {
    profiles: [
      { id: 'u-mentor', full_name: 'Mentor', role: 'mentor' },
      { id: 'g', full_name: 'Fellow A', role: 'fellow' }, { id: 'b', full_name: 'Fellow B', role: 'fellow' }
    ],
    plan: { approach: 'Hands-on and feedback-driven. I work alongside each fellow on their real project.', structure: 'Bi-weekly 30-min 1:1s, async feedback, and a weekly rhythm — all on this platform.', focus_areas: 'Core skills, responsible use of tools, idea to finished work.', tools: 'This notebook platform, the practice space, and monthly skills sessions.', notes: 'Flexible to each fellow’s project phase.' },
    sessions: [
      { session_date: '2026-05-20', fellow_id: null, minutes: 1200, kind: 'build', title: 'Set up the mentorship platform', notes: 'Journey, milestones, feedback, weekly tasks, public overview — configured for the fellows.' },
      { session_date: '2026-06-09', fellow_id: null, minutes: 180, kind: 'workshop', title: 'Launch onboarding', notes: 'Walked both fellows through the platform.' },
      { session_date: '2026-06-12', fellow_id: 'g', minutes: 30, kind: 'session', title: '1:1 — project scope', notes: 'Agreed to narrow the scope.' }
    ],
    stats: { feedback_total: 7, milestones_total: 5, resources_total: 3, weekly_total: 20, sessions_total: 14, session_minutes: 1680, one_to_one_total: 11, active_since: '2026-05-20' },
    overview: [
      { fellow_id: 'g', name: 'Fellow A', milestones_total: 3, milestones_done: 1, weekly_done: 11, feedback_count: 4 },
      { fellow_id: 'b', name: 'Fellow B', milestones_total: 2, milestones_done: 1, weekly_done: 9, feedback_count: 3 }
    ],
    milestones: [
      { fellow_id: 'g', title: 'Sign agreement & refine plan', status: 'done', due_label: 'Jun' },
      { fellow_id: 'g', title: 'Complete first project draft', status: 'in_progress', due_label: 'Jun' },
      { fellow_id: 'b', title: 'Outline the project workflow', status: 'todo', due_label: 'Jun' }
    ],
    comms: [
      { fellow_id: 'g', sent_at: '2026-06-11T07:30:00Z', received_at: '2026-06-11T09:15:00Z' },
      { fellow_id: 'g', sent_at: '2026-06-13T06:00:00Z', received_at: null }
    ],
    mentorName: 'Mentor'
  };
}

async function boot() {
  let prof, plan, sessions, pub, ov, ms, comms, mentorName;
  if (DEMO) {
    const d = sampleReport();
    prof = { data: d.profiles }; plan = { data: d.plan }; sessions = { data: d.sessions };
    pub = { data: d.stats }; ov = { data: d.overview }; ms = { data: d.milestones };
    comms = { data: d.comms };
    mentorName = d.mentorName;
  } else {
    if (!window.supabase) { fail('The report needs the app to be configured.'); return; }
    const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { fail('Please sign in as the mentor to view your report.', true); return; }
    [prof, plan, sessions, pub, ov, ms, comms] = await Promise.all([
      sb.from('profiles').select('*'),
      sb.from('mentor_plan').select('*').eq('id', 1).maybeSingle(),
      sb.from('mentor_sessions').select('*').order('session_date', { ascending: true }),
      sb.from('mentor_public').select('*').maybeSingle(),
      sb.from('programme_overview').select('*'),
      sb.from('programme_milestones').select('*'),
      sb.from('communications').select('fellow_id,sent_at,received_at')
    ]);
    const me = (prof.data || []).find(p => p.role === 'mentor');
    if (!me) { fail('This report is for the mentor only.', true); return; }
    if (!pub.data && pub.error) { fail('Could not load the report (' + pub.error.message + ').'); return; }
    mentorName = me.display_name || me.full_name;
  }
  const stats = pub.data || {};
  const PLAN = [['approach', 'Mentorship approach'], ['structure', 'Structure of mentorship'], ['focus_areas', 'Key topics & focus areas'], ['tools', 'Tools & platforms'], ['notes', 'Notes & special considerations']];

  $('#rep-boot').classList.add('nb-hidden');
  $('#rep-app').classList.remove('nb-hidden');
  const page = $('#rep-page');

  // header
  const head = el('header', 'rep-head');
  head.appendChild(el('p', 'rep-eyebrow', CONFIG.programmeName + ' · ' + (CONFIG.programmeSub || '')));
  head.appendChild(el('h1', 'rep-title', 'Mentor report'));
  head.appendChild(el('p', 'rep-by', mentorName + '  ·  generated ' + fmtDate(new Date().toISOString())));
  page.appendChild(head);

  // impact
  const sec1 = el('section', 'rep-sec');
  sec1.appendChild(el('h2', 'rep-h2', 'Impact at a glance'));
  const hrs = Math.round((stats.session_minutes || 0) / 60 * 10) / 10;
  const grid = el('div', 'rep-stats');
  [['Sessions & work logged', stats.sessions_total || 0], ['Hours mentored', hrs], ['1:1 sessions', stats.one_to_one_total || 0],
   ['Feedback notes written', stats.feedback_total || 0], ['Milestones guided', stats.milestones_total || 0],
   ['Resources shared', stats.resources_total || 0], ['Weekly check-ins', stats.weekly_total || 0],
   ['Active since', fmtDate(stats.active_since)]].forEach(([l, v]) => {
    const s = el('div', 'rep-stat'); s.appendChild(el('div', 'rep-stat-n', String(v))); s.appendChild(el('div', 'rep-stat-l', l)); grid.appendChild(s);
  });
  sec1.appendChild(grid);
  page.appendChild(sec1);

  // plan
  if (plan.data && PLAN.some(([k]) => plan.data[k])) {
    const sec = el('section', 'rep-sec');
    sec.appendChild(el('h2', 'rep-h2', 'Mentorship plan'));
    PLAN.forEach(([k, label]) => {
      if (!plan.data[k]) return;
      sec.appendChild(el('div', 'rep-sub', label));
      sec.appendChild(el('p', 'rep-p', plan.data[k]));
    });
    page.appendChild(sec);
  }

  // work & session log
  const sec2 = el('section', 'rep-sec');
  sec2.appendChild(el('h2', 'rep-h2', 'Work & session log'));
  const nameOf = id => { const p = (prof.data || []).find(x => x.id === id); return p ? (p.display_name || p.full_name) : 'Programme'; };
  (sessions.data || []).forEach(s => {
    const row = el('div', 'rep-log');
    const t = el('div', 'rep-log-top');
    t.appendChild(el('span', 'rep-log-date', fmtDate(s.session_date)));
    t.appendChild(el('span', 'rep-log-kind', KIND[s.kind] || s.kind));
    t.appendChild(el('span', 'rep-log-meta', (s.fellow_id ? nameOf(s.fellow_id) : 'Programme') + (s.minutes ? ' · ' + s.minutes + ' min' : '')));
    row.appendChild(t);
    row.appendChild(el('div', 'rep-log-title', s.title));
    if (s.notes) row.appendChild(el('p', 'rep-p', s.notes));
    sec2.appendChild(row);
  });
  if (!(sessions.data || []).length) sec2.appendChild(el('p', 'rep-p', 'No log entries yet.'));
  page.appendChild(sec2);

  // fellow progress
  const sec3 = el('section', 'rep-sec');
  sec3.appendChild(el('h2', 'rep-h2', 'Fellow progress'));
  const commList = (comms && comms.data) || [];
  (ov.data || []).forEach(f => {
    const card = el('div', 'rep-fellow');
    const done = f.milestones_done || 0, total = f.milestones_total || 0;
    const fc = commList.filter(c => c.fellow_id === f.fellow_id);
    const emails = fc.length ? ' · ' + fc.length + ' email' + (fc.length === 1 ? '' : 's') + ' (' + fc.filter(c => c.received_at).length + ' received)' : '';
    card.appendChild(el('div', 'rep-fellow-name', f.name + '  —  ' + done + ' / ' + total + ' milestones · ' + (f.weekly_done || 0) + ' weekly tasks · ' + (f.feedback_count || 0) + ' feedback' + emails));
    (ms.data || []).filter(m => m.fellow_id === f.fellow_id).forEach(m => {
      card.appendChild(el('div', 'rep-mst', (MST[m.status] || '○') + '  ' + m.title + (m.due_label ? '  (' + m.due_label + ')' : '')));
    });
    sec3.appendChild(card);
  });
  if (!(ov.data || []).length) sec3.appendChild(el('p', 'rep-p', 'No fellows yet.'));
  page.appendChild(sec3);

  page.appendChild(el('p', 'rep-foot', 'Generated from the ' + CONFIG.programmeName + ' mentorship platform — a custom tool built for the fellows. ' + fmtDate(new Date().toISOString()) + '.'));

  $('#rep-print').addEventListener('click', () => window.print());
}

boot().catch(err => { console.error(err); fail('Could not load the report.'); });

/*
 * Mentorship Notebook — public read-only overview
 * Built by Dickson Otieno — https://dicksonotieno.com
 */
import { CONFIG } from './config.js';
import { initTimeline, journeyStatus } from './timeline.js?v=4';

const CONFIGURED = !/YOUR[-_]/.test(CONFIG.supabaseUrl) && !/YOUR[-_]/.test(CONFIG.supabaseAnonKey);
const DEMO = new URLSearchParams(location.search).has('demo') || !CONFIGURED;

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

/* ---- sample data for demo / preview (no real data) ---- */
function sampleData() {
  return {
    overview: [
      { fellow_id: 'g', name: 'Fellow A', milestones_total: 3, milestones_done: 1, weekly_done: 11, feedback_count: 4, last_feedback: '2026-10-09T00:00:00Z', notebook_count: 7, last_notebook: '2026-10-10T00:00:00Z', last_active: '2026-10-12T00:00:00Z' },
      { fellow_id: 'b', name: 'Fellow B', milestones_total: 2, milestones_done: 1, weekly_done: 9, feedback_count: 3, last_feedback: '2026-10-06T00:00:00Z', notebook_count: 4, last_notebook: '2026-10-08T00:00:00Z', last_active: '2026-10-08T00:00:00Z' }
    ],
    milestones: [
      { fellow_id: 'g', title: 'Sign agreement & refine plan', status: 'done', due_label: 'Jun' },
      { fellow_id: 'g', title: 'Complete first project draft', status: 'in_progress', due_label: 'Jun' },
      { fellow_id: 'g', title: 'Milestone planning with mentor', status: 'todo', due_label: 'Jul wk 1' },
      { fellow_id: 'b', title: 'Sign agreement & refine plan', status: 'done', due_label: 'Jun' },
      { fellow_id: 'b', title: 'Outline the project workflow', status: 'todo', due_label: 'Jun' }
    ],
    timeline: sampleTimeline(),
    mentor: {
      feedback_total: 7, milestones_total: 5, resources_total: 3, weekly_total: 20,
      sessions_total: 14, session_minutes: 1680, one_to_one_total: 11, active_since: '2026-05-20',
      approach: 'Hands-on and feedback-driven. I work alongside each fellow on their real project.',
      structure: 'Bi-weekly 1:1 check-ins (30 min), plus async feedback and a weekly rhythm — all on this platform.',
      tools: 'This notebook platform, the practice space, and monthly skills sessions.'
    },
    settings: { show_milestones: true, show_activity: true, show_communication: true, show_mentor_impact: true },
    comms: [
      { fellow_id: 'g', messages_total: 3, received_total: 3, last_sent: '2026-10-10T00:00:00Z', last_received: '2026-10-10T00:00:00Z' }
    ]
  };
}
function sampleTimeline() {
  const E = (mk, w, t, title, d) => ({ id: mk + w + title, month_key: mk, week: w, track: t, title, detail: d || null });
  return [
    E('2026-06', null, 'labs', 'Kickoff workshop'),
    E('2026-06', null, 'programme', 'Agreement signed'),
    E('2026-07', null, 'training', 'Skills session', 'Monthly session'),
    E('2026-07', 1, 'labs', 'Lab — Session 1'),
    E('2026-08', null, 'labs', 'Clinic 1', 'August clinic'),
    E('2026-09', null, 'labs', 'Clinic 2', 'September clinic'),
    E('2026-10', null, 'programme', 'Mid-programme review'),
    E('2026-12', null, 'programme', 'Closing report')
  ];
}

async function load() {
  if (DEMO) return sampleData();
  const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  const [ov, ms, tl, mp, st, cm] = await Promise.all([
    sb.from('programme_overview').select('*'),
    sb.from('programme_milestones').select('*'),
    sb.from('timeline_events').select('*').order('sort_order').order('created_at'),
    sb.from('mentor_public').select('*').maybeSingle(),
    sb.from('overview_settings').select('*').maybeSingle(),
    sb.from('programme_communications').select('*')
  ]);
  if (ov.error) throw ov.error;
  return {
    overview: ov.data || [],
    milestones: ms.error ? [] : (ms.data || []),
    timeline: tl.error ? [] : (tl.data || []),
    mentor: mp && !mp.error ? mp.data : null,
    // default every section ON if the settings view isn't there yet
    settings: (st && !st.error && st.data) ? st.data : { show_milestones: true, show_activity: true, show_communication: true, show_mentor_impact: true },
    comms: cm && !cm.error ? (cm.data || []) : []
  };
}

const MST_ICON = { todo: '○', in_progress: '◐', done: '✓' };
const MST_CLS = { todo: '', in_progress: ' is-progress', done: ' is-done' };

function fellowCard(f, milestones, settings, comm) {
  const card = el('div', 'nb-panel');
  const head = el('div', 'nb-row');
  const av = el('span', 'nb-avatar', (f.name || 'F').slice(0, 2).toUpperCase());
  av.style.cssText = 'width:40px;height:40px;font-size:14px;';
  head.appendChild(av);
  const hc = el('div');
  hc.appendChild(el('h2', 'nb-h2', f.name || 'Fellow'));
  const done = f.milestones_done || 0, total = f.milestones_total || 0;
  hc.appendChild(el('p', 'nb-sub', 'Last active ' + fmtDate(f.last_active)));
  head.appendChild(hc);
  head.appendChild(el('span', 'nb-spacer'));
  if (settings.show_milestones && total) head.appendChild(el('span', 'nb-pill nb-pill-done', done + ' / ' + total + ' milestones'));
  card.appendChild(head);

  // progress bar + milestone titles (status only) — only if the section is on
  if (settings.show_milestones) {
    if (total) {
      const bar = el('div', 'nb-progress'); bar.style.marginTop = '12px';
      const fill = el('div', 'nb-progress-fill');
      fill.style.width = Math.round(done / total * 100) + '%';
      bar.appendChild(fill); card.appendChild(bar);
    }
    const mine = milestones.filter(m => m.fellow_id === f.fellow_id);
    if (mine.length) {
      const ul = el('ul', 'nb-mst'); ul.style.marginTop = '10px';
      mine.forEach(m => {
        const li = el('li');
        li.appendChild(el('span', 'nb-mststate' + MST_CLS[m.status], MST_ICON[m.status] || '○'));
        li.appendChild(el('span', 'nb-msttitle' + (m.status === 'done' ? ' is-done' : ''), m.title));
        if (m.due_label) li.appendChild(el('span', 'nb-mstmeta', m.due_label));
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
  }

  // communication summary — dates + counts only, never any subject text
  if (settings.show_communication && comm && comm.messages_total) {
    const line = 'Mentor contact: ' + comm.messages_total + ' email' + (comm.messages_total === 1 ? '' : 's') +
      ' logged · ' + (comm.received_total || 0) + ' acknowledged' +
      (comm.last_sent ? ' · last ' + fmtDate(comm.last_sent) : '');
    const c = el('p', 'nb-sub'); c.style.marginTop = '10px'; c.textContent = line;
    card.appendChild(c);
  }

  // activity counts (no content) — only if the section is on
  if (settings.show_activity) {
    const stats = el('div', 'nb-ovstats');
    [['Weekly tasks done', f.weekly_done || 0],
     ['Feedback received', f.feedback_count || 0],
     ['Notebook entries', f.notebook_count || 0]].forEach(([label, val]) => {
      const s = el('div', 'nb-ovstat');
      s.appendChild(el('div', 'nb-ovstat-n', String(val)));
      s.appendChild(el('div', 'nb-ovstat-l', label));
      stats.appendChild(s);
    });
    card.appendChild(stats);
  }
  return card;
}

async function boot() {
  let data;
  try { data = await load(); }
  catch (err) {
    $('#ov-boot').textContent = 'The public overview is not available yet.';
    console.warn(err);
    return;
  }
  $('#ov-boot').classList.add('nb-hidden');
  $('#ov-app').classList.remove('nb-hidden');
  if (CONFIG.programmeName) $('.nb-brandname').textContent = CONFIG.programmeName;
  const main = $('#ov-main');

  // hero
  const st = journeyStatus(data.timeline);
  const meta = $('#ov-meta');
  const lock = el('span', 'ov-chip ov-chip-lock');
  lock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  lock.appendChild(document.createTextNode('Read-only public view'));
  meta.appendChild(lock);
  const chip = (cls, text) => { meta.appendChild(el('span', 'ov-chip ' + cls, text)); };
  chip('ov-chip-now', st.beforeStart ? st.startLabel : st.afterEnd ? 'Programme complete' : st.pct + '% through · ' + st.current.name + ' ' + st.current.year);
  chip('ov-chip-mut', (data.overview.length || 0) + ' fellow' + (data.overview.length === 1 ? '' : 's'));

  // fellows
  const settings = data.settings || { show_milestones: true, show_activity: true, show_communication: true, show_mentor_impact: true };
  const commBy = {};
  (data.comms || []).forEach(c => { commBy[c.fellow_id] = c; });
  main.appendChild(el('p', 'nb-sectitle', 'Fellows'));
  if (!data.overview.length) main.appendChild(el('p', 'nb-empty', 'No fellows yet.'));
  data.overview.forEach(f => main.appendChild(fellowCard(f, data.milestones, settings, commBy[f.fellow_id])));

  // mentor's contribution (counts + approach — no session notes)
  if (data.mentor && settings.show_mentor_impact) {
    main.appendChild(el('p', 'nb-sectitle', 'Mentor’s contribution'));
    const mc = el('div', 'nb-panel');
    const hrs = Math.round((data.mentor.session_minutes || 0) / 60 * 10) / 10;
    const stats = el('div', 'nb-ovstats');
    stats.style.gridTemplateColumns = 'repeat(auto-fit,minmax(120px,1fr))';
    [['Sessions & work', data.mentor.sessions_total || 0], ['Hours mentored', hrs], ['Feedback notes', data.mentor.feedback_total || 0],
     ['Milestones guided', data.mentor.milestones_total || 0], ['Resources shared', data.mentor.resources_total || 0], ['Check-ins', data.mentor.weekly_total || 0]].forEach(([l, v]) => {
      const s = el('div', 'nb-ovstat'); s.appendChild(el('div', 'nb-ovstat-n', String(v))); s.appendChild(el('div', 'nb-ovstat-l', l)); stats.appendChild(s);
    });
    mc.appendChild(stats);
    if (data.mentor.active_since) mc.appendChild(el('p', 'nb-sub', 'Active since ' + fmtDate(data.mentor.active_since)));
    [['approach', 'Approach'], ['structure', 'Structure'], ['tools', 'Tools & platforms']].forEach(([k, label]) => {
      if (!data.mentor[k]) return;
      mc.appendChild(el('div', 'nb-plan-h', label));
      mc.appendChild(el('p', 'nb-plan-b', data.mentor[k]));
    });
    main.appendChild(mc);
  }

  // the shared programme timeline (read-only, no per-fellow data)
  const jp = el('div', 'nb-panel');
  jp.appendChild(el('p', 'nb-sectitle', 'The full programme timetable'));
  const root = el('div'); root.id = 'ainj-root';
  jp.appendChild(root);
  main.appendChild(jp);
  initTimeline(root, { events: data.timeline, isMentor: false, readonlyChips: true });
}

boot().catch(err => { console.error(err); $('#ov-boot').textContent = 'Could not load the overview.'; });

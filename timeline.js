import { CONFIG } from './config.js';

/* Journey map. The month rail, dates, launch window, weekly rhythm and markers
   all come from CONFIG.timeline (see config.js); the activities inside each
   month come from `events` (the DB) and are mentor-editable.
   Built by Dickson Otieno — https://dicksonotieno.com

   TRACKS = the coloured categories an activity can belong to. Each key's `cls`
   matches a set of colour tokens in styles.css (--training, --labs, …). Rename a
   category by changing its `label`; see CUSTOMIZATION.md to add/recolour tracks. */

const TRACKS = {
  training:  { label: 'Training',   cls: 'training',  color: '#2f6fb2' },
  labs:      { label: 'Labs',       cls: 'labs',      color: '#d05a48' },
  programme: { label: 'Programme',  cls: 'programme', color: '#4f8a3d' },
  mentor:    { label: 'Mentorship', cls: 'mentor',    color: '#b07d10' },
  milestone: { label: 'Milestone',  cls: 'mile',      color: '#e8a512' }
};

/* Month scaffold, dates and markers all derive from CONFIG.timeline; the
   activities inside each month live in the database. name/abbr/num/year are
   computed from each month's 'YYYY-MM' key so nothing is duplicated. */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_ABBR  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TL = CONFIG.timeline;
function parseISO(s) { const [Y, M, D] = String(s).split('-').map(Number); return new Date(Y, (M || 1) - 1, D || 1); }
const MONTHS = TL.months.map(m => {
  const year = +m.key.slice(0, 4), num = +m.key.slice(5, 7) - 1;
  return { key: m.key, year, num, name: MONTH_NAMES[num], abbr: MONTH_ABBR[num],
           weekly: !!m.weekly, kickoff: !!m.kickoff, flag: m.flag || null };
});
const START = parseISO(TL.start), END = parseISO(TL.end);

/* el() = innerHTML, ONLY for hardcoded strings. txt() = textContent, for any
   user-entered data (event titles/details) — never let those touch innerHTML. */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function txt(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function fmt(d) {
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
}
function weeksOf(y, m) {
  const dim = daysInMonth(y, m), w = [];
  let s = 1, i = 1;
  while (s <= dim) {
    const e = Math.min(s + 6, dim);
    w.push({ n: i, start: new Date(y, m, s), end: new Date(y, m, e) });
    s += 7; i++;
  }
  return w;
}
function sameYM(d, y, m) { return d.getFullYear() === y && d.getMonth() === m; }

export function journeyStatus(events, now = new Date()) {
  events = events || [];
  const key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const idx = MONTHS.findIndex(m => m.key === key);
  const beforeStart = now < START, afterEnd = now > END;
  let curIdx = idx;
  if (curIdx < 0) curIdx = beforeStart ? 0 : MONTHS.length - 1;
  const mk = m => ({ name: m.name, key: m.key, year: m.year, titles: events.filter(e => e.month_key === m.key).map(e => e.title) });
  const current = mk(MONTHS[curIdx]);
  const next = curIdx < MONTHS.length - 1 ? mk(MONTHS[curIdx + 1]) : null;
  const pct = Math.round(Math.min(Math.max((now - START) / (END - START), 0), 1) * 100);
  const startLabel = 'Starts ' + fmt(START) + ' ' + START.getFullYear();
  return { current, next, beforeStart, afterEnd, pct, startLabel };
}

/* opts: { events:[], isMentor:bool, addEvent(ev)->row, deleteEvent(id),
          checks:Set("weekKey|task"), toggleCheck(weekKey, task, done) } */
export function initTimeline(root, opts = {}) {
  const NOW = new Date();
  const isMentor = !!opts.isMentor;
  const checks = opts.checks instanceof Set ? opts.checks : new Set();
  const canCheck = typeof opts.toggleCheck === 'function';
  const readonlyChips = !!opts.readonlyChips; // public overview: show rhythm as static labels
  let evs = (opts.events || []).slice();
  let groups = {};
  function regroup() {
    groups = {};
    evs.forEach(e => {
      const b = groups[e.month_key] || (groups[e.month_key] = { monthly: [], weeks: {} });
      if (e.week == null) b.monthly.push(e);
      else (b.weeks[e.week] || (b.weeks[e.week] = [])).push(e);
    });
  }
  regroup();

  root.innerHTML = `
    <div class="ainj-maplabel"><span>The whole journey</span><strong class="ainj-pct"></strong></div>
    <div class="ainj-mapwrap"><div class="ainj-map" role="tablist" aria-label="Months">
      <div class="ainj-rail"><div class="ainj-railfill"></div></div>
    </div></div>
    <div class="ainj-standing">
      <div class="ainj-callout ainj-co-labs"><div>
        <h3>Urgent clinics — any time</h3>
        <p>Flag with mentor <span class="ainj-arrtxt">→</span> Book a session <span class="ainj-arrtxt">→</span> Escalated to the programme coordinator if out of scope.</p>
      </div></div>
      <div class="ainj-callout ainj-co-sand"><div>
        <h3>Practice space</h3>
        <p>Hands-on workspace, running onward through the programme.</p>
      </div></div>
    </div>
    <div class="ainj-panel" role="tabpanel"></div>
    <div class="ainj-legend" aria-hidden="true">
      <span><i style="background:#2f6fb2"></i> Training</span>
      <span><i style="background:#d05a48"></i> Labs</span>
      <span><i style="background:#4f8a3d"></i> Programme</span>
      <span><i style="background:#b07d10"></i> Mentorship</span>
      <span><i style="background:#e8a512"></i> Milestone</span>
    </div>`;

  const map = root.querySelector('.ainj-map');
  const panel = root.querySelector('.ainj-panel');
  const nowKey = NOW.getFullYear() + '-' + String(NOW.getMonth() + 1).padStart(2, '0');
  let selectedKey = MONTHS.some(m => m.key === nowKey) ? nowKey : MONTHS[0].key;

  function addFlag(label) {
    const f = el('div', 'ainj-flag');
    f.appendChild(el('span', 'ainj-node'));
    f.appendChild(txt('span', 'ainj-mn', label));
    map.appendChild(f);
  }
  function dotsFor(key) {
    const g = groups[key] || { monthly: [], weeks: {} };
    const seen = {};
    g.monthly.forEach(it => { seen[it.track] = 1; });
    Object.keys(g.weeks).forEach(wk => g.weeks[wk].forEach(it => { seen[it.track] = 1; }));
    const mObj = MONTHS.find(x => x.key === key);
    if (mObj && mObj.weekly) { seen.programme = 1; seen.mentor = 1; }
    const dots = el('span', 'ainj-dots');
    Object.keys(TRACKS).forEach(t => {
      if (seen[t]) { const i = document.createElement('i'); i.style.background = TRACKS[t].color; dots.appendChild(i); }
    });
    return dots;
  }
  function refreshDots() {
    map.querySelectorAll('.ainj-stop').forEach(s => {
      const old = s.querySelector('.ainj-dots');
      if (old) s.replaceChild(dotsFor(s.getAttribute('data-key')), old);
    });
  }

  if (TL.startFlag) addFlag(TL.startFlag);
  MONTHS.forEach(m => {
    const b = el('button', 'ainj-stop');
    b.setAttribute('role', 'tab');
    b.setAttribute('data-key', m.key);
    b.setAttribute('aria-selected', m.key === selectedKey ? 'true' : 'false');
    if (m.key === nowKey) b.classList.add('ainj-isnow');
    b.appendChild(el('span', 'ainj-node'));
    b.appendChild(el('span', 'ainj-mn', m.abbr));
    b.appendChild(dotsFor(m.key));
    if (m.key === nowKey) b.appendChild(el('span', 'ainj-nowtag', 'Now'));
    b.addEventListener('click', () => select(m.key, true));
    map.appendChild(b);
    if (m.flag) addFlag(m.flag);
  });
  if (TL.endFlag) addFlag(TL.endFlag);

  const pct = Math.round(Math.min(Math.max((NOW - START) / (END - START), 0), 1) * 100);
  root.querySelector('.ainj-pct').textContent =
    NOW < START ? ('Starts ' + fmt(START) + ' ' + START.getFullYear()) : NOW > END ? 'Complete' : pct + '% · you are here';
  requestAnimationFrame(() => { root.querySelector('.ainj-railfill').style.width = pct + '%'; });

  async function removeEvent(it) {
    if (!confirm('Remove “' + it.title + '” from the timetable?')) return;
    try {
      await opts.deleteEvent(it.id);
      evs = evs.filter(e => e.id !== it.id);
      regroup(); refreshDots(); render(selectedKey);
    } catch (err) { alert('Could not remove: ' + (err && err.message ? err.message : err)); }
  }
  function delBtn(it) {
    const b = el('button', 'ainj-del', '&times;');
    b.type = 'button';
    b.title = 'Remove';
    b.setAttribute('aria-label', 'Remove ' + it.title);
    b.addEventListener('click', ev => { ev.stopPropagation(); removeEvent(it); });
    return b;
  }
  function checkChip(weekKey, task, label, trackCls) {
    const key = weekKey + '|' + task;
    const b = document.createElement('button');
    b.type = 'button';
    const box = document.createElement('span'); box.className = 'ainj-cbox';
    const lab = document.createElement('span'); lab.textContent = label;
    b.appendChild(box); b.appendChild(lab);
    function paint() {
      const done = checks.has(key);
      b.className = 'ainj-wchip ainj-wcheck ainj-ch-' + trackCls + (done ? ' is-done' : '');
      box.textContent = done ? '✓' : '';
      b.setAttribute('aria-pressed', done ? 'true' : 'false');
      b.setAttribute('aria-label', (done ? 'Done — ' : 'Mark done — ') + label);
    }
    paint();
    if (canCheck) {
      b.addEventListener('click', async () => {
        const nowDone = !checks.has(key);
        if (nowDone) checks.add(key); else checks.delete(key);
        paint(); b.disabled = true;
        try { await opts.toggleCheck(weekKey, task, nowDone); }
        catch (err) {
          if (nowDone) checks.delete(key); else checks.add(key);
          paint(); alert('Could not save: ' + (err && err.message ? err.message : err));
        }
        b.disabled = false;
      });
    } else { b.disabled = true; }
    return b;
  }
  function monthlyCard(it) {
    const T = TRACKS[it.track] || TRACKS.mentor;
    const c = el('div', 'ainj-card ainj-c-' + T.cls);
    c.appendChild(txt('span', 'ainj-track', T.label));
    c.appendChild(txt('div', 'ainj-name', it.title));
    if (it.detail) c.appendChild(txt('div', 'ainj-meta', it.detail));
    if (isMentor) c.appendChild(delBtn(it));
    return c;
  }
  function weekEventEl(it) {
    const T = TRACKS[it.track] || TRACKS.mentor;
    const e = el('div', 'ainj-wevent');
    e.style.background = 'var(--' + T.cls + '-bg)';
    e.style.borderColor = 'var(--' + T.cls + '-ln)';
    e.style.borderLeftColor = 'var(--' + T.cls + ')';
    e.appendChild(txt('span', null, it.title));
    if (isMentor) { const d = delBtn(it); d.style.marginLeft = 'auto'; e.appendChild(d); }
    return e;
  }
  function addForm(m) {
    const wrap = el('div', 'ainj-editbox');
    const toggle = el('button', 'ainj-navbtn ainj-addtoggle', '+ Add to ' + m.name);
    toggle.type = 'button';
    wrap.appendChild(toggle);

    const form = el('form', 'ainj-editform');
    form.style.display = 'none';
    const track = document.createElement('select');
    [['training', 'Training'], ['labs', 'Labs'], ['programme', 'Programme'], ['mentor', 'Mentorship'], ['milestone', 'Milestone / other']]
      .forEach(([v, l]) => track.appendChild(new Option(l, v)));
    const title = document.createElement('input');
    title.type = 'text'; title.placeholder = 'What is it? (e.g. Skills session)'; title.required = true; title.maxLength = 200;
    const detail = document.createElement('input');
    detail.type = 'text'; detail.placeholder = 'Extra note (optional)'; detail.maxLength = 200;
    const scope = document.createElement('select');
    scope.appendChild(new Option('Whole month', ''));
    weeksOf(m.year, m.num).forEach(w => scope.appendChild(new Option('Week ' + w.n, String(w.n))));
    const add = el('button', 'nb-btn nb-btn-accent', 'Add'); add.type = 'submit';
    const cancel = el('button', 'nb-btn', 'Cancel'); cancel.type = 'button';

    const row = el('div', 'ainj-editrow');
    row.appendChild(track); row.appendChild(scope);
    const btns = el('div', 'ainj-editrow');
    btns.appendChild(add); btns.appendChild(cancel);
    form.appendChild(row); form.appendChild(title); form.appendChild(detail); form.appendChild(btns);

    toggle.addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? '' : 'none';
      if (form.style.display === '') title.focus();
    });
    cancel.addEventListener('click', () => { form.style.display = 'none'; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const ev = {
        month_key: m.key,
        week: scope.value ? parseInt(scope.value, 10) : null,
        track: track.value,
        title: title.value.trim(),
        detail: detail.value.trim() || null
      };
      if (!ev.title) return;
      add.disabled = true;
      try {
        const created = await opts.addEvent(ev);
        evs.push(created);
        regroup(); refreshDots(); render(selectedKey);
      } catch (err) { alert('Could not add: ' + (err && err.message ? err.message : err)); add.disabled = false; }
    });
    wrap.appendChild(form);
    return wrap;
  }

  function render(key) {
    const idx = MONTHS.findIndex(m => m.key === key);
    const m = MONTHS[idx];
    const y = m.year, mo = m.num;
    const g = groups[key] || { monthly: [], weeks: {} };
    panel.innerHTML = '';

    const head = el('div', 'ainj-phead');
    head.appendChild(txt('span', 'ainj-pname', m.name + ' ' + m.year));
    if (m.key === nowKey) head.appendChild(el('span', 'ainj-herepill', 'You are here'));
    if (m.kickoff) head.appendChild(el('span', 'ainj-pmile', 'Launch month'));
    if (m.flag) head.appendChild(txt('span', 'ainj-pmile', m.flag + ' follows'));
    if (idx === MONTHS.length - 1 && TL.endFlag) head.appendChild(txt('span', 'ainj-pmile', TL.endFlag));
    panel.appendChild(head);

    const nMonthly = g.monthly.length;
    panel.appendChild(el('p', 'ainj-psub',
      nMonthly + ' activit' + (nMonthly === 1 ? 'y' : 'ies') + ' this month' + (m.weekly ? ' · plus the weekly rhythm' : '')));

    const sec1 = el('div', 'ainj-sec');
    sec1.appendChild(el('div', 'ainj-sectitle', 'This month'));
    const grid = el('div', 'ainj-mcards');
    g.monthly.forEach(it => grid.appendChild(monthlyCard(it)));
    if (!g.monthly.length) grid.appendChild(el('p', 'ainj-empty', 'No month-level activities.'));
    sec1.appendChild(grid);
    panel.appendChild(sec1);

    const sec2 = el('div', 'ainj-sec');
    sec2.appendChild(el('div', 'ainj-sectitle', 'Week by week'));
    const list = el('div', 'ainj-weeks');
    weeksOf(y, mo).forEach(w => {
      const row = el('div', 'ainj-week');
      const isNow = sameYM(NOW, y, mo) && NOW >= w.start && NOW <= new Date(y, mo, w.end.getDate(), 23, 59, 59);
      if (isNow) row.classList.add('ainj-thisweek');

      const top = el('div', 'ainj-wtop');
      top.appendChild(el('span', 'ainj-wname', 'Week ' + w.n));
      top.appendChild(el('span', 'ainj-wdates', fmt(w.start) + ' – ' + fmt(w.end)));
      if (isNow) top.appendChild(el('span', 'ainj-wnow', 'This week'));
      row.appendChild(top);

      const wev = el('div', 'ainj-wevents');
      const K = TL.kickoff || {};
      if (m.kickoff && K.day && w.start.getDate() <= K.day && w.end.getDate() >= K.day) {
        const k = txt('div', 'ainj-wevent', 'Launch — ' + (K.label || 'Kickoff') + (K.dates ? '  ' + K.dates : ''));
        k.style.background = '#fdf3d7'; k.style.borderColor = '#f0dfa8'; k.style.borderLeftColor = '#e8a512';
        wev.appendChild(k);
      }
      (g.weeks[w.n] || []).forEach(it => wev.appendChild(weekEventEl(it)));
      if (wev.children.length) row.appendChild(wev);

      if (m.weekly) {
        const chips = el('div', 'ainj-wchips');
        if (readonlyChips) {
          chips.appendChild(el('span', 'ainj-wchip ainj-ch-programme', '<i></i>Weekly feedback'));
          chips.appendChild(el('span', 'ainj-wchip ainj-ch-mentor', '<i></i>Check-in with mentor'));
        } else {
          const wk = m.key + '-' + w.n;
          chips.appendChild(checkChip(wk, 'feedback', 'Weekly feedback', 'programme'));
          chips.appendChild(checkChip(wk, 'checkin', 'Check-in with mentor', 'mentor'));
        }
        row.appendChild(chips);
      } else if (!wev.children.length) {
        row.appendChild(el('p', 'ainj-empty', 'Reporting month — no weekly sessions.'));
      }
      list.appendChild(row);
    });
    sec2.appendChild(list);
    panel.appendChild(sec2);

    if (isMentor) panel.appendChild(addForm(m));

    const nav = el('div', 'ainj-nav');
    const prev = el('button', 'ainj-navbtn', '← ' + (idx > 0 ? MONTHS[idx - 1].name : ''));
    const next = el('button', 'ainj-navbtn', (idx < MONTHS.length - 1 ? MONTHS[idx + 1].name : '') + ' →');
    if (idx === 0) prev.setAttribute('disabled', '');
    if (idx === MONTHS.length - 1) next.setAttribute('disabled', '');
    prev.addEventListener('click', () => select(MONTHS[idx - 1].key, true));
    next.addEventListener('click', () => select(MONTHS[idx + 1].key, true));
    nav.appendChild(prev); nav.appendChild(next);
    panel.appendChild(nav);
  }

  function select(key, scrollToPanel) {
    selectedKey = key;
    map.querySelectorAll('.ainj-stop').forEach(s => {
      s.setAttribute('aria-selected', s.getAttribute('data-key') === key ? 'true' : 'false');
    });
    render(key);
    const stop = map.querySelector('.ainj-stop[data-key="' + key + '"]');
    if (stop && stop.scrollIntoView) stop.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    if (scrollToPanel && panel.scrollIntoView) {
      const r = panel.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.5) panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  select(selectedKey, false);
}

/* ERP river view 0.1.0 — a burger at top left opens a slide-in list of institutions; the screen then shows only the chosen
   body as a river: requests flow downstream through every lawful stage toward the sea, "every artifact found and viewed".
   Water reaches as far as the concluded stages; lights are red or amber only (never green); excuse icons sit on the bank at
   the stage where they were given. Tap a stage for its law, clock and worst-case dates. #<id or alias> links one body;
   the last choice is remembered on this device. Reads data/erp.json and data/sample.json. — Cedwyn editors */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', KEY = 'erp.river.sel';
  var D = null, SAMPLE = null, LIST = [], BY = {}, PROC = {}, EXC = {}, LAP = {}, CUR = null, LASTFOCUS = null;
  var ALIAS = { hmlr: 'hm-land-registry', 'hmlr-icr': 'hm-land-registry-independent-complaints-reviewer', icr: 'hm-land-registry-independent-complaints-reviewer',
    swp: 'south-wales-police', vog: 'vale-of-glamorgan-council', vogc: 'vale-of-glamorgan-council', 'vogc-scrutiny': 'vale-of-glamorgan-council-scrutiny',
    ga: 'glamorgan-archives', glamarchives: 'glamorgan-archives', tna: 'the-national-archives', nlw: 'national-library-of-wales', cadw: 'welsh-government-cadw',
    rcahmw: 'rcahmw-royal-commission', ico: 'information-commissioner-s-office', moj: 'ministry-of-justice-hmcts', hmcts: 'ministry-of-justice-hmcts',
    mod: 'ministry-of-defence', nio: 'northern-ireland-office', tfw: 'transport-for-wales', psow: 'public-services-ombudsman-for-wales',
    phso: 'parliamentary-and-health-service-ombudsman', cps: 'crown-prosecution-service', dcms: 'department-for-culture-media-and-sport',
    gld: 'government-legal-department-bona-vacantia', nrw: 'natural-resources-wales', os: 'ordnance-survey', voa: 'valuation-office-agency-hmrc',
    mp: 'member-of-parliament', 'mp-vog': 'member-of-parliament-vale-of-glamorgan', lcc: 'llandough-community-council', heneb: 'heneb-formerly-ggat-historic-environment-record',
    her: 'heneb-formerly-ggat-historic-environment-record', museum: 'amgueddfa-cymru-museum-wales', itv: 'itv-archive', cvuhb: 'cardiff-and-vale-university-health-board',
    pacac: 'public-administration-and-constitutional-affairs', cabinet: 'prime-minister-s-office-cabinet-office', bute: 'mount-stuart-bute-archive',
    wlga: 'local-government-association-wlga', ads: 'archaeology-data-service', wdtk: 'whatdotheyknow-unconfirmed', welshwater: 'dwr-cymru-welsh-water' };
  var SHORT = {}; Object.keys(ALIAS).forEach(function (a) { if (!SHORT[ALIAS[a]]) SHORT[ALIAS[a]] = a; });
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function nice(s) { if (!s) return '—'; var p = s.split('-'); try { return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return s; } }
  function unit(w) { if (!w || w.u === 'none') return 'no fixed clock'; return w.n + ' ' + ({ wd: 'working days', cm: w.n === 1 ? 'month' : 'months', cd: 'days' })[w.u]; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function resolve(id) { if (!id) return null; id = decodeURIComponent(String(id)).replace(/^#/, '').toLowerCase(); if (ALIAS[id]) id = ALIAS[id]; return BY[id] ? id : null; }
  function shred() { return '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><rect x="5" y="2" width="14" height="7" fill="#f2f2f2" stroke="#999"/><rect x="2" y="9" width="20" height="5" rx="1" fill="#777"/><g stroke="#f2f2f2" stroke-width="1.6"><line x1="6" y1="15" x2="6" y2="22"/><line x1="9" y1="15" x2="9" y2="20"/><line x1="12" y1="15" x2="12" y2="23"/><line x1="15" y1="15" x2="15" y2="20"/><line x1="18" y1="15" x2="18" y2="22"/></g></svg>'; }
  function iconHtml(id) { var e = EXC[id]; if (!e) return '?'; return e.icon === 'shredder' ? shred() : esc(e.icon); }

  /* the stages of one body in river order (lap by lap, then stage number), merged with their procedure */
  function course(o) {
    var lapN = {}; D.laps.forEach(function (l) { lapN[l.id] = l.n; });
    var st = o.stages.map(function (s, i) { var p = PROC[s.procedure] || {}; var m = {}; for (var k in p) m[k] = p[k]; for (k in s) m[k] = s[k]; m._i = i; return m; });
    st.sort(function (a, b) { return (lapN[a.lap] || 9) - (lapN[b.lap] || 9) || a.n - b.n; });
    var seen = (o.excuses_seen || []);
    st.forEach(function (s, i) { s._bank = (s.excuses || []).map(function (x) { return { id: x.excuse || x.id || x, date: x.date, link: x.link, ref: x.ref }; }); });
    if (seen.length && st.length) seen.forEach(function (x) { (x.excuses || []).forEach(function (id) { st[0]._bank.push({ id: id, date: x.date, link: x.link, ref: x.toc, audit: true, later: x.later_found }); }); });
    return st;
  }
  function done(s) { return s.status === 'concluded'; }

  function drawRiver(o) {
    var box = $('#erp-river-svg'); box.innerHTML = '';
    var st = course(o), W = Math.max(320, Math.min(box.clientWidth || 360, 760));
    var top = 52, gap = 70, lapGap = 34, cx0 = Math.round(Math.min(W * 0.27, 120)), amp = Math.min(W * 0.07, 26);
    var pts = [], y = top, lastLap = null, lapMarks = [];
    st.forEach(function (s, i) {
      if (s.lap !== lastLap) { if (lastLap !== null) y += lapGap - gap / 2; lapMarks.push({ lap: s.lap, y: y - 6 }); y += 46; lastLap = s.lap; }
      pts.push({ x: cx0 + amp * Math.sin(i * 1.15), y: y, s: s }); y += gap;
    });
    var seaY = y + 10, H = seaY + 120;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'River of stages for ' + o.name + ': ' + st.filter(done).length + ' of ' + st.length + ' stages concluded' });
    var defs = el('defs', {}, svg), g = el('linearGradient', { id: 'erp-water', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#7fd3ff' }, g); el('stop', { offset: '1', 'stop-color': '#2f7fd0' }, g);
    /* spring and sea */
    var all = [{ x: cx0, y: 18 }].concat(pts).concat([{ x: cx0 + 10, y: seaY }]);
    function path(a) { var d = 'M' + a[0].x.toFixed(1) + ' ' + a[0].y.toFixed(1); for (var i = 1; i < a.length; i++) { var p = a[i - 1], q = a[i], my = (p.y + q.y) / 2; d += ' C' + p.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + q.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1); } return d; }
    lapMarks.forEach(function (m, k) {
      var L = LAP[m.lap] || { n: k + 1, label: m.lap }, lf = (o.laps || []).filter(function (x) { return x.lap === m.lap; })[0];
      var lx = cx0 + amp + 30;
      el('line', { x1: 8, x2: W - 8, y1: m.y, y2: m.y, class: 'erp-rv-lapline' }, svg);
      var t = el('text', { x: lx, y: m.y + 16, class: 'erp-rv-lap' }, svg); t.textContent = 'Lap ' + L.n + ' · ' + L.label;
      if (lf) { var t2 = el('text', { x: lx, y: m.y + 30, class: 'erp-rv-est' }, svg); t2.textContent = nice(lf.opens) + ' – ' + nice(lf.closes_worst) + ' (est.)'; }
    });
    el('path', { d: path(all), class: 'erp-rv-bed', 'stroke-width': 22 }, svg);
    el('path', { d: path(all), class: 'erp-rv-course', 'stroke-width': 3 }, svg);
    /* water: from the spring down to the last concluded stage; the width grows downstream */
    var reach = -1; st.forEach(function (s, i) { if (done(s)) reach = i; });
    var flowing = all.slice(0, reach + 2);
    if (reach === st.length - 1) flowing = all;
    if (flowing.length > 1) { el('path', { d: path(flowing), class: 'erp-rv-water', 'stroke-width': 6 + 14 * ((reach + 1) / st.length) }, svg); }
    var spring = el('circle', { cx: cx0, cy: 18, r: 7, class: 'erp-rv-spring' }, svg);
    var st0 = el('text', { x: cx0 + 16, y: 22, class: 'erp-rv-name' }, svg); st0.textContent = 'Source: first request';
    pts.forEach(function (p, i) {
      var s = p.s, gg = el('g', { class: 'erp-rv-stage', tabindex: 0, role: 'button', 'data-i': i,
        'aria-label': (i + 1) + '. ' + (s.label || s.procedure) + ', ' + (done(s) ? 'concluded ' + (s.light || '') : s.status === 'open' ? 'open now' : 'not reached') + '. Tap for the law and dates.' }, svg);
      el('rect', { x: 0, y: p.y - gap / 2 + 4, width: W, height: gap - 8, class: 'erp-rv-hit' }, gg);
      var cls = 'erp-rv-node' + (done(s) && s.light ? ' ' + s.light : s.status === 'open' ? ' open' : '');
      if (s.status === 'open') el('circle', { cx: p.x, cy: p.y, r: 15, class: 'erp-rv-ring' }, gg);
      el('circle', { cx: p.x, cy: p.y, r: 9, class: cls }, gg);
      var lx = cx0 + amp + 30, tt = el('text', { x: lx, y: p.y - 4, class: 'erp-rv-name' }, gg);
      tt.textContent = clip(s.label || s.procedure, Math.floor((W - lx - 8) / 7.2));
      var sub = el('text', { x: lx, y: p.y + 12, class: 'erp-rv-est' }, gg);
      sub.textContent = (done(s) ? (s.light === 'red' ? 'red' : 'amber') + ' · ' : s.status === 'open' ? 'open · ' : '') + 'due by ' + nice(s.forecast && s.forecast.due_worst) + ' (est.)' + (s.inferred ? ' *' : '');
      /* the bank: excuse icons where they were given */
      (s._bank || []).slice(0, 4).forEach(function (b, k) {
        var e = EXC[b.id]; if (!e) return;
        var fo = el('foreignObject', { x: 2 + (k % 2) * 22, y: p.y - 22 + Math.floor(k / 2) * 22, width: 22, height: 22 }, gg);
        fo.innerHTML = '<div xmlns="http://www.w3.org/1999/xhtml" class="erp-rv-ico" title="' + esc(e.label) + '">' + iconHtml(b.id) + '</div>';
      });
      if ((s._bank || []).length > 4) { var more = el('text', { x: 6, y: p.y + 30, class: 'erp-rv-est' }, gg); more.textContent = '+' + (s._bank.length - 4); }
    });
    /* the sea */
    var sea = el('path', { d: 'M0 ' + (seaY + 6) + ' Q ' + W * 0.25 + ' ' + (seaY - 8) + ' ' + W * 0.5 + ' ' + (seaY + 6) + ' T ' + W + ' ' + (seaY + 6) + ' V ' + H + ' H 0 Z', class: 'erp-rv-sea' + (o.close_status === 'won' ? ' won' : '') }, svg);
    var s1 = el('text', { x: W / 2, y: seaY + 40, 'text-anchor': 'middle', class: 'erp-rv-seat' }, svg); s1.textContent = 'Every artifact found and viewed';
    var ev = o.evidence || {}, s2 = el('text', { x: W / 2, y: seaY + 60, 'text-anchor': 'middle', class: 'erp-rv-est' }, svg);
    s2.textContent = ev.known == null ? 'Evidence counts: not imported yet' : ('known ' + ev.known + ' · identified ' + ev.identified + ' · located ' + ev.located + ' · viewed ' + ev.viewed);
    var s3 = el('text', { x: W / 2, y: seaY + 78, 'text-anchor': 'middle', class: 'erp-rv-est' }, svg);
    s3.textContent = 'Worst-case arrival (est.): ' + nice(o.forecast && o.forecast.close_worst);
    box.appendChild(svg);
    box._st = st;
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, Math.max(4, n - 1)) + '…' : s; }

  function summary(o) {
    var st = o.stages, c = st.filter(done).length, pct = Math.round(100 * c / (st.length || 1));
    var imported = !(D.data_state && D.data_state.imported === false) || o.id === 'sample';
    $('#erp-rv-name').textContent = o.name;
    $('#erp-rv-kpi').innerHTML = '<b>' + pct + '%</b> downstream · ' + c + ' of ' + st.length + ' stages concluded' +
      (o.id === 'sample' ? ' · <em>sample, not real data</em>' : !imported ? ' · <em>no correspondence imported yet</em>' : '') +
      '<br><span>' + esc(o.regime || '') + (o.ombudsman ? ' · ' + esc(o.ombudsman) : '') + ' · worst-case close ' + nice(o.forecast && o.forecast.close_worst) + ' (est.)</span>';
    $('#erp-rv-bar i').style.width = pct + '%';
  }

  function select(id, opts) {
    id = resolve(id) || LIST[0].id; var o = BY[id]; CUR = o; opts = opts || {};
    store(KEY, id); summary(o); drawRiver(o);
    var h = '#' + (SHORT[id] || id); if (location.hash !== h && !opts.fromHash) history.replaceState(null, '', location.pathname + location.search + h);
    [].forEach.call(document.querySelectorAll('#erp-dl button[data-id]'), function (b) { if (b.getAttribute('data-id') === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    $('#erp-burger-name').textContent = o.name;
  }

  /* drawer */
  function focusables(root) { return [].filter.call(root.querySelectorAll('a[href],button:not([disabled]),input,[tabindex="0"]'), function (e) { return e.offsetParent !== null || e === document.activeElement; }); }
  function trap(root, ev) { if (ev.key !== 'Tab') return; var f = focusables(root); if (!f.length) return; var a = f[0], z = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); } else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); } }
  function openDrawer() { var d = $('#erp-drawer'); LASTFOCUS = document.activeElement; d.hidden = false; $('#erp-scrim').hidden = false; document.documentElement.classList.add('erp-rv-lock');
    requestAnimationFrame(function () { d.classList.add('on'); $('#erp-scrim').classList.add('on'); }); $('#erp-burger').setAttribute('aria-expanded', 'true');
    var cur = $('#erp-dl button[aria-current]'); if (cur) cur.scrollIntoView({ block: 'center' }); setTimeout(function () { $('#erp-q').focus(); }, 60); }
  function closeDrawer() { var d = $('#erp-drawer'); if (d.hidden) return; d.classList.remove('on'); $('#erp-scrim').classList.remove('on'); $('#erp-burger').setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('erp-rv-lock'); setTimeout(function () { d.hidden = true; $('#erp-scrim').hidden = true; }, 220); (LASTFOCUS && LASTFOCUS.focus ? LASTFOCUS : $('#erp-burger')).focus(); }
  function fillList(q) {
    q = (q || '').trim().toLowerCase(); var ul = $('#erp-dl'), n = 0; ul.innerHTML = '';
    LIST.forEach(function (o) {
      var hay = (o.name + ' ' + o.id + ' ' + (SHORT[o.id] || '') + ' ' + (o.regime || '')).toLowerCase(); if (q && hay.indexOf(q) < 0) return; n++;
      var c = o.stages.filter(done).length, pct = Math.round(100 * c / (o.stages.length || 1));
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" data-id="' + esc(o.id) + '"' + (CUR && CUR.id === o.id ? ' aria-current="true"' : '') + '><span class="nm">' + esc(o.name) + '</span><span class="mt">' + [pct + '%', esc(o.regime || ''), o.stages.length + ' stages'].filter(Boolean).join(' · ') + '</span></button>';
      ul.appendChild(li);
    });
    $('#erp-dn').textContent = n + ' of ' + LIST.length;
  }

  /* stage sheet */
  function openSheet(i) {
    var st = $('#erp-river-svg')._st, s = st && st[i]; if (!s) return; var o = CUR, sh = $('#erp-sheet'), L = LAP[s.lap] || {};
    var bank = (s._bank || []).map(function (b) { var e = EXC[b.id] || { label: b.id }; return '<li><span class="erp-rv-ico">' + iconHtml(b.id) + '</span> <b>' + esc(e.label) + '</b>' + (b.date ? ' · ' + nice(b.date) : '') + (b.audit ? ' · from the That Old Chestnut audit, shown at the first stage' : '') + (e.law ? '<br><small>' + esc(e.law) + '</small>' : '') + (e.counter ? '<br><small>Next move: ' + esc(e.counter) + '</small>' : '') + (b.link ? '<br><a href="' + esc(b.link) + '">Record ' + esc(b.ref || '') + '</a>' : '') + '</li>'; }).join('');
    $('#erp-sheet-body').innerHTML = '<p class="erp-rv-kick">Lap ' + esc(L.n || '') + ' · ' + esc(L.label || s.lap) + ' · stage ' + (i + 1) + ' of ' + st.length + '</p>' +
      '<h3 id="erp-sheet-h">' + esc(s.label || s.procedure) + '</h3>' +
      '<p class="erp-rv-st">' + (done(s) ? '<span class="erp-light erp-c ' + esc(s.light) + '"></span> Concluded, ' + esc(s.light) : s.status === 'open' ? 'Open now' : 'Not reached yet') + '</p>' +
      '<dl><dt>Law or policy</dt><dd>' + esc(s.law || '—') + (s.src ? '<br><a href="' + esc(s.src) + '" rel="noopener">Source</a>' : '') + '</dd>' +
      '<dt>Clock</dt><dd>' + unit(s.clock) + (s.ext ? '; extension ' + esc(s.ext) : '') + '</dd>' +
      '<dt>Worst case</dt><dd>' + unit(s.worst_case) + (s.worst_case && s.worst_case.basis ? '<br><small>' + esc(s.worst_case.basis) + '</small>' : '') + '</dd>' +
      '<dt>Dates (estimate)</dt><dd>opens ' + nice(s.forecast && (s.forecast.actual_opened || s.forecast.opens)) + ' · due by ' + nice(s.forecast && s.forecast.due_worst) + '<br><small>Worst-case forecast from ' + nice(D.forecast_rules.anchor) + ', not a date the body has given.' + (s.inferred ? ' * Our reading: no published time.' : '') + (s.synthetic ? ' A stage this framework adds.' : '') + '</small></dd>' +
      (s.us || s.them ? '<dt>Who moves</dt><dd>' + esc(s.us || '') + (s.them ? ' → ' + esc(s.them) : '') + '</dd>' : '') + '</dl>' +
      (bank ? '<p class="erp-rv-kick">On the bank here</p><ul class="erp-rv-bank">' + bank + '</ul>' : '');
    LASTFOCUS = document.activeElement; sh.hidden = false; $('#erp-scrim').hidden = false; requestAnimationFrame(function () { sh.classList.add('on'); $('#erp-scrim').classList.add('on'); }); setTimeout(function () { $('#erp-sheet-x').focus(); }, 40);
  }
  function closeSheet() { var sh = $('#erp-sheet'); if (sh.hidden) return; sh.classList.remove('on'); if ($('#erp-drawer').hidden) $('#erp-scrim').classList.remove('on'); setTimeout(function () { sh.hidden = true; if ($('#erp-drawer').hidden) $('#erp-scrim').hidden = true; }, 200); if (LASTFOCUS && LASTFOCUS.focus) LASTFOCUS.focus(); }

  function build() {
    var bar = document.createElement('div'); bar.className = 'erp-rv-bar'; bar.id = 'erp-rv-top';
    bar.innerHTML = '<button type="button" id="erp-burger" class="erp-burger" aria-expanded="false" aria-controls="erp-drawer" aria-label="Choose an institution">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<span class="erp-burger-name" id="erp-burger-name"></span><button type="button" class="erp-rv-mode" id="erp-rv-mode" aria-pressed="false">Board</button>';
    var sec = document.createElement('section'); sec.className = 'erp-rv'; sec.id = 'erp-river'; sec.setAttribute('aria-labelledby', 'erp-rv-name');
    var kick = $('.tp-hero .tp-kicker'); sec.innerHTML = '<p class="erp-rv-kick">' + esc(kick ? kick.textContent : 'ERP') + ' · ERP</p><h2 id="erp-rv-name"></h2><p class="erp-rv-kpi" id="erp-rv-kpi"></p><div class="erp-rv-prog" id="erp-rv-bar" aria-hidden="true"><i></i></div>' +
      '<p class="erp-rv-legend"><span class="erp-light erp-c red"></span> refused / not held · <span class="erp-light erp-c amber"></span> partial or late · ○ not reached · no green: no answer is taken as satisfactory. Dates marked est. are worst-case forecasts; * = our reading, no published time.</p>' +
      '<div id="erp-river-svg" class="erp-rv-svg"></div>';
    var dr = document.createElement('div'); dr.innerHTML =
      '<div class="erp-scrim" id="erp-scrim" hidden></div>' +
      '<nav class="erp-drawer" id="erp-drawer" role="dialog" aria-modal="true" aria-labelledby="erp-dh" hidden><div class="erp-dhead"><h2 id="erp-dh">Institutions</h2><button type="button" class="erp-x" id="erp-dx" aria-label="Close the list">✕</button></div>' +
      '<label class="erp-dsearch"><span class="sr">Search institutions</span><input id="erp-q" type="search" placeholder="Search, e.g. land registry" autocomplete="off"></label><p class="erp-dn" id="erp-dn" aria-live="polite"></p><ul class="erp-dl" id="erp-dl"></ul></nav>' +
      '<div class="erp-sheet" id="erp-sheet" role="dialog" aria-modal="true" aria-labelledby="erp-sheet-h" hidden><button type="button" class="erp-x" id="erp-sheet-x" aria-label="Close">✕</button><div id="erp-sheet-body"></div></div>';
    var anchor = $('header.tp-hero') || document.body.firstChild;
    anchor.parentNode.insertBefore(bar, anchor); anchor.parentNode.insertBefore(sec, anchor);
    while (dr.firstChild) document.body.appendChild(dr.firstChild);
    document.documentElement.classList.add('erp-rv-on');
    $('#erp-burger').addEventListener('click', function () { if ($('#erp-drawer').hidden) openDrawer(); else closeDrawer(); });
    $('#erp-dx').addEventListener('click', closeDrawer); $('#erp-scrim').addEventListener('click', function () { closeDrawer(); closeSheet(); });
    $('#erp-q').addEventListener('input', function () { fillList(this.value); });
    $('#erp-dl').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-id]'); if (!b) return; select(b.getAttribute('data-id')); LASTFOCUS = $('#erp-burger'); closeDrawer(); window.scrollTo(0, Math.max(0, bar.getBoundingClientRect().top + window.scrollY - 4)); });
    $('#erp-drawer').addEventListener('keydown', function (ev) { trap(this, ev); });
    $('#erp-sheet').addEventListener('keydown', function (ev) { trap(this, ev); });
    $('#erp-sheet-x').addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (!$('#erp-sheet').hidden) closeSheet(); else closeDrawer(); } });
    var svgBox = $('#erp-river-svg');
    svgBox.addEventListener('click', function (ev) { var g = ev.target.closest && ev.target.closest('.erp-rv-stage'); if (g) openSheet(+g.getAttribute('data-i')); });
    svgBox.addEventListener('keydown', function (ev) { if (ev.key !== 'Enter' && ev.key !== ' ') return; var g = ev.target.closest && ev.target.closest('.erp-rv-stage'); if (g) { ev.preventDefault(); openSheet(+g.getAttribute('data-i')); } });
    $('#erp-rv-mode').addEventListener('click', function () { var on = document.documentElement.classList.toggle('erp-rv-board'); this.setAttribute('aria-pressed', on ? 'true' : 'false'); this.textContent = on ? 'River' : 'Board'; });
    window.addEventListener('hashchange', function () { var id = resolve(location.hash); if (id && (!CUR || CUR.id !== id)) select(id, { fromHash: true }); });
    var rw = null; window.addEventListener('resize', function () { clearTimeout(rw); rw = setTimeout(function () { if (CUR) drawRiver(CUR); }, 200); });
  }

  function init(d, sample) {
    D = d; SAMPLE = sample && sample.opportunity;
    d.procedures.forEach(function (p) { PROC[p.id] = p; }); d.excuses.forEach(function (e) { EXC[e.id] = e; }); d.laps.forEach(function (l) { LAP[l.id] = l; });
    LIST = d.institutions.slice(); if (SAMPLE) { if (sample.procedures) sample.procedures.forEach(function (p) { if (!PROC[p.id]) PROC[p.id] = p; }); LIST.push(SAMPLE); }
    LIST.forEach(function (o) { BY[o.id] = o; });
    build(); fillList('');
    var h = location.hash.replace(/^#/, ''), q = new URL(location.href).searchParams.get('o');
    select(resolve(h) || resolve(q) || resolve(store(KEY)) || LIST[0].id, { fromHash: !!resolve(h) });
  }
  Promise.all([fetch('data/erp.json').then(function (r) { return r.json(); }), fetch('data/sample.json').then(function (r) { return r.json(); }).catch(function () { return null; })])
    .then(function (v) { init(v[0], v[1]); }).catch(function () { /* the static board stays */ });
})();

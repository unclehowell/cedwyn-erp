/* ERP river view 0.2.0 — a burger at top left opens a slide-in list of institutions; the screen then shows only the chosen
   body as a river flow: one trunk per body, and each kind of enquiry (FOI, EIR, GDPR/SAR, other) peels off as its own line.
   A line splits again where an internal review, a complaint or a regulator case happened. At the end of every line sit the
   outcomes (semi-translucent icons: the old chestnuts, fire, shredder, sent elsewhere, no reply ...) and a present for every
   actual record that came back as an email attachment; tap a present for its catalogue entry. Tap a line for its law, clock
   and dates. Goal (the sea): every artifact identified and accounted for. #<id or alias> links one body; the last choice is
   remembered on this device. Reads data/erp.json and data/flows.json. — Cedwyn editors */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', KEY = 'erp.river.sel';
  var APEX = 'https://bucklerfamily.estate', CAT = /(^|\.)bucklerfamily\.estate$/.test(location.hostname) ? '/api/catalogue/' : APEX + '/api/catalogue/';
  var D = null, FL = null, LIST = [], BY = {}, PROC = {}, OUT = {}, CUR = null, LASTFOCUS = null, GIFTS = [], GMAP = {};
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
    wlga: 'local-government-association-wlga', ads: 'archaeology-data-service', wdtk: 'whatdotheyknow-unconfirmed', welshwater: 'dwr-cymru-welsh-water',
    smg: 'science-museum-group', hse: 'health-and-safety-executive', he: 'historic-england', ch: 'companies-house' };
  var SHORT = {}; Object.keys(ALIAS).forEach(function (a) { if (!SHORT[ALIAS[a]]) SHORT[ALIAS[a]] = a; });
  var COL = { foi: '#4f9dff', eir: '#b07cff', sar: '#ff9f40', other: '#ff6b9a', internal_review: '#ffd166', complaint: '#ff5a5f', regulator: '#c9c9c9' };
  var PKEYS = { foi: ['foi'], eir: ['eir'], sar: ['sar'], other: ['enquiry', 'platform', 'cpr', 'gro', 'coroner'],
    internal_review: { foi: ['foi_ir'], eir: ['eir_ir'], sar: ['sar_cmp'], other: ['cmp1', 'pcmp'] }, complaint: ['cmp1', 'pcmp', 'cmp2', 'ptr'], regulator: ['ico', 'ico_case', 'ico_dp', 'psow', 'phso', 'icr'] };
  var LAWX = { foi: 'Freedom of Information Act 2000 s.1 and s.10: answer within 20 working days.', eir: 'Environmental Information Regulations 2004 reg 5(2): answer within 20 working days (reg 7: 40 for complex requests).',
    sar: 'UK GDPR Art 12(3) and Art 15: answer within one month (up to two more for complex requests).', other: 'No statutory clock: the body\'s own service standard, where it has one.',
    internal_review: 'FOIA s.45 Code of Practice / ICO guidance: 20 working days, 40 at most; EIR reg 11(4): 40 working days.', complaint: 'The body\'s own complaints procedure.',
    regulator: 'FOIA s.50 / UK GDPR Art 77 complaint to the ICO; ombudsman schemes where they apply.' };
  var CLOCKX = { foi: '20 working days (s.10); a public-interest extension must be reasonable', eir: '20 working days (reg 5(2)); 40 if complex (reg 7)', sar: 'one calendar month (Art 12(3)); up to two more if complex', other: 'no fixed clock', internal_review: '20 working days, 40 at most (FOI); 40 working days (EIR reg 11(4))', complaint: 'the body\'s own published timescale', regulator: 'no fixed clock (ICO and ombudsman case handling)' };
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function nice(s) { if (!s) return '—'; var p = String(s).slice(0, 10).split('-'); try { return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return s; } }
  function unit(w) { if (!w || w.u === 'none') return 'no fixed clock'; return w.n + ' ' + ({ wd: 'working days', cm: w.n === 1 ? 'month' : 'months', cd: 'days' })[w.u]; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function resolve(id) { if (!id) return null; id = decodeURIComponent(String(id)).replace(/^#/, '').toLowerCase(); if (ALIAS[id]) id = ALIAS[id]; return BY[id] ? id : null; }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, Math.max(4, n - 1)) + '…' : s; }
  function shred() { return '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><rect x="5" y="2" width="14" height="7" fill="#f2f2f2" stroke="#999"/><rect x="2" y="9" width="20" height="5" rx="1" fill="#777"/><g stroke="#f2f2f2" stroke-width="1.6"><line x1="6" y1="15" x2="6" y2="22"/><line x1="9" y1="15" x2="9" y2="20"/><line x1="12" y1="15" x2="12" y2="23"/><line x1="15" y1="15" x2="15" y2="20"/><line x1="18" y1="15" x2="18" y2="22"/></g></svg>'; }
  function icon(id) { var o = OUT[id]; if (!o) return '?'; return o.icon === 'shredder' ? shred() : esc(o.icon); }
  function olabel(id) { return (OUT[id] && OUT[id].label) || id; }
  function wOf(n) { return Math.max(6, Math.min(26, 5 + 4 * Math.sqrt(n || 0))); }

  /* one SVG foreignObject icon chip (semi-translucent); kind 'out' or 'gift' */
  function chip(svg, x, y, html, cls, attrs) {
    var fo = el('foreignObject', { x: x - 15, y: y - 15, width: 30, height: 30 }, svg);
    var d = document.createElement('div'); d.className = 'erp-fl-chip ' + cls; d.innerHTML = html; fo.appendChild(d);
    for (var k in (attrs || {})) d.setAttribute(k, attrs[k]); return d;
  }

  function drawRiver(b) {
    var box = $('#erp-river-svg'); box.innerHTML = ''; GIFTS = []; GMAP = {};
    var W = Math.max(320, Math.min(box.clientWidth || 360, 760)), cx = Math.round(W / 2), edge = 34;
    var lines = b.lines || [], y = 64, layout = [];
    lines.forEach(function (ln, i) {
      var left = i % 2 === 0, xe = left ? edge : W - edge, nb = (ln.branches || []).length;
      var outs = (ln.outcomes || []).length, gifts = (ln.presents || []).length;
      var endRows = Math.ceil(Math.min(outs, 8) / 4) + Math.ceil(gifts / 4);
      var h = 96 + nb * 100 + endRows * 36 + 30;
      layout.push({ ln: ln, i: i, left: left, xe: xe, y0: y, h: h }); y += Math.max(58, h - 40);
    });
    var seaY = (layout.length ? layout[layout.length - 1].y0 + layout[layout.length - 1].h : 120) + 24, H = seaY + 104;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'River flow for ' + b.name + ': ' + b.requests + ' requests, ' + (b.accounted || 0) + ' accounted for, ' + (b.presents || 0) + ' artifacts received' });
    /* trunk: thins as each line leaves it */
    var left = b.requests || 0, ty = 18;
    el('circle', { cx: cx, cy: 14, r: 7, class: 'erp-fl-spring' }, svg);
    var t0 = el('text', { x: cx + 14, y: 18, 'text-anchor': 'start', class: 'erp-fl-trunklab' }, svg); t0.textContent = (b.requests || 0) + ' enquiries';
    layout.forEach(function (L) {
      el('path', { d: 'M' + cx + ' ' + ty + ' L' + cx + ' ' + L.y0, class: 'erp-fl-trunk', 'stroke-width': wOf(left) }, svg);
      ty = L.y0; left -= L.ln.n;
    });
    el('path', { d: 'M' + cx + ' ' + ty + ' L' + cx + ' ' + (seaY - 6), class: 'erp-fl-trunk thin', 'stroke-width': 4 }, svg);
    layout.forEach(function (L) {
      var ln = L.ln, c = COL[ln.type] || '#999', y0 = L.y0, xe = L.xe, dir = L.left ? 1 : -1;
      var yTurn = y0 + 70, nb = (ln.branches || []).length, yEnd = yTurn + 26 + nb * 100;
      var d = 'M' + cx + ' ' + y0 + ' C' + cx + ' ' + (y0 + 38) + ' ' + xe + ' ' + (y0 + 26) + ' ' + xe + ' ' + yTurn + ' L' + xe + ' ' + yEnd;
      var g = el('g', { class: 'erp-fl-line', tabindex: 0, role: 'button', 'data-l': L.i, 'aria-label': ln.label + ': ' + ln.n + ' requests. Open the law, clock and dates' }, svg);
      el('path', { d: d, class: 'erp-fl-hit' }, g);
      el('path', { d: d, class: 'erp-fl-stroke', stroke: c, 'stroke-width': wOf(ln.n) }, g);
      var lab = el('text', { x: xe + dir * 16, y: yTurn - 18, 'text-anchor': L.left ? 'start' : 'end', class: 'erp-fl-lab' }, g); lab.textContent = ln.label;
      var cnt = el('text', { x: xe + dir * 16, y: yTurn - 3, 'text-anchor': L.left ? 'start' : 'end', class: 'erp-fl-n' }, g); cnt.textContent = ln.n + (ln.n === 1 ? ' request' : ' requests');
      /* splits: internal review, complaint, regulator */
      (ln.branches || []).forEach(function (br, k) {
        var by = yTurn + 20 + k * 100, bx = xe + dir * 96, bc = COL[br.type] || '#aaa';
        var bd = 'M' + xe + ' ' + by + ' C' + xe + ' ' + (by + 26) + ' ' + bx + ' ' + (by + 12) + ' ' + bx + ' ' + (by + 40);
        var bg = el('g', { class: 'erp-fl-line', tabindex: 0, role: 'button', 'data-l': L.i, 'data-b': k, 'aria-label': ln.label + ', ' + br.label + ': ' + br.n }, svg);
        el('path', { d: bd, class: 'erp-fl-hit' }, bg);
        el('path', { d: bd, class: 'erp-fl-stroke', stroke: bc, 'stroke-width': wOf(br.n) * 0.8 }, bg);
        var bl = el('text', { x: bx + dir * 14, y: by + 98, 'text-anchor': L.left ? 'end' : 'start', class: 'erp-fl-blab' }, bg); bl.textContent = ({ internal_review: 'Review', complaint: 'Complaint', regulator: 'Regulator' })[br.type] + ' · ' + br.n;
        (br.outcomes || []).slice(0, 3).forEach(function (o, j) {
          var dd = chip(svg, bx - dir * (j * 30), by + 66, icon(o.outcome) + (o.n > 1 ? '<b>' + o.n + '</b>' : ''), 'out', { role: 'button', tabindex: '0', 'data-l': L.i, 'data-b': k, title: olabel(o.outcome) + ' × ' + o.n, 'aria-label': br.label + ': ' + olabel(o.outcome) + ' × ' + o.n });
        });
      });
      /* the end of the line: outcomes, then presents */
      var ex = xe, ey = yEnd + 22, outs = (ln.outcomes || []).slice(0, 8);
      outs.forEach(function (o, j) {
        var col = j % 4, row = Math.floor(j / 4);
        chip(svg, ex + dir * col * 32, ey + row * 34, icon(o.outcome) + (o.n > 1 ? '<b>' + o.n + '</b>' : ''), 'out', { role: 'button', tabindex: '0', 'data-l': L.i, title: olabel(o.outcome) + ' × ' + o.n, 'aria-label': ln.label + ': ' + olabel(o.outcome) + ' × ' + o.n });
      });
      var gy = ey + Math.ceil(outs.length / 4) * 34;
      (ln.presents || []).forEach(function (p, j) {
        var col = j % 4, row = Math.floor(j / 4), gi = GIFTS.length; GIFTS.push(p); GMAP[p.catalogue_id || p.file] = p;
        chip(svg, ex + dir * col * 32, gy + row * 34, '🎁', 'gift', { role: 'button', tabindex: '0', 'data-g': gi, title: 'Artifact: ' + (p.file || p.catalogue_id), 'aria-label': 'Open the catalogue entry for ' + (p.file || p.catalogue_id) });
      });
    });
    /* the sea */
    var sea = el('path', { d: 'M0 ' + (seaY + 14) + ' Q' + W * 0.25 + ' ' + (seaY) + ' ' + W * 0.5 + ' ' + (seaY + 14) + ' T' + W + ' ' + (seaY + 14) + ' L' + W + ' ' + H + ' L0 ' + H + ' Z', class: 'erp-fl-sea' }, svg);
    var s1 = el('text', { x: cx, y: seaY + 44, 'text-anchor': 'middle', class: 'erp-fl-goal' }, svg); s1.textContent = FL.goal;
    var s2 = el('text', { x: cx, y: seaY + 66, 'text-anchor': 'middle', class: 'erp-fl-goal2' }, svg);
    s2.textContent = (b.accounted || 0) + ' of ' + (b.requests || 0) + ' requests accounted for · ' + (b.presents || 0) + ' artifact' + (b.presents === 1 ? '' : 's') + ' received';
    box.appendChild(svg);
  }

  function summary(b) {
    var pct = b.pct_accounted || 0;
    $('#erp-rv-name').textContent = b.name;
    $('#erp-rv-kpi').innerHTML = '<b>' + pct + '%</b> accounted for · ' + (b.accounted || 0) + ' of ' + (b.requests || 0) + ' requests have an end answer on record' +
      '<br><span>' + [(b.reviews || 0) + ' internal review' + (b.reviews === 1 ? '' : 's'), (b.complaints || 0) + ' complaint' + (b.complaints === 1 ? '' : 's'), (b.regulator ? b.regulator + ' regulator case' + (b.regulator === 1 ? '' : 's') : ''), '🎁 ' + (b.presents || 0) + ' artifact' + (b.presents === 1 ? '' : 's'), (b.not_checked ? b.not_checked + ' not checked' : '')].filter(Boolean).join(' · ') + '</span>';
    $('#erp-rv-bar i').style.width = pct + '%';
  }

  function select(id, opts) {
    id = resolve(id) || LIST[0].id; var b = BY[id]; CUR = b; opts = opts || {};
    store(KEY, id); summary(b); drawRiver(b);
    var h = '#' + (SHORT[id] || id); if (location.hash !== h && !opts.fromHash) history.replaceState(null, '', location.pathname + location.search + h);
    [].forEach.call(document.querySelectorAll('#erp-dl button[data-id]'), function (x) { if (x.getAttribute('data-id') === id) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
    $('#erp-burger-name').textContent = b.name;
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
    LIST.forEach(function (b) {
      var hay = (b.name + ' ' + b.id + ' ' + (SHORT[b.id] || '')).toLowerCase(); if (q && hay.indexOf(q) < 0) return; n++;
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" data-id="' + esc(b.id) + '"' + (CUR && CUR.id === b.id ? ' aria-current="true"' : '') + '><span class="nm">' + esc(b.name) + '</span><span class="mt">' +
        [(b.pct_accounted || 0) + '% accounted', b.requests + ' request' + (b.requests === 1 ? '' : 's'), b.presents ? '🎁 ' + b.presents : '', b.in_pipeline ? '' : 'flow only'].filter(Boolean).join(' · ') + '</span></button>';
      ul.appendChild(li);
    });
    $('#erp-dn').textContent = n + ' of ' + LIST.length;
  }

  /* sheets and the catalogue modal */
  function proc(type, parent) {
    var o = CUR && D && (D.institutions || []).filter(function (x) { return x.id === CUR.id; })[0]; var keys = PKEYS[type]; if (type === 'internal_review') keys = keys[parent] || keys.foi;
    if (!o) return null; for (var i = 0; i < o.stages.length; i++) { var p = PROC[o.stages[i].procedure]; if (p && keys.indexOf(p.key) >= 0) { var m = {}; for (var k in p) m[k] = p[k]; m.forecast = o.stages[i].forecast; return m; } }
    return null;
  }
  function show(sh, focusSel) { LASTFOCUS = document.activeElement; sh.hidden = false; $('#erp-scrim').hidden = false; requestAnimationFrame(function () { sh.classList.add('on'); $('#erp-scrim').classList.add('on'); }); setTimeout(function () { $(focusSel).focus(); }, 40); }
  function reqRow(r) {
    var ev = r.ev ? ' · <button type="button" class="erp-fl-cat" data-cat="' + esc(r.ev) + '">' + esc(r.ev) + '</button>' : '';
    return '<li><span class="erp-rv-ico erp-fl-dim">' + icon(r.outcome) + '</span> <b>' + esc(olabel(r.outcome)) + '</b>' + ev +
      '<br>' + esc(r.title || '') + (r.ref ? ' <small>(' + esc(r.ref) + ')</small>' : '') +
      '<br><small>' + (r.opened ? 'asked ' + nice(r.opened) : '') + (r.deadline ? ' · due ' + nice(r.deadline) : '') + (r.first_reply ? ' · first reply ' + nice(r.first_reply) : '') + (r.deadline_met ? ' · ' + esc(r.deadline_met) : '') +
      (r.newer_in_gmail ? ' · ' + r.newer_in_gmail + ' newer message' + (r.newer_in_gmail > 1 ? 's' : '') + ' in the mail, not checked' : '') + (r.source && r.source !== 'mail index' ? ' · source: ' + esc(r.source) : '') + '</small>' +
      ((r.presents || []).length ? '<br>' + r.presents.map(function (p) { return '<button type="button" class="erp-fl-gift" data-gk="' + esc(p.catalogue_id || p.file) + '">🎁 ' + esc(clip(p.file || p.catalogue_id, 40)) + '</button>'; }).join(' ') : '') + '</li>';
  }
  function openLine(li, bi) {
    var ln = CUR.lines[li]; if (!ln) return; var br = bi != null ? ln.branches[bi] : null, type = br ? br.type : ln.type, p = proc(type, ln.type), rs = br ? br.items : ln.requests;
    var tallies = (br ? br.outcomes : ln.outcomes).map(function (o) { return '<li><span class="erp-rv-ico erp-fl-dim">' + icon(o.outcome) + '</span> ' + esc(olabel(o.outcome)) + ' × ' + o.n + ((OUT[o.outcome] || {}).chestnut ? ' <small>(an old chestnut)</small>' : '') + '</li>'; }).join('');
    var dates = rs.map(function (r) { return r.opened; }).filter(Boolean).sort();
    $('#erp-sheet-body').innerHTML = '<p class="erp-rv-kick">' + esc(CUR.name) + (br ? ' · ' + esc(ln.label) : '') + '</p>' +
      '<h3 id="erp-sheet-h">' + esc(br ? br.label : ln.label) + ' · ' + rs.length + '</h3>' +
      '<dl><dt>Law or policy</dt><dd>' + esc(p && p.law ? p.law : LAWX[type]) + (p && p.src ? '<br><a href="' + esc(p.src) + '" rel="noopener">Source</a>' : '') + '</dd>' +
      '<dt>Clock</dt><dd>' + (p ? unit(p.clock) + (p.ext ? '; extension ' + esc(p.ext) : '') : esc(CLOCKX[type])) + '</dd>' +
      '<dt>Dates</dt><dd>' + (dates.length ? 'first ' + nice(dates[0]) + ' · latest ' + nice(dates[dates.length - 1]) : 'not checked') + (p && p.forecast ? '<br><small>Worst case if asked again now: due by ' + nice(p.forecast.due_worst) + ' (est.)</small>' : '') + '</dd></dl>' +
      '<p class="erp-rv-kick">How it ended</p><ul class="erp-rv-bank">' + tallies + '</ul>' +
      '<p class="erp-rv-kick">Requests</p><ul class="erp-rv-bank">' + rs.map(reqRow).join('') + '</ul>';
    show($('#erp-sheet'), '#erp-sheet-x');
  }
  function closeSheet() { var sh = $('#erp-sheet'); if (sh.hidden) return; sh.classList.remove('on'); if ($('#erp-drawer').hidden && $('#erp-modal').hidden) $('#erp-scrim').classList.remove('on'); setTimeout(function () { sh.hidden = true; if ($('#erp-drawer').hidden && $('#erp-modal').hidden) $('#erp-scrim').hidden = true; }, 200); if (LASTFOCUS && LASTFOCUS.focus) LASTFOCUS.focus(); }
  function renderItem(it, links) {
    var d = it.data || {}, rows = [['Date', it.date_display || nice(it.date_sort)], ['Status', it.status], ['Holder', it.holder], ['Type', d.type], ['Label', d.label], ['Provenance', d.provenance], ['Repository', d.repository], ['Summary', it.summary]];
    var page = it.page ? (/^https?:/.test(it.page) ? it.page.replace(/^https?:\/\/([a-z0-9-]+)\.bucklerfamily\.estate\//, function (m, sub) { return APEX + '/' + (sub === 'cedwyn' || sub === 'www' ? '' : sub + '/'); }) : APEX + it.page) : null;
    return '<p class="erp-rv-kick">Evidence catalogue · ' + esc(it.id) + (it.alias ? ' · ' + esc(it.alias) : '') + '</p><h3 id="erp-modal-h">' + esc(it.title) + '</h3><dl>' +
      rows.filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
      ((links || []).length ? '<p class="erp-rv-kick">Linked records</p><ul class="erp-rv-bank">' + links.slice(0, 12).map(function (l) { var id = l.id || l.to || l.target || ''; return '<li><button type="button" class="erp-fl-cat" data-cat="' + esc(id) + '">' + esc(id) + '</button> ' + esc(l.title || l.rel || '') + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="erp-fl-out">' + (page ? '<a href="' + esc(page) + '" rel="noopener">Open the record page</a> · ' : '') + '<a href="' + esc(CAT + encodeURIComponent(it.id)) + '" rel="noopener">Catalogue record (data)</a></p>';
  }
  function openCat(id, p) {
    var m = $('#erp-modal'), body = $('#erp-modal-body');
    if (!id) { body.innerHTML = '<p class="erp-rv-kick">Artifact · not yet in the catalogue</p><h3 id="erp-modal-h">' + esc(p && p.file) + '</h3><dl><dt>Received</dt><dd>' + nice(p && p.date) + ' from ' + esc(CUR.name) + '</dd><dt>Catalogue</dt><dd>No catalogue entry yet. It is listed as a proposed catalogue addition; existing records are never edited here.</dd></dl>'; show(m, '#erp-modal-x'); return; }
    body.innerHTML = '<p class="erp-rv-kick">Evidence catalogue · ' + esc(id) + '</p><h3 id="erp-modal-h">Loading…</h3>';
    show(m, '#erp-modal-x');
    fetch(CAT + encodeURIComponent(id)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { if (!j || !j.item) throw new Error('empty'); body.innerHTML = renderItem(j.item, j.links); })
      .catch(function () { body.innerHTML = '<p class="erp-rv-kick">Evidence catalogue · ' + esc(id) + '</p><h3 id="erp-modal-h">' + esc((p && p.file) || id) + '</h3><p>The catalogue did not answer just now.</p><p class="erp-fl-out"><a href="' + esc(CAT + encodeURIComponent(id)) + '" rel="noopener">Open the catalogue record</a></p>'; });
  }
  function closeModal() { var m = $('#erp-modal'); if (m.hidden) return; m.classList.remove('on'); var others = !$('#erp-sheet').hidden || !$('#erp-drawer').hidden; if (!others) $('#erp-scrim').classList.remove('on'); setTimeout(function () { m.hidden = true; if (!others) $('#erp-scrim').hidden = true; }, 200); if (LASTFOCUS && LASTFOCUS.focus) LASTFOCUS.focus(); }

  function build() {
    var bar = document.createElement('div'); bar.className = 'erp-rv-bar'; bar.id = 'erp-rv-top';
    bar.innerHTML = '<button type="button" id="erp-burger" class="erp-burger" aria-expanded="false" aria-controls="erp-drawer" aria-label="Choose an institution">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<span class="erp-burger-name" id="erp-burger-name"></span><button type="button" class="erp-rv-mode" id="erp-rv-mode" aria-pressed="false">Board</button>';
    var sec = document.createElement('section'); sec.className = 'erp-rv'; sec.id = 'erp-river'; sec.setAttribute('aria-labelledby', 'erp-rv-name');
    var kick = $('.tp-hero .tp-kicker'); sec.innerHTML = '<p class="erp-rv-kick">' + esc(kick ? kick.textContent : 'ERP') + ' · ERP</p><h2 id="erp-rv-name"></h2><p class="erp-rv-kpi" id="erp-rv-kpi"></p><div class="erp-rv-prog" id="erp-rv-bar" aria-hidden="true"><i></i></div>' +
      '<p class="erp-rv-legend"><span class="erp-fl-key" style="background:' + COL.foi + '"></span>FOI <span class="erp-fl-key" style="background:' + COL.eir + '"></span>EIR <span class="erp-fl-key" style="background:' + COL.sar + '"></span>GDPR/SAR <span class="erp-fl-key" style="background:' + COL.other + '"></span>other · splits: <span class="erp-fl-key" style="background:' + COL.internal_review + '"></span>review <span class="erp-fl-key" style="background:' + COL.complaint + '"></span>complaint <span class="erp-fl-key" style="background:' + COL.regulator + '"></span>regulator. 🎁 an actual record sent as an attachment: tap it. Line width = number of requests. Outcomes come from the mail; where the mail did not show one it reads not checked.</p>' +
      '<div id="erp-river-svg" class="erp-rv-svg"></div>';
    var dr = document.createElement('div'); dr.innerHTML =
      '<div class="erp-scrim" id="erp-scrim" hidden></div>' +
      '<nav class="erp-drawer" id="erp-drawer" role="dialog" aria-modal="true" aria-labelledby="erp-dh" hidden><div class="erp-dhead"><h2 id="erp-dh">Institutions</h2><button type="button" class="erp-x" id="erp-dx" aria-label="Close the list">✕</button></div>' +
      '<label class="erp-dsearch"><span class="sr">Search institutions</span><input id="erp-q" type="search" placeholder="Search, e.g. land registry" autocomplete="off"></label><p class="erp-dn" id="erp-dn" aria-live="polite"></p><ul class="erp-dl" id="erp-dl"></ul></nav>' +
      '<div class="erp-sheet" id="erp-sheet" role="dialog" aria-modal="true" aria-labelledby="erp-sheet-h" hidden><button type="button" class="erp-x" id="erp-sheet-x" aria-label="Close">✕</button><div id="erp-sheet-body"></div></div>' +
      '<div class="erp-modal" id="erp-modal" role="dialog" aria-modal="true" aria-labelledby="erp-modal-h" hidden><button type="button" class="erp-x" id="erp-modal-x" aria-label="Close">✕</button><div id="erp-modal-body"></div></div>';
    var anchor = $('header.tp-hero') || document.body.firstChild;
    anchor.parentNode.insertBefore(bar, anchor); anchor.parentNode.insertBefore(sec, anchor);
    while (dr.firstChild) document.body.appendChild(dr.firstChild);
    document.documentElement.classList.add('erp-rv-on');
    $('#erp-burger').addEventListener('click', function () { if ($('#erp-drawer').hidden) openDrawer(); else closeDrawer(); });
    $('#erp-dx').addEventListener('click', closeDrawer); $('#erp-scrim').addEventListener('click', function () { if (!$('#erp-modal').hidden) closeModal(); else { closeDrawer(); closeSheet(); } });
    $('#erp-q').addEventListener('input', function () { fillList(this.value); });
    $('#erp-dl').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-id]'); if (!b) return; select(b.getAttribute('data-id')); LASTFOCUS = $('#erp-burger'); closeDrawer(); window.scrollTo(0, Math.max(0, bar.getBoundingClientRect().top + window.scrollY - 4)); });
    ['#erp-drawer', '#erp-sheet', '#erp-modal'].forEach(function (s) { $(s).addEventListener('keydown', function (ev) { trap(this, ev); }); });
    $('#erp-sheet-x').addEventListener('click', closeSheet); $('#erp-modal-x').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (!$('#erp-modal').hidden) closeModal(); else if (!$('#erp-sheet').hidden) closeSheet(); else closeDrawer(); } });
    function act(t) {
      var k = t.closest && t.closest('[data-gk]'); if (k) { var q = GMAP[k.getAttribute('data-gk')]; if (q) openCat(q.catalogue_id, q); return true; }
      var g = t.closest && t.closest('[data-g]'); if (g) { var p = GIFTS[+g.getAttribute('data-g')]; if (p) openCat(p.catalogue_id, p); return true; }
      var c = t.closest && t.closest('[data-cat]'); if (c) { openCat(c.getAttribute('data-cat')); return true; }
      var l = t.closest && t.closest('[data-l]'); if (l && l.closest('#erp-river-svg')) { openLine(+l.getAttribute('data-l'), l.hasAttribute('data-b') ? +l.getAttribute('data-b') : null); return true; }
      return false;
    }
    document.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('#erp-river-svg,#erp-sheet,#erp-modal')) act(ev.target); });
    document.addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest && ev.target.closest('#erp-river-svg') && act(ev.target)) ev.preventDefault(); });
    $('#erp-rv-mode').addEventListener('click', function () { var on = document.documentElement.classList.toggle('erp-rv-board'); this.setAttribute('aria-pressed', on ? 'true' : 'false'); this.textContent = on ? 'River' : 'Board'; });
    window.addEventListener('hashchange', function () { var id = resolve(location.hash); if (id && (!CUR || CUR.id !== id)) select(id, { fromHash: true }); });
    var rw = null; window.addEventListener('resize', function () { clearTimeout(rw); rw = setTimeout(function () { if (CUR) drawRiver(CUR); }, 200); });
  }

  function init(d, fl) {
    D = d; FL = fl;
    (d.procedures || []).forEach(function (p) { PROC[p.id] = p; }); (fl.outcomes || []).forEach(function (o) { OUT[o.id] = o; });
    LIST = fl.bodies.slice(); LIST.forEach(function (b) { BY[b.id] = b; });
    build(); fillList('');
    var h = location.hash.replace(/^#/, ''), q = new URL(location.href).searchParams.get('o');
    select(resolve(h) || resolve(q) || resolve(store(KEY)) || LIST[0].id, { fromHash: !!resolve(h) });
  }
  Promise.all([fetch('data/erp.json').then(function (r) { return r.json(); }), fetch('data/flows.json').then(function (r) { return r.json(); })])
    .then(function (v) { init(v[0], v[1]); }).catch(function () { /* the static board stays */ });
})();

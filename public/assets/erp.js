/* ERP 0.0.1 — worst-case disclosure pipelines. Reads data/erp.json (schema/erp.schema.json); draws the opportunity
   board, the Donkey Kong climb (one girder per lap) and the stage table. Works on top of the static page (no-JS lists stay).
   WebMCP: registers read tools when the browser offers navigator.modelContext. — Cedwyn editors */
(function () {
  'use strict';
  var DATA = null, SAMPLE = null, SEL = null, ANCHOR = null, HOL = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function pd(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function addWd(d, n) { var x = new Date(d.getTime()), k = 0; while (k < n) { x.setUTCDate(x.getUTCDate() + 1); var w = x.getUTCDay(); if (w !== 0 && w !== 6 && !HOL[iso(x)]) k++; } return x; }
  function addCm(d, n) { var y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate(); var t = new Date(Date.UTC(y, m + 1, 0)); return new Date(Date.UTC(y, m, Math.min(day, t.getUTCDate()))); }
  function addU(d, u, n) { if (u === 'wd') return addWd(d, n); if (u === 'cm') return addCm(d, n); if (u === 'cd') { var x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; } return d; }
  var FMT = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  function nice(s) { try { return pd(s).toLocaleDateString('en-GB', FMT); } catch (e) { return s; } }
  function unit(w) { return w.n + ' ' + ({ wd: 'working days', cm: w.n === 1 ? 'month' : 'months', cd: 'days', none: '' })[w.u]; }

  /* the same worst-case rule as tools/build.py: laps in sequence; inside a lap a chain runs in order, the rest side by side */
  function forecast(o, anchor) {
    var start = pd(anchor), lapStart = start, laps = [];
    DATA.laps.forEach(function (lap) {
      var ls = o.stages.filter(function (s) { return s.lap === lap.id; });
      if (!ls.length) return;
      var ends = {}, lapEnd = lapStart;
      ls.forEach(function (s) {
        var opens = s.chain && ends[s.chain] ? ends[s.chain] : lapStart;
        var due = addU(opens, s.worst_case.u, s.worst_case.n);
        if (s.chain) ends[s.chain] = due;
        if (due > lapEnd) lapEnd = due;
        s._opens = iso(opens); s._due = iso(due);
      });
      laps.push({ lap: lap.id, opens: iso(lapStart), closes: iso(lapEnd) });
      lapStart = lapEnd;
    });
    o._close = iso(lapStart); o._days = Math.round((lapStart - start) / 864e5); o._laps = laps;
    return o;
  }
  function pct(o) { var c = o.stages.filter(function (s) { return s.status === 'concluded'; }).length; return Math.round(100 * c / o.stages.length); }
  function exc(id) { for (var i = 0; i < DATA.excuses.length; i++) if (DATA.excuses[i].id === id) return DATA.excuses[i]; return null; }
  var SHRED = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="7" fill="#f2f2f2" stroke="#999"/><rect x="2" y="9" width="20" height="5" rx="1" fill="#777"/><g stroke="#f2f2f2" stroke-width="1.6"><line x1="6" y1="15" x2="6" y2="22"/><line x1="9" y1="15" x2="9" y2="20"/><line x1="12" y1="15" x2="12" y2="23"/><line x1="15" y1="15" x2="15" y2="20"/><line x1="18" y1="15" x2="18" y2="22"/></g></svg>';
  function icon(id) { var e = exc(id); if (!e) return ''; return '<span class="erp-ico erp-c" title="' + esc(e.label) + '" aria-label="' + esc(e.label) + '">' + (e.icon === 'shredder' ? SHRED : esc(e.icon)) + '</span>'; }

  /* ---------- the climb: one girder per lap, ladders between, the ape at the top on "Closed won" ---------- */
  function climb(o) {
    var laps = DATA.laps.filter(function (l) { return o.stages.some(function (s) { return s.lap === l.id; }); });
    var W = 360, LH = 58, TOP = 64, N = laps.length, H = TOP + N * LH + 24, X0 = 12, X1 = W - 12, GAP = 30, TILT = 7;
    function g(lv) { var y = TOP + (N - 1 - lv) * LH + 34, hr = lv % 2 === 0, l = hr ? X0 + GAP : X0, r = hr ? X1 : X1 - GAP, yl = hr ? y + TILT / 2 : y - TILT / 2, yr = hr ? y - TILT / 2 : y + TILT / 2; return { l: l, r: r, yl: yl, yr: yr, hr: hr, at: function (x) { return yl + (x - l) / (r - l) * (yr - yl); } }; }
    var out = ['<svg class="erp-dk erp-c" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Climb for ' + esc(o.name) + ': ' + N + ' laps, ' + o.stages.length + ' stages">'];
    var here = null, mk = o.marker.stage_n;
    laps.forEach(function (lap, lv) {
      var G = g(lv), ls = o.stages.filter(function (s) { return s.lap === lap.id; });
      // girder (riveted beam)
      out.push('<polygon points="' + G.l + ',' + (G.yl - 5) + ' ' + G.r + ',' + (G.yr - 5) + ' ' + G.r + ',' + (G.yr + 3) + ' ' + G.l + ',' + (G.yl + 3) + '" fill="#d04a2f"/>');
      for (var x = G.l + 6; x < G.r; x += 12) out.push('<line x1="' + x + '" y1="' + (G.at(x) - 5) + '" x2="' + (x + 6) + '" y2="' + (G.at(x + 6) + 3) + '" stroke="#7a2412" stroke-width="1.2"/>');
      var mx = (G.l + G.r) / 2;
      out.push('<text x="' + mx + '" y="' + (G.at(mx) + 15) + '" fill="#bbb" font-size="8.5" letter-spacing=".8" text-anchor="middle">' + (lv + 1) + ' · ' + esc(lap.label.toUpperCase()) + '</text>');
      // ladder up to the next girder
      if (lv < N - 1) {
        var lx = G.hr ? G.l + 16 : G.r - 22, y0 = G.at(lx) - 5, y1 = g(lv + 1).at(lx) + 3;
        out.push('<g stroke="#5fd3ff" stroke-width="1.6"><line x1="' + lx + '" y1="' + y0 + '" x2="' + lx + '" y2="' + y1 + '"/><line x1="' + (lx + 8) + '" y1="' + y0 + '" x2="' + (lx + 8) + '" y2="' + y1 + '"/>');
        for (var yy = y1 + 5; yy < y0; yy += 7) out.push('<line x1="' + lx + '" y1="' + yy + '" x2="' + (lx + 8) + '" y2="' + yy + '"/>');
        out.push('</g>');
      }
      // stage squares along the girder
      var a = G.hr ? G.l + 34 : G.r - 34, b = G.hr ? G.r - 40 : G.l + 40, k = ls.length;
      ls.forEach(function (s, j) {
        var sx = k === 1 ? (a + b) / 2 : a + (b - a) * j / (k - 1), sy = G.at(sx) - 13;
        var fill = s.light === 'red' ? '#ff5a5f' : s.light === 'amber' ? '#ffb020' : s.status === 'open' ? '#ffffff' : '#000';
        out.push('<g><title>' + esc(s.n + '. ' + s.label + ' · worst-case due ' + nice(s._due || s.forecast.due_worst)) + '</title><rect x="' + (sx - 6) + '" y="' + (sy - 6) + '" width="12" height="12" rx="2" fill="' + fill + '" stroke="' + (s.status === 'not_started' ? '#777' : '#fff') + '" stroke-width="1.2"/>' +
          '<text x="' + sx + '" y="' + (sy + 3) + '" font-size="7.5" text-anchor="middle" fill="' + (s.light || s.status === 'open' ? '#000' : '#aaa') + '">' + s.n + '</text></g>');
        (s.excuses || []).forEach(function (e, q) { var E = exc(e.excuse); if (!E) return; out.push(barrel(sx + 4 + q * 11, sy - 17, E)); });
        if (s.n === mk) here = { x: sx, y: G.at(sx) - 5 };
      });
      if (lv === 0 && mk === 0) here = { x: G.hr ? G.l + 14 : G.r - 14, y: G.at(G.hr ? G.l + 14 : G.r - 14) - 5 };
    });
    // top platform: closed won
    var tg = g(N - 1), ax = tg.hr ? tg.r - 36 : tg.l + 36, ay = tg.at(ax) - 5;
    out.push('<rect x="' + (W / 2 - 120) + '" y="8" width="240" height="22" fill="none" stroke="#fff" stroke-width="1"/><text x="' + W / 2 + '" y="23" font-size="9" letter-spacing="1" text-anchor="middle" fill="#fff" textLength="216" lengthAdjust="spacingAndGlyphs">CLOSED WON · EVERY RECORD VIEWED</text>');
    out.push(ape(ax, ay));
    var seen = o.excuses_seen || [], pile = [];
    seen.forEach(function (r) { r.excuses.forEach(function (e) { if (pile.length < 6) pile.push(e); }); });
    pile.forEach(function (e, q) { var E = exc(e); if (E) out.push(barrel((tg.hr ? ax - 30 - q * 12 : ax + 18 + q * 12), ay - 8, E)); });
    if (here) out.push(hero(here.x, here.y));
    out.push('</svg>');
    return out.join('');
  }
  function barrel(x, y, E) {
    var t = E.icon === 'shredder' ? '▤' : E.icon;
    return '<g><title>' + esc(E.label) + '</title><ellipse cx="' + x + '" cy="' + y + '" rx="5.5" ry="5" fill="#b8742a" stroke="#5a3210"/><line x1="' + (x - 5) + '" y1="' + (y - 2) + '" x2="' + (x + 5) + '" y2="' + (y - 2) + '" stroke="#5a3210"/><line x1="' + (x - 5) + '" y1="' + (y + 2) + '" x2="' + (x + 5) + '" y2="' + (y + 2) + '" stroke="#5a3210"/><text x="' + x + '" y="' + (y - 7) + '" font-size="8" text-anchor="middle">' + esc(t) + '</text></g>';
  }
  function px(o, x, y, p, cells) { cells.forEach(function (c) { o.push('<rect x="' + (x + c[0] * p) + '" y="' + (y + c[1] * p) + '" width="' + (c[2] * p) + '" height="' + (c[3] * p) + '" fill="' + c[4] + '"/>'); }); }
  function ape(x, y) {
    var o = ['<g><title>The institution at the top of its own climb</title>'], f = '#6b4a2f';
    px(o, x, y, 2.2, [[-5, -10, 10, 9, f], [-4, -15, 8, 6, f], [-3, -13, 6, 4, '#d8b48a'], [-2, -13, 1, 1, '#111'], [1, -13, 1, 1, '#111'], [-2, -11, 4, 1, '#3e2a1a'], [-3, -6, 6, 4, '#8a6545'], [-8, -17, 3, 8, f], [5, -17, 3, 8, f], [-5, -1, 4, 2, '#3e2a1a'], [1, -1, 4, 2, '#3e2a1a']]);
    o.push('</g>'); return o.join('');
  }
  function hero(x, y) {
    var o = ['<g><title>We are here</title>'];
    px(o, x, y, 1.8, [[-3, -12, 6, 2, '#2fbf4a'], [-2, -10, 4, 3, '#f1c27d'], [-3, -7, 6, 4, '#2fbf4a'], [-3, -3, 2, 3, '#2a4bd7'], [1, -3, 2, 3, '#2a4bd7']]);
    o.push('<text x="' + x + '" y="' + (y - 26) + '" font-size="8.5" text-anchor="middle" fill="#2fbf4a" letter-spacing="1">WE ARE HERE</text></g>'); return o.join('');
  }

  /* ---------- one opportunity ---------- */
  function detail(o) {
    forecast(o, ANCHOR);
    var isS = o.id === 'sample', h = [];
    h.push('<article class="erp-detail" id="opp-' + esc(o.id) + '">');
    if (isS) h.push('<p><span class="erp-sample erp-c">Sample · not a real institution · not real data</span></p>');
    h.push('<h2>' + esc(o.name) + '</h2>');
    h.push('<p class="tp-muted">' + o.stages.length + ' stages over ' + o._laps.length + ' laps · ' + pct(o) + '% complete · ' + esc(o.marker.label) + ' · worst-case close ' + nice(o._close) + ' (' + Math.round(o._days / 30.44) + ' months from ' + nice(ANCHOR) + ')</p>');
    var ev = o.evidence;
    h.push('<p class="tp-muted">Closed won needs every known record identified, located and viewed: ' + (ev.known == null ? 'evidence counts not yet imported' : ev.viewed + ' of ' + ev.known + ' viewed (' + ev.identified + ' identified, ' + ev.located + ' located)') + '.</p>');
    h.push('<p>' + o.regimes_applicable.map(function (r) { return '<span class="erp-pill">' + esc(r.id) + '</span>'; }).join('') + '</p>');
    if (o.regimes_not_applicable.length) h.push('<details><summary>What does not apply, and why</summary><ul>' + o.regimes_not_applicable.map(function (r) { return '<li><b>' + esc(r.id) + '</b>: ' + esc(r.why) + '</li>'; }).join('') + '</ul></details>');
    if (o.excuses_seen && o.excuses_seen.length) {
      h.push('<p class="erp-h">Excuses on record (That Old Chestnut)</p><ul class="erp-seen">' + o.excuses_seen.map(function (r) {
        return '<li>' + r.excuses.map(icon).join('') + ' <a href="' + esc(r.link) + '">' + esc(r.toc) + '</a> · ' + nice(r.date) + (r.later_found ? ' · records found later ' + nice(r.later_found) : '') + '</li>';
      }).join('') + '</ul>');
    }
    h.push(climb(o));
    h.push('<table class="erp-stages"><thead><tr><th>#</th><th>Stage</th><th>Law and clock</th><th>Worst case</th><th>Opens</th><th>Due (worst)</th><th>Light</th><th>Excuses</th></tr></thead><tbody>');
    var lastLap = null;
    o.stages.forEach(function (s) {
      if (s.lap !== lastLap) { lastLap = s.lap; var L = DATA.laps.filter(function (l) { return l.id === s.lap; })[0]; h.push('<tr class="lap"><td colspan="8">Lap ' + L.n + ' · ' + esc(L.label) + '</td></tr>'); }
      var law = s.src ? '<a href="' + esc(s.src) + '">' + esc(s.law || s.label) + '</a>' : esc(s.law || '');
      h.push('<tr' + (s.n === o.marker.stage_n ? ' class="here"' : '') + '><td class="d" data-l="#">' + s.n + '</td><td data-l="Stage">' + esc(s.label) + (s.inferred ? ' <span class="erp-inf">inferred</span>' : '') + (s.synthetic ? ' <span class="erp-inf">added stage</span>' : '') + '</td><td class="law" data-l="Law">' + law + '</td><td data-l="Worst case">' + esc(unit(s.worst_case)) + '</td><td class="d" data-l="Opens">' + (s.forecast && s.forecast.actual_opened ? '<b>' + nice(s.forecast.actual_opened) + '</b> <small>opened</small>' : nice(s._opens)) + '</td><td class="d" data-l="Due">' + (s.forecast && s.forecast.actual_closed ? '<b>' + nice(s.forecast.actual_closed) + '</b> <small>concluded</small>' : nice(s._due) + (s.status === 'open' ? ' <small>open</small>' : '')) + '</td><td data-l="Light"><span class="erp-light erp-c ' + (s.light || '') + '" title="' + (s.light || (s.status === 'not_started' ? 'not reached' : s.status)) + '"></span></td><td data-l="Excuses">' + (s.excuses || []).map(function (e) { return icon(e.excuse) + (e.n > 1 ? '<small>×' + e.n + '</small>' : ''); }).join('') + (s.evidence_ids && s.evidence_ids.length ? ' <small>' + s.evidence_ids.slice(0, 4).map(function (id) { return '<a href="https://bucklerfamily.estate/catalogue/?id=' + esc(id) + '">' + esc(id) + '</a>'; }).join(' ') + (s.evidence_ids.length > 4 ? ' +' + (s.evidence_ids.length - 4) : '') + '</small>' : '') + '</td></tr>');
    });
    h.push('</tbody></table></article>');
    return h.join('');
  }

  function show(id, push) {
    var o = id === 'sample' ? SAMPLE : DATA.institutions.filter(function (x) { return x.id === id; })[0];
    var box = $('#erp-detail');
    if (!o) { box.innerHTML = '<p class="tp-muted">Choose an opportunity to see its pipeline.</p>'; SEL = null; return; }
    SEL = o.id; box.innerHTML = detail(o); $('#erp-pick').value = o.id;
    if (push) { var u = new URL(location.href); u.searchParams.set('o', o.id); history.replaceState(null, '', u.search + '#pipeline'); }
  }
  function refreshBoard() {
    DATA.institutions.forEach(function (o) {
      forecast(o, ANCHOR);
      var li = document.getElementById('o-' + o.id); if (!li) return;
      var c = li.querySelector('[data-close]'); if (c) c.textContent = nice(o._close);
    });
    var latest = DATA.institutions.reduce(function (m, o) { return o._close > m ? o._close : m; }, ANCHOR);
    var k = $('#kpi-close'); if (k) k.textContent = nice(latest).replace(/^\d+ /, '');
  }

  function init(d, s) {
    DATA = d; SAMPLE = s && s.opportunity; d.bank_holidays.dates.forEach(function (x) { HOL[x] = 1; });
    var PROC = {}; d.procedures.forEach(function (p) { PROC[p.id] = p; });
    function res(o) { o.stages = o.stages.map(function (st) { var m = {}, p = PROC[st.procedure] || {}, k; for (k in p) m[k] = p[k]; m.procedure_id = p.id; for (k in st) m[k] = st[k]; return m; }); }
    d.institutions.forEach(res); if (SAMPLE) res(SAMPLE);
    var q = new URL(location.href).searchParams;
    ANCHOR = /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : d.forecast_rules.anchor;
    var ctl = $('#erp-ctl'); ctl.hidden = false;
    var pick = $('#erp-pick'), from = $('#erp-from');
    from.value = ANCHOR;
    pick.addEventListener('change', function () { show(pick.value, true); });
    from.addEventListener('change', function () { if (!from.value) return; ANCHOR = from.value; var u = new URL(location.href); u.searchParams.set('from', ANCHOR); history.replaceState(null, '', u.search + location.hash); refreshBoard(); if (SEL) show(SEL, false); });
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('[data-opp]'); if (!a) return;
      ev.preventDefault(); show(a.getAttribute('data-opp'), true); var t = $('#pipeline'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    refreshBoard();
    show(q.get('o') || '', false);
    webmcp();
  }

  function webmcp() {
    var mc = navigator.modelContext; if (!mc || typeof mc.registerTool !== 'function') return;
    function list() { return DATA.institutions.map(function (o) { return { id: o.id, name: o.name, stages: o.stages.length, pct_complete: pct(o), marker: o.marker, close_worst: o._close || o.forecast.close_worst }; }); }
    try {
      mc.registerTool({ name: 'erp_list_opportunities', description: 'List every institution pipeline (id, name, stages, % complete, marker, worst-case close date).', inputSchema: { type: 'object', properties: {} }, execute: function () { return { content: [{ type: 'text', text: JSON.stringify(list()) }] }; } });
      mc.registerTool({ name: 'erp_get_opportunity', description: 'Return one institution pipeline with every stage, law, clock and worst-case forecast.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, execute: function (a) { var o = DATA.institutions.filter(function (x) { return x.id === (a && a.id); })[0]; return { content: [{ type: 'text', text: o ? JSON.stringify(forecast(o, ANCHOR)) : 'not found' }] }; } });
    } catch (e) { /* the browser's own surface decides */ }
  }

  Promise.all([fetch('data/erp.json').then(function (r) { return r.json(); }), fetch('data/sample.json').then(function (r) { return r.json(); })])
    .then(function (v) { init(v[0], v[1]); })
    .catch(function () { /* static lists remain */ });
})();

// ERP tests (0.0.1 framework, 0.0.2 river flow): read the built files and check the framework the owner asked for. Run: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => join(ROOT, 'public', p);
const html = readFileSync(pub('index.html'), 'utf8');
const data = JSON.parse(readFileSync(pub('data/erp.json'), 'utf8'));
const sample = JSON.parse(readFileSync(pub('data/sample.json'), 'utf8'));
const PROC = Object.fromEntries(data.procedures.map((p) => [p.id, p]));

test('page: title, viewport, canonical apex path, slot 57 of 59', () => {
  assert.match(html, /<title>ERP · [^<]+<\/title>/);
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bucklerfamily\.estate\/erp\/">/);
  assert.match(html, /Webapp 57 of 59/);
  assert.match(html, /<h1>ERP<\/h1>/);
});

test('page: local assets exist; no subdomain links; no placeholders', () => {
  for (const m of html.matchAll(/(?:href|src)="((?:assets|data|schema)\/[^"?#]+)/g)) assert.ok(existsSync(pub(m[1])), m[1]);
  assert.doesNotMatch(html, /https?:\/\/[a-z0-9-]+\.bucklerfamily\.estate/);
  assert.doesNotMatch(html, /lorem ipsum|TODO|\{\{|undefined/i);
});

test('house words: banned words, barred digits and the owner name are absent', () => {
  const all = html + JSON.stringify(data) + JSON.stringify(sample);
  for (const w of ['says', 'claims', 'according to', 'hearsay', 'unverified', 'alleged', 'fraud', 'stolen', 'testimony', 'recollection']) {
    assert.doesNotMatch(all, new RegExp('\\b' + w + '\\b', 'i'), w);
  }
  assert.ok(!['47', '52'].some((y) => all.includes('15' + y)));
  assert.doesNotMatch(all, /\bsion\b/i);
});

test('schema shape: 7 laps, red and amber only, no green anywhere', () => {
  assert.equal(data.schema, 'cedwyn-erp/1.0.0');
  assert.deepEqual(data.laps.map((l) => l.id), ['request', 'clarification', 'internal_review', 'complaint', 'regulator', 'representative', 'court']);
  assert.deepEqual(data.lights.map((l) => l.id), ['red', 'amber']);
  const schema = JSON.parse(readFileSync(pub('schema/erp.schema.json'), 'utf8'));
  assert.deepEqual(schema.$defs.light.enum, ['red', 'amber', null]);
  for (const o of [...data.institutions, sample.opportunity]) for (const s of o.stages) assert.ok(s.light === null || s.light === 'red' || s.light === 'amber');
});

test('every institution has a full worst-case pipeline with law, clock and dated forecast', () => {
  assert.equal(data.institutions.length, 56);
  for (const o of data.institutions) {
    assert.ok(o.stages.length >= 2, o.id);
    let prevLap = 0;
    for (const s of o.stages) {
      const p = PROC[s.procedure];
      assert.ok(p, `${o.id} ${s.procedure}`);
      assert.ok(p.law && p.clock && p.worst_case && typeof p.worst_case.n === 'number', `${o.id} ${p.id}`);
      assert.ok(s.forecast.due_worst >= s.forecast.opens, `${o.id} ${s.n}`);
      const lapN = data.laps.find((l) => l.id === p.lap).n;
      assert.ok(lapN >= prevLap, `${o.id} laps in order`); prevLap = lapN;
    }
    assert.equal(o.forecast.close_worst, o.laps.at(-1).closes_worst);
    assert.ok(o.regimes_applicable.length + o.regimes_not_applicable.length > 0, o.id);
  }
});

test('framework state: nothing imported, markers at the start, nothing invented', () => {
  assert.equal(data.data_state.imported, false);
  for (const o of data.institutions) {
    assert.equal(o.marker.status, 'not_imported');
    assert.equal(o.pct_complete, 0);
    assert.equal(o.evidence.known, null);
    assert.equal(o.close_status, 'open');
    for (const s of o.stages) { assert.equal(s.status, 'not_started'); assert.equal(s.light, null); }
  }
  assert.equal(sample.data_state.state, 'sample');
  assert.match(sample.opportunity.name, /Sample/);
});

test('excuse icons: the five the owner named are present with law and source', () => {
  const ids = data.excuses.map((e) => e.id);
  for (const k of ['holiday', 'fee', 'chestnut', 'fire', 'shredded']) assert.ok(ids.includes(k), k);
  for (const e of data.excuses) assert.match(e.src, /^https:\/\//);
  assert.equal(data.excuses.find((e) => e.id === 'holiday').icon, '✈');
  assert.equal(data.excuses.find((e) => e.id === 'fee').icon, '£');
});

test('worst-case arithmetic: FOI 40 working days, SAR 3 months, bank holidays skipped', () => {
  const foi = data.procedures.find((p) => p.key === 'foi');
  assert.deepEqual([foi.worst_case.u, foi.worst_case.n], ['wd', 40]);
  const sar = data.procedures.find((p) => p.key === 'sar');
  assert.deepEqual([sar.worst_case.u, sar.worst_case.n], ['cm', 3]);
  const v = data.institutions.find((o) => o.id === 'vale-of-glamorgan-council');
  const s1 = v.stages.find((s) => PROC[s.procedure].key === 'foi');
  assert.equal(s1.forecast.opens, '2026-11-10');
  assert.equal(s1.forecast.due_worst, '2027-01-12'); // 40 working days, skipping every UK bank holiday (s.10(6)): 30 Nov (Scotland), 25 and 28 Dec 2026, 1 and 4 Jan 2027 (Scotland)
});

test('0.0.2 river flow: flows.json is real, additive and public-safe', () => {
  const raw = readFileSync(pub('data/flows.json'), 'utf8');
  const fl = JSON.parse(raw);
  assert.equal(fl.version, '0.0.2');
  assert.equal(fl.goal, 'Every artifact identified and accounted for');
  assert.equal(data.version, '0.0.2');
  assert.equal(data.changelog[0].version, '0.0.2');
  assert.ok(data.changelog.some((r) => r.version === '0.0.1'), 'the 0.0.1 row stays');
  assert.ok(fl.bodies.length >= 56);
  const ids = new Set(data.institutions.map((o) => o.id));
  for (const b of fl.bodies) {
    if (b.in_pipeline) assert.ok(ids.has(b.id), b.id);
    const n = b.lines.reduce((a, l) => a + l.n, 0);
    assert.equal(n, b.requests, b.id);
    for (const l of b.lines) assert.ok(['foi', 'eir', 'sar', 'other'].includes(l.type));
  }
  const outs = new Set(fl.outcomes.map((o) => o.id));
  for (const b of fl.bodies) for (const l of b.lines) for (const r of l.requests) assert.ok(outs.has(r.outcome), r.outcome);
  assert.ok(fl.counts.accounted > 0 && fl.counts.presents > 0, 'no longer 0%');
  const low = raw.toLowerCase();
  for (const w of ['says', 'claims', 'according to', 'hearsay', 'unverified', 'alleged', 'fraud', 'stolen', 'testimony', 'recollection'])
    assert.doesNotMatch(low, new RegExp('\\b' + w + '\\b'), w);
  assert.ok(!raw.includes('15' + '47') && !raw.includes('15' + '52'));
  assert.doesNotMatch(raw, /\bSion\b/i);
  assert.doesNotMatch(raw, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no email addresses');
});

test('river 0.2.0: sea label and catalogue modal wiring', () => {
  const js = readFileSync(pub('assets/river.js'), 'utf8');
  assert.match(js, /river view 0\.2\.0/);
  assert.match(js, /\/api\/catalogue\//);
  assert.doesNotMatch(js, /found and viewed/);
  assert.match(html, /river\.js\?v=0\.2\.0/);
});

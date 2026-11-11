#!/usr/bin/env python3
"""ERP record links 0.1.0: every request in the river resolves to a catalogue record with a unique ID.

Reads public/data/flows.json and public/data/catalogue-emails.json, plus the public catalogue API
(evidence and missing_record kinds). Writes public/data/records.json:
  rec[<body>|<opened>|<title>] = {"id": "EV-…", "how": "ev"|"subject"|"ref"|"fuzzy"}  the correspondence record
  mr[<body>] = ["MR-…", …]   pencil-sketch placeholders for records asked of that body and not yet held
  items[<id>] = {"t": title, "k": kind, "s": status}   labels for the modal, so no API call is needed
An id the catalogue does not answer is never linked. Nothing in the catalogue is edited.
Run after tools/import_activity.py:  python3 tools/link_records.py  — Cedwyn editors"""
import json, re, sys, datetime as dt, urllib.request, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
API = 'https://bucklerfamily.estate/api/catalogue/'
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'cedwyn-erp'}), timeout=60) as r: return json.load(r)
def kind(k):
    out, off = [], 0
    while True:
        j = get(f'{API}?kind={k}&limit=50&offset={off}'); out += j['items']; off += 50
        if off >= j['total']: return out
def norm(s):
    s = (s or '').lower().strip(); s = re.sub(r'^subject:\s*', '', s)
    while True:
        n = re.sub(r'^\s*(re|fw|fwd|aw|sv)(\[\d+\])?\s*:\s*', '', s)
        if n == s: break
        s = n
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()
def toks(s): return {w for w in norm(s).split() if len(w) > 2}
def days(a, b):
    try: return abs((dt.date.fromisoformat(a[:10]) - dt.date.fromisoformat(b[:10])).days)
    except Exception: return 9999
def key(bid, r): return bid + '|' + (r.get('opened') or '') + '|' + (r.get('title') or '')

def main():
    FL = json.load(open(ROOT / 'public/data/flows.json')); CE = json.load(open(ROOT / 'public/data/catalogue-emails.json'))
    EM = [dict(zip(CE['fields'], r)) for r in CE['emails']]
    ev = kind('evidence'); mrs = kind('missing_record')
    items = {}
    for i in ev + mrs: items[i['id']] = {'t': i['title'], 'k': i['kind'], 's': i.get('status')}
    for m in EM: items.setdefault(m['id'], {'t': m['subject'], 'k': 'email', 's': m['direction']})
    byinst = {}
    for m in EM:
        for n in m['institutions'] or []: byinst.setdefault(n, []).append(m)
    rec, stats = {}, {'ev': 0, 'subject': 0, 'ref': 0, 'fuzzy': 0, 'none': 0, 'ev_missing': []}
    def resolve(b, r):
        if r.get('ev') and r['ev'] in items: return {'id': r['ev'], 'how': 'ev'}
        if r.get('ev'): stats['ev_missing'].append(r['ev'])
        cands, od = byinst.get(b['name'], []), r.get('opened') or ''
        near = lambda xs: sorted(xs, key=lambda m: days(m['datetime'], od))[0]
        ns = norm(r.get('title'))
        x = [m for m in cands if norm(m['subject']) == ns]
        if x: return {'id': near(x)['id'], 'how': 'subject'}
        refs = [t.strip().lower() for t in re.split(r'[;,]', r.get('ref') or '') if len(t.strip()) >= 5]
        x = [m for m in cands if any(t in (m['subject'] or '').lower() for t in refs)]
        if x: return {'id': near(x)['id'], 'how': 'ref'}
        T, best = toks(r.get('title')), None
        nums = set(re.findall(r'\d{5,}', r.get('title') or ''))   # a reference number in the title must match too
        for m in cands:
            U = toks(m['subject'])
            if nums and not nums & set(re.findall(r'\d{5,}', m['subject'] or '')): continue
            if T and U:
                j = len(T & U) / len(T | U)
                if j >= 0.5 and days(m['datetime'], od) <= 45 and (not best or j > best[0]): best = (j, m)
        if best: return {'id': best[1]['id'], 'how': 'fuzzy'}
        nm = b['name'].lower(); best = None   # an evidence record for the same body whose title carries the request's words
        for i in ev:
            if nm not in ((i.get('holder') or '') + ' ' + (i.get('title') or '')).lower(): continue
            U = toks(i['title'])
            if T and U and len(T & U) / len(T) >= 0.8 and (not best or len(T & U) > best[0]): best = (len(T & U), i)
        if best: return {'id': best[1]['id'], 'how': 'fuzzy'}
        return None
    mr = {}
    for b in FL['bodies']:
        for ln in b.get('lines', []):
            rows = list(ln.get('requests', []))
            for br in ln.get('branches', []): rows += br.get('items', [])
            for r in rows:
                x = resolve(b, r)
                if x: rec[key(b['id'], r)] = x; stats[x['how']] += 1
                else: stats['none'] += 1
        nm = b['name']; keys = {nm.lower()} | {p.strip().lower() for p in re.split(r'\s/\s|\(', nm.split(' (')[0]) if len(p.strip()) >= 3}
        def hit(text):
            t = (text or '').lower()
            return any(re.search(r'(?<![a-z])' + re.escape(k) + r'(?![a-z])', t) for k in keys)
        ids = [m['id'] for m in mrs if hit(m.get('holder')) or any(hit(s[1] if isinstance(s, list) and len(s) > 1 else '') for s in (m.get('data') or {}).get('search_record') or [])]
        if ids: mr[b['id']] = ids
    used = {v['id'] for v in rec.values()} | {i for v in mr.values() for i in v}
    for b in FL['bodies']:
        for ln in b.get('lines', []):
            for p in ln.get('presents', []):
                if p.get('catalogue_id'): used.add(p['catalogue_id'])
    out = {'schema': 'cedwyn-erp-records/0.1.0', 'generated': dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
           'record_page': 'https://bucklerfamily.estate/catalogue/?id=',
           'note': 'Each request in the river and its catalogue record (the correspondence), and the pencil-sketch placeholders (MR-…) for records asked of each body and not yet held. Read-only on the catalogue.',
           'counts': {k: (len(v) if isinstance(v, list) else v) for k, v in stats.items()}, 'ev_missing': sorted(set(stats['ev_missing'])),
           'rec': rec, 'mr': mr, 'items': {i: items[i] for i in sorted(used) if i in items}}
    (ROOT / 'public/data/records.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps(out['counts']), 'mr bodies', len(mr), 'items', len(out['items']))
if __name__ == '__main__': main()

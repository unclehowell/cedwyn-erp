#!/usr/bin/env python3
"""Pull email metadata from the central catalogue into the ERP's own data (public/data/catalogue-emails.json).
The catalogue is the single source of truth for emails: each message is a catalogue record (kind email, EM-0001 …).
The ERP keeps metadata only — id, date and time, direction, correspondent, subject line, thread, the request's evidence
record (EV-…), attachment count — and links to the catalogue record page. No email text is copied here.
Order: the catalogue API (kind=email), else the catalogue's own record index (unclehowell/cedwyn,
data/core/records/emails/index.json at CATALOGUE_REF, default main), else the last pull is kept and marked stale.
Run on every build or redeploy: python3 tools/pull_catalogue.py (tools/build.py runs it first).   — Cedwyn editors"""
import json, os, pathlib, urllib.request, datetime as dt, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'catalogue-emails.json'
API = os.environ.get('CATALOGUE_API', 'https://bucklerfamily.estate/api/catalogue')
REF = os.environ.get('CATALOGUE_REF', 'main')
INDEX = 'https://raw.githubusercontent.com/unclehowell/bucklerfamily-estate/' + REF + '/data/core/records/emails/index.json'
PAGE = 'https://bucklerfamily.estate/catalogue' + ('/' if REF == 'main' else '-preview/') + '?id='
SCHEMA = 'cedwyn-erp-catalogue-emails/1.0.0'

def get(u, t=40):
    last = None
    for a in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'cedwyn-erp-build', 'accept': 'application/json'}), timeout=t) as r:
                return json.loads(r.read())
        except Exception as e:
            last = e; time.sleep(1 + 2 * a)
    raise last

def from_api():
    out, off = [], 0
    while True:
        d = get(f'{API}?kind=email&limit=500&offset={off}')
        items = [x for x in (d.get('items') or []) if x.get('kind') == 'email']
        out += items
        if not items or len(out) >= (d.get('total') or 0): break
        off = len(out)
    rows = []
    for x in out:
        e = (x.get('data') or {}).get('email') or {}
        rows.append({'id': x['id'], 'datetime': e.get('datetime') or x.get('date_sort'), 'direction': e.get('direction'),
                     'institutions': [i.get('name') for i in e.get('institutions') or []], 'subject': e.get('subject'),
                     'thread': e.get('thread_id'), 'message_id': e.get('message_id'), 'ev': e.get('ev'), 'attachments': e.get('attachments') or 0,
                     'transcript_public': bool(e.get('transcript_public'))})
    return rows

def from_index():
    ix = get(INDEX, 60); f = ix['fields']
    def col(name):
        for i, n in enumerate(f):
            if n.split('(')[0] == name: return i
        return None
    c = {k: col(k) for k in ('id', 'datetime', 'direction', 'institutions', 'subject', 'thread_id', 'transcript_public', 'attachments', 'message_id', 'ev')}
    def g(r, k): i = c[k]; return r[i] if i is not None and i < len(r) else None
    return [{'id': g(r, 'id'), 'datetime': g(r, 'datetime'), 'direction': {'s': 'sent', 'r': 'received'}.get(g(r, 'direction'), g(r, 'direction')),
             'institutions': g(r, 'institutions') or [], 'subject': g(r, 'subject'), 'thread': g(r, 'thread_id'), 'message_id': g(r, 'message_id'),
             'ev': g(r, 'ev'), 'attachments': g(r, 'attachments') or 0, 'transcript_public': bool(g(r, 'transcript_public'))} for r in ix['records']]

def pull():
    now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'); src = None; err = []
    try:
        rows = from_api(); src = {'from': 'catalogue API', 'url': API + '?kind=email'} if rows else None
    except Exception as e:
        err.append('API: ' + str(e)[:120]); rows = []
    if not rows:
        try:
            rows = from_index(); src = {'from': 'catalogue record index', 'url': INDEX, 'ref': REF}
        except Exception as e:
            err.append('index: ' + str(e)[:120]); rows = []
    if not rows:
        if OUT.exists():
            old = json.loads(OUT.read_text()); old['sync'].update({'stale': True, 'checked': now, 'errors': err}); OUT.write_text(json.dumps(old, ensure_ascii=False, separators=(',', ':')) + '\n')
            print('catalogue pull failed; kept the last pull', err); return old
        print('catalogue pull: no email records yet', err)   # not fatal: the board builds, and says the catalogue has no emails yet
        return None
    rows = [r for r in rows if r.get('id')]
    rows.sort(key=lambda r: (r.get('datetime') or '', r['id']))
    by_ev, by_body = {}, {}
    for r in rows:
        if r.get('ev'): by_ev.setdefault(r['ev'], []).append(r['id'])
        for n in r['institutions'] or ['Unlisted correspondent']:
            b = by_body.setdefault(n, {'emails': 0, 'sent': 0, 'received': 0, 'first': r.get('datetime'), 'last': r.get('datetime')})
            b['emails'] += 1; b['sent' if r.get('direction') == 'sent' else 'received'] += 1; b['last'] = r.get('datetime')
    data = {'schema': SCHEMA, 'note': 'Metadata only, pulled from the central catalogue on build. The catalogue holds each email (EM-…); open a record at record_page + id.',
            'record_page': PAGE, 'sync': dict(src, pulled=now, stale=False, count=len(rows), id_range=[rows[0]['id'], rows[-1]['id']], errors=err),
            'counts': {'emails': len(rows), 'sent': sum(1 for r in rows if r.get('direction') == 'sent'), 'received': sum(1 for r in rows if r.get('direction') == 'received'),
                       'requests_linked': len(by_ev), 'bodies': len(by_body)},
            'by_ev': by_ev, 'by_body': by_body,
            'fields': ['id', 'datetime', 'direction', 'institutions', 'subject', 'thread', 'message_id', 'ev', 'attachments', 'transcript_public'],
            'emails': [[r[k] for k in ('id', 'datetime', 'direction', 'institutions', 'subject', 'thread', 'message_id', 'ev', 'attachments', 'transcript_public')] for r in rows]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({'catalogue_emails': data['sync']}))
    return data

if __name__ == '__main__':
    pull()

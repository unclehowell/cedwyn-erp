#!/usr/bin/env python3
"""ERP stage import (0.1.0): reads public/data/flows.json and (1) gives every body in the river a pipeline
(extra_seed: bodies with no seeded ladder get a copy of a generic ladder for their kind, body-specific links
removed and every rung marked inferred), (2) lights the stage board from the mail (light): each request, review,
complaint and regulator case in the river opens the matching stage with its dates and EV links; a stage whose
cases all have an end answer is concluded with a red or amber light (there is no green); excuses come from the
outcome. Called by tools/build.py. Nothing here reads the mail itself; the river is the record.
- Sion's Tab agent"""
import copy, re
from urllib.parse import urlparse

# kind of body -> seeded ladder used as the template (generic statutory rungs only)
ROUTE_OF = {
 'science-museum-group': 'uk_gov', 'arts-council-england': 'uk_gov', 'companies-house': 'uk_gov',
 'modern-records-centre-university-of-warwick': 'uk_gov', 'health-and-safety-executive': 'uk_gov', 'network-rail': 'uk_gov',
 'british-geological-survey': 'uk_gov', 'cambridge-university-collection-of-aerial-photog': 'uk_gov', 'planning-inspectorate': 'uk_gov',
 'cardiff-council': 'welsh_council', 'mid-and-west-wales-fire-and-rescue-service': 'welsh_public_body',
 'welsh-government-ministerial-correspondence': 'welsh_gov',
 'capital-law': 'law_firm', 'loosemores-successor-to-john-loosemore-co': 'law_firm', 'darwin-gray': 'law_firm',
 'hugh-james-successor-to-john-loosemore-co': 'law_firm', 'harrison-clark-rickerbys-hcr-law': 'law_firm',
}
TEMPLATE = {'uk_gov': 'archaeology-data-service', 'welsh_council': 'vale-of-glamorgan-council', 'welsh_public_body': 'national-library-of-wales',
            'welsh_gov': 'welsh-government-cadw', 'law_firm': 'blake-morgan-llp', 'private': 'bt-archives'}
NOTE = {'national-collection-of-aerial-photography-histor': 'Historic Environment Scotland answers under the Freedom of Information (Scotland) Act 2002; that ladder is not seeded here, so only the records enquiry and subject access rungs are shown.'}
OK_HOSTS = ('legislation.gov.uk', 'ico.org.uk', 'www.gov.uk', 'gov.uk', 'ombudsman.wales', 'ombudsman.org.uk', 'legalombudsman.org.uk', 'gov.wales', 'judiciary.uk')

def _generic(rung, tname):
    r = copy.deepcopy(rung)
    host = urlparse(r.get('src') or '').netloc
    if r.get('src') and not any(host.endswith(h) for h in OK_HOSTS):
        r['src'] = None
    for k in ('label', 'law', 'note', 'us', 'them'):
        if isinstance(r.get(k), str) and tname:
            r[k] = r[k].replace(tname, 'The body').replace('The body: ', '')
    r['inferred'] = True
    return r

def extra_seed(F, flows):
    have = {i['id'] for i in F['institutions']}
    by = {i['id']: i for i in F['institutions']}
    added = []
    for b in flows.get('bodies', []):
        if b['id'] in have:
            continue
        route = ROUTE_OF.get(b['id'], 'private')
        t = by[TEMPLATE[route]]
        tname = t['name'].split(' (')[0].split(' /')[0]
        rungs = [_generic(r, tname) for r in t['rungs']]
        added.append({'id': b['id'], 'name': b['name'], 'route': route, 'regime': t.get('regime'), 'ombudsman': t.get('ombudsman'),
                      'policy': None, 'note': NOTE.get(b['id'], 'Generic ladder for this kind of body (copied from the seeded ' + route.replace('_', ' ') + ' ladder); the body\'s own published procedure is not checked yet.'),
                      'rungs': rungs, 'counts': {'rungs': len(rungs), 'inferred': len(rungs)}, 'added_from_flows': True})
    F['institutions'].extend(added)
    return [a['id'] for a in added]

RED = {'not_held', 'no_reply', 'exempt', 'shredded', 'fire', 'vexatious', 'redirect', 'letter_only', 'cost_limit', 'fee', 'clarification', 'bounced', 'not_subject', 'complaint_closed'}
AMBER = {'late_part', 'disclosed', 'locked'}
OPEN = {'ack_only', 'no_reply', 'not_checked'}
EXCUSE_OF = {'not_held': 'not_held', 'redirect': 'redirect', 'clarification': 'clarification', 'shredded': 'shredded', 'fire': 'fire',
             'vexatious': 'vexatious', 'fee': 'fee', 'cost_limit': 'cost_limit', 'not_subject': 'not_subject', 'late_part': 'late_part',
             'no_reply': 'no_reply', 'exempt': 'privacy', 'letter_only': 'chestnut'}
REQ_KEYS = {'foi': ['foi', 'eir', 'enquiry', 'letter', 'platform', 'cpr', 'gro', 'coroner', 'scrutiny'], 'eir': ['eir', 'foi', 'enquiry', 'letter'],
            'sar': ['sar', 'cpr', 'enquiry', 'foi'], 'other': ['enquiry', 'letter', 'platform', 'scrutiny', 'cpr', 'gro', 'coroner', 'foi', 'eir', 'sar']}
IR_KEYS = {'foi': ['foi_ir', 'eir_ir', 'reconsider'], 'eir': ['eir_ir', 'foi_ir', 'reconsider'], 'sar': ['sar_cmp'], 'other': ['foi_ir', 'eir_ir', 'sar_cmp', 'reconsider']}
CMP_KEYS = ['cmp1', 'cmp_policy', 'pcmp', 'ptr', 'scrutiny', 'cmp2', 'cmp3', 'sar_cmp']
def REG_KEYS(title, typ):
    t = (title or '').lower()
    if 'ombudsman' in t or 'psow' in t: return ['psow', 'psow_rev', 'phso', 'phso_rev', 'leo', 'ico']
    if 'icr' in t or 'independent complaints' in t: return ['icr', 'icr_svc']
    if 'iopc' in t: return ['iopc']
    if typ == 'sar' or 'data protection' in t: return ['ico_dp', 'ico', 'ico_case']
    return ['ico', 'ico_case', 'ico_dp', 'ico_svc', 'psow', 'phso', 'icr', 'iopc', 'leo', 'ccw', 'std', 'adj']

def light(data, flows):
    procs = {p['id']: p for p in data['procedures']}
    fb = {b['id']: b for b in flows.get('bodies', [])}
    lit = 0; opened = 0; concluded = 0
    for o in data['institutions']:
        b = fb.get(o['id'])
        if not b:
            continue
        st = o['stages']
        def key(s): return procs[s['procedure']]['key']
        def find(keys, lap=None):
            for k in keys:
                for s in st:
                    if key(s) == k: return s
            if lap:
                for s in st:
                    if procs[s['procedure']]['lap'] == lap: return s
            return None
        cases = {}
        def put(s, item):
            if s is not None: cases.setdefault(s['n'], (s, []))[1].append(item)
        for l in b['lines']:
            typ = l['type']
            for r in l['requests']:
                s = find(REQ_KEYS.get(typ, REQ_KEYS['other']), 'request'); put(s, r)
                if r.get('outcome') == 'clarification':
                    put(find(['clar_' + key(s)] if s else [], 'clarification'), r)
                if re.search(r'pre-action|letter before claim|letter before action', r.get('title') or '', re.I):
                    put(find(['pap'], 'court'), r)
            for br in l['branches']:
                for it in br['items']:
                    if br['type'] == 'internal_review': s = find(IR_KEYS.get(typ, IR_KEYS['other']), 'internal_review')
                    elif br['type'] == 'complaint': s = find(CMP_KEYS, 'complaint')
                    elif br['type'] == 'regulator': s = find(REG_KEYS(it.get('title'), typ), 'regulator')
                    else: s = None
                    put(s, it)
        for n, (s, items) in cases.items():
            dates = sorted(x.get('opened') or x.get('last') for x in items if x.get('opened') or x.get('last'))
            if dates: s['forecast']['actual_opened'] = dates[0]
            outs = [x.get('outcome') for x in items]
            if all(x not in OPEN for x in outs):
                s['status'] = 'concluded'; concluded += 1
                s['light'] = 'amber' if all(x in AMBER for x in outs) else 'red'
                last = sorted(x.get('last') or x.get('opened') or '' for x in items)[-1]
                if last: s['forecast']['actual_closed'] = last
            else:
                s['status'] = 'open'; s['light'] = None; opened += 1
            ev = []
            for x in items:
                if x.get('ev') and x['ev'] not in ev: ev.append(x['ev'])
                for p in x.get('presents') or []:
                    pid = p.get('ev') or p.get('id') if isinstance(p, dict) else p
                    if pid and pid not in ev: ev.append(pid)
            s['evidence_ids'] = ev
            ex = {}
            for x in items:
                e = EXCUSE_OF.get(x.get('outcome'))
                if not e: continue
                dte = x.get('last') or x.get('opened') or ''
                z = ex.get(e)
                if z is None or dte > z['date']:
                    n = (z or {}).get('n', 0)
                    z = {'excuse': e, 'date': dte}
                    if x.get('ev') or x.get('ref'): z['ref'] = x.get('ev') or x.get('ref')
                    if x.get('ev'): z['link'] = 'https://bucklerfamily.estate/catalogue/?id=' + x['ev']
                    z['n'] = n
                    ex[e] = z
                ex[e]['n'] = ex[e].get('n', 0) + 1
            ex = list(ex.values())
            s['excuses'] = ex
            lit += 1
        c = sum(1 for s in st if s['status'] == 'concluded')
        o['pct_complete'] = round(100 * c / len(st), 1) if st else 0
        op = [s for s in st if s['status'] == 'open']
        if op:
            m = max(op, key=lambda s: s['n'])   # the open stage furthest along the route
            o['marker'] = {'stage_n': m['n'], 'status': 'open', 'label': 'At stage ' + str(m['n']) + ': ' + procs[m['procedure']]['label'] + ' (open since ' + m['forecast'].get('actual_opened', '') + ')'}
        elif c:
            m = sorted([s for s in st if s['status'] == 'concluded'], key=lambda s: s['forecast'].get('actual_closed', ''))[-1]
            o['marker'] = {'stage_n': m['n'], 'status': 'concluded', 'label': 'Last concluded: stage ' + str(m['n']) + ' ' + procs[m['procedure']]['label'] + ' (' + m['forecast'].get('actual_closed', '') + '); next stage not started'}
        else:
            o['marker'] = {'stage_n': 0, 'status': 'not_started', 'label': 'No correspondence on record yet'}
    return {'stages_lit': lit, 'stages_open': opened, 'stages_concluded': concluded}

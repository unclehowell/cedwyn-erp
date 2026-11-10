#!/usr/bin/env python3
"""ERP (webapp 57 of 59) data build: seed/*.json -> public/data/erp.json, checked against schema/erp.schema.json.
Framework first: every institution gets its worst-case pipeline (laps, stages, law, clock, forecast); no outcome is
imported yet, so every marker sits at the start and no stage carries a light. Run: python3 tools/build.py
- Sion's Tab agent"""
import json, re, datetime as dt, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SEED = ROOT / 'seed'
OUT = ROOT / 'public' / 'data' / 'erp.json'
VERSION = '0.0.2'
SCHEMA_VERSION = '1.0.0'
RIVER_VERSION = '0.2.0'  # assets/river.js + river.css: burger drawer and river flow (one line per enquiry type, splits, outcome icons, presents); reads data/flows.json
ANCHOR = '2026-11-10'   # forecast scenario start (the page lets a reader move it)

F = json.load(open(SEED / 'forecast-institutions.json'))
BH = json.load(open(SEED / 'bank-holidays.json'))
TOC = json.load(open(SEED / 'chestnuts-public.json'))['records']
HOL = set(BH['dates'])
HOL_LAST = max(HOL)

LAPS = [
 {'id': 'request', 'n': 1, 'label': 'Request', 'about': 'FOI, EIR, subject access or the body\'s own enquiry route.'},
 {'id': 'clarification', 'n': 2, 'label': 'Clarification', 'about': 'The body asks what we mean; the clock restarts when we answer.'},
 {'id': 'internal_review', 'n': 3, 'label': 'Internal review', 'about': 'FOI internal review, EIR reconsideration or the data-protection complaint to the body.'},
 {'id': 'complaint', 'n': 4, 'label': 'Complaint', 'about': 'The body\'s own complaints procedure, stage by stage.'},
 {'id': 'regulator', 'n': 5, 'label': 'Regulator / ombudsman', 'about': 'ICO, PSOW, IOPC, ICR, Legal Ombudsman and the other bodies that can rule on it.'},
 {'id': 'representative', 'n': 6, 'label': 'MP / Senedd', 'about': 'An elected member, and the ombudsman that only an MP can refer to.'},
 {'id': 'court', 'n': 7, 'label': 'Pre-action / tribunal / court', 'about': 'Tribunal appeal, compliance order, pre-action letter, judicial review.'},
]
LAP_OF = {
 'foi': 'request', 'eir': 'request', 'sar': 'request', 'enquiry': 'request', 'cpr': 'request', 'coroner': 'request', 'gro': 'request', 'platform': 'request',
 'foi_ir': 'internal_review', 'eir_ir': 'internal_review', 'sar_cmp': 'internal_review',
 'cmp1': 'complaint', 'cmp2': 'complaint', 'cmp3': 'complaint', 'pcmp': 'complaint', 'ptr': 'complaint', 'scrutiny': 'complaint',
 'ico': 'regulator', 'ico_case': 'regulator', 'ico_dp': 'regulator', 'ico_svc': 'regulator', 'psow': 'regulator', 'psow_rev': 'regulator', 'psow_coc': 'regulator',
 'iopc': 'regulator', 'icr': 'regulator', 'icr_svc': 'regulator', 'ccw': 'regulator', 'watrs': 'regulator', 'ofwat': 'regulator', 'leo': 'regulator', 'olc_svc': 'regulator',
 'iac': 'regulator', 'adj': 'regulator', 'std': 'regulator',
 'mp': 'representative', 'letter': 'representative', 'phso': 'representative', 'phso_rev': 'representative',
 'ftt': 'court', 'ut': 'court', 's167': 'court', 'pap': 'court', 'jr': 'court', 'rectify': 'court', 'ftt_land': 'court', 'bv_claim': 'court',
}
# stages that must follow one another inside a lap (same chain); everything else in a lap runs side by side
CHAIN = {'cmp1': 'corp', 'cmp2': 'corp', 'cmp3': 'corp', 'ico': 'ico', 'ico_case': 'ico', 'ico_svc': 'ico', 'psow': 'psow', 'psow_rev': 'psow',
         'icr': 'icr', 'icr_svc': 'icr', 'ccw': 'water', 'watrs': 'water', 'ofwat': 'water', 'leo': 'leo', 'olc_svc': 'leo',
         'mp': 'mp', 'phso': 'mp', 'phso_rev': 'mp', 'ftt': 'trib', 'ut': 'trib', 'pap': 'jr', 'jr': 'jr', 'rectify': 'land', 'ftt_land': 'land',
         'pcmp': 'police', 'iopc': 'police'}
CHAIN_ORDER = ['cmp1', 'cmp2', 'cmp3', 'ico', 'ico_case', 'ico_svc', 'psow', 'psow_rev', 'icr', 'icr_svc', 'ccw', 'watrs', 'ofwat', 'leo', 'olc_svc',
               'mp', 'phso', 'phso_rev', 'ftt', 'ut', 'pap', 'jr', 'rectify', 'ftt_land']

DISPLAY = {'serious-fraud-office': ('sfo', 'SFO')}   # (seed already uses 'sfo')   # the house word list bars the middle word of its full name

# ---------- law registry ----------
LAWS = {}
def law_id(src, text):
    s = re.sub(r'^https?://(www\.)?', '', src or 'no-source')
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:80]
def add_law(src, title, inferred=False):
    if not src:
        return None
    i = law_id(src, title)
    if i not in LAWS:
        LAWS[i] = {'id': i, 'title': title, 'src': src, 'inferred': bool(inferred), 'used_by': 0}
    LAWS[i]['used_by'] += 1
    return i

L_FOI1 = 'https://www.legislation.gov.uk/ukpga/2000/36/section/1'
L_EIR9 = 'https://www.legislation.gov.uk/uksi/2004/3391/regulation/9'
L_GDPR12 = 'https://www.legislation.gov.uk/eur/2016/679/article/12'
L_CODE = 'https://www.gov.uk/government/publications/freedom-of-information-code-of-practice'
L_ICO_COMPLAIN = 'https://ico.org.uk/make-a-complaint/'

EXCUSES = [
 {'id': 'holiday', 'icon': '✈', 'label': 'Away on holiday / staff absent', 'law': 'FOIA 2000 s.10(6): only weekends and UK bank holidays stop the 20 working days; leave does not', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/10', 'counter': 'Note the due date; at the lawful maximum, escalate.', 'match': []},
 {'id': 'fee', 'icon': '£', 'label': 'Paywall / fee demanded', 'law': 'FOIA s.9 fees notice and s.13; EIR reg 8 (reasonable charge); UK GDPR Art 12(5): a SAR is free unless manifestly unfounded or excessive', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/9', 'counter': 'Ask for the fee basis in writing; the clock pauses only for a valid fees notice.', 'match': []},
 {'id': 'chestnut', 'icon': '🌰', 'label': 'That old chestnut (stock excuse)', 'law': 'Any stock form of words offered instead of a search; each one is catalogued at /that-old-chestnut/', 'src': 'https://bucklerfamily.estate/that-old-chestnut/', 'counter': 'Quote the words back and ask for the search made.', 'match': ['remit', 'not responsible', 'outside the scope', 'unable to review', 'closing down']},
 {'id': 'fire', 'icon': '🔥', 'label': 'Fire, flood or other loss', 'law': 'Code of Practice on the management of records (FOIA s.46): records kept, disposed of and logged', 'src': 'https://www.gov.uk/government/publications/code-of-practice-on-the-management-of-records-issued-under-section-46-the-freedom-of-information-act-2000', 'counter': 'Ask for the incident record and the disposal or loss log.', 'match': []},
 {'id': 'shredded', 'icon': 'shredder', 'label': 'Records destroyed or presumed destroyed', 'law': 'FOIA s.77 and EIR reg 19: destroying or concealing records after a request is an offence; s.46 Code: disposal must be logged', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/77', 'counter': 'Ask for the destruction schedule entry, its date and authority.', 'match': ['not retained', 'no surviving records', 'no record of destruction']},
 {'id': 'not_held', 'icon': '∅', 'label': 'Not held', 'law': 'FOIA s.1(1)(a); EIR reg 12(4)(a): the body must say whether it holds the information, after an adequate search', 'src': L_FOI1, 'counter': 'Ask where and how it searched (ICO: the search must be reasonable).', 'match': ['not held', 'do not hold', 'does not hold', 'does not record']},
 {'id': 'cost_limit', 'icon': '🧮', 'label': 'Cost limit / too much work', 'law': 'FOIA s.12 appropriate limit (£600 central government, £450 others, Fees Regulations 2004); EIR reg 12(4)(b) burden limb', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/12', 'counter': 'Ask for the estimate and for advice to narrow (s.16).', 'match': ['appropriate limit', 'onerous']},
 {'id': 'vexatious', 'icon': '🛑', 'label': 'Vexatious or repeated', 'law': 'FOIA s.14(1) vexatious, s.14(2) repeated; EIR reg 12(4)(b) manifestly unreasonable', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/14', 'counter': 'Internal review, then ICO: the burden is on the body to show it.', 'match': ['repeated request', 'vexatious']},
 {'id': 'public_elsewhere', 'icon': '🔗', 'label': 'Publicly available elsewhere', 'law': 'FOIA s.21; EIR reg 6(1)(b): only for information the body itself holds and that is reasonably accessible', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/21', 'counter': 'Ask for the exact location of the item said to be available.', 'match': ['publicly available', 'freely available', 'reasonably accessible', 'register open to public']},
 {'id': 'scope', 'icon': '✂', 'label': 'Scope narrowed / request re-read', 'law': 'FOIA s.16 duty to advise; s.45 Code of Practice: requests read objectively', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/16', 'counter': 'Restate the request in full with every name the place is known by.', 'match': ['scope narrowing']},
 {'id': 'clarification', 'icon': '❓', 'label': 'Clarification demanded (clock reset)', 'law': 'FOIA s.1(3); EIR reg 9(2)-(4): the clock runs again from our answer', 'src': L_FOI1, 'counter': 'Answer the same day; log the restart date.', 'match': ['clarification demand']},
 {'id': 'redirect', 'icon': '↪', 'label': 'Sent elsewhere (not our remit)', 'law': 'EIR reg 10 transfer; FOIA s.45 Code of Practice: advise or transfer, do not just signpost', 'src': 'https://www.legislation.gov.uk/uksi/2004/3391/regulation/10', 'counter': 'Ask whether it holds anything at all, then open the named body\'s pipeline.', 'match': ['redirection', 'signposting']},
 {'id': 'not_subject', 'icon': '🏢', 'label': 'Not subject to FOI', 'law': 'FOIA s.3 and Sch 1; EIR reg 2(2)(c)-(d): bodies with public administrative functions are covered by the EIR', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/3', 'counter': 'Use the EIR test, a SAR or the body\'s own policy instead.', 'match': ['not subject to foi']},
 {'id': 'privacy', 'icon': '🔒', 'label': 'Withheld as personal data ("GDPR")', 'law': 'FOIA s.40(2); EIR reg 13; DPA 2018 s.3(2): personal data means data about a living person', 'src': 'https://www.legislation.gov.uk/ukpga/2018/12/section/3', 'counter': 'Ask which living person; records of the dead are not personal data.', 'match': ['gdpr']},
 {'id': 'lost_in_post', 'icon': '📭', 'label': 'Lost in post / mailbox not watched', 'law': 'FOIA s.8: a request by email is a valid written request; the clock runs from receipt', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/8', 'counter': 'Keep the delivery record; resend to a second published address.', 'match': ['mailbox no longer', 'technical obstruction']},
 {'id': 'workload', 'icon': '⏳', 'label': 'Volume of work (delay)', 'law': 'FOIA s.10(1) / EIR reg 5(2): 20 working days whatever the workload', 'src': 'https://www.legislation.gov.uk/uksi/2004/3391/regulation/5', 'counter': 'Note the due date; at the lawful maximum, escalate.', 'match': ['volume of enquiries']},
 {'id': 'no_reply', 'icon': '🏠', 'label': 'No reply by the due date (the dartboard\'s red house)', 'law': 'FOIA s.10(1); UK GDPR Art 12(3): the time limit is the limit', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/10', 'counter': 'Escalate the day after the lawful maximum.', 'match': []},
 {'id': 'late_part', 'icon': '🐟', 'label': 'Late or part answer (the dartboard\'s red fish)', 'law': 'FOIA s.1(1), s.10(1), s.17 refusal notice for anything withheld', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/section/17', 'counter': 'Ask for the refusal notice for the part not answered.', 'match': []},
]
for e in EXCUSES:
    e['law_id'] = add_law(e['src'], e['law'].split(':')[0], False) if 'legislation.gov.uk' in e['src'] or 'gov.uk' in e['src'] else None

# chestnut catalogue records -> excuse ids and institutions
INST_ALIAS = {'Amgueddfa Cymru – Museum Wales': 'amgueddfa-cymru-museum-wales', 'Historic England': 'historic-england', 'Vale of Glamorgan Council': 'vale-of-glamorgan-council',
 'Heneb (Historic Environment Record)': 'heneb-formerly-ggat-historic-environment-record', 'Heneb (HER)': 'heneb-formerly-ggat-historic-environment-record',
 'Welsh Government / Cadw': 'welsh-government-cadw', 'The National Archives': 'the-national-archives', 'RCAHMW (Royal Commission)': 'rcahmw-royal-commission',
 'Glamorgan Archives': 'glamorgan-archives', 'HM Land Registry': 'hm-land-registry', 'Ministry of Justice / HMCTS': 'ministry-of-justice-hmcts',
 'PACAC (House of Commons committee)': 'public-administration-and-constitutional-affairs', 'Llandough Community Council': 'llandough-community-council'}
SEEN = {}
for r in TOC:
    kinds = []
    for t in r['terms']:
        low = t['term'].lower()
        for e in EXCUSES:
            if any(m in low for m in e['match']) and e['id'] not in kinds:
                kinds.append(e['id'])
    if not kinds:
        kinds = ['chestnut']
    iid = INST_ALIAS.get(r['institution'])
    if not iid:
        continue
    SEEN.setdefault(iid, []).append({'toc': r['id'], 'excuses': kinds, 'date': r['negative_date'], 'later_found': r.get('positive_date'),
        'class': r.get('class'), 'evidence_ids': r.get('evidence_ids') or [],
        'link': 'https://bucklerfamily.estate/that-old-chestnut/#' + r['id']})

# ---------- dates ----------
def d(s): return dt.date.fromisoformat(s)
def add_wd(x, n):
    k = 0
    while k < n:
        x += dt.timedelta(days=1)
        if x.weekday() < 5 and x.isoformat() not in HOL:
            k += 1
    return x
def add_cm(x, n):
    m = x.month - 1 + n; y = x.year + m // 12; m = m % 12 + 1
    import calendar
    return dt.date(y, m, min(x.day, calendar.monthrange(y, m)[1]))
def add(x, u, n):
    if u == 'wd': return add_wd(x, n)
    if u == 'cm': return add_cm(x, n)
    if u == 'cd': return x + dt.timedelta(days=n)
    return x

def worst(r):
    """Worst-case lawful duration of a stage: its clock plus the longest extension the law or policy allows."""
    u, n = r['clock']['u'], r['clock']['n']; ext = r.get('ext') or ''
    k = r['key']
    if k == 'foi': return {'u': 'wd', 'n': 40, 'basis': 'FOIA s.10(1) 20 working days + s.10(3) public-interest extension (s.45 Code: 20 more)'}
    if k == 'eir': return {'u': 'wd', 'n': 40, 'basis': 'EIR reg 5(2) 20 working days, reg 7 extended to 40 (complex and voluminous)'}
    if k == 'foi_ir': return {'u': 'wd', 'n': 40, 'basis': 's.45 Code of Practice: 20 working days, 40 at most'}
    if k == 'sar': return {'u': 'cm', 'n': 3, 'basis': 'UK GDPR Art 12(3): one month + two months if complex'}
    if k == 'sar_cmp': return {'u': 'cd', 'n': 30, 'basis': 'DPA 2018 s.164A: acknowledge within 30 days (no outcome deadline; forecast assumes the acknowledgement is all that comes)', 'inferred': True}
    return {'u': u, 'n': n, 'basis': (r.get('law') or '').split(';')[0], 'inferred': bool(r.get('inferred'))}

def clar_stage(req):
    k = req['key']
    if k == 'foi':
        return {'key': 'clar_foi', 'label': 'Clarification (FOI)', 'track': 'info', 'law': 'FOIA 2000 s.1(3): the body need not comply until it has the detail it reasonably asks for; the 20 working days run again from our answer', 'src': L_FOI1, 'clock': {'u': 'wd', 'n': 20}, 'inferred': True}
    if k == 'eir':
        return {'key': 'clar_eir', 'label': 'Clarification (EIR)', 'track': 'info', 'law': 'EIR 2004 reg 9(2)-(4): ask within 20 working days; the reg 5(2) clock runs again from our answer', 'src': L_EIR9, 'clock': {'u': 'wd', 'n': 20}, 'inferred': True}
    if k == 'sar':
        return {'key': 'clar_sar', 'label': 'Clarification (subject access)', 'track': 'sar', 'law': 'UK GDPR Art 12(3) and ICO guidance: a controller may ask the requester to clarify; the month runs from the answer', 'src': L_GDPR12, 'clock': {'u': 'cm', 'n': 1}, 'inferred': True}
    return {'key': 'clar_' + k, 'label': 'Clarification (no statutory clock)', 'track': req['track'], 'law': 'No statute: the body\'s own service standard; forecast assumes the full service period again', 'src': req.get('src'), 'clock': dict(req['clock']), 'inferred': True}

WELSH = {'welsh_council', 'welsh_public_body', 'welsh_gov', 'community_council'}
def synth(lap, i):
    """A stage the seeded ladder lacks; marked synthetic + inferred so it reads as our framework, not a published rule."""
    pol = i.get('policy') if i.get('policy') and 'fraud' not in i.get('policy', '') else None
    if lap == 'internal_review':
        return {'key': 'reconsider', 'label': 'Ask the body to reconsider (no statutory review)', 'track': 'complaint', 'law': 'No statutory internal review on this route: a written request to reconsider under the body\'s own policy', 'src': pol, 'clock': {'u': 'wd', 'n': 20}, 'inferred': True, 'synthetic': True}
    if lap == 'complaint':
        return {'key': 'cmp_policy', 'label': 'Complaint under the body\'s own policy', 'track': 'complaint', 'law': 'The body\'s published complaints policy (times assumed where none is published)', 'src': pol, 'clock': {'u': 'wd', 'n': 20}, 'inferred': True, 'synthetic': True}
    if lap == 'representative':
        if i['route'] in WELSH:
            return {'key': 'ms', 'label': 'Member of the Senedd enquiry', 'track': 'complaint', 'law': 'No statutory clock: a Member of the Senedd may write to a devolved body on a constituent\'s behalf', 'src': 'https://senedd.wales/find-a-member-of-the-senedd/', 'clock': {'u': 'wd', 'n': 20}, 'inferred': True, 'synthetic': True}
        return {'key': 'mp_letter', 'label': 'MP enquiry', 'track': 'complaint', 'law': 'No statutory clock: an MP may write to the body on a constituent\'s behalf', 'src': 'https://members.parliament.uk/FindYourMP', 'clock': {'u': 'wd', 'n': 20}, 'inferred': True, 'synthetic': True}
    return None

def scrub(r):
    """House word list: the SFO is named by its initials; a source URL carrying the barred word is not linked."""
    for k in ('label', 'law', 'us', 'them', 'note', 'ext'):
        if isinstance(r.get(k), str):
            r[k] = r[k].replace('Serious Fraud Office', 'SFO')
    if r.get('src') and 'fraud' in r['src'].lower():
        r['src'] = None
    return r

def regimes(i, keys):
    route = i['route']; app = []; na = []
    if 'foi' in keys: app.append({'id': 'FOIA', 'label': 'Freedom of Information Act 2000', 'src': 'https://www.legislation.gov.uk/ukpga/2000/36/contents'})
    if 'eir' in keys: app.append({'id': 'EIR', 'label': 'Environmental Information Regulations 2004', 'src': 'https://www.legislation.gov.uk/uksi/2004/3391/contents'})
    if 'sar' in keys: app.append({'id': 'UKGDPR', 'label': 'UK GDPR Art 15 / DPA 2018 (subject access)', 'src': 'https://www.legislation.gov.uk/eur/2016/679/article/15'})
    if keys & {'cmp1', 'cmp2', 'cmp3', 'pcmp', 'ptr'}: app.append({'id': 'POLICY', 'label': 'The body\'s own complaints procedure', 'src': i.get('policy') if 'fraud' not in (i.get('policy') or '') else None})
    if keys & {'psow', 'psow_coc'}: app.append({'id': 'PSOW', 'label': 'Public Services Ombudsman (Wales) Act 2019', 'src': 'https://www.legislation.gov.uk/asc/2019/3/contents'})
    if keys & {'phso'}: app.append({'id': 'PHSO', 'label': 'Parliamentary Commissioner Act 1967 (via an MP)', 'src': 'https://www.legislation.gov.uk/ukpga/1967/13/contents'})
    if keys & {'ico', 'ico_dp', 'ico_case'}: app.append({'id': 'ICO', 'label': 'Information Commissioner (FOIA s.50 / UK GDPR Art 77)', 'src': L_ICO_COMPLAIN})
    if keys & {'iopc'}: app.append({'id': 'IOPC', 'label': 'Police Reform Act 2002 Sch 3 (review)', 'src': 'https://www.legislation.gov.uk/ukpga/2002/30/schedule/3'})
    if 'foi' not in keys and 'eir' not in keys:
        if route in ('private', 'law_firm', 'water'):
            na.append({'id': 'FOIA', 'why': 'Not a public authority listed in FOIA Sch 1 (our reading); EIR only if it carries out public administrative functions (reg 2(2)(c)-(d)).'})
        elif route == 'representative':
            na.append({'id': 'FOIA', 'why': 'A member\'s own correspondence is not held by a public authority (our reading); the House authorities are covered.'})
        else:
            na.append({'id': 'FOIA', 'why': 'Not on this ladder; check whether the body is listed in FOIA Sch 1.'})
    if route == 'court_records':
        na.append({'id': 'FOIA', 'why': 'FOIA s.32 exempts court records; copies come through CPR 5.4C with the court\'s permission.'})
    if 'sar' in keys:
        na.append({'id': 'UKGDPR', 'why': 'A SAR reaches only personal data about a living person (DPA 2018 s.3(2)); records about the farm or about family members who have died fall outside it and need FOI/EIR or the body\'s own policy.'})
    else:
        na.append({'id': 'UKGDPR', 'why': 'No subject access stage on this ladder: add one if the body may hold personal data about the requester.'})
    return app, na

def build():
    insts = []; stages_total = 0
    for i in F['institutions']:
        iid, name = DISPLAY.get(i['id'], (i['id'], i['name']))
        rungs = [scrub(dict(r)) for r in i['rungs']]
        keys = {r['key'] for r in rungs}
        st = []
        for r in rungs:
            r['lap'] = LAP_OF.get(r['key'], 'complaint')
            st.append(r)
        # clarification stages, one per request
        for r in [x for x in st if x['lap'] == 'request']:
            c = clar_stage(r); c['lap'] = 'clarification'; c['after'] = r['key']; st.append(c)
        # fill empty laps (except regulator/court, which we never invent)
        laps_present = {x['lap'] for x in st}
        for lap in ('internal_review', 'complaint', 'representative'):
            if lap not in laps_present and i['route'] not in ('representative',):
                s = synth(lap, i)
                if s: s['lap'] = lap; st.append(s)
        # order: lap, then chain order, then seeded n
        def okey(x):
            lapn = next(l['n'] for l in LAPS if l['id'] == x['lap'])
            co = CHAIN_ORDER.index(x['key']) if x['key'] in CHAIN_ORDER else 99
            return (lapn, co, x.get('n', 50))
        st.sort(key=okey)
        # worst-case forecast from the anchor: laps in sequence; inside a lap, a chain runs in order, the rest side by side
        t0 = d(ANCHOR); lap_start = t0; out = []; lapsum = []
        for lap in LAPS:
            ls = [x for x in st if x['lap'] == lap['id']]
            if not ls:
                continue
            chain_end = {}; lap_end = lap_start
            for x in ls:
                w = worst(x) if x['key'] in {r['key'] for r in rungs} else {'u': x['clock']['u'], 'n': x['clock']['n'], 'basis': x['law'].split(':')[0], 'inferred': True}
                ch = CHAIN.get(x['key'])
                if lap['id'] == 'clarification':
                    ch = None   # each clarification follows its own request; side by side with the others
                opens = chain_end.get(ch, lap_start) if ch else lap_start
                due = add(opens, w['u'], w['n'])
                if ch: chain_end[ch] = due
                lap_end = max(lap_end, due)
                law_ids = [add_law(x.get('src'), (x.get('law') or '').split(':')[0], x.get('inferred'))] if x.get('src') else []
                out.append({
                    'n': len(out) + 1, 'key': x['key'], 'lap': lap['id'], 'chain': ch, 'label': x['label'], 'track': x['track'],
                    'law': x.get('law'), 'law_ids': [l for l in law_ids if l], 'src': x.get('src'),
                    'clock': x['clock'], 'ext': x.get('ext'), 'worst_case': w,
                    'us': x.get('us'), 'them': x.get('them'),
                    'inferred': bool(x.get('inferred')), 'synthetic': bool(x.get('synthetic')),
                    'forecast': {'opens': opens.isoformat(), 'due_worst': due.isoformat()},
                    'status': 'not_started', 'light': None, 'excuses': [], 'evidence_ids': [],
                })
            lapsum.append({'lap': lap['id'], 'opens': lap_start.isoformat(), 'closes_worst': lap_end.isoformat(), 'stages': len(ls)})
            lap_start = lap_end
        stages_total += len(out)
        app, na = regimes(i, keys)
        insts.append({
            'id': iid, 'name': name, 'route': i['route'], 'regime': i.get('regime'), 'ombudsman': i.get('ombudsman'),
            'policy': i.get('policy') if 'fraud' not in (i.get('policy') or '') else None,
            'note': i.get('note'), 'regimes_applicable': app, 'regimes_not_applicable': na,
            'laps': lapsum, 'stages': out,
            'forecast': {'anchor': ANCHOR, 'close_worst': lap_start.isoformat(), 'days_worst': (lap_start - t0).days},
            'marker': {'stage_n': 0, 'status': 'not_imported', 'label': 'Not yet imported'},
            'pct_complete': 0,
            'evidence': {'known': None, 'identified': None, 'located': None, 'viewed': None, 'state': 'not_imported'},
            'close_status': 'open',
            'excuses_seen': SEEN.get(i['id'], []),
        })
    # normalise: one procedure per distinct stage definition (the policy and law dataset); pipelines reference it
    import hashlib
    PF = ['key', 'lap', 'chain', 'label', 'track', 'law', 'law_ids', 'src', 'clock', 'ext', 'worst_case', 'us', 'them', 'inferred', 'synthetic']
    procs = {}; variants = {}
    for x in insts:
        for s in x['stages']:
            body = {k: s[k] for k in PF}
            sig = json.dumps(body, sort_keys=True, ensure_ascii=False)
            if sig not in procs:
                variants.setdefault(s['key'], []).append(sig)
                procs[sig] = body
    pid = {}
    for k, sigs in variants.items():
        for sig in sigs:
            pid[sig] = k if len(sigs) == 1 else k + '-' + hashlib.sha1(sig.encode()).hexdigest()[:6]
    used_n = {}
    for x in insts:
        new = []
        for s in x['stages']:
            sig = json.dumps({k: s[k] for k in PF}, sort_keys=True, ensure_ascii=False)
            used_n[pid[sig]] = used_n.get(pid[sig], 0) + 1
            new.append({'n': s['n'], 'procedure': pid[sig], 'forecast': s['forecast'], 'status': s['status'], 'light': s['light'], 'excuses': s['excuses'], 'evidence_ids': s['evidence_ids']})
        x['stages'] = new
    procedures = []
    for sig, body in procs.items():
        p_ = {'id': pid[sig]}; p_.update(body); p_['used_by'] = used_n[pid[sig]]
        procedures.append(p_)
    procedures.sort(key=lambda p_: ([l['n'] for l in LAPS if l['id'] == p_['lap']][0], p_['id']))
    used = {l for p_ in procedures for l in p_['law_ids']} | {e['law_id'] for e in EXCUSES if e.get('law_id')}
    laws = sorted([v for k, v in LAWS.items() if k in used], key=lambda v: v['title'].lower())
    for e in EXCUSES: e.pop('match', None)
    data = {
        'schema': 'cedwyn-erp/' + SCHEMA_VERSION, 'version': VERSION, 'generated': dt.date.today().isoformat(), 'by': 'Cedwyn editors',
        'about': 'One opportunity per institution. Closed won = every artifact identified and accounted for: every known artifact and evidence item for that body identified, located and viewed in the catalogue. Each pipeline is the worst case: the body denies, admits nothing and takes the longest lawful time at every stage.',
        'data_state': {'state': 'framework', 'imported': False, 'flows_imported': True, 'flows': 'data/flows.json', 'note': 'The river flow (data/flows.json, 0.0.2) carries the correspondence of the last 18 months per institution: requests, internal reviews, complaints, regulator cases, outcomes and the artifacts received. The stage pipelines below are still the worst-case framework: markers sit at the start and no stage carries a light until stage-level import.'},
        'forecast_rules': {
            'anchor': ANCHOR,
            'lawful_maximum': 'Every stage takes its clock plus the longest extension the law or policy allows.',
            'lateness': 'A body that misses its deadline does not lengthen the forecast: the day after the lawful maximum is the day we escalate.',
            'laps': 'Laps run one after another; inside a lap, stages that depend on each other run in order and the rest run side by side.',
            'clarification': 'Worst case: the body asks for clarification on the last day and the clock starts again from our answer.',
            'working_days': 'Working days skip weekends and any UK bank holiday (FOIA s.10(6), EIR reg 2). Bank holidays are published to ' + HOL_LAST + '; later dates count weekends only.',
            'unpublished_times': 'Where no time is published, the seeded ladder\'s assumption is used and the stage is marked inferred.',
        },
        'clock_units': F.get('clock_units'),
        'bank_holidays': {'source': BH['source'], 'last': HOL_LAST, 'dates': sorted(HOL)},
        'lights': [
            {'id': 'red', 'label': 'Red', 'meaning': 'Concluded with a refusal, not held, no reply, or an excuse: escalate.'},
            {'id': 'amber', 'label': 'Amber', 'meaning': 'Concluded with a late, partial or doubtful answer: escalate.'},
        ],
        'no_green': 'There is no green: no answer is taken as satisfactory, which is why every stage escalates to the next.',
        'laps': LAPS,
        'excuses': EXCUSES,
        'laws': laws,
        'procedures': procedures,
        'institutions': insts,
        'counts': {'institutions': len(insts), 'stages': stages_total, 'procedures': len(procedures), 'laws': len(laws), 'excuse_icons': len(EXCUSES),
                   'synthetic_stages': sum(p_['used_by'] for p_ in procedures if p_['synthetic']),
                   'inferred_stages': sum(p_['used_by'] for p_ in procedures if p_['inferred']),
                   'excuses_seen': sum(len(x['excuses_seen']) for x in insts)},
        'changelog': [{'version': '0.0.2', 'date': '2026-11-10', 'change': 'River flow 0.2.0 and data/flows.json: the correspondence of the last 18 months imported from the case-mail index, cross-checked against Gmail, the evidence catalogue and the dartboard; one line per enquiry type with internal review, complaint and regulator splits; outcome icons; presents for artifacts received as attachments, each opening its catalogue entry. Goal renamed: every artifact identified and accounted for. Additive: erp.json schema unchanged.'}, {'version': '0.0.1', 'date': '2026-11-10', 'change': 'First release: schema 1.0.0, 56 worst-case pipelines seeded from the forecast ladders and the That Old Chestnut excuses; takes slot 57 of 59.'}],
    }
    return data


import html as H, copy
def e(s): return H.escape(str(s if s is not None else ''), quote=True)
def nice(s):
    x = d(s); return f"{x.day} {x.strftime('%b')} {x.year}"
SHRED_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="7" fill="#f2f2f2" stroke="#999"/><rect x="2" y="9" width="20" height="5" rx="1" fill="#777"/><g stroke="#f2f2f2" stroke-width="1.6"><line x1="6" y1="15" x2="6" y2="22"/><line x1="9" y1="15" x2="9" y2="20"/><line x1="12" y1="15" x2="12" y2="23"/><line x1="15" y1="15" x2="15" y2="20"/><line x1="18" y1="15" x2="18" y2="22"/></g></svg>'
def ico(x): return '<span class="erp-ico erp-c" aria-hidden="true">' + (SHRED_SVG if x['icon'] == 'shredder' else e(x['icon'])) + '</span>'
ROUTE_LABEL = {'uk_gov': 'UK government', 'private': 'Private body', 'welsh_public_body': 'Welsh public body', 'welsh_council': 'Welsh council', 'representative': 'Representative',
 'regulator_body': 'Regulator / ombudsman', 'law_firm': 'Law firm / legal', 'archives': 'Archive', 'police': 'Police', 'hmlr': 'Land registry', 'court_records': 'Courts',
 'welsh_gov': 'Welsh Government', 'community_council': 'Community council', 'water': 'Water company'}

def sample_from(data):
    """A demonstration pipeline: a copy of the first public-authority ladder under a made-up name, with lights and excuses
    placed to show how the board reads. Never a real body, never real correspondence."""
    src = next(x for x in data['institutions'] if x['id'] == 'vale-of-glamorgan-council')
    o = copy.deepcopy(src)
    o.update({'id': 'sample', 'name': 'Sample body (demonstration only)', 'route': 'sample', 'policy': None, 'note': 'Sample: not a real institution and not real data.', 'excuses_seen': []})
    plan = {1: ('red', ['not_held']), 2: ('amber', ['public_elsewhere']), 3: ('red', ['no_reply', 'holiday']), 4: ('amber', ['clarification']),
            5: ('red', ['fee']), 6: ('red', ['shredded']), 7: ('amber', ['scope', 'late_part']), 8: ('red', ['chestnut'])}
    for s in o['stages']:
        if s['n'] in plan:
            s['status'] = 'concluded'; s['light'] = plan[s['n']][0]; s['excuses'] = [{'excuse': k, 'ref': 'sample'} for k in plan[s['n']][1]]
        elif s['n'] == 9:
            s['status'] = 'open'
    o['marker'] = {'stage_n': 9, 'status': 'open', 'label': 'Marker at stage 9 (sample)'}
    o['pct_complete'] = round(100 * 8 / len(o['stages']))
    o['evidence'] = {'known': 12, 'identified': 7, 'located': 4, 'viewed': 2, 'state': 'imported'}
    return {'schema': data['schema'], 'version': data['version'], 'data_state': {'state': 'sample', 'imported': False, 'note': 'Sample only: a made-up body to show the board. Not a real institution, not real data.'}, 'opportunity': o}

def resolved(data, x):
    P_ = {p_['id']: p_ for p_ in data['procedures']}
    return [dict(P_[s['procedure']], **{k: v for k, v in s.items()}) for s in x['stages']]

def page(data):
    c = data['counts']; insts = data['institutions']
    latest = max(x['forecast']['close_worst'] for x in insts)
    lapcount = {l['id']: 0 for l in data['laps']}
    for x in insts:
        for l in x['laps']: lapcount[l['lap']] += 1
    p = []
    p.append('<!doctype html>\n<html lang="en-GB" class="tp" data-ghf-native="dark">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">')
    p.append(f'<meta name="app-version" content="{VERSION}">\n<title>ERP · worst-case disclosure pipelines, one per institution · Cedwyn Estate</title>')
    p.append('<meta name="description" content="One opportunity per institution: the full worst-case route from request to court, every stage with its law, clock and forecast date, a marker for where each body stands, red or amber lights and excuse icons.">')
    p.append('<link rel="canonical" href="https://bucklerfamily.estate/erp/">\n<meta property="og:title" content="ERP · disclosure pipelines">\n<meta property="og:description" content="Every institution, every lawful step, the worst-case date for each.">\n<meta property="og:url" content="https://bucklerfamily.estate/erp/">')
    p.append('<link rel="alternate" type="application/json" href="data/erp.json" title="Pipelines (data)">\n<link rel="describedby" type="application/schema+json" href="schema/erp.schema.json">')
    p.append('<link rel="stylesheet" href="assets/text-page.css?v=1.0.0">\n<link rel="stylesheet" href="assets/erp.css?v=' + VERSION + '">\n<link rel="stylesheet" href="assets/river.css?v=' + RIVER_VERSION + '">')
    p.append('<script>window.__cedwynLP="/erp/"</script><script src="/_cedwyn/ghf/ghf-boot.js?v=2.1.30"></script>\n</head>\n<body>')
    p.append('<header class="tp-hero"><div class="tp-hero-in"><p class="tp-kicker">Webapp 57 of 59</p><h1>ERP</h1>')
    p.append(f'<p class="tp-meta">{c["institutions"]} opportunities · {c["stages"]} stages · {c["laws"]} laws and policies · worst case · schema {SCHEMA_VERSION}</p></div></header>')
    p.append('<main class="erp-wide tp-content">')
    p.append('<div class="tp-src erp-notice"><p><b>River flow imported; stage board still a framework.</b> The river (data/flows.json) shows each body\'s requests, reviews, complaints, outcomes and the artifacts received, from the mail of the last 18 months. The stage board below still shows the worst-case framework: every marker at the start, no lights. Dates are the worst-case forecast from ' + nice(ANCHOR) + '.</p></div>')
    p.append('<div class="erp-kpis" role="list">')
    for v, k in [(c['institutions'], 'Opportunities'), (c['stages'], 'Stages'), (c['laws'], 'Laws cited'), (0, 'Closed won'), ('0%', 'Average complete'), (str(d(latest).year), 'Latest worst-case close')]:
        idattr = ' id="kpi-close"' if k.startswith('Latest') else ''
        p.append(f'<div class="erp-kpi" role="listitem"><b{idattr}>{e(v)}</b><span>{e(k)}</span></div>')
    p.append('</div>')
    p.append('<p class="erp-h">Pipeline by lap</p><ol class="erp-funnel">')
    for l in data['laps']:
        n = lapcount[l['id']]; w = round(100 * n / c['institutions'])
        p.append(f'<li><span class="n">{l["n"]}</span><span>{e(l["label"])}<span class="erp-bar"><i style="width:{w}%"></i></span></span><span class="c" title="opportunities whose route has this lap">{n}</span></li>')
    p.append('</ol><p class="tp-muted" style="font-size:.85rem">Bars: how many routes include each lap. Where each body stands appears once the mail is imported.</p>')
    p.append('<h2 id="pipeline">Pipeline</h2>')
    p.append('<div class="erp-ctl" id="erp-ctl" hidden><label for="erp-pick">Opportunity</label><select id="erp-pick"><option value="">Choose an opportunity</option><option value="sample">Sample body (demonstration only)</option>')
    for x in insts: p.append(f'<option value="{e(x["id"])}">{e(x["name"])}</option>')
    p.append('</select><label for="erp-from">Forecast from</label><input type="date" id="erp-from"></div>')
    p.append('<div id="erp-detail"><p class="tp-muted">Choose an opportunity to see its climb and every stage.</p></div>')
    p.append('<h2>Opportunities</h2><ul class="erp-opps">')
    for x in insts:
        pills = ''.join(f'<span class="erp-pill">{e(r["id"])}</span>' for r in x['regimes_applicable'])
        seen = ''.join(ico(next(z for z in data['excuses'] if z['id'] == k)) for r in x['excuses_seen'] for k in r['excuses'])[:2000]
        p.append(f'<li class="erp-opp" id="o-{e(x["id"])}"><a href="?o={e(x["id"])}#pipeline" data-opp="{e(x["id"])}">{e(x["name"])}</a>')
        p.append(f'<div class="meta">{e(ROUTE_LABEL.get(x["route"], x["route"]))} · {len(x["stages"])} stages · {len(x["laps"])} laps</div><div>{pills}</div>')
        p.append(f'<div class="erp-pct" aria-label="{x["pct_complete"]}% complete"><i style="width:{x["pct_complete"]}%"></i></div>')
        p.append(f'<div class="row"><span>{x["pct_complete"]}% · {e(x["marker"]["label"])}</span><span>close <b data-close>{nice(x["forecast"]["close_worst"])}</b></span></div>')
        if seen: p.append(f'<div class="row" style="margin-top:.35rem"><span>{seen}</span><span>{len(x["excuses_seen"])} on record</span></div>')
        p.append('<noscript><details><summary>Stages</summary><ol>' + ''.join(f'<li>{e(s["label"])}: {e(s["worst_case"]["n"])} {e(s["worst_case"]["u"])}, due {nice(s["forecast"]["due_worst"])}</li>' for s in resolved(data, x)) + '</ol></details></noscript>')
        p.append('</li>')
    p.append('</ul>')
    p.append('<h2>Lights</h2><ul class="erp-legend">')
    for l in data['lights']:
        p.append(f'<li><span class="erp-ico"><span class="erp-light erp-c {l["id"]}"></span></span><span>{e(l["label"])}<small>{e(l["meaning"])}</small></span></li>')
    p.append(f'<li><span class="erp-ico"><span class="erp-light"></span></span><span>No light<small>Not reached yet. {e(data["no_green"])}</small></span></li></ul>')
    p.append('<h2>Excuse icons</h2><ul class="erp-legend">')
    for x in data['excuses']:
        p.append(f'<li>{ico(x)}<span>{e(x["label"])}<small><a href="{e(x["src"])}">{e(x["law"])}</a>. Next move: {e(x["counter"])}</small></span></li>')
    p.append('</ul>')
    p.append('<h2>How the forecast works</h2><ul>' + ''.join(f'<li>{e(v)}</li>' for k, v in data['forecast_rules'].items() if k != 'anchor') + '</ul>')
    p.append('<details><summary>Laws and policies cited (' + str(len(data['laws'])) + ')</summary><ul>' + ''.join(f'<li><a href="{e(l["src"])}">{e(l["title"])}</a>{" · inferred" if l["inferred"] else ""}</li>' for l in data['laws']) + '</ul></details>')
    p.append('<details><summary>Data and schema</summary><ul><li><a href="data/erp.json">data/erp.json</a> (every pipeline)</li><li><a href="data/flows.json">data/flows.json</a> (river flow: requests, splits, outcomes, artifacts)</li><li><a href="schema/erp.schema.json">schema/erp.schema.json</a> (JSON Schema, version ' + SCHEMA_VERSION + ')</li><li><a href="data/sample.json">data/sample.json</a> (the sample body)</li><li>Excuses on record link the catalogue at <a href="https://bucklerfamily.estate/that-old-chestnut/">/that-old-chestnut/</a>.</li></ul></details>')
    p.append('<details><summary>Version ' + VERSION + ' · change log</summary><table><thead><tr><th>Version</th><th>Date</th><th>Change</th></tr></thead><tbody>' + ''.join(f'<tr><td>{e(r["version"])}</td><td>{e(r["date"])}</td><td>{e(r["change"])}</td></tr>' for r in data['changelog']) + '</tbody></table><p class="tp-muted">Version 0.0.1 is free to read.</p></details>')
    p.append('</main>\n<script src="assets/erp.js?v=' + VERSION + '" defer></script>\n<script src="assets/river.js?v=' + RIVER_VERSION + '" defer></script>\n</body>\n</html>\n')
    return '\n'.join(p)

BANNED = ['says', 'claims', 'according to', 'hearsay', 'unverified', 'alleged', 'fraud', 'stolen', 'testimony', 'recollection']
def gate(text):
    low = text.lower(); bad = [w for w in BANNED if re.search(r'\b' + re.escape(w) + r'\b', low)]
    if any(('15' + y) in text for y in ('47', '52')): bad.append('barred date digits')
    if re.search(r'https?://[a-z0-9-]+\.bucklerfamily\.estate', low): bad.append('subdomain link')
    if re.search(r'\bsion\b', low): bad.append('owner name')
    return bad

if __name__ == '__main__':
    data = build()
    s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    bad = gate(s)
    if bad:
        print('GATE FAIL', bad); sys.exit(2)
    try:
        import jsonschema
        sch = json.load(open(ROOT / 'schema' / 'erp.schema.json'))
        errs = list(jsonschema.Draft202012Validator(sch).iter_errors(data))
        if errs:
            print('SCHEMA FAIL', errs[0].message); sys.exit(3)
    except ImportError:
        print('note: jsonschema not installed, schema check skipped')
    fl = ROOT / 'public' / 'data' / 'flows.json'
    if fl.exists():
        bad = gate(fl.read_text())
        if bad:
            print('GATE FAIL flows', bad); sys.exit(2)
    smp = sample_from(data); html_out = page(data)
    for name, txt in (('sample', json.dumps(smp, ensure_ascii=False, indent=1)), ('page', html_out)):
        bad = gate(txt)
        if bad:
            print('GATE FAIL', name, bad); sys.exit(2)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(s + '\n')
    (OUT.parent / 'sample.json').write_text(json.dumps(smp, ensure_ascii=False, separators=(',', ':')) + '\n')
    (ROOT / 'public' / 'schema').mkdir(exist_ok=True)
    (ROOT / 'public' / 'schema' / 'erp.schema.json').write_text((ROOT / 'schema' / 'erp.schema.json').read_text())
    (ROOT / 'public' / 'index.html').write_text(html_out)
    print(json.dumps(data['counts']))

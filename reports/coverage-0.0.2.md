# ERP 0.0.2 — coverage report (river flow)

Built 10 Nov 2026. Window: the 18 months to the build date (requests whose latest message falls after 10 May 2025).

## Sources, in the order used
1. **Case-mail index** (read-only): 329 threads, 1,139 messages, up to 9 Nov 2026. Every request, review, complaint and outcome class in the river comes from here first.
2. **Gmail sweep** (read-only, 10 Nov 2026): 1,379 messages read by header over the window. 594 were already in the index. Of the 785 that were not: 30 are newer messages in threads the index already holds (shown on the request as "newer message in the mail, not checked"); 37 are replies from listed bodies in threads the index does not yet hold (added as 25 requests or splits, outcome "acknowledged" or "not checked"); the rest are press, auto-replies, delivery failures, private individuals or unrelated matters, left out, with their subjects kept private.
3. **Evidence catalogue** (`/api/catalogue`): 1,051 records; 81 reply attachments read one by one to tell an artifact from a letter.
4. **Dartboard**: 165 EV ids. 13 have no mail thread in the index (EV-0095, EV-0113, EV-0114, EV-0124, EV-0126, EV-0131, EV-0255, EV-0272, EV-0293, EV-0601, EV-0602, EV-0606, EV-0900); they are catalogue or research records, not requests, so they add no line.
5. **Watchtower**: absence checks only, no requests; nothing added. **Roadmap**: the page answers 404; nothing added. **CRM**: not read this pass (see Limits).

## Totals
| | n |
|---|---|
| Bodies with a river | 86 (56 with a pipeline, 30 flow only) |
| Requests (trunk) | 315 — FOI 77, EIR 18, GDPR/SAR 14, other 206 |
| Internal reviews | 22 |
| Complaints | 35 |
| Regulator / ombudsman | 5 |
| Accounted for (end answer on record) | 147 of 315 (47%) |
| Presents (artifacts received as attachments) | 40 (40 with a catalogue entry, 0 without) |
| Requests with something not checked | 35 |

Pipeline bodies with nothing accounted for yet (13): Linklaters, WhatDoTheyKnow (unconfirmed), Local Government Association / WLGA, Ministry of Defence, Transport for Wales, Natural Resources Wales, Audit Wales, Church of England archives (Lambeth Palace Library), Government Legal Department (Bona Vacantia), Parliamentary and Health Service Ombudsman, Wales Office, HM Land Registry (Independent Complaints Reviewer), Public Services Ombudsman for Wales.

## Outcomes
| Outcome | Requests | Counts as accounted |
|---|---|---|
| Acknowledged, nothing since | 79 | no |
| No reply | 79 | no |
| Not held | 34 | yes |
| Transferred / sent elsewhere | 33 | yes |
| Letter only, no records | 29 | yes |
| Late or part answer | 17 | yes |
| Disclosed | 10 | yes |
| Not checked | 9 | no |
| Clarification demanded | 8 | yes |
| Exempt / refused | 5 | yes |
| Destroyed | 4 | yes |
| Locked (encrypted, not read) | 1 | yes |
| Complaint closed | 1 | yes |
| Vexatious / repeat | 1 | yes |
| Fee demanded | 1 | yes |
| Cost limit | 1 | yes |
| Bounced | 1 | yes |
| Not subject to FOI | 1 | no |
| Lost in a fire | 1 | yes |

Fire and destroyed (shredder) are set only where the body's own reply records a fire or a destruction; a preservation notice asking a body not to destroy records does not count.

## What a present is
An actual record sent as an email attachment: a map extract, a deed or contract, a survey photograph, a released document, a schedule or data file. Not a reply letter, leaflet, fee schedule, form, encrypted container or the requester's own file.

Received attachments in the index: 125 — 33 artifact, 73 reply letter or form, 15 not checked, 4 the requester's own. The catalogue's reply attachments added 12 more artifacts the index had not tied to a thread.

## Proposed catalogue additions (not made — the catalogue is locked)
None this pass: the three artifacts first found without a link (the Vale 1965 conveyance and the two Museum Wales object records 63.24/1 and 63.24/2) match existing records EV-0042, EV-0140 and EV-0138. No catalogue-change PR is needed; no existing record was edited.

## Per body
| Body | Kind | Requests | Reviews | Complaints + regulator | Accounted | 🎁 | Not checked |
|---|---|---|---|---|---|---|---|
| HM Land Registry | pipeline | 37 | 0 | 3 | 13 (35%) | 0 | 0 |
| Vale of Glamorgan Council | pipeline | 32 | 3 | 6 | 10 (31%) | 2 | 1 |
| Glamorgan Archives | pipeline | 26 | 0 | 2 | 17 (65%) | 2 | 2 |
| Ministry of Justice / HMCTS | pipeline | 18 | 3 | 0 | 10 (56%) | 0 | 1 |
| The National Archives | pipeline | 14 | 1 | 3 | 7 (50%) | 4 | 5 |
| Member of Parliament | pipeline | 12 | 0 | 5 | 1 (8%) | 0 | 1 |
| South Wales Police | pipeline | 12 | 2 | 0 | 7 (58%) | 0 | 1 |
| Welsh Government / Cadw | pipeline | 10 | 2 | 3 | 4 (40%) | 8 | 2 |
| National Library of Wales | pipeline | 8 | 1 | 0 | 6 (75%) | 0 | 0 |
| Amgueddfa Cymru - Museum Wales | pipeline | 7 | 2 | 1 | 6 (86%) | 12 | 0 |
| BP | pipeline | 7 | 0 | 0 | 2 (29%) | 0 | 0 |
| Member of Parliament (Vale of Glamorgan) | pipeline | 7 | 0 | 1 | 1 (14%) | 0 | 0 |
| ITV Archive | pipeline | 6 | 0 | 0 | 2 (33%) | 0 | 0 |
| Llandough Community Council | pipeline | 6 | 1 | 1 | 5 (83%) | 0 | 0 |
| Dwr Cymru Welsh Water | pipeline | 5 | 0 | 0 | 2 (40%) | 0 | 3 |
| Legal regulators | pipeline | 5 | 0 | 0 | 1 (20%) | 0 | 0 |
| RCAHMW (Royal Commission) | pipeline | 5 | 0 | 3 | 3 (60%) | 0 | 0 |
| Science Museum Group | flow only | 5 | 0 | 0 | 1 (20%) | 2 | 2 |
| Department for Culture, Media and Sport | pipeline | 4 | 1 | 0 | 1 (25%) | 0 | 1 |
| Vale of Glamorgan Council (Scrutiny) | pipeline | 4 | 0 | 0 | 2 (50%) | 0 | 0 |
| Cardiff and Vale University Health Board | pipeline | 3 | 1 | 0 | 3 (100%) | 0 | 0 |
| Heneb (formerly GGAT) / Historic Environment Record | pipeline | 3 | 1 | 1 | 3 (100%) | 1 | 1 |
| Linklaters | pipeline | 3 | 0 | 0 | 0 (0%) | 0 | 0 |
| Prime Minister's Office / Cabinet Office | pipeline | 3 | 0 | 0 | 1 (33%) | 0 | 1 |
| Senedd | pipeline | 3 | 0 | 1 | 3 (100%) | 0 | 0 |
| WhatDoTheyKnow (unconfirmed) | pipeline | 3 | 0 | 0 | 0 (0%) | 0 | 2 |
| Coroner's Service (RCT Council) | pipeline | 2 | 0 | 0 | 1 (50%) | 0 | 0 |
| Cotswold Archaeology | pipeline | 2 | 0 | 0 | 1 (50%) | 0 | 1 |
| Local Government Association / WLGA | pipeline | 2 | 0 | 0 | 0 (0%) | 0 | 1 |
| Ministry of Defence | pipeline | 2 | 0 | 1 | 0 (0%) | 0 | 0 |
| Mount Stuart (Bute archive) | pipeline | 2 | 0 | 0 | 1 (50%) | 0 | 0 |
| Northern Ireland Office | pipeline | 2 | 1 | 0 | 2 (100%) | 0 | 0 |
| Persimmon Homes | pipeline | 2 | 0 | 0 | 1 (50%) | 0 | 0 |
| Transport for Wales | pipeline | 2 | 0 | 1 | 0 (0%) | 0 | 0 |
| Natural Resources Wales | pipeline | 2 | 0 | 0 | 0 (0%) | 0 | 0 |
| Archaeology Data Service | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Audit Wales | pipeline | 1 | 0 | 0 | 0 (0%) | 0 | 1 |
| BT Archives | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Blake Morgan LLP | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 1 |
| Cardiff / Vale Register Office | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Church of England archives (Lambeth Palace Library) | pipeline | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Counter Terrorism Policing (NaCTSO) | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Crown Prosecution Service | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Defra | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 1 |
| Cardiff Central Library | pipeline | 1 | 0 | 0 | 1 (100%) | 2 | 0 |
| Government Legal Department (Bona Vacantia) | pipeline | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Historic England | pipeline | 1 | 1 | 0 | 1 (100%) | 2 | 0 |
| Information Commissioner's Office | pipeline | 1 | 0 | 3 | 1 (100%) | 0 | 0 |
| Ordnance Survey | pipeline | 1 | 0 | 0 | 1 (100%) | 5 | 0 |
| Parliamentary and Health Service Ombudsman | pipeline | 1 | 0 | 1 | 0 (0%) | 0 | 0 |
| Public Administration and Constitutional Affairs Committee | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 1 |
| SFO | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| The Postal Museum | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Valuation Office Agency / HMRC | pipeline | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Wales Office | pipeline | 1 | 2 | 0 | 0 (0%) | 0 | 0 |
| RICS (Royal Institution of Chartered Surveyors) | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 1 |
| Arts Council England | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 1 |
| Companies House | flow only | 1 | 0 | 1 | 1 (100%) | 0 | 0 |
| Forest of Cardiff (registered charity) | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 1 |
| Capital Law | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Loosemores (successor to John Loosemore & Co.) | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Cardiff Council | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| The Law Society | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Modern Records Centre (University of Warwick) | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 1 |
| Darwin Gray | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Hugh James (successor to John Loosemore & Co.) | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Health and Safety Executive | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 1 |
| SPAB (Society for the Protection of Ancient Buildings) | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Historic Buildings & Places | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Network Rail | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Open Spaces Society | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| British Geological Survey | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Cambridge University Collection of Aerial Photography (CUCAP) | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Victorian Society | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| FSB Wales (Federation of Small Businesses) | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| SEWBReC (South East Wales Biodiversity Records Centre) | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Glamorgan Federation of Women's Institutes | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Wildlife Trust of South and West Wales | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 1 |
| Mid and West Wales Fire and Rescue Service | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Chambers Wales South East Wales | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| The Georgian Group | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| National Collection of Aerial Photography (Historic Environment Scotland) | flow only | 1 | 0 | 0 | 1 (100%) | 0 | 0 |
| Welsh Government (Ministerial correspondence) | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| Planning Inspectorate | flow only | 1 | 0 | 0 | 0 (0%) | 0 | 0 |
| HM Land Registry (Independent Complaints Reviewer) | pipeline | 0 | 0 | 1 | 0 (0%) | 0 | 0 |
| Public Services Ombudsman for Wales | pipeline | 0 | 0 | 2 | 0 (0%) | 0 | 0 |

## Limits
- Outcome classes come from the index's reading of each reply; where no reply was read, the outcome is "not checked".
- 30 newer messages in known threads and 37 replies in unindexed threads were seen by header only; their outcomes are not checked.
- The encrypted SAR reply (3 parts) is locked: its contents are not read.
- Complaints with no matching request sit on the body's busiest line, labelled "own thread".
- The CRM was not read in this pass.
- The stage pipelines in erp.json are still the worst-case framework; this release adds the river flow only.

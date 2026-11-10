# ERP 0.1.0 — coverage report (stage board lit)

Built 10 Nov 2026. Window: all the mail held (earliest case correspondence 17 Aug 2016); each request carries `in_18m` for the 18-month view.

| | 0.0.2 | 0.1.0 |
|---|---|---|
| Bodies with a river | 86 | 87 |
| Bodies with a pipeline | 56 | 87 (31 added: generic ladder for the kind of body, every rung marked inferred) |
| Stages on the board | 796 | 1,154 |
| Stages lit | 0 | 143 (74 concluded: 69 red, 5 amber; 69 open) |
| Bodies with a marker past the start | 0 | 87 |
| Requests (trunk) | 315 | 316 |
| Accounted for | 147 | 157 |
| Requests with something not checked | 35 | 3 |

## How a stage is lit
Each request, internal review, complaint and regulator case in data/flows.json opens the matching stage of that body's route (FOI, EIR, subject access or the records enquiry; FOI/EIR review or the data-protection complaint; the body's complaint stage; ICO, ombudsman, ICR or IOPC). A stage whose cases all have an end answer is concluded: amber when every case was disclosed, late/part or locked, red otherwise (there is no green). Clarification demands light the clarification stage; a pre-action letter lights the pre-action stage. Dates (actual_opened / actual_closed), EV records and excuses come from the cases. The marker sits on the open stage furthest along the route; % complete = concluded stages / stages on the route.

## What was read this pass (Gmail, read-only)
- 47 newer messages in threads the index holds, each classified from the body's own words (12 outcomes changed: e.g. Health and Safety Executive and the Companies House archive now record destruction under their retention rules; Welsh Water's two subject access requests found nothing held; the Cabinet Office asked whether to process the request).
- The replies behind 12 not-checked requests (DCMS, Science Museum Group, The National Archives, Vale of Glamorgan complaint, WhatDoTheyKnow notices, Companies House complaint, Cabinet Office).
- All-time sweep before 10 May 2025: 102 messages with case terms read by header; one is case correspondence with a body (a 2016 enquiry to a law firm, no reply in the thread), added. The rest are other matters or private individuals and stay out. 776 public-sector messages before May 2025 carry no case term and were not opened.

## Still open
- 3 requests with a newer message not found on a second search: Ministry of Justice / HMCTS subject access, The National Archives estate and legal records FOI, South Wales Police FOI 719/26 (not checked).
- CRM case tasks: not read this pass.
- Evidence counts (known / identified / located / viewed) are not imported, so no body is closed won.

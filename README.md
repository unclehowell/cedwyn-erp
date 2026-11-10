# ERP — webapp 57 of 59

Served at https://bucklerfamily.estate/erp/ (the estate build reads this repository's `main`, folder `public/`). Until the registration PR unclehowell/cedwyn#554 is merged, `/erp/` is served by the Cloudflare Worker `bfe-erp` (`worker/bfe-erp.js`), which reads `public/` straight from this repository's `main` (edge-cached 5 min) and falls back to the preview Worker; once the estate build carries `/erp/`, delete its two routes (`bucklerfamily.estate/erp*`, `bucklerfamily.estate/erp/*`).

## Emails come from the catalogue (0.0.3)
The central catalogue is the single source of truth for emails: each message is a catalogue record (kind `email`, `EV-0906` …).
This board keeps **metadata only** — id, date and time, direction, correspondent, subject line, thread, the request's evidence record, attachment count —
in `public/data/catalogue-emails.json`, and links each to its catalogue record. No email text is kept here.

Build or redeploy:

    python3 tools/build.py            # pulls the catalogue first (tools/pull_catalogue.py), then builds the board
    python3 tools/bundle_preview.py   # bundles public/ into worker/preview.js for the preview Worker

`tools/pull_catalogue.py` reads the catalogue API (`kind=email`), else the catalogue's record index (`unclehowell/cedwyn`,
`data/core/records/emails/index.json`, ref `CATALOGUE_REF`, default `main`), else keeps the last pull and marks it stale.
The data in this branch was built with `CATALOGUE_REF=catalogue-emails-v0.4.0` (the catalogue pull request), so its links open the catalogue preview;
once that pull request is merged, a plain `python3 tools/build.py` pulls from `main`.

One opportunity per institution, past and present: the full **worst-case** route from first request to court, every stage with its law or policy, its clock, the longest lawful time the body may take, and the forecast date it falls on. **Closed won** = every artifact identified and accounted for: every known artifact and evidence item for that body identified, located and viewed in our catalogue.

The board assumes each body denies, admits nothing and takes every day the law allows. A body that is late does not lengthen the forecast: the day after the lawful maximum is the day the next stage opens.

## Schema first (1.0.0)
`schema/erp.schema.json` (JSON Schema 2020-12; also served at `public/schema/`):

- **laws** — every statute, code and published policy cited, with its source URL.
- **procedures** — one distinct stage definition: lap, law, source, clock, extension, worst-case lawful duration, `inferred` (our reading, no published time) and `synthetic` (a stage our framework adds where the seeded ladder had none).
- **institutions** — one pipeline each: applicable regimes and those that do not apply (with the reason), laps, stages (procedure + forecast + status + light + excuses + evidence ids), marker, `pct_complete`, evidence counts (`known / identified / located / viewed`) and `close_status`.
- **laps** (7, fixed): Request → Clarification → Internal review → Complaint → Regulator / ombudsman → MP / Senedd → Pre-action / tribunal / court.
- **lights**: `red` or `amber` only, for a concluded stage. There is no green: no answer is taken as satisfactory, which is why every stage escalates.
- **excuses**: the icon set (✈ holiday, £ fee, 🌰 stock excuse, 🔥 fire, shredder, ∅ not held, 🧮 cost limit, 🛑 vexatious, 🔗 published elsewhere, ✂ scope narrowed, ❓ clarification, ↪ sent elsewhere, 🏢 not subject to FOI, 🔒 personal data, 📭 lost in post, ⏳ workload, 🏠 no reply, 🐟 late or part answer), each with its law and our next move.

## Data state
**0.0.2 — river flow imported.** `public/data/flows.json` carries the correspondence of the last 18 months for 86 bodies (56 with a pipeline here, 30 flow only): one line per enquiry type (FOI, EIR, GDPR/SAR, other), internal review / complaint / regulator splits, each request's outcome, and a present for every actual record received as an email attachment (linked to its catalogue entry). Sources: the case-mail index, a read-only Gmail sweep (10 Nov 2026), the evidence catalogue and the dartboard. Where the mail did not show an outcome it reads `not_checked`; nothing is guessed. A request counts as accounted for once the body gave an end answer. `reports/coverage-0.0.2.md` is the coverage report.

The stage pipelines are still the framework (0.0.1): no stage-level import yet. Every marker is at the start, every stage `not_started`, no lights, evidence counts `null`. `public/data/sample.json` is a made-up body that shows how the board reads once data arrives; it is labelled as a sample everywhere it appears. The excuses on record per institution come from the That Old Chestnut audit (public-safe fields only) and link to `/that-old-chestnut/#<id>`.

## Files
- `seed/` — inputs: the forecast ladders (56 institutions), UK bank holidays (gov.uk), That Old Chestnut public fields.
- `tools/build.py` — builds `public/data/erp.json`, `public/data/sample.json` and `public/index.html`; validates against the schema; fails on the house word list.
- `public/` — the served app (static; the lists work without JavaScript; `assets/erp.js` draws the climb and recomputes the forecast for any start date, `?o=<id>&from=YYYY-MM-DD`).
- `public/assets/river.js` + `river.css` (river flow 0.2.0) — a burger at top left opens a slide-in, searchable list of the institutions (✕, tap outside or Esc closes; focus stays inside). The screen then shows one body as a river: a trunk, a thick rounded line per enquiry type that peels off left or right, splits for internal review, complaint and regulator, semi-translucent outcome icons at each line's end (🌰 the old chestnuts, 🔥 fire, shredder, ∅ not held, ↪ sent elsewhere, 🏠 no reply…) and 🎁 for each artifact received; tap 🎁 for its catalogue entry (read live from `/api/catalogue/<id>`, with a link out), tap a line for its law, clock, dates and requests. The sea is the goal: every artifact identified and accounted for. `#<id>` or a short alias (`#hmlr`, `#cadw`, `#tna`…) opens one body; the last choice is remembered on the device.
- `test/erp.test.mjs` — `node --test test/erp.test.mjs`.

## Import (next phase)
Each stage takes `status` (`open`, `concluded`), `light` (`red`/`amber`), `forecast.actual_opened/actual_closed`, `excuses[]` (`{excuse, date, ref, link}`) and `evidence_ids[]`; the marker moves to the newest open stage and `pct_complete` = concluded / total. Import from the mail manifest once agreed; never record an outcome that is not in the mail.

## Preview
https://cedwyn-erp-preview.righteous.workers.dev/ (noindex, static bundle `worker/preview.js` built from `public/`; pushes do not redeploy it, rebuild after any change).

## Rules for editors (human or agent)
Neutral dated wording; the site's banned-word list; apex paths only (`https://bucklerfamily.estate/<path>`); add-only for catalogue records. Tracking issue: see the change log.

## Change log
| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-11-10 | Stage board lit from the mail (tools/import_activity.py): 144 stages lit (75 concluded with a red or amber light, 69 open), markers moved, % complete counted. Every body in the river has a pipeline (88; 32 added with generic, inferred ladders). River covers all the mail held (from 17 Aug 2016); not-checked requests 35 → 3 after reading 47 newer messages and the replies behind 12 open outcomes. |
| 0.0.1 (UI) | 2026-11-10 | River view 0.1.0: institution drawer and one river per body (UI only; data, schema and version unchanged). |
| 0.0.1 | 2026-11-10 | First release: schema 1.0.0; 56 pipelines, 796 stages, 172 procedures, 102 laws; takes slot 57 of 59 (was coming-soon-57). |

— Sion's Tab agent

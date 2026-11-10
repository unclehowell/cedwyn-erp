# ERP — webapp 57 of 59

Served at https://bucklerfamily.estate/erp/ (the estate build reads this repository's `main`, folder `public/`).

One opportunity per institution, past and present: the full **worst-case** route from first request to court, every stage with its law or policy, its clock, the longest lawful time the body may take, and the forecast date it falls on. **Closed won** = every known artifact and evidence item for that body identified, located and viewed in our catalogue.

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
Framework only (0.0.1): no correspondence is imported. Every marker is at the start, every stage `not_started`, no lights, evidence counts `null`. `public/data/sample.json` is a made-up body that shows how the board reads once data arrives; it is labelled as a sample everywhere it appears. The excuses on record per institution come from the That Old Chestnut audit (public-safe fields only) and link to `/that-old-chestnut/#<id>`.

## Files
- `seed/` — inputs: the forecast ladders (56 institutions), UK bank holidays (gov.uk), That Old Chestnut public fields.
- `tools/build.py` — builds `public/data/erp.json`, `public/data/sample.json` and `public/index.html`; validates against the schema; fails on the house word list.
- `public/` — the served app (static; the lists work without JavaScript; `assets/erp.js` draws the climb and recomputes the forecast for any start date, `?o=<id>&from=YYYY-MM-DD`).
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
| 0.0.1 | 2026-11-10 | First release: schema 1.0.0; 56 pipelines, 796 stages, 172 procedures, 102 laws; takes slot 57 of 59 (was coming-soon-57). |

— Sion's Tab agent

# Implementation Plan: Crew Jobs

**Branch**: `006-crew-jobs` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-crew-jobs/spec.md`

## Summary

The trial level's single repair truck is replaced by **four crews with jobs**: Road Crew,
Builders, Electricians and Drainage Team. Each crew is a team in its own vehicle, led by a
named leader. The storm now causes four kinds of damage: cracked roads, damaged roofs, downed
streetlights and a failing pump station. Each job is **Best**, **Can help** (2× slower, no
bonus) or **Can't fix** for each kind, and each has its own advantage. The player sends crews
in one of two ways:

- **incident first**: open the incident; the panel lists every crew with a badge, an arrival
  time and a repair time, with the best free crew pre-picked;
- **crew first**: click a crew in the new crew bar, then click an incident.

The level is scaled up for four crews: 18 incidents, at most 3 / 4 / 6 active, warnings 30 %
shorter, a goal of 10, and clustered damage so the best crew is sometimes busy.

**Technical approach**:

- **Jobs are domain data**: a new `jobs.js` holds the match table and the advantage maths.
  Incident kinds gain two kinds and target rules.
- **`Round` runs many crews**: it moves from one `Crew` to an array of crews, with
  `dispatchOptions` and `bestCrewFor` for the panel.
- **`LevelRun` handles choosing**: it gains picking and arming (crew-first) logic.
- **Adapters**: they gain job art (vehicles, portraits, glyphs), a crew bar, a crew list in the
  panel and a Crew guide.
- **Feature-005 levels and tests keep working**: they run through a hidden one-crew `general`
  job, and level-wide difficulty comes from a new `warnScale` field.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2020, classic `<script>` files. Unchanged.

**Primary Dependencies**: None.

**Storage**: None.

**Testing**: the in-browser harness `tests/index.html`, also run headlessly during
development.

- New suites: `jobs`, `incident-kinds`, `job-art`.
- Extended suites: `level-checks`, `crew`, `round`, `level-run`, `hints`, `architecture`.
- Removed: `vehicle-art`, replaced by `job-art`.

**Target Platform**: current desktop Chrome, Edge and Firefox; works over `file://` and static
hosting.

**Project Type**: Browser game (single static front end).

**Performance Goals**:

- 60 FPS with 4 crews moving, 6 active incidents and heavy rain (SC-005).
- Dispatch options are recomputed at most every 250 ms and only while the panel is open: 4 BFS
  runs on 20×20 tiles, well under 1 ms.

**Constraints**:

- No build or install.
- The level stays deterministic (fixed schedule, fixed tie-break order).
- All feature-005 tests keep passing (SC-006).
- A level that fails its checks still falls back to free look.

**Scale/Scope**:

- About 4 new source files (`jobs.js`, `job-art.js`, `crew-guide.js`, plus tests) and about 12
  changed files.
- 4 jobs, 4 crews and 4 damage kinds.
- 18 scheduled incidents on the 20×20 trial map, which gains a pump station and 4 named
  streetlights.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Always-Playable Build | Legacy one-crew levels keep working (`general` job); a level that fails its checks falls back to free look; stories land in order (P1 crews + choice → P2 kinds + rebalance → P3 advantages + guide) | ✅ |
| II. Core Loop First | Serves the "choose who to send" step of the core loop; the spec names it | ✅ |
| III. Tested Logic, Playtested Presentation | Match table, repair and points maths, multi-crew assignment, dispatch options, pre-pick, arming and refusal are all in domain/application and unit-tested; the crew bar, panel, pins and guide are covered by quickstart §2 | ✅ |
| IV. Performance Budget | 4 extra drawables; options throttled to 250 ms; about 20 extra images (16 vehicle facings + 3 portraits), roughly 60 KB | ✅ |
| V. Simplicity | Jobs are plain data plus 3 pure helpers; no dispatcher class; arming is two fields in `LevelRun`; the guide reuses How to Play instead of a new dialog | ✅ |
| VI. Browser-Only, Zero-Install | Plain JS/CSS/HTML only | ✅ |
| VII. Clean Architecture | Jobs, kinds and checks → domain; crews, round, run, hints → application; vehicles, portraits, glyphs (`job-art`), HUD, crew bar, guide → adapters; level and map data → infrastructure; `main.js` only wires | ✅ |

**Post-design re-check (after Phase 1)**: still all ✅.

- No picture path or glyph entered the domain: the vehicle, portrait and glyph per job/kind
  live in `job-art.js`.
- The level holds only the portrait *key*.
- `LevelLayer` sends every click through `run.clickIncident`, so the crew-first rules stay in
  the application layer.

## Project Structure

### Documentation (this feature)

```text
specs/006-crew-jobs/
├── plan.md              # This file
├── research.md          # R1–R10
├── data-model.md        # Job, kinds, level crews, crew/incident/run changes
├── quickstart.md        # Test suites + playtest checklist
├── contracts/
│   ├── level-and-jobs.md     # MCW.jobs table, level crews, checker rules
│   ├── play-ui.md            # Crew bar, panel crew list, pins, guide, hints
│   └── new-apis.md           # Module APIs by layer
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
js/
├── domain/
│   ├── jobs.js               # NEW  MCW.jobs, matchLevel, repairSeconds, repairPoints
│   ├── incident-kinds.js     # CHANGED  + streetlight, pump; target rules
│   └── level-checks.js       # CHANGED  crews rules, kind target rules, MCW.levelCrews
├── application/
│   ├── crew.js               # CHANGED  id, jobId, leader, portrait, status()
│   ├── round.js              # CHANGED  crews[], send(inc, crew), dispatchOptions, bestCrewFor, job scoring, warnScale
│   ├── level-run.js          # CHANGED  pickedCrew, armedCrew, clickIncident, options cache, {target}
│   └── hints.js              # CHANGED  step texts
├── adapters/
│   ├── art/job-art.js        # NEW  vehicles, portraits, job icons, kind glyphs (replaces vehicle-art.js)
│   ├── art/vehicle-art.js    # REMOVED
│   ├── render/level-layer.js # CHANGED  drawable per crew, glyphs, dimming, clickIncident
│   ├── ui/hud.js             # CHANGED  crew bar, panel crew rows, keys 1–4, arming, toasts, Right-crew pop
│   └── ui/crew-guide.js      # NEW  guide table in How to Play
└── main.js                   # CHANGED  job-art image list, CrewGuide wiring

levels/trial.js               # CHANGED  crews, 18 incidents, target 10, warnScale 0.7, rightCrewBonus, stars
maps/trial.js                 # CHANGED  pump station + 4 named streetlights (regenerated)
css/hud.css                   # CHANGED  crew bar, crew rows, badges, toast
index.html                    # CHANGED  #crew-guide in How to Play, script tags, How to Play text

tests/
├── domain/jobs.test.js, domain/incident-kinds.test.js, adapters/job-art.test.js   # NEW
├── adapters/vehicle-art.test.js                                                    # REMOVED
└── domain/level-checks, application/crew, round, level-run, hints, architecture    # EXTENDED
```

**Structure Decision**: The existing layer folders are unchanged. `job-art.js` replaces
`vehicle-art.js` because the truck picture is now one of four job vehicles.

### Notes for implementation

- **Legacy shortcut**: `MCW.levelCrews(level)` is the single place that turns a legacy
  `depot` + `crew` level into `[{ id: "crew", job: "general", … }]`. Both `Round` and
  `checkLevel` call it.
- **Release on reassignment**: when a second crew is sent to an assigned incident, the first
  crew's `goHome()` runs before the new assignment, so both events (`assigned` for the new
  crew, and the released crew's return) happen in the same step.
- **Disarming**: `LevelRun` disarms on the armed crew's `arrive` event (it starts repairing),
  as well as on Esc and on `select(null)`.
- **Panel throttling**: the HUD reads `run.options`, which `LevelRun.update` refreshes every
  250 ms of round time and also on `select`, `pick`, `assigned`, `arrive` and `repaired`.

## Complexity Tracking

No constitution violations to justify.

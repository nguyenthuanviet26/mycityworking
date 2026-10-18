# Implementation Plan: Trial Level

**Branch**: `005-trial-level` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-trial-level/spec.md`

## Summary

This plan turns **Play** into the first complete, winnable round of CaptAIn. On a small trial
city, a fixed schedule of incidents (cracked roads, damaged roofs) appears through three storm
phases (Drizzle → Downpour → Peak storm). The player selects an incident and sends the repair
truck, which drives the shortest road route to it, repairs it and drives back. Unrepaired
incidents turn urgent and drain the City condition meter, and each repair wins some of it
back. Reaching 6 repairs marks the goal, and play goes on until the storm clears. The result
card shows win or lose and 1–3 stars, with Retry and Main menu. Tutorial hints guide the first
repair.

Technical approach:

- **Rules** live in new DOM-free domain/application modules (`findRoute`, `incidentKinds`,
  `checkLevel`, `Crew`, `Round`, `Hints`, `LevelRun`), all advanced by `update(dtMs)` from the
  existing frame loop and fully unit-tested.
- **Presentation** is a canvas layer (truck, pins, progress rings, edge arrows) and a DOM HUD
  (top bar, incident panel, banners, hints, result card).
- **The level** is a data file (`levels/trial.js`) on a decorator-made map (`maps/trial.js`).
- **Pausing**: the round only advances in the `playing` screen state, so pausing, menus and a
  hidden tab freeze it without any extra code paths.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2020 as classic `<script>` files (no modules). Unchanged.

**Primary Dependencies**: None (no new libraries)

**Storage**: None. No progress or best scores are saved, as the spec says. The hint-skip choice lasts only for the session.

**Testing**: The existing in-browser harness `tests/index.html`. New suites: route, level-checks, crew, round, hints, level-run, vehicle-art. Extended suites: screens, rain, architecture.

**Target Platform**: Current desktop Chrome/Edge/Firefox, over `file://` and static hosting

**Project Type**: Browser game (single static front end)

**Performance Goals**:

- 60 FPS with 4 active incidents, the truck moving and the heaviest rain (SC-005).
- A route is found in well under 1 ms on a 20×20 map.
- Retry is back in a fresh round in under 2 s (SC-006). No reload and no image loading happen on retry.

**Constraints**:

- No build, install or server (Principle VI).
- The round must be repeatable on every play (FR-004).
- Per-frame code must not allocate without bound. The rain pool is fixed, the marker drawing reuses its paths, and route search only runs on send and redirect.
- An invalid level must never break boot: the game falls back to free look.

**Scale/Scope**: About 12 new source and data files, 9 changed files, and 7 new plus 3 extended test files. One level and one map of about 20×20 tiles, with 10 scheduled incidents.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Always-Playable Build | Work is ordered P1 → P2 → P3, and each story leaves a playable game. `checkLevel` failure falls back to today's free-look map. `?map=<other>` keeps free look | ✅ |
| II. Core Loop First | This feature *is* the core loop (incident → send → travel → repair → score). The stories are independently demoable (spec) | ✅ |
| III. Tested Logic, Playtested Presentation | All rules (route, crew, round, phases, meter, stars, hints, flow) are in domain/application and unit-tested without the game page. The canvas layer, HUD and rain are covered by the playtest checklist in quickstart §2 | ✅ |
| IV. Performance Budget | BFS on send only. Fixed rain pool of 400 drops. The redraw is already dirty-flagged. Playtest step 26 checks 60 FPS in the worst case. About 8 small truck images are added, roughly 20 KB | ✅ |
| V. Simplicity | No new libraries, no event bus beyond the existing emitter, no fixed-step engine. `LevelRun` exists only to keep flow logic out of `main.js` (Principle VII) | ✅ |
| VI. Browser-Only, Zero-Install | Plain JS/CSS/HTML files plus data scripts in `levels/` and `maps/`. Works from `file://` | ✅ |
| VII. Clean Architecture | Every file's layer is listed below. Domain and application never touch the DOM, canvas or picture paths (truck pictures live in `adapters/art/vehicle-art.js`). `main.js` only wires. The architecture test is extended to cover the new modules | ✅ |

**Post-design re-check (after Phase 1)**: still all ✅.

- The data model keeps pictures out of incidents and the crew: they hold facing names and
  states only, and adapters pick the files.
- `Round` changes tile/object variants through the domain `GameMap` API, exactly as the
  developer `V` key does today.
- The HUD reads state through `LevelRun` and never changes the round directly except through
  `select`, `sendCrew` and `skipHints`.

## Project Structure

### Documentation (this feature)

```text
specs/005-trial-level/
├── plan.md              # This file
├── research.md          # Phase 0: design decisions R1–R12
├── data-model.md        # Phase 1: level, incident, crew, round, hints, screen states
├── quickstart.md        # Phase 1: automated suites + playtest checklist
├── contracts/
│   ├── level-definition.md   # levels/*.js format + checkLevel rules
│   ├── play-ui.md            # HUD, markers, panel, controls, hints, result card
│   └── new-apis.md           # module APIs by layer
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
js/
├── domain/
│   ├── route.js              # NEW  findRoute, workTiles (BFS on road/bridge)
│   ├── incident-kinds.js     # NEW  road / building incident kinds
│   └── level-checks.js       # NEW  checkLevel(level, map)
├── application/
│   ├── crew.js               # NEW  Crew movement, facing, repair state
│   ├── round.js              # NEW  clock, phases, schedule, incidents, meter, score, result
│   ├── hints.js              # NEW  tutorial hint steps
│   ├── level-run.js          # NEW  ties Round + Hints to the screen flow
│   ├── screens.js            # CHANGED  "result" state, finish/retry
│   ├── game-session.js       # CHANGED  start view on retry; level start view
│   └── rain.js               # CHANGED  setIntensity / active drop count
├── adapters/
│   ├── art/vehicle-art.js    # NEW  truck picture per facing
│   ├── render/level-layer.js # NEW  crew drawable, pins, rings, edge arrows, click hit-test
│   ├── render/rain-layer.js  # CHANGED  eased intensity, 400-drop pool
│   ├── ui/hud.js             # NEW  top bar, panel, banners, hint bubble, result card
│   ├── ui/menu.js            # CHANGED  result screen, pause on hidden tab
│   └── input/input.js        # CHANGED  optional clickHandler hook
├── infrastructure/
│   └── level-registry.js     # NEW  MCW.levels.register/get/forMap
└── main.js                   # CHANGED  pick + check level, load truck images, wire run/layer/HUD

levels/trial.js               # NEW  [infrastructure data] trial level definition
maps/trial.js                 # NEW  [infrastructure data] ~20×20 trial city (made in the decorator)
css/hud.css                   # NEW  [adapters] HUD, panel, banners, hints, result card
index.html                    # CHANGED  HUD + result markup, new script/style tags, How to Play text

tests/
├── domain/route.test.js, domain/level-checks.test.js                       # NEW
├── application/crew.test.js, round.test.js, hints.test.js, level-run.test.js  # NEW
├── adapters/vehicle-art.test.js                                            # NEW
├── application/screens.test.js, application/rain.test.js                   # EXTENDED
├── architecture.test.js                                                     # EXTENDED (new names per layer)
└── index.html                                                               # CHANGED (new scripts)
```

**Structure Decision**: This keeps the existing single static front end and the Principle VII
folder layout. Level data sits in a new top-level `levels/` folder next to `maps/`, because
both are content files loaded by script tags that only call a registry.

### Notes for implementation

- **Esc order**: when the incident panel is open, the HUD's key handler consumes Esc first (it
  closes the panel); otherwise `MenuUI` pauses as today.
- **Restoring the map**: `Round.reset()` (on retry and on returning to the menu) switches every
  damaged target back to `normal`, so the menu background and the next round start clean
  (playtest step 18).
- **Default map**: with no `?map=`, boot uses the trial level's map instead of
  `sample-city`. The README "Play" section and the URL settings list are updated to match.

## Complexity Tracking

No constitution violations to justify.

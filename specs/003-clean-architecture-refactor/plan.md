# Implementation Plan: Clean Architecture Refactor

**Branch**: `003-clean-architecture-refactor` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-clean-architecture-refactor/spec.md`

## Summary

Reorganise the existing ~2,000 lines into `js/domain/`, `js/application/`, `js/adapters/` and
`js/infrastructure/` (Constitution Principle VII) with zero behaviour change. Two real design
fixes: (1) pictures leave the domain — the object catalog splits into domain rules and adapter
art, and the per-tile picture cache moves from `GameMap` into a new `TerrainArt` adapter;
(2) game flow leaves `main.js` — a new application `GameSession` owns the start view,
pause/resume view restore and the menu-background drift. A test that scans function source per
layer enforces the dependency rule over `file://`. Baseline screenshots, tests and draw time
are captured first and compared at the end.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2020, classic scripts (unchanged)

**Primary Dependencies**: None

**Storage**: N/A

**Testing**: In-browser harness (`tests/index.html`), reorganised by layer; new architecture test

**Target Platform**: Current desktop Chrome/Edge/Firefox, `file://` and static hosting (unchanged)

**Project Type**: Browser game (single static front end)

**Performance Goals**: Big-map draw time within +10% of baseline (≈ 3.25 ms at 0.5×)

**Constraints**: No behaviour change; no build/install; tests must not load drawing code

**Scale/Scope**: ~22 source files moved/split, 1 new application module, 3 new test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Always-Playable Build | Work done in small steps, each ending with tests green and the game starting (research R9) | ✅ |
| II. Core Loop First | Enabling refactor, no new features; explicitly scoped to "no behaviour change" | ✅ (justified in spec Overview) |
| III. Tested Logic | Domain + application tested without the game page; new tests for GameSession | ✅ |
| IV. Performance | Draw time measured before/after, ≤ +10% | ✅ |
| V. Simplicity | Only one new runtime object (GameSession) and one adapter cache (TerrainArt); no interfaces/base classes; selection port is a plain 2-function object | ✅ |
| VI. Zero-Install | Still classic scripts, no tools; architecture check runs in the browser | ✅ |
| VII. Clean Architecture | This feature implements it; every file assigned a layer in contracts/layer-map.md | ✅ |

**Post-design re-check**: ✅ All gates pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/003-clean-architecture-refactor/
├── plan.md
├── research.md              # R1–R9
├── data-model.md            # split structures, GameSession, SelectionPort
├── quickstart.md            # baseline capture + 13 after-checks
├── contracts/
│   ├── layer-map.md         # old → new file table, script order, forbidden references
│   └── new-apis.md          # objectTypes, GameSession, objectArt, TerrainArt, Renderer, main.js duties
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks
```

### Source Code (after the refactor)

```text
index.html                       # script tags re-ordered by layer
js/
├── domain/                      # entities + rules; no browser, no pictures
│   ├── namespace.js
│   ├── iso.js
│   ├── terrain.js
│   ├── collision.js
│   ├── object-types.js          # NEW (rules half of catalog)
│   ├── game-map.js              # art cache removed; emits terrainchange
│   └── map-parser.js
├── application/                 # use cases + flow; depends on domain only
│   ├── camera.js
│   ├── screens.js
│   ├── attract.js
│   ├── rain.js
│   └── game-session.js          # NEW (flow from main.js)
├── adapters/
│   ├── art/
│   │   ├── object-art.js        # NEW (pictures half of catalog)
│   │   └── terrain-art.js       # was core/autotile.js + TerrainArt cache
│   ├── render/
│   │   ├── renderer.js
│   │   ├── debug-overlay.js
│   │   └── rain-layer.js
│   ├── input/
│   │   └── input.js
│   └── ui/
│       └── menu.js
├── infrastructure/
│   ├── assets.js
│   └── map-registry.js
└── main.js                      # composition root only
maps/                            # unchanged
tests/
├── index.html                   # loads domain, application, adapters/art only
├── harness.js
├── architecture.test.js         # NEW
├── domain/{iso,map-parser,game-map}.test.js
├── application/{camera,screens,attract,rain,game-session}.test.js   # game-session NEW
└── adapters/{terrain-art,object-art}.test.js                        # object-art NEW
```

**Structure Decision**: One static project; layer = folder. Old folders `js/core`, `js/render`,
`js/input`, `js/ui`, `js/maps` are removed when empty.

## Complexity Tracking

No constitution violations.

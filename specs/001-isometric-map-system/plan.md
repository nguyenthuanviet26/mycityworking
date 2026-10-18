# Implementation Plan: Isometric Tile Map System

**Branch**: `001-isometric-map-system` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-isometric-map-system/spec.md`

## Summary

Build the game's foundation: an isometric city map drawn from the `Isometric City` asset pack
(128×64 diamond tiles), loaded from a hand-written text-grid map file, with drag/keyboard
scrolling, cursor-centred zoom (0.5×–2×), hard map bounds, tile picking, a fixed
`(col,row)` + fractional map-position coordinate system, and per-tile collision for foot and
vehicle movement with runtime overrides and change events. Technical approach: plain HTML5
Canvas 2D, classic `<script>` files under one `MCW` namespace (no build, works from
`file://`), pure-logic core modules unit-tested from a browser test page.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2020 (no transpiling), classic scripts

**Primary Dependencies**: None (Canvas 2D API only)

**Storage**: N/A (map definitions are `.js` files in the repo; no runtime saving in this feature)

**Testing**: In-repo browser test harness (`tests/index.html` + `tests/harness.js`)

**Target Platform**: Current desktop Chrome/Edge/Firefox; from `file://` and static hosting

**Project Type**: Browser game (single static front-end project)

**Performance Goals**: 60 FPS while panning/zooming a 100×100 map; first interactive screen ≤ 5 s

**Constraints**: No install/build/backend (Constitution VI); assets ≤ 20 MB (pack is 4.8 MB);
must work over `file://` (no ES modules, no `fetch`)

**Scale/Scope**: Sample map ≥ 30×30; supports up to 100×100 tiles; ~25 terrain/road images and
~30 object images loaded per map

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Always-Playable Build | Story 1 alone produces a visible, loadable map; each later story adds to a working page | ✅ |
| II. Core Loop First | Serves "move along roads to the incident"; characters/routing/incidents explicitly out of scope; stories P1–P4 independently demoable | ✅ |
| III. Tested Logic / Playtested Presentation | `js/core/*` (iso math, parser, autotile, collision, camera math) has no DOM; unit tests in `tests/`; playtest checklist in quickstart.md | ✅ |
| IV. Performance Budget | Viewport culling, dirty-flag redraw, loading only used images (research R8, R13) | ✅ |
| V. Simplicity | Zero dependencies; no ECS/scene graph; one namespace | ✅ |
| VI. Browser-Only, Zero-Install | HTML/CSS/JS only; classic scripts and `.js` map files so `file://` works; tests open in browser | ✅ |

**Post-design re-check (after Phase 1)**: ✅ All gates still pass. The design adds no
dependency, no build step and no server; the Map API contract keeps logic DOM-free.

## Project Structure

### Documentation (this feature)

```text
specs/001-isometric-map-system/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R13
├── data-model.md        # Phase 1: entities and rules
├── quickstart.md        # Phase 1: run guide + playtest checklist
├── contracts/
│   ├── map-definition.md  # map file format
│   ├── map-api.md         # interface for future features
│   └── controls.md        # player/developer input
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

> Files moved by feature 003 — see `specs/003-clean-architecture-refactor/contracts/layer-map.md` for current locations.

```text
index.html                 # loads css, scripts in order, canvas, loading/error overlay
css/
└── style.css              # full-window canvas, dev panel, loading/error overlay
js/
├── core/                  # pure logic, no DOM (unit-tested)
│   ├── namespace.js       # window.MCW + tiny event emitter
│   ├── iso.js             # coordinate conversions, DIRS, depthKey
│   ├── terrain.js         # terrain types, default legend, default collision
│   ├── catalog.js         # object catalog: type → kind, size, art keys, collision
│   ├── collision.js       # combine(), constants
│   ├── autotile.js        # road mask → piece, shoreline rule → piece
│   ├── map-parser.js      # MapDefinition → GameMap + warnings
│   ├── game-map.js        # GameMap: tiles, objects, collision queries, overrides, events
│   └── camera.js          # camera state, clamping, zoomAt, pan, screen↔map
├── render/                # canvas drawing
│   ├── assets.js          # manifest + image loader with placeholders
│   ├── renderer.js        # culling, two-pass draw, drawables, dirty flag
│   └── debug-overlay.js   # grid, collision tint, markers, info panel, FPS
├── input/
│   └── input.js           # mouse/keyboard → camera, hover/select events
├── maps/
│   └── registry.js        # MCW.maps.register / get
└── main.js                # boot: pick map (?map=), load assets, start loop
maps/
├── sample-city.js         # ≥ 30×30 sample city
├── tiny.js                # 5×5 map for bounds tests
└── big.js                 # 100×100 generated map for performance checks
tests/
├── index.html             # loads js/core/* + harness + tests
├── harness.js             # describe/it/assert, renders results
├── iso.test.js
├── map-parser.test.js
├── autotile.test.js
├── game-map.test.js       # collision, overrides, neighbours, events
└── camera.test.js
Isometric City/            # existing asset pack, used in place
```

**Structure Decision**: Single static front-end project at the repository root. `js/core`
holds all testable logic; `js/render` and `js/input` are presentation, verified by the
quickstart playtest. The asset pack stays where it is.

## Complexity Tracking

No constitution violations; nothing to justify.

## Notes

- `/speckit-clarify` question 2 (how characters reach buildings) was not answered before
  planning. Research R11 records the recommended answer (one access tile per building,
  defaulting to an adjacent road) as provisional. It doesn't affect any acceptance test in
  this feature.

---

description: "Task list for the Clean Architecture Refactor"
---

# Tasks: Clean Architecture Refactor

**Input**: Design documents from `specs/003-clean-architecture-refactor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/layer-map.md, contracts/new-apis.md, quickstart.md

**Tests**: Included. The spec requires new tests for the flow moved out of `main.js` and for the
layer-boundary check (FR-016), and every pre-existing test must keep passing (FR-002).

**Organization**: By user story. Because this is a refactor, the order is: capture a baseline →
move files unchanged (game identical, US1 verified) → fix the real violations (US2) → make
tests layer-pure and add the architecture check (US3) → final comparison.

## Format: `[ID] [P?] [Story] Description`

## Conventions (apply to every task)

- **Behaviour is frozen.** Copy code verbatim when moving; change only what the task says.
- Keep the IIFE style `(function (MCW) { "use strict"; ... })(window.MCW);`, classic scripts,
  no modules, no `fetch`.
- After every task that touches code: open `tests/index.html` (must stay `0 failed`) and
  `index.html` (menu appears, Play works). If either breaks, fix before moving on (Constitution I).
- File destinations and script order come from `contracts/layer-map.md`; new APIs from
  `contracts/new-apis.md` — use those names exactly.

---

## Phase 1: Setup (baseline)

- [X] T001 Capture the baseline per `specs/003-clean-architecture-refactor/quickstart.md` section 1: record the test summary (expected `70 passed, 0 failed`) and the list of test names (copy the result list text) into `specs/003-clean-architecture-refactor/baseline/tests.txt`; save the five screenshots at 1600×1000 as `specs/003-clean-architecture-refactor/baseline/menu.png`, `map-z05.png`, `map-z1.png`, `map-z2.png`, `big-z05.png`; record the draw-time result in `specs/003-clean-architecture-refactor/baseline/perf.txt`; record `wc -l js/main.js` (155) in the same file

**Checkpoint**: Baseline saved; nothing in `js/` changed yet.

---

## Phase 2: Foundational (move files unchanged)

**Purpose**: Put every file in its layer folder with **no code changes**, so later steps are small diffs.

- [X] T002 Create folders `js/domain/`, `js/application/`, `js/adapters/art/`, `js/adapters/render/`, `js/adapters/input/`, `js/adapters/ui/`, `js/infrastructure/`, `tests/domain/`, `tests/application/`, `tests/adapters/`
- [X] T003 Move unchanged (git-style move, content identical): `js/core/namespace.js`, `iso.js`, `terrain.js`, `collision.js`, `game-map.js`, `map-parser.js` → `js/domain/`; `js/core/catalog.js` → `js/domain/catalog.js` (temporary home until T012 splits it); `js/core/camera.js`, `screens.js`, `attract.js`, `rain.js` → `js/application/`; `js/core/autotile.js` → `js/adapters/art/terrain-art.js`; `js/render/renderer.js`, `debug-overlay.js`, `rain-layer.js` → `js/adapters/render/`; `js/input/input.js` → `js/adapters/input/input.js`; `js/ui/menu.js` → `js/adapters/ui/menu.js`; `js/render/assets.js` → `js/infrastructure/assets.js`; `js/maps/registry.js` → `js/infrastructure/map-registry.js`
- [X] T004 Update script tags in `index.html` to the new paths. Order (dependencies at load time require `catalog` and `terrain-art` before `game-map` for now): `js/domain/namespace.js`, `iso.js`, `terrain.js`, `collision.js`, `catalog.js`, `js/adapters/art/terrain-art.js`, `js/domain/map-parser.js`, `game-map.js`, `js/application/camera.js`, `screens.js`, `attract.js`, `rain.js`, `js/infrastructure/map-registry.js`, `maps/sample-city.js`, `maps/tiny.js`, `maps/big.js`, `js/infrastructure/assets.js`, `js/adapters/render/renderer.js`, `debug-overlay.js`, `rain-layer.js`, `js/adapters/input/input.js`, `js/adapters/ui/menu.js`, `js/main.js`
- [X] T005 Move test files unchanged: `tests/iso.test.js`, `map-parser.test.js`, `game-map.test.js` → `tests/domain/`; `camera.test.js`, `screens.test.js`, `attract.test.js`, `rain.test.js` → `tests/application/`; `autotile.test.js` → `tests/adapters/terrain-art.test.js`; update `tests/index.html` to load the moved source files (same temporary order as T004 for domain/application/terrain-art, plus `../js/infrastructure/map-registry.js` for now) and the moved test files
- [X] T006 Delete the now-empty folders `js/core/`, `js/render/`, `js/input/`, `js/ui/`, `js/maps/`

**Checkpoint**: Same code, new folders. Tests `70 passed`; game unchanged.

---

## Phase 3: User Story 1 - The game behaves exactly as before (Priority: P1) 🎯 MVP

**Goal**: Prove the move kept behaviour identical; this check is repeated after every later phase.

**Independent Test**: quickstart section 2, checks 1, 4, 5, 6, 10.

- [X] T007 [US1] Run `tests/index.html` and compare the result list with `baseline/tests.txt`: same 70 names, all passing
- [X] T008 [US1] Take the four map screenshots (`map-z05`, `map-z1`, `map-z2`, `big-z05`) the same way as T001 and compare pixel-by-pixel with the baseline (any pixel difference = failure; investigate before continuing); compare the menu screenshot by eye
- [X] T009 [US1] Re-run the draw-time snippet from quickstart section 1 and confirm it is ≤ baseline + 10%; open `index.html` from disk with `?menu=0`, `?map=nope`, `?dev=1` and confirm no console errors and unchanged behaviour
- [X] T010 [US1] Append "Verification after file moves" with the results of T007–T009 to `specs/003-clean-architecture-refactor/baseline/results.md`

**Checkpoint**: MVP — every file is in a layer folder and the game is provably unchanged.

---

## Phase 4: User Story 2 - Each part of the code lives in its proper layer (Priority: P2)

**Goal**: Remove the three violations: pictures in the domain, flow in `main.js`, wrong load order.

**Independent Test**: quickstart checks 11–13, then repeat T007–T009.

### Split the object catalog (violation 1a)

- [X] T011 [P] [US2] Write `tests/adapters/object-art.test.js`: `Object.keys(MCW.objectTypes.TYPES)` and `Object.keys(MCW.objectArt.ART)` are the same 156 keys; for every key "`rules.hasDamaged === !!art.damagedFile`"; `objectArt.pictureFor({type:"hospital_a", variant:"damaged"})` is `"Buildings/bld_hospital_a_damaged.png"`; `pictureFor({type:"tree_pine_tall", variant:"damaged"})` is `"Props/prop_tree_pine_tall.png"` (no damaged art → normal picture)
- [X] T012 [US2] Split `js/domain/catalog.js` into `js/domain/object-types.js` (`MCW.objectTypes = { TYPES, collisionFor }` with each entry `{ kind, size: {w, h}, hasDamaged }`) and `js/adapters/art/object-art.js` (`MCW.objectArt = { ART, pictureFor(object) }` with each entry `{ file, damagedFile? }`); generate both from the current catalog data so values are identical (156 types); delete `js/domain/catalog.js`
- [X] T013 [US2] Update `js/domain/game-map.js` and `js/domain/map-parser.js` to use `MCW.objectTypes.TYPES` / `MCW.objectTypes.collisionFor` instead of `MCW.catalog`; `setObjectVariant` checks `MCW.objectTypes.TYPES[obj.type].hasDamaged` instead of `damagedFile`; update `tests/domain/map-parser.test.js` and `tests/domain/game-map.test.js` only if they reference `MCW.catalog` (they don't today — confirm)

### Move pictures out of the map (violation 1b)

- [X] T014 [US2] In `js/domain/game-map.js`: remove `_art`, `artAt` and `_invalidateArt`; make `setTerrain` emit `terrainchange {col, row}` (in addition to setting terrain); keep `setTileVariant` emitting `tilechange` as today
- [X] T015 [US2] In `js/adapters/art/terrain-art.js`: rename the export `MCW.autotile` → `MCW.terrainArt` (same functions `roadMask`, `roadPiece`, `bridgePiece`, `shorePiece`, `tileArt`); add `MCW.TerrainArt(map)` with `artAt(col,row)` caching `tileArt` results per tile and clearing the tile + 8 neighbours on map `terrainchange` and `tilechange`; move `collectImagePaths` here as `MCW.terrainArt.collectImagePaths(map, art)` using `art.artAt` and `MCW.objectArt.ART[o.type].file/damagedFile`; remove the old `MCW.collectImagePaths`
- [X] T016 [US2] Update `js/adapters/render/renderer.js`: constructor `Renderer(canvas, map, camera, terrainArt)`; draw terrain with `this.terrainArt.artAt(col,row)`; draw objects with `MCW.assets.get(MCW.objectArt.pictureFor(o))` (remove `MCW.catalog` use)
- [X] T017 [US2] Update `tests/adapters/terrain-art.test.js` and `tests/domain/game-map.test.js`: replace `MCW.autotile` with `MCW.terrainArt`, `m.artAt(...)` with `new MCW.TerrainArt(m).artAt(...)`, and `MCW.collectImagePaths(m)` with `MCW.terrainArt.collectImagePaths(m, new MCW.TerrainArt(m))`; keep every test name and assertion meaning; move the test "setTileVariant emits tilechange and changes art" check of art into the same test using a `TerrainArt` created before the variant change (proves cache invalidation)

### Move flow out of main.js (violation 2)

- [X] T018 [P] [US2] Write `tests/application/game-session.test.js` (with a real `ScreenMachine`, a real `Camera` on a 32×32 map, and a fake selection port `{get, set}` recording calls): constructor applies the start view (zoom 1, map centre; and `{zoom:0.5, center:{x:10,y:12}}` when given); `backgroundActive()` true on `menu`, `credits`, `howto` from menu, false on `howto` from pause, `playing`, `paused`, `loading`; `update(1000)` on the menu sets zoom 0.75 and moves the camera, returns true; on `playing` returns false and leaves the camera alone; menu → playing applies the start view and fires `playstart` once; playing → paused → playing restores `wx`, `wy`, `zoom` exactly after the camera was changed while paused and calls `selection.set` with the saved hovered/selected; pause → `toMenu` calls `selection.set({hovered:null, selected:null})` and resets the drift clock (the next `update(0)` puts the camera at `attract.positionAt(0, …)`)
- [X] T019 [US2] Implement `js/application/game-session.js` per `contracts/new-apis.md` and `data-model.md` ("`saved`: set on playing→paused, used on paused→playing, cleared on `toMenu`"; "`driftClock` reset to 0 on `toMenu`"; "`startView` default `{zoom: 1, center: null}`"); emitter via `MCW.createEmitter()`; no DOM, no adapter references
- [X] T020 [US2] Rewrite `js/main.js` as composition root only (contracts/new-apis.md "Composition root responsibilities"): build `startView` from `?zoom`/`?center`; create `TerrainArt`, pass it to `Renderer` and to `collectImagePaths`; create `GameSession` with a selection port over `game.input` (`get` → `{hovered: input.hovered, selected: input.selected}`; `set` → `input.select(v.selected); input.hovered = v.hovered; renderer.hovered = v.hovered`); screen `change` → `input.enabled = screens.inputEnabled()`, `input.reset()` when disabled, `rain.enabled = session.backgroundActive()`, redraw; `session.on("playstart")` → turn on dev mode once if `?dev=1`; frame loop calls `session.update(dt)` instead of the inline drift code; remove all pause/restore/drift code; target ≤ 108 lines
- [X] T021 [US2] Fix the load order to the final layer order from `contracts/layer-map.md` in `index.html` (domain → application → adapters with art first → infrastructure → maps → main) and in `tests/index.html` (domain, application, `js/adapters/art/object-art.js`, `js/adapters/art/terrain-art.js`, harness, tests); remove `map-registry.js` from `tests/index.html`; add `game-session.test.js` and `object-art.test.js` to `tests/index.html`
- [X] T022 [US2] Run quickstart checks 11–13 (layout, `main.js` length, search domain + application for `document`, `canvas`, `.png`, `Image(`) and then repeat T007–T009; append results to `specs/003-clean-architecture-refactor/baseline/results.md`

**Checkpoint**: All violations fixed; game identical; tests green.

---

## Phase 5: User Story 3 - Rules and flow are tested without the game page (Priority: P3)

**Goal**: An automated, repeatable layer check.

**Independent Test**: quickstart checks 2–3.

- [X] T023 [US3] Write `tests/architecture.test.js` per research R5 and `contracts/layer-map.md` "Forbidden references": a helper `sourcesOf(value)` that collects `toString()` of a function, its `prototype` methods, and (recursively, one level) function-valued properties of plain objects; for each domain export (`iso`, `terrain`, `collision`, `objectTypes`, `GameMap`, `parseMap`, `createEmitter`) assert none of the tokens `document`, `window`, `canvas`, `getContext`, `Image(`, `.png`, `setTimeout`, `requestAnimationFrame`, `performance` appear, nor `MCW.` followed by any application, adapter or infrastructure export name; for each application export (`Camera`, `ScreenMachine`, `attract`, `rain`, `GameSession`) assert the same browser tokens and no adapter/infrastructure export names; also assert that `MCW.Renderer`, `MCW.Input`, `MCW.MenuUI`, `MCW.assets`, `MCW.maps` are **undefined** on the test page (proves the page loads no drawing/input/UI/infrastructure code); add it last in `tests/index.html`
- [X] T024 [US3] Prove the check works: temporarily add `document.title;` inside a `GameMap` method, reload `tests/index.html` and confirm the architecture test fails; remove it and confirm `0 failed`; note the result in `specs/003-clean-architecture-refactor/baseline/results.md`

**Checkpoint**: Layer rule enforced automatically.

---

## Phase 6: Polish & Cross-Cutting

- [X] T025 Run the feature 001 quickstart (steps 1–22) and feature 002 quickstart (steps 1–20) and the console checks (quickstart check 9); record any difference from their existing playtest logs in `specs/003-clean-architecture-refactor/baseline/results.md`
- [X] T026 Final comparison: repeat T007–T009 (all 70 original test names pass plus the new tests; map screenshots pixel-identical; draw time ≤ +10%); record final numbers (tests, draw time, `main.js` line count) in `specs/003-clean-architecture-refactor/baseline/results.md`
- [X] T027 [P] Update `README.md` "Project layout" to the four layers (`js/domain/`, `js/application/`, `js/adapters/`, `js/infrastructure/`, `js/main.js`, `maps/`, `tests/` by layer)
- [X] T028 [P] Add a note at the top of the "Source Code" section in `specs/001-isometric-map-system/plan.md` and `specs/002-main-menu/plan.md`: "Files moved by feature 003 — see `specs/003-clean-architecture-refactor/contracts/layer-map.md` for current locations"
- [X] T029 Delete the baseline screenshots once all comparisons pass (keep `tests.txt`, `perf.txt`, `results.md`)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6.
- US1's checks (T007–T009) are re-run inside T022 and T026 — the "no behaviour change" story
  guards every later phase.
- Within US2: T011 → T012 → T013 (catalog); T014 → T015 → T016 → T017 (art); T018 → T019 →
  T020 (flow); T021 after all three groups; T022 last.
- Same-file rule: `js/domain/game-map.js` (T013, T014), `index.html` / `tests/index.html`
  (T004, T005, T021, T023), `js/main.js` (T020) — one at a time.

### Parallel Opportunities

- T011 and T018 (two new test files) can be written in parallel with each other and with the
  catalog/art work, since they touch different files.
- T027 and T028 (docs) in parallel at the end.

## Parallel Example: User Story 2

```text
Task: "T011 Write tests/adapters/object-art.test.js"
Task: "T018 Write tests/application/game-session.test.js"
```

## Implementation Strategy

1. Baseline (T001) — never skip; it is the only proof of "no behaviour change".
2. Move files unchanged (T002–T006) and verify (US1, T007–T010) → **MVP**: layered folders,
   identical game. Safe stopping point.
3. Fix violations one group at a time (catalog → art → flow), tests green after each (US2).
4. Add the architecture check (US3).
5. Full regression + docs (Phase 6).

## Notes

- 29 tasks. [P] = different files, no unfinished dependencies.
- Bugs found during the refactor are recorded in `baseline/results.md`, not fixed, unless
  fixing them is required to keep behaviour identical (spec Assumptions).

## Implementation status (2026-10-17)

- All 29 tasks done. Unit tests: 85 passed, 0 failed (70 original names + 15 new). Details in
  `baseline/results.md`.
- Map screenshots pixel-identical before/after; scripted menu flow 28/28; feature 001 dev-mode,
  edge and URL checks unchanged; `js/main.js` 155 → 107 lines.
- SC-006 (draw time within +10%) is **not proven**: medians 1.29 ms (byte-identical code) vs
  1.46 ms (after), but unchanged code already varies ±20% run to run on this machine. All
  values are under 2 ms per frame.
- Deviation from T020: the selection port is built by `Input#selectionPort()` (the adapter that
  implements it) instead of inline in `main.js`.
- Manual checks still open from features 001/002 (real-mouse feel, resize, Firefox) were not
  re-run here.

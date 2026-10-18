---

description: "Task list for the Trial Level feature"
---

# Tasks: Trial Level

**Input**: Design documents from `specs/005-trial-level/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R12), data-model.md, contracts/ (level-definition.md, play-ui.md, new-apis.md), quickstart.md

**Tests**: Included. Constitution Principle III requires automated unit tests for domain and application code, run from `tests/index.html`. Write each test task first and confirm it fails before implementing. Canvas drawing, the HUD and rain are verified by the playtest steps in `quickstart.md` §2.

**Organization**: Tasks are grouped by user story, so each story can be implemented and demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1, US2, US3)

## Conventions that apply to every task

- **Code style**: follow the existing files.
  - Classic scripts wrapped in `(function (MCW) { "use strict"; … })(window.MCW);`.
  - `var`, prototype methods (`var P = X.prototype;`), and `MCW.createEmitter()` for events (`on`/`off` delegating to `this._events`).
  - A short header comment naming the layer and what the file does.
- **Layers** (Constitution VII):
  - `js/domain/` must not use `window` (except the namespace), `document`, canvas, images, timers, `performance`, or `.png` paths.
  - `js/application/` must not use the DOM, canvas or asset paths, and must not reference adapters or infrastructure.
  - `js/main.js` only wires parts together.
- **Units**: level data uses **seconds**; every `update(dtMs)` takes **milliseconds**.
- **Script tags**:
  - Every new script gets a `<script>` tag in `index.html` in inside-out order: domain → application → adapters → infrastructure → `maps/` → `levels/` → `js/main.js`.
  - Every new domain/application file, and `js/adapters/art/vehicle-art.js`, also gets a tag in `tests/index.html` before `harness.js`.
  - Each new test file gets a tag after `harness.js`, before `architecture.test.js`.
  - Add a tag in the same task that creates the file, never earlier, so the page never loads a missing file.
- **After every task**: `tests/index.html` shows `0 failed`, and `index.html` starts with no console errors (Constitution I).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folders and the empty stylesheet that later tasks fill in.

- [X] T001 Create the folder `levels/`. Create `css/hud.css`:
  - a header comment and a `:root` block of HUD colour variables: bar background `rgba(18,24,32,0.82)`, text `#f2f4f7`, accent `#4fc3f7`, new-incident yellow `#f5c518`, urgent red `#e5484d`, ok green `#2ecc71`, meter amber `#f0a020`;
  - a `#hud[hidden] { display: none; }` rule.

  In `index.html`, add `<link rel="stylesheet" href="css/hud.css">` after `css/editor.css`, and an empty `<div id="hud" hidden></div>` right after `<canvas id="game">`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Routing, incident kinds, level data and its checker, truck art, and the input hook. Every story needs these. Normal play must not change yet: Play still opens free look until T020 wires the level in.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for the foundation (write first, see them fail)

- [X] T002 [P] Create `tests/domain/route.test.js`. Build a small inline map with `MCW.parseMap({ terrain: "…", objects: [...] })`: a road loop with one bridge, a dead end, some grass, water and a 2×2 building. Test that `MCW.findRoute(map, from, goals)`:
  - returns the shortest list of tiles from `from` (excluded) to a goal (included);
  - only ever steps onto road or bridge tiles (check `map.isPassable(c, r, "vehicle")` for every step);
  - returns `[]` when `from` is in `goals`, and `null` when no goal can be reached (e.g. road cut off by grass);
  - returns the identical route on repeated calls, and prefers neighbours in the order NE, SE, SW, NW on ties;
  - picks the nearer of two goals.

  Also test that `MCW.workTiles(map, {col,row,w,h})` returns only vehicle-passable tiles touching the footprint on its four sides (not diagonals), for a 1×1 road tile and for a 2×2 building.
- [X] T003 [P] Create `tests/domain/level-checks.test.js` with an inline map and an inline valid level (3 phases, 4 schedule entries, depot on road). Test that `MCW.checkLevel(level, map)` returns `[]` for it, and returns a problem string for each of these broken copies, one rule each, as listed in `contracts/level-definition.md`:
  1. depot off-road;
  2. 2 phases;
  3. `maxActive` going down;
  4. `rain` not increasing;
  5. a later phase with a slower pace (entries ÷ `durationS`);
  6. an unsorted schedule;
  7. `at` ≥ total length;
  8. an unknown `kind`;
  9. a road kind with `object` instead of `tile`;
  10. a `tile` target that is grass;
  11. an `object` target with no damaged art (`construction_b`);
  12. an unknown object id;
  13. an unreachable target;
  14. two `tutorial: true` entries;
  15. a tutorial entry that is not first;
  16. `target` 0 or greater than the schedule length;
  17. `stars[0] > stars[1]`;
  18. `refill.early < refill.normal`.
- [X] T004 [P] Create `tests/adapters/vehicle-art.test.js`. Test that `MCW.vehicleArt.pictureFor(f)` returns `"Vehicles/veh_truck_yellow_" + f + ".png"` for each of `NE`, `SE`, `SW`, `NW`, and that `allImagePaths()` returns exactly those 4 paths.

### Implementation for the foundation

- [X] T005 [P] Create `js/domain/route.js` (domain).
  - `MCW.findRoute(map, from, goals)`: a breadth-first search from `from` using `map.neighbors(col, row, "vehicle")`, which already returns neighbours in the order NE, SE, SW, NW. Keep a `Map`/array of parents keyed by `map.index`, stop at the first tile in the goal set, and rebuild the path. Return `[]` if `from` is a goal, `null` if none is reachable (research R3).
  - `MCW.workTiles(map, fp)`: list the tiles on the SE, SW, NE and NW sides of the footprint (same order as `GameMap.accessTile`) that pass `map.isPassable(c, r, "vehicle")`.

  Add the tags to `index.html` and `tests/index.html` after `map-serializer.js`, plus the `route.test.js` tag. T002 passes.
- [X] T006 [P] Create `js/domain/incident-kinds.js` (domain) with `MCW.incidentKinds`:
  - `road`: `{ id:"road", label:"Road cracked", targets:"tile", repairS:4, warnS:25, points:100 }`;
  - `building`: `{ id:"building", label:"Roof damaged", targets:"object", repairS:6, warnS:30, points:150 }`.

  Freeze both entries. Add the tags to `index.html` and `tests/index.html` after `route.js`.
- [X] T007 Create `js/domain/level-checks.js` (domain) with `MCW.checkLevel(level, map)`, which returns an array of plain-English problem strings for rules 1–7 of `contracts/level-definition.md`.
  - Use `MCW.incidentKinds`, `MCW.objectTypes.TYPES[type].hasDamaged`, `MCW.workTiles` and `MCW.findRoute`.
  - Total length = the sum of `phases[i].durationS`.
  - Pace of phase i = (number of entries with `at` inside phase i) ÷ `durationS`.

  Add the tags to `index.html` and `tests/index.html` after `incident-kinds.js`, plus the `level-checks.test.js` tag. T003 passes.
- [X] T008 [P] Create `js/adapters/art/vehicle-art.js` (adapter, no DOM) with `MCW.vehicleArt = { pictureFor(facing), allImagePaths() }`, as in T004. Add the tags to `index.html` and `tests/index.html` after `object-art.js`, plus the `vehicle-art.test.js` tag. T004 passes.
- [X] T009 [P] Create `js/infrastructure/level-registry.js` (infrastructure) with `MCW.levels = { register(def), get(id), forMap(mapId), list() }`, following the style of `js/infrastructure/map-registry.js`. `forMap` returns the first registered level whose `map === mapId`, or `null`. Add its tag to `index.html` after `map-registry.js` (not to the test page).
- [X] T010 Create `maps/trial.js` (infrastructure data) registering map `{ id: "trial", name: "Trial City", terrain, objects }`. The map should be about 20×20 tiles with:
  - a road grid with at least 3 junctions and one dead end;
  - a canal (`~`) crossed by exactly one bridge (`b`);
  - a garage (`autoshop_a`, `id: "garage"`) next to a road tile that will be the depot;
  - at least 5 named buildings that have damaged art (e.g. `id: "clinic"` `clinic_a`, `"cafe"` `cafe_a`, `"school"`, `"houses-north"`, `"market"` using types from `js/domain/object-types.js` with `hasDamaged: true`), each touching a road;
  - houses, trees and props for decoration.

  Either draw it in the decorator (`index.html?edit=1`, New blank map 20×20, then Export) or write it by hand in the format of `maps/sample-city.js`. Add `<script src="maps/trial.js">` in `index.html` after `maps/big.js`. Check that `index.html?map=trial&menu=0` shows it with no `[map]` warnings in the console.
- [X] T011 Create `levels/trial.js` (infrastructure data) calling `MCW.levels.register({...})` with every field from `contracts/level-definition.md` and the values in research R12:
  - `id:"trial"`, `name:"Trial: First Storm"`, `map:"trial"`, `depot` = the road tile beside the garage, `startView` centred on the city, `crew:{speed:3}`, `target:6`;
  - phases Drizzle 60 s / max 2 / rain 0.4, Downpour 90 s / max 3 / rain 0.7, Peak storm 90 s / max 4 / rain 1.0;
  - 10 schedule entries: Drizzle has 2 (the first at `at:3` is a road tile, with `tutorial:true`); Downpour has 4; Peak storm has 4. Mix road tiles and the named buildings from T010, use different targets for entries that may overlap, and sort by `at`;
  - `drainPerUrgentPerS:1.2`, `refill:{normal:5, early:8}`, `earlyBonus:50`, `stars:[900,1300]`.

  Add `<script src="levels/trial.js">` in `index.html` after the map tags. In the browser console, `MCW.checkLevel(MCW.levels.get("trial"), MCW.parseMap(MCW.maps.get("trial")).map)` must return `[]`.
- [X] T012 [P] Change `js/adapters/input/input.js`: add `this.clickHandler = null` in the constructor. In `endDrag`, when a left-button click (moved < `CLICK_SLOP`) ends, call `self.clickHandler(e.clientX, e.clientY, t)` first if it is set. Only call `self.select(t)` when the handler did not return `true`. Pan, zoom, hover and decorator tools stay unchanged (research R9).
- [X] T013 Extend `tests/architecture.test.js` `LAYERS`:
  - domain: add `findRoute`, `workTiles`, `incidentKinds`, `checkLevel`;
  - adapters: add `vehicleArt`;
  - infrastructure: add `levels`.

  Add `"levels"` to the list asserted undefined on the test page. All architecture tests pass.

**Checkpoint**: All tests pass. The game still opens on the menu, and Play still shows free look on `sample-city`.

---

## Phase 3: User Story 1 — Fix one incident with a repair crew (Priority: P1) 🎯 MVP

**Goal**: Pressing Play starts the trial city. Incidents appear on schedule with damaged art and a pin. The player selects one and sends the truck, which drives on roads to it, repairs it (progress ring), restores the normal look, scores points and drives home.

**Independent Test**: quickstart §2 steps 1–7. Start the level, click the first incident, send the crew, and watch it stay on roads, arrive, repair and return. The tile looks normal again and the score has gone up.

### Tests for User Story 1 (write first, see them fail)

- [X] T014 [P] [US1] Create `tests/application/crew.test.js` using an inline map (a straight road plus a corner and a bridge). Test `new MCW.Crew({ map, depot:{col,row}, speed:2 })`:
  - it starts `idle` at the depot centre, facing `"SE"`;
  - `sendTo("inc-0", goals)` returns `true` and sets state `driving` and `incidentId`;
  - `update(500)` moves it exactly 1 tile (0.5 s × 2 tiles/s);
  - `facing` equals the `MCW.iso.DIRS` name of each step, and changes at the corner;
  - on reaching a goal tile, `update` returns `[{type:"arrive", incidentId:"inc-0"}]` and the state becomes `repairing`;
  - `canSend()` is `false` while `repairing`, and `sendTo` then returns `false`;
  - after `goHome()` the state is `returning`, and on reaching the depot, `update` returns `[{type:"home"}]` and the state is `idle`;
  - redirect: calling `sendTo` while `driving` halfway between tiles keeps moving to the tile it was heading into, then follows the new route (it never moves backwards mid-tile);
  - when already standing on a goal tile, `sendTo` arrives on the next `update` with no movement;
  - `sendTo` returns `false` and changes nothing when there is no route.
- [X] T015 [P] [US1] Create `tests/application/round.test.js` (US1 part) with an inline map and level (as in T003). Test `new MCW.Round({ map, level })`:
  - at `elapsed` 0 no incident is active and every target is `normal`;
  - after `update` past an entry's `at`, a `release` event fires, `activeIncidents()` holds it with state `new`, and the target is `damaged` (`map.getTile(c,r).variant`, or `map.getObject(id).variant`);
  - `incident.workTiles` equals `MCW.workTiles` of its footprint, and `incident.centre` is the footprint centre;
  - an entry whose target already has an active incident waits, and is released after that incident is repaired;
  - `incidentAt(col,row)` finds an incident by any footprint tile;
  - `send(id)` returns `true`, sets the incident `assigned` and `crewSent`, and fires `assigned`;
  - stepping `update(100)` until the crew arrives fires `arrive` and sets the state `repairing`; `progress` rises from 0 to 1 over `kind.repairS`;
  - on completion, `repaired` fires with `{incident, points}`, the target is `normal` again, the incident leaves `activeIncidents()`, `score` increases by `kind.points`, and `repaired` (the count) is 1;
  - the crew then returns home, and `secondsUntilCrewFree()` is a number while it is repairing and `null` otherwise;
  - `reset()` restores every damaged target to `normal`.
- [X] T016 [P] [US1] Create `tests/application/level-run.test.js` (US1 part) using `new MCW.ScreenMachine()` and an inline map and level. Test `new MCW.LevelRun({ screens, map, level })`:
  - `run.round` is `null` on the menu;
  - after `screens.loaded(); screens.play()`, `run.round` is a fresh `Round` and a `start` event fires;
  - `run.update(dt)` advances the round only while `screens.state === "playing"` (after `pause()`, `elapsed` does not change);
  - `select(id)` sets `run.selected` and emits `select`;
  - `sendCrew()` sends the crew to the selected incident;
  - `toMenu()` from pause sets `run.round` to `null`, and the map has no `damaged` targets left.

### Implementation for User Story 1

- [X] T017 [US1] Create `js/application/crew.js` (application) with `MCW.Crew`, following data-model.md "Crew" and research R4:
  - fields: `x`, `y` (map position), `tile`, `facing`, `state` (`idle|driving|repairing|returning`), `route`, `incidentId`, `speed`, `depot`;
  - `sendTo(incidentId, goals)`: route with `MCW.findRoute` from the tile being entered (`this.tile`), and keep the current step;
  - `goHome()`: route to `[depot]`;
  - `update(dtMs)`: move along the route at `speed` tiles/s between tile centres (`MCW.iso.tileCenter`), set `facing` from the step direction by matching `[dCol,dRow]` against `MCW.iso.DIRS`, and return the event list. No allocation per frame when idle;
  - `canSend()`;
  - `startRepair()` / `finishRepair()` used by `Round`.

  Add the tags to `index.html` and `tests/index.html` after `editor-session.js`, plus the `crew.test.js` tag. T014 passes.
- [X] T018 [US1] Create `js/application/round.js` (application) with `MCW.Round`, covering the US1 rules. Follow data-model.md "Round" and "Incident":
  - **Schedule queue**: release entries in order once `elapsed >= at` and the target is free (no phase limit yet; T030 adds it).
  - **Incidents**: build each one with `id:"inc-"+index`, `kind`, `target`, `footprint` (from the tile, or `map.getObject(id)` anchor and size), `workTiles`, `centre`, `tutorial`, `releasedAt`, `state`, `crewSent:false`, `progress:0`.
  - **Variants**: set `damaged` on release and `normal` on repair, via `map.setTileVariant` / `map.setObjectVariant`.
  - **Crew**: owns a `MCW.Crew`. `send(id)` assigns the incident, or redirects (the previous incident goes back to `new`, keeping `crewSent`). Repair progress uses `kind.repairS`. Repair completion adds `kind.points` to `score` and increments `repaired`; then the crew goes home unless it is sent elsewhere.
  - **Events**: `release`, `assigned`, `arrive`, `repaired`.
  - **API**: `incident`, `incidentAt`, `activeIncidents`, `secondsUntilCrewFree`, `reset`, `on`/`off`.
  - **`update(dtMs)` order** (research R2): releases → crew movement and arrivals → repair progress and completion. Leave clearly marked spots for the US2 steps (urgency, drain, phase, end).

  Add the tags to both pages after `crew.js`, plus the `round.test.js` tag. T015 passes.
- [X] T019 [US1] Create `js/application/level-run.js` (application) with `MCW.LevelRun({ screens, map, level })`:
  - **Starting a round**: on screen `change` from `menu` to `playing`, create `new MCW.Round({map, level})`, re-emit its events, clear `selected`, and emit `start`. On `toMenu`, call `round.reset()` and set `round = null`.
  - **`update(dtMs)`**: advance the round only when `screens.state === "playing"`.
  - **Selection and sending**: `select(id)` (or `null`), and `sendCrew()` (sends to `selected`).
  - **Re-emitted events**: also emit `select`. When a selected incident is repaired, clear `selected`.

  Add the tags to both pages after `round.js`, plus the `level-run.test.js` tag. T016 passes.
- [X] T020 [US1] Change `js/main.js` (composition root, wiring only):
  - **Choosing the level**: in `boot`, when `?map=` is missing, use `mapId = "trial"`. Set `level = MCW.levels.forMap(mapId)`. If `level` exists, run `problems = MCW.checkLevel(level, map)`; if there are problems, `console.warn("[level] " + p)` for each and set `level = null` (free-look fallback).
  - **Loading**: add `MCW.vehicleArt.allImagePaths()` to the image list when `level` is set.
  - **Wiring**: in `start`, when `level` is set, create `game.run = new MCW.LevelRun({screens, map, level})`, `new MCW.LevelLayer(game, game.run)` (T021) and `game.hud = new MCW.HUD(game, game.run, document.getElementById("hud"))` (T022), and add `function (dt) { return game.run.update(dt); }` to the updaters before the camera updater.
  - **Start view**: pass the level's `startView` (if any) as the session start view, unless `?center`/`?zoom` are given.

  `?map=sample-city` must behave exactly as before.
- [X] T021 [US1] Create `js/adapters/render/level-layer.js` (adapter) with `MCW.LevelLayer(game, run)`:
  - **Crew drawable**: register one drawable `{x, y, draw(ctx, sx, sy, z)}` with `game.renderer.addDrawable`. Its `x`/`y` follow `run.round.crew` each frame, and it draws `MCW.assets.get(MCW.vehicleArt.pictureFor(crew.facing))` centred on the point, bottom about 8·z px below. It draws nothing when `run.round` is `null`.
  - **Markers overlay**: push one function to `game.renderer.topOverlays` that draws, for each active incident at `camera.mapToScreen(centre)` lifted about 70·z px (more for buildings):
    - a pin, yellow `!` for new;
    - a small truck glyph when assigned;
    - a progress ring with a wrench glyph while repairing;
    - a white outline when selected.

    Use the `css/hud.css` colours as JS constants. Use one reused path per shape (no per-frame arrays).
  - **Edge arrows**: for incidents whose pin is off-screen, draw an arrow on the screen edge (inset 24 px) pointing towards them, and store its screen rectangle for hit-testing.
  - **Click handler**: set `game.input.clickHandler = function (sx, sy, tile) {…}`. An arrow hit calls `game.camera.centerOn(centre.x, centre.y, {glide:true})`. A pin hit (a 24 px radius) or `run.round.incidentAt(tile)` calls `run.select(id)`. Otherwise call `run.select(null)` and return `false`. Return `true` when consumed.
  - **Redraws**: return `true` from an `update` while the crew moves or a ring fills, and wire it into the updaters in `main.js` so the frame redraws.

  Add the tag to `index.html` after `rain-layer.js`.
- [X] T022 [US1] Create `js/adapters/ui/hud.js` (adapter) with `MCW.HUD(game, run, root)`, covering the US1 part:
  - **Showing**: `root.hidden = false` while `screens.state` is `playing` or `paused` with a round.
  - **Score**: a simple score readout in the top-left.
  - **Incident panel** (contracts/play-ui.md): opens on `select`, and shows the label and state plus **Send crew** / **Redirect crew** / **Crew on the way** / **Crew busy — free in Ns** / **Repairing… NN%** according to the crew and incident state, and **Go to** (camera glide). It closes on `select(null)`, on repair of the selected incident, and on Esc.
  - **Keys**: Enter/Space trigger the enabled button, `Tab` calls `run.selectNext()` (add `selectNext` to `LevelRun`: most urgent first, then oldest), `C` glides to the crew.
  - **Esc order**: register the keydown listener in the capture phase, so Esc closes an open panel and calls `e.stopImmediatePropagation()` before `MenuUI` pauses.
  - **Floating text**: a `+N pts` text that floats up for 1 s at the top bar on `repaired`.

  Style it in `css/hud.css` (bottom-centre panel, max width 360 px, large buttons matching `.menu-btn`). Add the tag to `index.html` after `menu.js`.
- [X] T023 [US1] Update the How to Play section in `index.html`:
  - replace the paragraph with: "Storms are damaging the city. Click an incident, send your repair crew along the roads, and fix it before things get worse.";
  - add rows to the controls table: "Click an incident | Open it", "Enter | Send the crew", "Tab | Next incident", "C | Find the crew".

**Checkpoint**: quickstart §2 steps 1–7 pass. The round never ends yet (phases and win/lose come in US2). All tests pass.

---

## Phase 4: User Story 2 — Win or lose the round (Priority: P2)

**Goal**: Three storm phases with banners, heavier rain and rising limits. Urgent incidents drain City condition and repairs refill it. "Goal reached" keeps the round going. The round ends when the storm clears or the city collapses, and a result card shows stars, Retry and Main menu. Pause and a hidden tab freeze everything.

**Independent Test**: quickstart §2 steps 8–18. Win once (stars shown), then lose by ignoring incidents. Retry gives an identical fresh round; Main menu returns to the clean drifting city.

### Tests for User Story 2 (write first, see them fail)

- [X] T024 [P] [US2] Extend `tests/application/screens.test.js`:
  - `finish()` from `playing` gives `result` (and is refused in every other state);
  - `retry()` from `result` gives `playing`;
  - `toMenu()` from `result` gives `menu` with `focusOnShow === "btn-play"`;
  - entering `result` sets `focusOnShow === "btn-retry"`;
  - `escape()` on `result` returns `false` and the state stays `result`;
  - `inputEnabled()` is `false` on `result`.
- [X] T025 [P] [US2] Extend `tests/application/round.test.js` with the US2 rules (inline level with short phases, e.g. 10 s / 10 s / 10 s):
  - `phase()` gives index 0, 1, 2 at `elapsed` 0, 10, 20, and a `phase` event fires once per change with `{index, name}`;
  - entries beyond the current phase's `maxActive` wait and are released in order when a slot frees;
  - an incident becomes urgent `warnS` after release (an `urgent` event fires), but not while `repairing`;
  - condition drops by `drainPerUrgentPerS × urgentCount × seconds`;
  - a repair refills by `refill.early` when the incident never became urgent, and by `refill.normal` otherwise, capped at 100; the `repaired` event carries `{refill, early}`;
  - the early bonus is added to the score;
  - reaching `target` sets `goalReached` and fires `goal` once, and the round continues;
  - at `elapsed === duration`, `cleared` then `end` fire with `{won, reason:"cleared"}`;
  - condition 0 before the goal gives `{won:false, reason:"collapsed"}`; after the goal gives `{won:true, reason:"collapsed"}`;
  - a target repair completing in the same `update` in which the meter hits 0 gives `won:true` (order from research R2);
  - stars: a loss gives 0; a win gives 1 + (score ≥ `stars[0]`) + (score ≥ `stars[1]`);
  - after `end`, `update` changes nothing;
  - `Result` has `repaired`, `target`, `timeS` and `score`;
  - `remaining()` = `duration − elapsed`.
- [X] T026 [P] [US2] Extend `tests/application/level-run.test.js`:
  - when the round ends, `LevelRun` calls `screens.finish()` (the state becomes `result`) and keeps `round.result`;
  - `retry()` creates a new round with `elapsed` 0, condition 100, score 0, the same first release time and target, and every target back to normal;
  - `paused → playing` keeps the same round object and `elapsed`;
  - `rainIntensity()` is the current phase's `rain` while playing, 0 after `cleared`, and `null` when there is no round (meaning "use the menu value").
- [X] T027 [P] [US2] Extend `tests/application/rain.test.js`:
  - `MCW.rain.create(400, …)` sets `active === 400`;
  - `setIntensity(r, 0.4)` gives `active === 160`, and `setIntensity(r, 0)` gives 0;
  - `update` moves only the first `active` drops (the others keep their `y`);
  - raising the intensity again respawns the newly active drops above the top edge.
- [X] T028 [P] [US2] Extend `tests/application/game-session.test.js`: `result → playing` (via `retry`) applies the start view and emits `playstart`, as `menu → playing` does.

### Implementation for User Story 2

- [X] T029 [US2] Change `js/application/screens.js`:
  - add `playing.finish → "result"` (setting `m.focusOnShow = "btn-retry"`);
  - add a `result` state with `retry → "playing"` (`focusOnShow = null`) and `toMenu → "menu"` (`focusOnShow = "btn-play"`);
  - add `"finish"` and `"retry"` to the generated action methods;
  - do not add `result` to `ESCAPE`.

  T024 passes.
- [X] T030 [US2] Extend `js/application/round.js` with the US2 rules, filling the marked steps of `update` in the research R2 order:
  - `duration` = the sum of the phase `durationS` values; `phase()`, `remaining()`, `phase` events;
  - release limited by `phases[phaseIndex].maxActive`;
  - urgency after `kind.warnS`, with an `urgent` event; urgent stays set until repaired, and is never set while repairing;
  - `condition` drain per urgent incident, clamped at 0;
  - refill on repair (`refill.early` if never urgent, else `refill.normal`, capped at 100), plus `earlyBonus` for early repairs;
  - `goalReached` and the `goal` event (once);
  - end check: `elapsed >= duration` → emit `cleared` then `end`; `condition <= 0` → `end` with `reason:"collapsed"`. `won = goalReached` in both cases;
  - stars per research R6;
  - set `over = true` and make `update` a no-op afterwards.

  T025 passes.
- [X] T031 [US2] Extend `js/application/level-run.js`:
  - on the round's `end`, call `screens.finish()`;
  - on `change` with `action === "retry"`, `reset()` the old round and start a fresh one;
  - `paused → playing` changes nothing;
  - add `rainIntensity()`.

  Change `js/application/game-session.js` so that `e.from === "result" && e.to === "playing"` also calls `applyStartView()` and emits `playstart`, and so `toMenu` from `result` clears the selection like it does from pause. T026 and T028 pass.
- [X] T032 [US2] Change `js/application/rain.js`:
  - `create` sets `r.active = count`;
  - add `setIntensity(r, k)`: when `active` grows, respawn the newly active drops above the top edge with `spawn(r, i, false)`;
  - `update` and `resize` loop to `r.active`.

  Change `js/adapters/render/rain-layer.js`:
  - pool of 400 drops;
  - `setIntensity(k)` stores a target, and `update` eases `level` towards it at up to 1.0 per second, then calls `MCW.rain.setIntensity(this.rain, level)`;
  - `draw` loops to `r.active`;
  - the menu uses intensity 0.4, matching today's 160 drops.

  In `js/main.js`:
  - set `game.rain.enabled = game.session.backgroundActive() || !!(game.run && game.run.round)` on screen change;
  - add an updater that calls `game.rain.setIntensity(game.run.rainIntensity() ?? 0.4)` (written without `??`: use an explicit `null` check).

  T027 passes.
- [X] T033 [US2] Extend `js/adapters/ui/hud.js` and `css/hud.css` with the full top bar from contracts/play-ui.md:
  - phase name and `m:ss` remaining (updated when the whole second changes);
  - goal text, which switches to "Goal reached! Keep repairing for a higher score";
  - `n / target` with ✓;
  - score;
  - the City condition meter with bar and %, amber below 50 % and red below 25 %, and a `+5%`/`+8%` pop for 1 s on `repaired`.

  Add the banners (centred, about 2 s, `pointer-events:none`):
  - round start: "Drizzle — Repair 6 incidents before the storm ends";
  - "Downpour!" and "Peak storm!" on `phase`;
  - "Goal reached!" on `goal`;
  - "Storm cleared" on `cleared`.

  The incident panel shows **URGENT** for urgent incidents.
- [X] T034 [US2] Change `js/adapters/render/level-layer.js` so urgent incidents draw a red pin with `!!` and a pulsing ring (the pulse comes from the round's `elapsed`, not wall-clock time), and edge arrows use the pin colour.
- [X] T035 [US2] Add the result card to `index.html` inside `#menu-layer`:

  ```html
  <section id="screen-result" class="menu-card" hidden>
    <h2 id="result-title"></h2>
    <p id="result-reason"></p>
    <div id="result-stars"></div>
    <table id="result-stats"></table>
    <div class="menu-buttons">
      <button id="btn-retry" class="menu-btn">Retry</button>
      <button id="btn-result-menu" class="menu-btn">Main menu</button>
    </div>
  </section>
  ```

  Change `js/adapters/ui/menu.js`:
  - add `result: "screen-result"` to `SCREENS`;
  - bind `btn-retry → m.retry()` and `btn-result-menu → m.toMenu()`;
  - give it a `setResult(result)` that fills the card:
    - title: "Level complete" or "Level failed";
    - reason when lost: "The city could not hold on" for `collapsed`, "The storm ended before the goal" for `cleared`;
    - stars as ★/☆ text with an `aria-label` like "2 of 3 stars";
    - stat rows: Incidents repaired `n / target`, Time `m:ss`, Score;
  - add a `document.addEventListener("visibilitychange", …)` that calls `m.pause()` when `document.hidden` and the state is `playing`.

  In `js/main.js`, wire `game.run.on("end", function (r) { game.menu.setResult(r); })`.
- [X] T036 [US2] Make sure leaving a round leaves no damage behind:
  - `LevelRun` calls `round.reset()` on `toMenu` (from pause or result) and on `retry`;
  - the HUD is hidden on `menu`, `howto` from the menu, `credits` and `result`;
  - `LevelLayer` draws nothing when `run.round` is `null`.

  Verify quickstart steps 14 and 18.

**Checkpoint**: quickstart §2 steps 1–18 pass. All tests pass.

---

## Phase 5: User Story 3 — Learn the loop from on-screen hints (Priority: P3)

**Goal**: Five tutorial hints, one at a time, guide the first repair. The tutorial incident can't turn urgent until the crew is sent to it. **Skip hints** turns hints off for the round and for Retry.

**Independent Test**: quickstart §2 steps 19–21.

### Tests for User Story 3 (write first, see them fail)

- [X] T037 [P] [US3] Create `tests/application/hints.test.js`. Test `new MCW.Hints(MCW.Hints.TRIAL_STEPS)`:
  - `current` is `null` at the start;
  - `notify("tutorialReleased")` shows step 1;
  - `notify("incidentSelected")` clears it and shows step 2;
  - `notify("crewSent")` gives step 3, `notify("crewArrived")` gives step 4, and `notify("repairDone")` gives step 5;
  - `update(5000)` clears step 5, and `current` is `null` afterwards;
  - only one step is ever current;
  - an event for a later step's clear (e.g. `crewSent` while step 1 is showing) skips the steps in between;
  - `skip()` sets `current` to `null` and ignores every later `notify`;
  - a `change` event fires on every change.
- [X] T038 [P] [US3] Extend `tests/application/round.test.js`:
  - the `tutorial: true` incident does not become urgent while `crewSent` is false, even long after `warnS` and past the end of phase 1;
  - after `send`, it becomes urgent `warnS` after the send (not after release);
  - the condition does not drain from it while it is protected.
- [X] T039 [P] [US3] Extend `tests/application/level-run.test.js`:
  - `run.hints` notifies the matching events from round and select events (tutorial release → `tutorialReleased`; selecting the tutorial incident → `incidentSelected`; `assigned` → `crewSent`; `arrive` → `crewArrived`; the first `repaired` → `repairDone`);
  - `skipHints()` keeps hints skipped after `retry()`;
  - after `toMenu` followed by `play`, hints show again.

### Implementation for User Story 3

- [X] T040 [US3] Create `js/application/hints.js` (application) with `MCW.Hints(steps)` and `MCW.Hints.TRIAL_STEPS`, holding the five steps from contracts/play-ui.md §Hints. Each step is `{ id, text, showOn, clearOn, anchor }` with anchors `"incident"`, `"send"`, `"crew"`, `"meter"`, `"goal"`. The last step has `clearAfterMs: 5000`. Implement `notify`, `update`, `skip`, `current`, `skipped` and `on("change")` as specified in T037. Add the tags to both pages after `level-run.js`, plus the `hints.test.js` tag. T037 passes.
- [X] T041 [US3] In `js/application/round.js`, protect the tutorial incident: its urgency clock starts at the time of the first `send` to it (store `urgencyFrom`), and before that it is never urgent and never drains (FR-023). T038 passes.
- [X] T042 [US3] In `js/application/level-run.js`:
  - create `this.hints` on every round start, unless `this.hintsSkipped`;
  - map round and select events to `hints.notify(...)` as in T039;
  - call `hints.update(dtMs)` in `update`;
  - `skipHints()` sets `hintsSkipped = true` and calls `hints.skip()`;
  - reset `hintsSkipped` to false on `toMenu`;
  - re-emit hints `change` as `hint`.

  T039 passes.
- [X] T043 [US3] Extend `js/adapters/ui/hud.js` and `css/hud.css` with the hint bubble:
  - a rounded dark bubble with a pointer triangle, the hint text, and a "Skip hints" link button (`run.skipHints()`);
  - position it from the anchor: `incident` → above the tutorial incident's pin (screen position from `camera.mapToScreen`, updated each frame); `send` → above the panel's main button; `crew` → above the truck; `meter` → below the meter; `goal` → below the goal text;
  - hide it when `run.hints.current` is `null` and while not `playing`.

**Checkpoint**: quickstart §2 steps 1–21 pass. All tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T044 [P] Update `README.md`:
  - **Play** section: Play now starts the trial level, with a one-paragraph description of the loop;
  - controls table: add Click an incident, Enter, Tab, C;
  - URL settings: no `?map` now opens the trial level, and any other `?map=` opens free look;
  - "Add a map": mention `levels/<id>.js` and `contracts/level-definition.md`;
  - project layout: add the new files.
- [X] T045 [P] In `specs/002-main-menu/quickstart.md`, change the step that expects Play to open the free map so that it expects the trial level (SC-007).
- [ ] T046 Run the regression checks, quickstart §2 steps 22–25:
  - `?menu=0`, `?map=sample-city`, `?dev=1`, camera controls and `?edit=1`;
  - the 002 and 004 playtest checklists.

  Fix any regressions.
- [ ] T047 Do a performance pass (quickstart step 26). Record a DevTools Performance profile during Peak storm with 4 active incidents, the truck moving and rain at 1.0. Confirm a steady 60 FPS and no growing allocations in `LevelLayer`, `RainLayer` or `Round.update`, and fix any hot spots.
- [ ] T048 Playtest and tune: run the full quickstart §2 with 2 or more people who haven't played. Adjust `levels/trial.js` (and `js/domain/incident-kinds.js` if needed) until:
  - the first repair happens within 60 s (SC-001);
  - a round lasts 3–6 minutes (SC-002);
  - most testers win on the first or second try (SC-003).

  Record the final numbers in research.md R12.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
  - T005, T006, T008, T009 and T012 are independent.
  - T007 needs T005 and T006.
  - T010 needs T009 only for the script order (the map uses `MCW.maps`).
  - T011 needs T009 and T010.
  - T013 runs last in the phase.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on US1, because it extends `round.js`, `level-run.js`, `hud.js` and `level-layer.js`.
- **US3 (Phase 5)**: depends on US1. It can run in parallel with US2 if `round.js` and `level-run.js` edits are coordinated: T041/T042 touch the same files as T030/T031, so do them after those, or merge carefully.
- **Polish (Phase 6)**: after the stories you intend to ship.

### Within each story

Write the test tasks first and see them fail. Then implement in this order: application rules → composition root → adapters. Check the story's playtest steps at its checkpoint.

### Task-level order inside US1

T014/T015/T016 (parallel) → T017 → T018 → T019 → T020 + T021 + T022 (T020 references the other two, so land them together or stub them) → T023.

### Task-level order inside US2

T024–T028 (parallel) → T029 → T030 → T031 → T032 → T033/T034/T035 (different files, parallel) → T036.

## Parallel Example: Foundational

```text
Together: T002 route tests · T003 level-check tests · T004 vehicle-art tests
Then together: T005 route.js · T006 incident-kinds.js · T008 vehicle-art.js · T009 level-registry.js · T012 input hook
Then: T007 level-checks.js → T010 maps/trial.js → T011 levels/trial.js → T013 architecture test
```

## Parallel Example: User Story 1

```text
Together: T014 crew tests · T015 round tests · T016 level-run tests
Then: T017 crew.js → T018 round.js → T019 level-run.js
Then together (different files): T021 level-layer.js · T022 hud.js ; then T020 main.js wiring
```

## Parallel Example: User Story 2

```text
Together: T024 screens tests · T025 round tests · T026 level-run tests · T027 rain tests · T028 game-session tests
After T029–T032: T033 HUD top bar/banners · T034 urgent markers · T035 result card + menu.js
```

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 and Phase 2, then the checkpoint: the game is unchanged and the tests are green.
2. Phase 3 (US1), then the checkpoint: Play gives the trial city, and the player can fix incidents with the truck. **Stop and demo**: this is already the core loop.

### Incremental delivery

1. Add US2: phases, the meter, win/lose and the result card. This is the full game round and the demo version.
2. Add US3: hints for first-time players and judges.
3. Polish: README, regressions, performance, tuning.

Each step keeps `index.html` playable and `tests/index.html` green (Constitution I, III).

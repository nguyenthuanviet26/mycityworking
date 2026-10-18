---

description: "Task list for the Map Decorator feature"
---

# Tasks: Map Decorator

**Input**: Design documents from `specs/004-map-decorator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (map-file.md, editor-ui.md, new-apis.md), quickstart.md

**Tests**: Included. Constitution Principle III requires automated unit tests for domain and application code (and this plan also tests `map-file.js`), run from `tests/index.html`. Write each test task first and confirm it fails before implementing. UI and rendering are verified by the playtest steps in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each story can be implemented and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1, US2, US3)

## Conventions that apply to every task

- Code style follows the existing files: classic scripts wrapped in `(function (MCW) { "use strict"; … })(window.MCW);`, `var`, prototype methods, `MCW.createEmitter()` for events, and a one-line header comment naming the layer.
- Layers (Constitution VII): `js/domain/` must not touch `window` (except the namespace), `document`, canvas, images, timers or `.png` paths. `js/application/` must not touch the DOM, canvas or asset paths. Infrastructure and stores are reached only through ports passed in by `js/main.js`.
- Every new script gets a `<script>` tag in `index.html` in the inside-out order from `contracts/new-apis.md` ("Script order"). Every new domain/application file and `js/infrastructure/map-file.js` also gets a tag in `tests/index.html`, before `harness.js`. Each new test file gets a tag after `harness.js`.
- After every task, `tests/index.html` shows `0 failed`, and `index.html` (normal play) starts with no console errors (Constitution I).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The folders and empty files that later tasks fill in.

- [X] T001 Create the folder `tests/infrastructure/`. Create `css/editor.css` with a header comment and a `:root` block of editor colour variables (panel background `#1e2329`, text `#e8e8e8`, accent `#4fc3f7`, ok `#2ecc71`, bad `#e74c3c`). Add `<link rel="stylesheet" href="css/editor.css">` after `css/menu.css` in `index.html`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The domain model changes, the shared editing helpers and the input hook that every story needs. Normal play must stay exactly the same.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for the foundation (write first, see them fail)

- [X] T002 [P] Add cases to `tests/domain/game-map.test.js`:
  - `removeObject(id)` frees every footprint tile of a 2×2 building and returns the object, or `null` for an unknown id;
  - `placeObject` emits `objectchange` `{id, change:"placed"}` and `removeObject` emits `{id, change:"removed"}`;
  - `placeObject({type, at, id:"hospital"})` sets `named === true`, and without `id` it sets `named === false`;
  - `setTerrain` clears `unknown`, resets the tile variant to `"normal"`, emits `terrainchange`, and emits `collisionchange` `{col,row,before,after}` only when the effective collision changes (grass→road changes `vehicle`; grass→dirt does not);
  - `removeObject` emits `collisionchange` for each footprint tile whose collision changed.
- [X] T003 [P] Create `tests/domain/map-checks.test.js`:
  - a bridge with road on both SE/NW sides gives no problem;
  - a bridge with no road/bridge on either axis gives `{code:"bridge-not-crossing", col, row, message}`;
  - an object with any footprint tile on water gives `code:"object-on-water"`;
  - a clean map gives `[]`.
- [X] T004 [P] Create `tests/domain/map-serializer.test.js` using inline definitions (the test page loads no `maps/` files):
  - `serializeMap(parseMap(def).map, {id, name})` gives terrain text with one line per row, exactly `cols` characters each, using the default legend (`.` grass, `,` dirt, `#` concrete, `=` asphalt, `~` water, `r` road, `b` bridge);
  - objects are sorted by row, then column;
  - `variant` appears only when `"damaged"`;
  - `id` appears only for named objects;
  - `access` is kept when given;
  - generated `obj-N` ids are never written;
  - round trip: `parseMap(serializeMap(m))` has the same size, per-tile terrain and objects (type, anchor, variant, named id, access) as `m`;
  - a map built with a custom legend serializes using default-legend characters.
- [X] T005 [P] Create `tests/application/edit-history.test.js`:
  - `push`, then `undo`, returns the pushed change and `canRedo()` becomes true;
  - `redo` returns it again;
  - a `push` after an `undo` clears the redo stack;
  - with `limit: 3`, a 4th push drops the oldest;
  - the default limit is 200;
  - `clear()` empties both stacks.
- [X] T006 [P] Create `tests/application/palette.test.js`:
  - `pieces()` contains exactly 7 terrain pieces (grass, dirt, concrete, asphalt, water, road, bridge) with `category:"Ground"` and `size {w:1,h:1}`, plus one object piece per key in `MCW.objectTypes.TYPES`;
  - piece `key` is `"terrain:<id>"` or `"object:<type>"`;
  - `label` replaces `_` with a space;
  - categories follow research R11 (`hospital_a` → "Public", `house_small_blue_a` → "Houses", `cafe_a` → "Shops & food", `office_small_gray_a` → "Work", `tree_pine_tall` and `rocks_gray_a` → "Trees & nature", `sign_stop_a` → "Street");
  - `categories()` returns `["Ground","Houses","Shops & food","Public","Work","Trees & nature","Street"]`;
  - `search(pieces, "HOSP")` returns only hospital pieces, and `search(pieces, "small blue")` matches `house_small_blue_a`.

### Implementation for the foundation

- [X] T007 Update `js/domain/game-map.js` to pass T002:
  - add `removeObject(id)`;
  - set `obj.named = !!spec.id` in `placeObject`;
  - emit `objectchange` with `change:"placed"` / `"removed"` / `"variant"` (add `change:"variant"` to the existing `setObjectVariant` payload);
  - in `setTerrain`: clear `unknown[i]`, set `variant[i] = "normal"`, emit `terrainchange`, and emit `collisionchange` when `collisionAt` differs before vs after.

  Keep `access` as given. The existing `tests/domain/game-map.test.js` and `tests/domain/map-parser.test.js` cases must still pass.
- [X] T008 [P] Create `js/domain/map-checks.js` exporting `MCW.mapChecks(map) → [{code, col, row, message}]` to pass T003. Move the bridge rule out of `checkBridges` in `js/domain/map-parser.js`, and add the object-on-water rule. Messages: `Bridge at (c,r) is not between road or bridge tiles` and `Object "<id or type>" is on water`.
- [X] T009 Update `js/domain/map-parser.js` to call `MCW.mapChecks(map)` after placing objects and turn each problem into a warning (same text as before). Remove the inline bridge and on-water checks. The output of `parseMap` stays unchanged, so the existing `tests/domain/map-parser.test.js` must still pass. Add the `map-checks.js` tag before `map-parser.js` in `index.html` and `tests/index.html`. (Depends on T008.)
- [X] T010 [P] Create `js/domain/map-serializer.js` exporting `MCW.serializeMap(map, {id, name}) → {id, name, terrain, objects}` per research R7 to pass T004. Terrain text starts and ends with `\n`, as in the existing map files. Add its tag after `map-parser.js` in `index.html` and `tests/index.html`.
- [X] T011 [P] Create `js/application/edit-history.js` exporting `MCW.EditHistory({limit = 200})` with `push`, `undo`, `redo`, `canUndo`, `canRedo`, `clear` to pass T005. Add tags after `game-session.js` in `index.html` and `tests/index.html`.
- [X] T012 [P] Create `js/application/palette.js` exporting `MCW.palette` with `pieces()`, `categories()`, `search(pieces, q)` per research R11 and data-model "Palette Piece" to pass T006. It must reference no picture paths. Add tags after `edit-history.js`.
- [X] T013 [P] Update `js/adapters/input/input.js`:
  - add `setTool(tool | null)`, where `tool` is `{down(pos, tile), move(pos, tile), up(pos, tile), cancel()}`, `pos` is `camera.screenToMap(x, y)` and `tile` is `_tileAt(x, y)` (may be `null`);
  - with a tool set, a left-button press, move and release go to the tool, and buttons 1/2 (middle/right) pan using the existing drag code;
  - add a `contextmenu` listener that calls `preventDefault()` while a tool is set;
  - `pointercancel`, window `blur` and `reset()` call `tool.cancel()` if a tool stroke is active;
  - the keyboard handlers return early when `document.activeElement` is an `INPUT`, `TEXTAREA` or `SELECT`;
  - with no tool set, behaviour is exactly as today.
- [X] T014 [P] Add `allImagePaths()` to `MCW.terrainArt` in `js/adapters/art/terrain-art.js` (research R12). It lists every road piece in `ROAD_PIECES` and both bridge-body axes in `normal` and `damaged`, plus `tile_ground_water.png` and `tile_ground_{grass,dirt,concrete,asphalt}.png`. It also lists, for both grass and dirt, `_water_{NE,SE,SW,NW}_clean`, `_wateredge_{N,E,S,W}_clean` and `_watercorner_{N,E,S,W}_clean`. The list has no duplicates. Add a case to `tests/adapters/terrain-art.test.js` checking that it includes `tile_road_xsing_normal.png`, `tile_ground_dirt_watercorner_W_clean.png` and every path `collectImagePaths` returns for a small inline map.
- [X] T015 Update `js/main.js`: add `"terrainchange"` to the map events that call `redraw()`. Update `tests/architecture.test.js` `LAYERS`: domain gains `mapChecks` and `serializeMap`, and application gains `palette` and `EditHistory`. Then confirm `index.html` plays exactly as before (quickstart Q1–Q2).

**Checkpoint**: Foundation ready. The test page is green, and normal play is unchanged.

---

## Phase 3: User Story 1: Paint ground and roads onto the map (Priority: P1) 🎯 MVP

**Goal**: A developer opens `index.html?edit=1` (or `?edit=1&map=<id>`), picks a new blank map or a copy of a registered map, and paints ground/road/water by click or drag with undo/redo. Roads join and shorelines form automatically.

**Independent Test**: quickstart Q3–Q10. Open decorate mode on the sample map, paint a road loop and a pond, and check the road pieces, shorelines and collision overlay.

### Tests for User Story 1 (write first, see them fail)

- [X] T016 [P] [US1] Create `tests/application/editor-session.test.js` with the static helpers:
  - `EditorSession.validateNewMap({name, id, cols, rows}, existingIds)`:
    - rejects an id not matching `^[a-z][a-z0-9-]{0,39}$`;
    - rejects a name that is empty or longer than 60 characters;
    - rejects `cols`/`rows` outside "5–100";
    - rejects an id in `existingIds`;
    - returns `{ok:false, errors:{field: message}}` naming each bad field, and `{ok:true}` otherwise;
  - `EditorSession.blankDefinition({id, name, cols:20, rows:20})` parses to a 20×20 all-grass map with no objects;
  - `EditorSession.suggestId("Test Town!")` → `"test-town"` and `suggestId("123 Go")` → `"map-123-go"`.
- [X] T017 [P] [US1] Add painting cases to `tests/application/editor-session.test.js`, using a real `MCW.GameMap` from `parseMap` and a no-op store port `{list(){return []}, load(){}, save(){return {ok:true}}, remove(){}}`:
  - after `setTool({kind:"paint", terrain:"road"})`, `paintAt(2,3)` sets that tile and records one history entry;
  - a stroke from `beginStroke({x:0.5,y:0.5})` and `extendStroke({x:6.5,y:0.5})` to `endStroke()` paints all 7 tiles in between (walking in steps of at most 0.25 tile) and records **one** `paint` change;
  - positions outside the map are skipped without error;
  - painting the same terrain as is already there records nothing;
  - `undo()` restores every `before` terrain and `redo()` re-applies;
  - painting under a building keeps the building (FR-010);
  - `isDirty()` is true after a change on a never-saved work, and false for a never-saved new blank map with zero changes;
  - the `"change"` event fires on paint, undo and redo.

### Implementation for User Story 1

- [X] T018 [US1] Create `js/application/editor-session.js` exporting `MCW.EditorSession`. The constructor is `new EditorSession({map, work, start, store, registered})`. Implement:
  - fields from data-model "Editor Session" (`tool` default `{kind:"select"}`, `mode:"editing"`, `stroke:null`, `history: new MCW.EditHistory()`, `revision:0`, `savedRevision:0`, `everSaved`);
  - `on/off`;
  - `setTool`;
  - `beginStroke/extendStroke/endStroke/paintAt` per research R3 (each paint calls `map.setTerrain`);
  - the `paint` change kind with `undo()/redo()/canUndo()/canRedo()`, which adjust `revision` per data-model;
  - `isDirty()` as `!everSaved || revision !== savedRevision`, except a never-saved work with `revision === 0` and no history;
  - the statics `validateNewMap`, `blankDefinition`, `suggestId`.

  Emit `"change"`, `"dirty"` and `"tool"`. Add tags after `palette.js` in `index.html` and `tests/index.html`, and add `EditorSession` to the application list in `tests/architecture.test.js`. Make T016–T017 pass.
- [X] T019 [P] [US1] Create `js/adapters/render/editor-overlay.js` exporting `MCW.EditorOverlay(game, session)`. It pushes into `game.renderer.overlays` a function that, while `session.mode === "editing"` and the tool is `paint`, strokes the hovered tile's diamond in the accent colour, 2 px. It draws nothing in testing mode. Add its tag after `menu.js` in `index.html`, and add `EditorOverlay` to the adapters list in `tests/architecture.test.js`.
- [X] T020 [US1] Create `js/adapters/ui/editor-ui.js` exporting `MCW.EditorUI(opts)`. It builds its DOM by script inside a new `<div id="editor-layer">` appended to `body` (no other `index.html` markup). Part 1, per `contracts/editor-ui.md`:
  - **Chooser**: a "Registered maps" list (name, id, `cols×rows` from parsing each definition) with a *Decorate a copy* button; a "New blank map" form (name; id pre-filled with `suggestId(name)` until edited; columns and rows, default 30, allowed "5–100") whose *Create* button is disabled while `validateNewMap` fails, with each error shown next to its field; and a *Back to the game* link to `index.html`. The chooser calls `opts.onOpen({definition, work})` when a map is chosen.
  - **Editor layout**: a left palette panel with a tools row (*Select*) and a *Ground* section of the 7 terrain pieces from `MCW.palette`. Thumbnails are `<img>` elements whose `src` is `MCW.assets.get(path).src`, using `tile_ground_<id>.png`, `tile_road_straight_SE_normal.png` for road and `tile_road_bridge_body_SE_normal.png` for bridge. The selected piece is outlined.
  - **Top bar**: map name, id, size, an unsaved indicator ("● Unsaved" / "Saved"), and *Undo* / *Redo* buttons enabled from `canUndo/canRedo`.
  - **Keys**: Ctrl+Z → undo; Ctrl+Y and Ctrl+Shift+Z → redo; Esc → Select tool. Each calls `preventDefault()`.
  - **Pointer tool**: for the paint tool, it calls `game.input.setTool({down: pos ⇒ session.beginStroke(pos), move: session.extendStroke, up: session.endStroke, cancel: session.endStroke})`, and calls `setTool(null)` for Select.

  Add its tag after `editor-overlay.js` in `index.html`, and add `EditorUI` to the adapters list in `tests/architecture.test.js`. (Depends on T018.)
- [X] T021 [US1] Style the chooser, palette panel (fixed left, 280 px wide, scrollable), thumbnails (64 px, label and footprint text), top bar (fixed top, to the right of the panel), disabled buttons and field errors in `css/editor.css`. Use the variables from T001, and make sure nothing covers the map area beyond the panel and bar.
- [X] T022 [US1] Update `js/main.js` per `contracts/new-apis.md` "Composition root":
  - read `edit`, `map` and `work` from `params`;
  - without `edit=1`, run `boot()` unchanged;
  - with `edit=1`, call a new `startEditor()`, which builds a `registered` port `{has(id), get(id)}` from `MCW.maps` and shows `MCW.EditorUI` in chooser state;
  - `?edit=1&map=<id>` skips the chooser and opens a copy, with work `{id, name, cols, rows, sourceMapId:id}` and `start` = the registered definition;
  - an unknown map id shows the chooser with the line `Unknown map "<id>"`;
  - `onOpen` parses the definition with `MCW.parseMap`, creates `TerrainArt`, then loads `MCW.terrainArt.allImagePaths()` plus every `file`/`damagedFile` in `MCW.objectArt.ART` behind the existing progress overlay;
  - after loading, it creates Camera, Renderer, Input, DebugOverlay, `EditorSession`, `EditorOverlay` and the editor panels, sets `game.menuOpen = function () { return false; }`, and creates no `MenuUI`, `RainLayer`, `ScreenMachine` or `GameSession`;
  - start view: `zoom`/`center` params, or the map centre at 1×;
  - honour `&dev=1`;
  - reuse the frame loop: factor it into a local `runLoop(game, extraUpdates)` used by both paths, with no rule logic added.
- [X] T023 [US1] Run quickstart Q1–Q10 and fix any issues in the files above. In particular: the road loop joins correctly (SC-004), a fast drag leaves no gaps (FR-008), the collision overlay updates while painting (FR-015), and normal play is unchanged.

**Checkpoint**: User Story 1 is fully usable. A developer can create a map and paint ground, roads and water with undo/redo (the MVP).

---

## Phase 4: User Story 2: Place and remove buildings and props (Priority: P2)

**Goal**: The palette lists every building and prop by category, with search. A see-through preview shows whether placement is allowed. The developer can place, erase (whole footprint) and switch an object's damaged look, all undoable.

**Independent Test**: quickstart Q11–Q13. Place a 1×1 house, a 2×2 hospital and a tree; try placing on top of another object; erase one; switch a house to damaged.

### Tests for User Story 2 (write first, see them fail)

- [X] T024 [P] [US2] Add object cases to `tests/application/editor-session.test.js`:
  - `checkPlacement("hospital_a", c, r)` returns `{ok:true, tiles:[4 entries with inside:true, free:true]}` on free tiles, and `{ok:false, reason:"outside"}` when any footprint tile is off the map, with that tile `inside:false`;
  - it returns `{ok:false, reason:"occupied"}` when any tile is covered, with that tile `free:false`;
  - `place()` returns false and records nothing when not ok;
  - `place("house_small_blue_a", 2, 2)` records one `place` change, `undo()` removes the object and `redo()` puts it back with the same id;
  - `eraseAt` on any tile of a 2×2 footprint removes the whole object;
  - erasing a named object (`id:"hospital"`) and undoing restores `id`, `named`, `variant` and `access`;
  - an eraser stroke (`beginStroke`/`extendStroke`/`endStroke` with the `erase` tool) over 3 objects records **one** `remove` change with 3 `specs`;
  - `eraseAt` on empty ground records nothing;
  - `toggleVariant(id)` flips `normal`↔`damaged` only when `MCW.objectTypes.TYPES[type].hasDamaged`, records a `variant` change, and undoes;
  - every change updates `map.collisionAt` immediately (FR-015).

### Implementation for User Story 2

- [X] T025 [US2] Extend `js/application/editor-session.js` to pass T024:
  - `checkPlacement(type, col, row) → {ok, tiles:[{col,row,inside,free}], reason?}`;
  - `place(type, col, row)`;
  - `eraseAt(col, row)`, which joins the open stroke when the tool is `erase`, so strokes route by tool kind (`paint` vs `erase`);
  - `toggleVariant(objectId)`;
  - the change kinds `place`, `remove` (`specs: [...]`) and `variant`, with their undo/redo per data-model "Change".

  Object specs for re-placing are `{type, at:[col,row], variant, id, access}`, with `named` kept by passing `id` only when the object was named. To keep a generated id on redo, pass it and then set `named` back to false.
- [X] T026 [US2] Extend `js/adapters/ui/editor-ui.js` with the remaining palette and selection controls:
  - an *Eraser* tool button, and the `E` key selecting it;
  - a search box filtering with `MCW.palette.search` (typing in it must not scroll the map);
  - palette sections for every category after *Ground*, in `MCW.palette.categories()` order, each listing its pieces. Thumbnails use `MCW.assets.get(MCW.objectArt.ART[type].file).src` scaled to fit 64 px, with labels and footprint text (`2×2`);
  - for an object piece: `input.setTool({down: (pos, tile) ⇒ tile && session.place(type, tile.col, tile.row), …})`;
  - for the eraser: a tool whose `down/move` call `session.beginStroke`/`extendStroke` with erase semantics and whose `up` ends the stroke;
  - an **info strip** for the Select tool, showing the selected tile's coordinates, terrain and object, plus a *Show damaged* / *Show normal* button when the object type `hasDamaged`, calling `session.toggleVariant`.
- [X] T027 [P] [US2] Extend `js/adapters/render/editor-overlay.js`:
  - with an object tool, draw each footprint diamond from `session.checkPlacement` at the hovered tile, filled `rgba(46,204,113,0.35)` when the tile is allowed and `rgba(231,76,60,0.35)` otherwise;
  - in `game.renderer.topOverlays`, draw the object's picture at `globalAlpha 0.55`, positioned as `Renderer.prototype._drawObject` does for that footprint;
  - with the eraser, outline the hovered object's whole footprint in red, 2 px.
- [X] T028 [P] [US2] Add styles for category headings, the search box, the eraser button and the info strip to `css/editor.css`.
- [X] T029 [US2] Run quickstart Q11–Q13 and fix any issues: preview colours (SC-007), depth order of placed objects, the whole-footprint erase, and the variant switch.

**Checkpoint**: User Stories 1 and 2 both work. A full city can be decorated in one session.

---

## Phase 5: User Story 3: Save, export and send the map to another developer (Priority: P3)

**Goal**: Save drafts in the browser with an unsaved-changes guard, test-play, reset and rename. Export a `maps/<id>.js` file with instructions, and import a received map file safely.

**Independent Test**: quickstart Q14–Q26. Undo/redo steps; save and reload; test play; leave prompt; export, add to `maps/` and play; import elsewhere; reject bad files.

### Tests for User Story 3 (write first, see them fail)

- [X] T030 [P] [US3] Add work cases to `tests/application/editor-session.test.js`, using an in-memory store port (`{data:{}, list, load, save, remove}`, with a variant whose `save` returns `{ok:false, reason:"quota"}`):
  - `save()` calls `store.save` with `{id, name, cols, rows, sourceMapId, definition: serializeMap(map, {id, name})}`, sets `savedRevision = revision` and `everSaved = true`, and makes `isDirty()` false;
  - undoing back to the saved revision makes `isDirty()` false again;
  - a failed save returns `{ok:false, reason}` and stays dirty (FR-020);
  - saving keeps the undo history (FR-017c);
  - `reset()` rebuilds the layout from `start` in the same `GameMap` as one `reset` change, which undo/redo reverses (FR-019): for a blank map `start` is all grass, and for a copy it is the registered definition;
  - `rename(name, id)` validates with the id rule `^[a-z][a-z0-9-]{0,39}$` and a name of 1–60 characters, and rejects an id used by another stored work;
  - `testPlay()` sets `mode:"testing"` and emits `"mode"`, and `backToEditor()` returns to `"editing"` with the history unchanged;
  - `problems()` returns `MCW.mapChecks(map)` after changes.
- [X] T031 [P] [US3] Add export and import cases to `tests/application/editor-session.test.js`:
  - `exportInfo()` returns `{definition, fileName:"<id>.js", scriptLine:'<script src="maps/<id>.js"></script>', replaces:false, clash:null, problems}` for a new id;
  - for a copy whose id equals `sourceMapId`, it returns `replaces:true, scriptLine:null`;
  - when the id belongs to a *different* registered map, it returns `clash:"<id>-2"` (or the next free suffix) per research R13;
  - `EditorSession.checkImport(def, {knownTerrain, knownTypes, workIds})` rejects, with the exact messages from `contracts/map-file.md` "Import validation":
    - a missing or invalid id;
    - missing terrain;
    - size > 100×100;
    - unknown terrain characters (up to 5 listed);
    - unknown object types (up to 5 listed);
    - an object without a valid `at`;
  - it returns `conflict:"work-id-exists"` when the id is in `workIds`;
  - `EditorSession.nextFreeId("town", ["town","town-2"])` → `"town-3"`.
- [X] T032 [P] [US3] Create `tests/infrastructure/map-file.test.js`:
  - `MCW.mapFile.format(def, {cols, rows, date:"2026-10-17"})` produces exactly the layout in `contracts/map-file.md` "Export": header comment with name, size and date; legend line; `MCW.maps.register({`; `id`/`name` with double quotes; terrain template string with one row per line; one object per line with keys in order `type, at, variant, id, access`; `objects: []` when empty; and a final newline;
  - formatting the same definition twice gives byte-identical output;
  - `` ` `` and `${` in `name` are escaped;
  - `read(format(def))` returns an equal definition;
  - `read` accepts an inline string written in the style of `maps/sample-city.js` (leading `//` comments, bare keys, trailing commas, `// section` comments inside `objects`, a backtick terrain string);
  - `read` rejects, with `{ok:false, error}` naming the line, each of these: `MCW.maps.register(alert(1))`, a `${x}` inside the terrain template, a second statement after `);`, an identifier value (`id: foo`), and text with no `MCW.maps.register(`;
  - a spy shows that no global function is called during `read` (for example, define `window.__called = false` and a file `MCW.maps.register({id: __mark()})` must not set it);
  - `scriptLine("town")` → `'<script src="maps/town.js"></script>'`.

### Implementation for User Story 3

- [X] T033 [US3] Extend `js/application/editor-session.js` to pass T030–T031:
  - `save()` via the store port;
  - `reset()` with the `reset` change kind (before/after definitions; apply by setting every tile's terrain, removing all objects and placing the definition's objects, all on the same `GameMap`);
  - `rename(name, id)`, which updates `work` and moves the stored entry when the work has been saved;
  - `problems()` refreshed on `"change"` (emitting `"problems"`);
  - `exportInfo()`;
  - `testPlay()` / `backToEditor()`, emitting `"mode"`;
  - the statics `checkImport` and `nextFreeId`.

  Use no DOM and no `localStorage`.
- [X] T034 [P] [US3] Create `js/infrastructure/map-file.js` exporting `MCW.mapFile` with `format`, `read` and `scriptLine` per `contracts/map-file.md` and research R4. The `read` function is a hand-written tokenizer and recursive-descent reader for the literal subset only: objects, arrays, strings, template strings without `${`, numbers, `true`/`false`/`null`, comments and trailing commas. It must never use `eval`, `Function`, `<script>` or `JSON.parse` on untrusted fragments other than validated string escapes. Use no DOM. Add tags in `index.html` (after `map-registry.js`) and `tests/index.html`, plus `tests/infrastructure/map-file.test.js` after `harness.js`. Make T032 pass.
- [X] T035 [P] [US3] Create `js/infrastructure/work-store.js` exporting `MCW.workStore` with `list()`, `load(id)`, `save(work)` and `remove(id)` over `localStorage`, using keys `mcw.editor.index` (array of `{id, name, cols, rows, sourceMapId, savedAt}`) and `mcw.editor.work.<id>` (`{meta, definition}`). Wrap every access in try/catch. Failures return `{ok:false, reason}`. An unreadable entry is skipped in `list()` and logged with `console.warn("[editor] …")`. `savedAt` is `new Date().toISOString()`. Add its tag after `map-file.js` in `index.html` only.
- [X] T036 [P] [US3] Create `js/infrastructure/file-io.js` exporting `MCW.fileIO`:
  - `download(fileName, text)` makes a Blob of type `text/javascript`, an object URL and a temporary `<a download>` that is clicked and then the URL is revoked;
  - `pickText({accept:".js", maxBytes:1048576}) → Promise<{ok, text?, name?, reason?}>` uses a hidden `<input type="file">` and `FileReader.readAsText`. It refuses files over `maxBytes` before reading, with the reason `The file is too big to be a map file`.

  Add its tag after `work-store.js` in `index.html` only. Add `mapFile`, `workStore` and `fileIO` to the infrastructure list in `tests/architecture.test.js`, and extend its "test page loads no …" case to also assert `MCW.workStore` and `MCW.fileIO` are undefined.
- [X] T037 [US3] Extend `js/adapters/ui/editor-ui.js` for saving and leaving:
  - a *Save* button and Ctrl+S (with `preventDefault()`) calling `session.save()`. On failure, show the dismissable message `Could not save in this browser (<reason>). Your changes are still here; use Export to keep a copy.`;
  - the unsaved indicator shows `Saved HH:MM` after a successful save;
  - a *Leave* button: if `session.isDirty()`, show the prompt `Save changes to <name>?` with **Save** / **Discard** / **Cancel** (Save → save, then leave; Discard → leave; Cancel → close the prompt). Leaving navigates to `index.html?edit=1`;
  - a `beforeunload` listener that calls `preventDefault()` and sets `returnValue` while `session.isDirty()`, and is removed just before an intentional leave;
  - a *Reset* button with the confirm `Reset <name> to its starting layout? You can undo this.`;
  - a rename control in the top bar (name and id fields with inline errors from `session.rename`).
- [X] T038 [US3] Extend the chooser in `js/adapters/ui/editor-ui.js` and the editor startup in `js/main.js`:
  - a "Saved works" section first (name, id, size, local saved time) from `MCW.workStore.list()`, each with *Open*, *Rename* and *Delete*. Delete confirms with `Delete <name> from this browser? This cannot be undone.`;
  - opening a saved work uses its stored definition, `everSaved:true` and `start` = its source map's registered definition when `sourceMapId` is registered, else all grass;
  - `?edit=1&work=<id>` opens a saved work directly, and an unknown id shows the chooser with `Unknown saved work "<id>"`;
  - `main.js` passes `MCW.workStore` as the session's `store` port.
- [X] T039 [US3] Add test play in `js/adapters/ui/editor-ui.js`, `js/adapters/render/editor-overlay.js` and `js/main.js`:
  - the *Test play* button calls `session.testPlay()`;
  - on `mode:"testing"`: hide the palette and top bar, call `input.setTool(null)`, and show a *Back to editor* button at top-left;
  - Esc or that button calls `session.backToEditor()`;
  - on return: restore the panels and the previous tool, and clear every collision override (loop all tiles and call `map.clearOverride` where `map.hasOverride`);
  - the overlay draws nothing while testing (research R2, FR-003a).
- [X] T040 [US3] Add the problem count and the export panel to `js/adapters/ui/editor-ui.js`:
  - a top-bar problem count from `session.problems()`; clicking it lists the problems, and clicking one calls `game.camera.centerOn(col + 0.5, row + 0.5, {smooth:true})`;
  - an *Export* button opening a panel built from `session.exportInfo()`, containing:
    - *Download `<id>.js`*, which calls `MCW.fileIO.download(fileName, MCW.mapFile.format(definition, {cols, rows, date: today}))`;
    - the problems as warnings that don't block the download;
    - the replace note `Replaces maps/<id>.js — no new script line needed` or the clash warning `Map id "<id>" is already used by another map; try "<suggestion>"`;
    - the 3 steps from `contracts/map-file.md` "Adding an exported file to the game", with a *Copy* button for the script line (`navigator.clipboard.writeText`, falling back to selecting the text).
- [X] T041 [US3] Add *Import map file…* to the chooser in `js/adapters/ui/editor-ui.js`:
  - call `MCW.fileIO.pickText`, then `MCW.mapFile.read`, then `MCW.EditorSession.checkImport(def, {knownTerrain, knownTypes, workIds})`;
  - show any error in the chooser without creating anything (FR-018d);
  - on `conflict:"work-id-exists"`, ask *Replace the saved work* / *Import as a copy* (id from `nextFreeId`) / *Cancel*;
  - on success, open the editor with work `{id, name, cols, rows, sourceMapId: registered.has(id) ? id : null}`, `everSaved:false` and `start` = the imported definition. The work becomes a saved work on its first save (FR-017b).
- [X] T042 [P] [US3] Add styles for prompts (a modal over the map), the message banner, the export panel, the problem list, and the *Back to editor* button to `css/editor.css`.
- [X] T043 [US3] Run quickstart Q14–Q26 and fix any issues. Check: one stroke is one undo step; save and reload; test play keeps unsaved changes; the leave prompt and tab-close warning; reset with undo; an exported file plays from `maps/` (then revert `index.html` and remove the test file); import in another browser; rejecting `alert(1)`, random text and unknown types; and the `tiny` clash warning.

**Checkpoint**: All three user stories work. Maps can be made, saved, shared and reopened by another developer.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, docs and the final constitution gates.

- [X] T044 Run quickstart Q27–Q28: drag-paint across `?edit=1&map=big&dev=1` at 0.5× zoom with FPS around 60 (SC-003). Confirm normal play doesn't load the editor's extra images (Network tab) and starts as fast as before. If painting stutters, batch `problems()` refresh to once per animation frame in `js/adapters/ui/editor-ui.js`.
- [X] T045 [P] Add a "Map decorator (developers)" section to `README.md`: how to open `index.html?edit=1`, the controls summary from `contracts/editor-ui.md`, how to send a map (export → the teammate copies the file into `maps/` and adds the script line), and the Firefox `file://` storage note from research R8.
- [X] T046 [P] Update `specs/001-isometric-map-system/contracts/map-definition.md` with a note under "Object entry fields" that ids are kept only when written in the file, and a pointer to `specs/004-map-decorator/contracts/map-file.md` for the editor's export layout and the literal-only import rules.
- [X] T047 Final gate review against the constitution's Development Workflow gates 1–7:
  - no console errors in normal play or the editor;
  - `tests/index.html` shows 0 failed;
  - the full quickstart passes;
  - no build or install was introduced;
  - every new file is in the layer listed in `plan.md`;
  - `js/main.js` holds wiring only.

  Record the result at the end of `specs/004-map-decorator/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies.
- **Foundational (Phase 2)** depends on Setup and **blocks all stories**.
- **US1 (Phase 3)** depends on Foundational.
- **US2 (Phase 4)** depends on Foundational and on the US1 editor shell (T018, T020, T022), because objects are placed inside the same session, panel and wiring. Its logic tasks (T024, T025) can start right after T018.
- **US3 (Phase 5)** depends on Foundational and on the US1 shell (T018, T020, T022). It does **not** need US2: save, export and import work on ground-only maps. T032, T034, T035 and T036 can start right after Phase 2.
- **Polish (Phase 6)** depends on the stories you are shipping.

### Within Each Story

- Write the test tasks first and see them fail, then implement the application logic, then the adapters/UI, then wire `main.js`, then run the playtest.
- Tasks in the same file are sequential, in ID order (for example T020, then T026, T037, T038, T039, T040 and T041, all in `editor-ui.js`).

### Parallel Opportunities

- Phase 2: T002–T006 (all test files) run in parallel. Then T008, T010, T011, T012, T013 and T014 run in parallel. T007 is needed before T009 and T015.
- US1: T016 and T017 are the same file, so write them back to back. T019 can run in parallel with T018. T021 can run as soon as T020's markup exists.
- US2: T027 and T028 run in parallel with T026.
- US3: T030, T031 and T032 run in parallel. T034, T035 and T036 run in parallel with each other and with T033. T042 runs in parallel with T037–T041.

---

## Parallel Example: Phase 2 (Foundational)

```text
Task: "T002 Add removeObject/events/setTerrain cases to tests/domain/game-map.test.js"
Task: "T003 Create tests/domain/map-checks.test.js"
Task: "T004 Create tests/domain/map-serializer.test.js"
Task: "T005 Create tests/application/edit-history.test.js"
Task: "T006 Create tests/application/palette.test.js"
# then
Task: "T008 Create js/domain/map-checks.js"
Task: "T010 Create js/domain/map-serializer.js"
Task: "T011 Create js/application/edit-history.js"
Task: "T012 Create js/application/palette.js"
Task: "T013 Add setTool to js/adapters/input/input.js"
Task: "T014 Add allImagePaths to js/adapters/art/terrain-art.js"
```

## Parallel Example: User Story 3

```text
Task: "T030 Work cases in tests/application/editor-session.test.js"
Task: "T032 Create tests/infrastructure/map-file.test.js"
# then
Task: "T034 Create js/infrastructure/map-file.js"
Task: "T035 Create js/infrastructure/work-store.js"
Task: "T036 Create js/infrastructure/file-io.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup), then Phase 2 (Foundational): the game is unchanged, and the tests are green.
2. Phase 3 (US1): paint ground, roads and water in `?edit=1`, with undo/redo.
3. **Stop and validate** with quickstart Q1–Q10. This can already be demoed, but work can't be kept yet. If time is very short, a cut-down "export only" step (T032, T034, T036 and the download part of T040) can follow straight after US1, so maps can be shared before saving and import exist.

### Incremental Delivery

1. Setup and Foundational give an unchanged game and a green test page.
2. US1 gives painting (the MVP).
3. US2 adds buildings and props: full decoration.
4. US3 adds save, test play, export and import: maps can be shared between developers (the feature's purpose).
5. Polish covers the performance check, README and the gate review.

### Parallel Team Strategy

After Phase 2, one developer takes the US1 shell (T018–T022). Once T018 lands, a second developer starts the US2 logic (T024–T025) and a third starts the US3 file and storage work (T032, T034–T036). These meet in `editor-ui.js` in ID order.

---

## Notes

- [P] means a different file with no dependency on an unfinished task.
- If a task would break normal play, keep the new code behind `?edit=1` until it works (Constitution I).
- Don't add editing rules to `js/main.js`. If logic starts to grow there, move it into `EditorSession`.
- Never write to `maps/` or `index.html` from code. Adding a map is a manual step (research R13, spec Assumptions).

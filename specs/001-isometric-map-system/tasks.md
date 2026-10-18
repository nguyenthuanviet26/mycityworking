---

description: "Task list for the Isometric Tile Map System"
---

# Tasks: Isometric Tile Map System

**Input**: Design documents from `specs/001-isometric-map-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution Principle III requires automated unit tests for all game logic
in `js/core/`. They run from `tests/index.html` in the browser. Rendering and input are
verified with the quickstart playtest checklist.

**Organization**: Tasks are grouped by user story so each story can be implemented and
demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1–US4 from spec.md

## Conventions (apply to every task)

- Plain JavaScript (ES2020), **classic scripts, not ES modules**. Every file is wrapped in an
  IIFE, `(function (MCW) { ... })(window.MCW);`, and attaches exports to `window.MCW`
  (research R2).
- `js/core/*` MUST NOT touch `document`, `window` (except reading `MCW`), canvas or images.
- No libraries, no `fetch`, no build. Everything must work when `index.html` is opened
  from disk.
- Asset paths are under `Isometric City/` and must be passed through `encodeURI` (the folder
  names contain spaces).
- Directions: `NE=[0,-1]`, `SE=[1,0]`, `SW=[0,1]`, `NW=[-1,0]` as `[dCol,dRow]`; corners
  `N=[-1,-1]`, `E=[1,-1]`, `S=[1,1]`, `W=[-1,1]`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Page skeleton, namespace, test harness

- [X] T001 Create the folder layout from plan.md (`css/`, `js/core/`, `js/render/`, `js/input/`, `js/maps/`, `maps/`, `tests/`) and `index.html` at the repo root. It contains a full-window `<canvas id="game">`, a `<div id="overlay">` for loading and error messages, a `<div id="devpanel" hidden>`, and `<script>` tags in this exact order: `js/core/namespace.js`, `iso.js`, `terrain.js`, `collision.js`, `catalog.js`, `autotile.js`, `map-parser.js`, `game-map.js`, `camera.js`, `js/maps/registry.js`, `maps/sample-city.js`, `maps/tiny.js`, `maps/big.js`, `js/render/assets.js`, `renderer.js`, `debug-overlay.js`, `js/input/input.js`, `js/main.js`
- [X] T002 [P] Create `css/style.css`: the body has no margin or scrollbars and a dark background `#262a33`; the canvas is fixed to the full window (`touch-action: none`, `cursor: grab`, `cursor: grabbing` while dragging via a class); `#overlay` is a centred box with a progress bar and an error state; `#devpanel` is a fixed top-left panel with monospace 12px text on a semi-transparent background
- [X] T003 Create `js/core/namespace.js`: define `window.MCW = window.MCW || {}`, plus `MCW.createEmitter()`, which returns `{on(evt,fn), off(evt,fn), emit(evt,payload)}` (handlers stored per event; `emit` calls a copy of the list)
- [X] T004 [P] Create `tests/harness.js`: global `describe(name, fn)`, `it(name, fn)`, `assertEqual(actual, expected, msg)` (deep equality for plain objects and arrays), `assertClose(a, b, eps=1e-9, msg)`, `assertTrue(v, msg)`, `assertThrows(fn, msg)`; it collects results and, on `window.onload`, renders a green/red list and the summary line `N passed, M failed` into `document.body`, also logging failures with `console.error`
- [X] T005 Create `tests/index.html`. It loads, in this order: `../js/core/namespace.js`, `iso.js`, `terrain.js`, `collision.js`, `catalog.js`, `autotile.js`, `map-parser.js`, `game-map.js`, `camera.js`, `../js/maps/registry.js`, `harness.js`, then `iso.test.js`, `map-parser.test.js`, `autotile.test.js`, `game-map.test.js`, `camera.test.js` (create each test file empty with a `describe` stub so the page loads)
- [X] T006 [P] Create `js/maps/registry.js`: `MCW.maps = { register(def), get(id), list() }`. `register` throws if `def.id` is missing or already registered

**Checkpoint**: `index.html` opens with no console errors (blank canvas); `tests/index.html` shows `0 passed, 0 failed`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Coordinate math, terrain/collision data, parsing, the map model, basic camera,
asset loading and boot. Every story needs these.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T007 [P] Write tests in `tests/iso.test.js`: `mapToWorld(1,0)` → `{wx:64, wy:32}`; `mapToWorld(0,1)` → `{wx:-64, wy:32}`; a round trip `worldToMap(mapToWorld(x,y))` equals `(x,y)` for 20 random fractional points; `tileOf(2.99, 0.01)` → `{col:2,row:0}`; `tileOf(-0.1, 0)` → `{col:-1,row:0}`; `tileCenter(3,4)` → `{x:3.5,y:4.5}`; `DIRS.SE` equals `[1,0]`; `depthKey(2,3)` equals `5`
- [X] T008 [P] Implement `js/core/iso.js` per research R4: `MCW.iso = { TILE_W:128, TILE_H:64, DIRS, CORNERS, mapToWorld(x,y) → {wx:(x−y)*64, wy:(x+y)*32}, worldToMap(wx,wy) → {x:(wx/64+wy/32)/2, y:(wy/32−wx/64)/2}, tileOf(x,y) → floor, tileCenter(col,row), depthKey(x,y) → x+y }`
- [X] T009 [P] Implement `js/core/terrain.js`: `MCW.terrain.TYPES` keyed by id `grass`, `dirt`, `concrete`, `asphalt`, `water`, `road`, `bridge`, each with `collision` per data-model.md ("road, bridge: foot true, vehicle true, cost 1"; "grass, dirt, concrete, asphalt: foot true, vehicle false, cost 1"; "water: foot false, vehicle false, cost ∞") and `autotile` (`road`/`bridge` → `"road"`, `grass`/`dirt` → `"shore"`, `water` → `"water"`, others `null`); `MCW.terrain.DEFAULT_LEGEND = {".":"grass", ",":"dirt", "#":"concrete", "=":"asphalt", "~":"water", "r":"road", "b":"bridge"}`; `DEFAULT_TERRAIN = "grass"`
- [X] T010 [P] Implement `js/core/collision.js`: `MCW.collision = { OPEN:{foot:true,vehicle:true,cost:1}, BLOCKED:{foot:false,vehicle:false,cost:Infinity}, combine(a,b) → {foot:a.foot&&b.foot, vehicle:a.vehicle&&b.vehicle, cost:Math.max(a.cost,b.cost)}, fromPartial(p) }`; `fromPartial` fills missing fields with `true`, `true`, `1`; a combined cost is `Infinity` when both `foot` and `vehicle` are false
- [X] T011 [P] Implement `js/core/catalog.js`: `MCW.catalog.OBJECTS`, keyed by type. Each entry is `{kind:"building"|"tree"|"prop", size:{w,h}, file:"Buildings/bld_hospital_a.png", damagedFile?:"Buildings/bld_hospital_a_damaged.png"}`. Add entries for every `bld_*` file in `Isometric City/Buildings` (type = name without `bld_` and `.png`; also `water_a` → `building_water_a.png`) and every non-damaged `prop_*` in `Isometric City/Props` (type = name without `prop_`; `tree_*` → kind `tree`, others `prop`). Size is `{w:2,h:2}` when the image is 256 px wide and `{w:1,h:1}` when 128 px or less (images 256 wide: hospital, apartments, office_tall, warehouse etc.; determine by checking the PNG width when writing the table). Add `MCW.catalog.collisionFor(kind)`: building and tree → `BLOCKED`, prop → `OPEN`
- [X] T012 Write tests in `tests/map-parser.test.js`: a 3×2 grid `"..r\n~~r"` parses to cols 3, rows 2 with correct terrain; leading and trailing blank lines are ignored; a ragged row is padded with grass and produces 1 warning; an unknown char `?` gives grass, the tile flag `unknown:true` and 1 warning; a custom `legend` overrides the default; an unknown object type → warning and object skipped; a 2×2 object partly off the map → warning and skipped; overlapping objects → the second is skipped with a warning; an object on water → warning; a missing `terrain` → throws `Error("Map definition has no terrain")`
- [X] T013 Implement `js/core/map-parser.js`: `MCW.parseMap(def)` → `{map: GameMap, warnings: string[]}` per contracts/map-definition.md (grid rules, default legend merge, object validation, a bridge not between road/bridge tiles → warning, an object `id` defaulting to `"obj-<n>"`, `access` copied if given). Each warning is also logged with `console.warn("[map] " + msg)`. It builds the map with `new MCW.GameMap(cols, rows)` and `placeObject`
- [X] T014 Implement the base of `js/core/game-map.js`: `MCW.GameMap(cols, rows)` holds `terrain[]` and `variant[]` (default `"normal"`), `unknown[]`, `objectIdAt[]` (index = `row*cols+col`), an objects `Map` and an emitter. Methods: `inBounds`, `index(col,row)`, `setTerrain(col,row,id)`, `getTile(col,row)` → `{col,row,terrain,variant,objectId}` or `null`, `placeObject({id,type,at:[c,r],variant,access})` (fills footprint cells from `at` across `w` columns and `h` rows; returns false on overlap/out of bounds), `getObject(id)`, `objectAt(col,row)`, `objects()`, `on/off` (delegate to the emitter). Collision methods are added in US4
- [X] T015 Add base tests to `tests/game-map.test.js`: `getTile` out of bounds → `null`; a 2×2 `placeObject` at `[3,3]` makes `objectAt` return it for (3,3), (4,3), (3,4), (4,4) and `null` for (5,3); an overlapping `placeObject` returns false
- [X] T016 Implement the base of `js/core/camera.js`: `MCW.Camera({viewW, viewH})` with state `wx, wy, zoom=1, minZoom=0.5, maxZoom=2`; methods `setView(w,h)`, `worldToScreen(wx,wy)` → `{sx:(wx−this.wx)*zoom+viewW/2, sy:(wy−this.wy)*zoom+viewH/2}`, `screenToWorld(sx,sy)` (its inverse), `mapToScreen(x,y)` and `screenToMap(sx,sy)` (via `MCW.iso`), `visibleTileRange(cols,rows,pad=2)` → `{c0,c1,r0,r1}` (convert the 4 screen corners to map positions, take min/max, pad, clamp to the map). Clamping and zoom come in US2
- [X] T017 Implement `js/render/assets.js`: `MCW.assets = { load(keysToPaths, onProgress) → Promise, get(key) }`. It uses `new Image()` with `src = encodeURI("Isometric City/" + path)` (not `fetch`). On error it stores a generated magenta 128×64 diamond placeholder canvas and calls `console.warn("[assets] missing " + path)`; it resolves when every image has loaded or failed
- [X] T018 Implement `js/main.js` boot: read `?map=` (default `sample-city`). If the id isn't registered, show `Map failed to load: unknown map "<id>"` in `#overlay` and stop. Otherwise call `MCW.parseMap` (catch thrown errors → overlay message), collect the image keys the map needs (filled in by US1), load them while showing progress in `#overlay`, hide the overlay, then create `MCW.game = { map, camera, renderer, input }` with the camera centred on the map's world centre `mapToWorld(cols/2, rows/2)`

**Checkpoint**: `tests/index.html` passes all iso, parser and game-map base tests; `index.html` boots to an empty canvas with no errors.

---

## Phase 3: User Story 1 - See the city map (Priority: P1) 🎯 MVP

**Goal**: The sample city is drawn from the map file with correct road pieces, shorelines,
bridges, buildings and depth order.

**Independent Test**: Open `index.html`. Compare the screen with `maps/sample-city.js`: every
tile has the right terrain, every road piece joins its neighbours, and nearer objects cover
farther ones (quickstart steps 1–5).

### Tests for User Story 1

- [X] T019 [P] [US1] Write tests in `tests/autotile.test.js`: `roadPiece` returns the file for each of the 16 masks exactly as in the research R5 table (e.g. open `{SE,SW}` → `tile_road_corner_N`, open `{NE,SW}` → `tile_road_straight_SW`, none → `tile_road_xsing`); bridge orientation (neighbours on SE/NW → `bridge_body_SE`, on NE/SW → `bridge_body_SW`); shoreline per research R6 (one water side `NE` → `tile_ground_grass_water_NE_clean`, water sides `NE+NW` → `..._wateredge_N_clean`, only diagonal `E` water → `..._watercorner_E_clean`, opposite sides → plain `tile_ground_grass`, dirt uses `tile_ground_dirt_*`); the variant `damaged` swaps `_normal` for `_damaged` on roads

### Implementation for User Story 1

- [X] T020 [US1] Implement `js/core/autotile.js`: `MCW.autotile.roadMask(map,col,row)` (a neighbour counts if its terrain is `road` or `bridge`), `roadPiece(mask, variant)` → asset path using the exact research R5 table, `bridgePiece(map,col,row,variant)`, `shorePiece(map,col,row)` → path per the research R6 rules for `grass`/`dirt` tiles (water neighbour = terrain `water`; out of map counts as not water), `tileArt(map,col,row)` → the final asset path for any tile (`grass` → `Roads and Grounds/tile_ground_grass.png`, `dirt` → `tile_ground_dirt.png`, `concrete` → `tile_ground_concrete.png`, `asphalt` → `tile_ground_asphalt.png`, `water` → `tile_ground_water.png`, road/bridge/shore via the functions above)
- [X] T021 [US1] Add to `js/core/game-map.js` an art cache: `artAt(col,row)` returns a cached `MCW.autotile.tileArt` result; `setTerrain` invalidates the cache for that tile and its 8 neighbours; add `setTileVariant(col,row,variant)` (`"normal"`/`"damaged"`; invalidates the cache, emits `tilechange {col,row,variant}`) and `setObjectVariant(id,variant)` (emits `objectchange {id,variant}`; ignored when the catalog entry has no `damagedFile`) per FR-009
- [X] T022 [US1] Add `MCW.collectImagePaths(map)` in `js/core/autotile.js`: the set of all `artAt` paths in use, both road variants for every road/bridge tile, and every object's `file` and `damagedFile`. Wire it into `js/main.js` so only these images are loaded (research R13)
- [X] T023 [US1] Implement `js/render/renderer.js` pass 1: `MCW.Renderer(canvas, map, camera)` sizes the canvas to `innerWidth×innerHeight×devicePixelRatio` and scales the context by DPR. In `draw()`, clear the canvas, then for each tile in `camera.visibleTileRange` (row-major order) draw the image for `map.artAt` with its top-left at world `(wx−64, wy + 64 − img.height)`, where `(wx,wy) = mapToWorld(col,row)` of the tile's top corner, transformed by camera zoom (`ctx.drawImage` with scaled width and height). Tiles with `unknown:true` get a 2 px magenta diamond outline
- [X] T024 [US1] Implement `js/render/renderer.js` pass 2: build a list of objects in the visible range plus `drawables` (`addDrawable(d)` / `removeDrawable(d)` per contracts/map-api.md), and sort by depth key: objects use `(c+w)+(r+h)` with the anchor `(c,r)` and size `(w,h)`; drawables use `x+y`; ties are broken by x (research R7). Draw each object's image (damaged file when `variant==="damaged"`) horizontally centred on its footprint centre and bottom-aligned to the footprint's front (south) corner `mapToWorld(c+w, r+h)`; drawables call `d.draw(ctx, sx, sy, zoom)`
- [X] T025 [US1] Add to `js/render/renderer.js` a dirty flag and `requestRedraw()`; in `js/main.js` start a `requestAnimationFrame` loop that calls `renderer.draw()` only when dirty; subscribe to `map` `tilechange`/`objectchange` to call `requestRedraw()`
- [X] T026 [P] [US1] Author `maps/sample-city.js` with `MCW.maps.register({id:"sample-city", ...})`: at least 32×32 tiles; a connected road grid (at least 2 east–west and 2 north–south roads, with every road piece type used at least once: straight, corner, T, crossroads, dead end); a 1-tile-wide canal of `~` running north–south with 2 `b` bridges; `,` dirt and `#` concrete patches. Objects: `hospital_a` (id `hospital`), at least 6 houses of mixed sizes (residential), `fruitstand_a` (id `market`), `autoshop_a` (id `garage`), `water_a` (id `pump-station`), a park with at least 5 trees, `firestation_a`, `clinic_b`, plus a few props (`sign_caution_a`, `trashcan_blue_a`); include one `variant:"damaged"` house. All objects must sit on grass, dirt or concrete next to a road
- [X] T027 [US1] Run quickstart playtest steps 1–5 and fix any wrong road or shoreline pieces or depth issues; record the results in `specs/001-isometric-map-system/quickstart.md` (append "Playtest log" with date and pass/fail per step)

**Checkpoint**: The MVP. The sample city is visible and correct at a fixed camera.

---

## Phase 4: User Story 2 - Scroll and zoom around the map (Priority: P2)

**Goal**: Drag, keyboard scroll and cursor-centred zoom, with the view always kept inside the map.

**Independent Test**: Quickstart steps 6–12 on the sample, tiny and big maps.

### Tests for User Story 2

- [X] T028 [P] [US2] Write tests in `tests/camera.test.js`. `bounds` for a 10×10 map is `{minX:-640-64, maxX:640+64, minY:-64, maxY:640+64}`. After `panBy` far past an edge, the viewport edge equals the bound edge. `zoomAt(10, sx, sy)` clamps zoom to 2 and `zoomAt(0.01, ...)` to 0.5. `zoomAt` keeps `screenToWorld(sx,sy)` unchanged (within 1e-6) when not clamped by bounds. When the map's world box is smaller than the viewport on an axis, the camera centre on that axis equals the box centre and `panBy` does not change it. `scrollSpeedWorld(zoom)` equals `600/zoom`. `centerOn(x,y)` without `smooth` puts `mapToScreen(x,y)` at the view centre (unless clamped)

### Implementation for User Story 2

- [X] T029 [US2] Add to `js/core/camera.js`: `setMapSize(cols,rows)` computes `bounds` from the map's world box (`minX=−rows*64`, `maxX=cols*64`, `minY=0`, `maxY=(cols+rows)*32`) with a 64 px margin (research R9); `clamp()` enforces the invariant from data-model.md (viewport inside bounds, or centred on any axis where bounds are smaller than the viewport); `panBy(dsx,dsy)` (moves by `−dsx/zoom`, `−dsy/zoom`, then clamps); `zoomAt(factor,sx,sy)` (keeps the world point under `(sx,sy)` fixed: `newZoom=clamp(zoom*factor)`, `cam = worldUnderCursor − (cursor − viewCentre)/newZoom`, then clamps); `scrollSpeedWorld(zoom)=600/zoom`; `setView` re-clamps
- [X] T030 [US2] Add to `js/core/camera.js`: `centerOn(x,y,{smooth})`. When it's instant, set and clamp. When it's smooth, store a 300 ms ease-out glide (`t → 1−(1−t)^3`) advanced by `update(dtMs)`, which returns true while animating
- [X] T031 [US2] Implement `js/input/input.js` camera controls: `MCW.Input(canvas, camera, renderer)` with pointer drag panning (`pointerdown`/`pointermove`/`pointerup`, `setPointerCapture`, `grabbing` class), a `wheel` listener (`passive:false`, `preventDefault`) calling `zoomAt(deltaY<0 ? 1.1 : 1/1.1, offsetX, offsetY)`, a held-keys set for Arrow keys and W/A/S/D (scroll per frame by `scrollSpeedWorld*dt`), `+`/`=`/`-` zooming about the view centre, `Home` (centre the map, zoom 1), and `blur` (clear held keys, end the drag). Every change calls `renderer.requestRedraw()`
- [X] T032 [US2] Update `js/main.js`: the loop computes `dt`, calls `input.update(dt)` and `camera.update(dt)`, and redraws when they report changes; on `resize`, call `renderer.resize()` + `camera.setView(innerWidth, innerHeight)` + `requestRedraw()`; call `camera.setMapSize(map.cols, map.rows)` at boot
- [X] T033 [P] [US2] Author `maps/tiny.js` (id `tiny`, a 5×5 grid with a plus-shaped road and one house) and `maps/big.js` (id `big`, a 100×100 grid generated in JS before `register`: roads every 8th row and column, a canal at column 50 with bridges where the roads cross it, about 300 houses and trees placed with a fixed-seed pseudo-random generator on grass next to roads)
- [ ] T034 [US2] Run quickstart playtest steps 6–12 and append the results to the playtest log in `specs/001-isometric-map-system/quickstart.md`

**Checkpoint**: US1 + US2. The whole map can be explored and never leaves bounds.

---

## Phase 5: User Story 3 - Point at a tile and know where it is (Priority: P3)

**Goal**: Hover highlight, click to select, developer info panel and test markers proving the
coordinate system.

**Independent Test**: Quickstart steps 13–17.

### Tests for User Story 3

- [X] T035 [P] [US3] Add tests to `tests/camera.test.js` for `tileAtScreen`: with the camera at several zooms (0.5, 1, 1.7) and offsets, `tileAtScreen(mapToScreen(c+0.5, r+0.5))` returns `{col:c,row:r}` for 30 random in-map tiles; points 1 px inside each of the 4 diamond corners resolve to that tile; a point outside the map returns `null`

### Implementation for User Story 3

- [X] T036 [US3] Add to `js/core/camera.js`: `tileAtScreen(sx,sy,cols,rows)` → `MCW.iso.tileOf(screenToMap(sx,sy))`, or `null` when out of bounds
- [X] T037 [US3] Extend `js/input/input.js`: an emitter with `tilehover` (emitted only when the hovered tile changes, or `null` when off the map or when the pointer leaves the canvas) and `tileselect` (emitted on `pointerup` when the total movement since `pointerdown` is under 5 px); store `hovered` and `selected` on `MCW.game.input`
- [X] T038 [US3] Extend `js/render/renderer.js`: after pass 1, draw the hovered tile as a white semi-transparent diamond outline (2 px) and the selected tile as a yellow filled diamond at 25% opacity; redraw on `tilehover`/`tileselect`
- [X] T039 [US3] Implement `js/render/debug-overlay.js`: `MCW.DebugOverlay(game)` toggled by `F3` or `` ` `` (prevent the default for F3). While on, `#devpanel` shows FPS (smoothed over 30 frames), zoom, the hovered tile `(col,row)`, terrain, variant, object id/type, and effective collision (shown as `—` until US4 adds `collisionAt`); `G` toggles the grid outline drawn over visible tiles; dev mode forces a redraw every frame so FPS is live
- [X] T040 [US3] Add developer test markers to `js/render/debug-overlay.js`: `M` adds a marker drawable at the exact `screenToMap` position of the cursor via `renderer.addDrawable({x,y,draw})` (a red 6 px circle with a 1 px white border, scaled by zoom); `Shift+M` removes all markers
- [ ] T041 [US3] Run quickstart playtest steps 13–17 and append the results to the playtest log in `specs/001-isometric-map-system/quickstart.md`

**Checkpoint**: US1–US3. Every tile is addressable and pickable, and markers prove positions and depth.

---

## Phase 6: User Story 4 - Know which tiles can be crossed (Priority: P4)

**Goal**: Collision queries, runtime overrides and change events, plus a developer overlay.

**Independent Test**: Quickstart steps 18–21 and the console checks.

### Tests for User Story 4

- [X] T042 [P] [US4] Add tests to `tests/game-map.test.js`: `collisionAt` for road `{true,true,1}`, grass `{true,false,1}`, water `{false,false,Infinity}`; all 4 tiles of a 2×2 building are BLOCKED; a prop on a road stays `{true,true,1}`; out of map → BLOCKED; `isPassable(c,r,"vehicle")`; `neighbors(c,r,"vehicle")` on a road T-junction returns exactly the 3 road neighbours with the correct `dir` and `cost`; `setOverride(c,r,{vehicle:false})` makes a road `{true,false,1}` and emits `collisionchange` with `before` and `after`; `setOverride(c,r,{cost:2})` gives cost 2; `clearOverride` restores the original and emits again; `accessTile(id)` returns the given `access`, otherwise the first vehicle-passable neighbour of the footprint checking SE, SW, then NE, NW sides (research R11)

### Implementation for User Story 4

- [X] T043 [US4] Add collision to `js/core/game-map.js` per data-model.md and contracts/map-api.md: `collisionAt(col,row)` = `combine(terrain.collision, objectCollision?, override?)` with out of bounds → `BLOCKED`; `isPassable(col,row,mode)` (`mode` is `"foot"` or `"vehicle"`); `neighbors(col,row,mode)` → `[{col,row,dir,cost}]` over `NE, SE, SW, NW`; `setOverride(col,row,partial)` and `clearOverride(col,row)` stored in a sparse `Map<index,Collision>`, each emitting `collisionchange {col,row,before,after}`; `accessTile(objectId)` per research R11
- [X] T044 [US4] Extend `js/render/debug-overlay.js`: `C` toggles the collision overlay, filling each visible tile diamond at 35% opacity with green (`foot && vehicle`), yellow (`foot` only) or red (impassable); the info panel shows effective collision from `collisionAt`; redraw on `collisionchange`
- [X] T045 [US4] Add developer keys to `js/render/debug-overlay.js`: `B` toggles `setOverride(selected, {foot:false, vehicle:false})` / `clearOverride(selected)` on the selected tile; `V` toggles the variant of the selected tile's object if it has one, otherwise of the tile itself (`setObjectVariant` / `setTileVariant`)
- [X] T046 [US4] Run quickstart playtest steps 18–21 and the "Console checks" block, and append the results to the playtest log in `specs/001-isometric-map-system/quickstart.md`

**Checkpoint**: All four stories are complete; the Map API in contracts/map-api.md is fully available.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T047 Run quickstart step 22 (`index.html?map=big`, dev mode, pan and zoom at 0.5×) and confirm about 60 FPS; if it's below, cache `artAt` image lookups per tile, skip objects outside the padded range, and avoid creating per-frame arrays in `js/render/renderer.js`
- [ ] T048 [P] Verify Constitution VI: open `index.html` and `tests/index.html` directly from disk (`file://`) in Chrome and Firefox with no console errors; confirm no `fetch`, `import`/`export` or `type="module"` anywhere (`grep -rE "fetch\(|^\s*(import|export) |type=\"module\"" js maps tests index.html`)
- [X] T049 [P] Create `README.md` at the repo root: how to play (open `index.html`), how to run tests (open `tests/index.html`), the controls table (link `specs/001-isometric-map-system/contracts/controls.md`), and how to add a map (link `contracts/map-definition.md`)
- [ ] T050 Run the full quickstart playtest (steps 1–22) plus `tests/index.html` end to end; confirm all tests pass and every step passes; update the playtest log

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories → **Polish (Phase 7)**
- Foundational blocks all stories.

### User Story Dependencies

- **US1 (P1)**: needs only Foundational. The MVP.
- **US2 (P2)**: needs Foundational; it can technically be built without US1 (it would scroll a blank canvas), but it's only demoable with US1.
- **US3 (P3)**: needs Foundational + US2's `camera.js` changes (T029) for correct picking at any zoom.
- **US4 (P4)**: the logic (T042–T043) needs only Foundational; its overlay (T044–T045) needs US3's `debug-overlay.js` (T039) and selection (T037).

### Within Each Story

- Write tests first and see them fail (T019, T028, T035, T042), then implement.
- Core logic (`js/core`) before rendering and input; the playtest task comes last.

### Parallel Opportunities

- Setup: T002, T004, T006 run in parallel after T001.
- Foundational: T007–T011 are all different files and can run together; T012–T015 follow (they depend on T009–T011); T016 and T017 run in parallel with T012–T015.
- US1: T019 (tests) and T026 (sample map) run in parallel with T020.
- US2: T028 and T033 run in parallel with T029.
- US4: T042–T043 can be developed in parallel with US2/US3 because they only touch `game-map.js` and its tests.

---

## Parallel Example: User Story 1

```text
Task: "T019 Write autotile tests in tests/autotile.test.js"
Task: "T026 Author maps/sample-city.js"
Task: "T020 Implement js/core/autotile.js"
```

## Parallel Example: Foundational

```text
Task: "T007 iso tests in tests/iso.test.js"
Task: "T008 js/core/iso.js"
Task: "T009 js/core/terrain.js"
Task: "T010 js/core/collision.js"
Task: "T011 js/core/catalog.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1) → **stop and validate** with quickstart steps 1–5. You now have a correct city
   to show.

### Incremental Delivery

1. + US2 → explore the whole map (demoable)
2. + US3 → pick tiles, prove coordinates (demoable with dev mode)
3. + US4 → collision ready for the characters/routing feature
4. Polish → performance, `file://` check, README

Each step keeps `index.html` playable (Constitution I).

---

## Notes

- 50 tasks; [P] = different files, no unfinished dependencies.
- Commit after each task or logical group once the project is a git repository.
- Research R11 (building access tile) is provisional; it's implemented in T043 but can be
  changed later.

## Implementation status (2026-10-17)

- 45 of 50 tasks are complete. Unit tests: 50 passed, 0 failed (headless Chrome and Edge, `file://`).
- Still open (manual playtest needed; the code is in place). See the playtest log in quickstart.md:
  - T034: steps 6, 7, 9 (wheel), 11 need a real mouse, keyboard and window resize.
  - T041: step 17 (drag-then-release does not select) needs a real mouse.
  - T047 (closed 2026-10-17): measured in real-time headless Chrome on the 100×100 map: 3.25 ms average / 7.2 ms worst draw at 0.5× (1920×1080 window), 1.06 ms at 1× — well within a 16.7 ms frame.
  - T048: verified in Chrome and Edge from `file://` with no `fetch`/modules; Firefox is not installed on this machine.
  - T050: the full checklist run is waiting on the items above.
- Additions beyond the tasks: URL settings `?zoom=`, `?center=col,row`, `?dev=1` (in `js/main.js`) for sharing views and screenshots; `tileAtScreen` rejects NaN (with a test).

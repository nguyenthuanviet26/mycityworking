# Research: Map Decorator

Decisions for `plan.md`. Each one records what was chosen, why, and what else was considered.
The current code already has everything needed to *draw* an edited map (terrain cache that
re-picks road pieces and shorelines per tile, depth-sorted objects, collision combine), so most
of the work is editing operations, a file format reader/writer, and the editor UI.

## R1 — How decorate mode starts and how it sits next to normal play

- **Decision**: `main.js` checks `?edit=1`. If it is absent, boot is exactly as today. If it is
  present, `main.js` runs a second wiring function, `startEditor`. That function creates the
  same map, camera, renderer, input and developer overlay, plus the editor parts, and creates no
  `MenuUI`, attract drift or rain. `?edit=1&map=<id>` opens a copy of a registered map
  straight away, and `?edit=1&work=<id>` opens a saved work in progress. Plain `?edit=1` shows
  the **chooser**: registered maps, saved works, *New blank map* and *Import map file*.
  Choosing an entry builds the map in memory and starts the editor without reloading the page.
  **Leave** (after the Save / Discard / Cancel prompt) goes back to `?edit=1`, which shows the
  chooser again.
- **Rationale**: this is the same URL-setting style as `?dev=1`, `?map=` and `?menu=0`, so
  players never reach it (FR-001). The `002` screen machine and menu stay untouched. A map's
  size is fixed for a whole editor session, so there is no "switch map at runtime" problem:
  the renderer, terrain cache and camera are created once for one map.
- **Alternatives**: a new `editing` state in `ScreenMachine` (rejected: it mixes a developer
  tool into the player screen flow and its tests); a separate `editor.html` page (rejected:
  it duplicates the script list and the two could drift apart).

## R2 — Test play

- **Decision**: `EditorSession` has a `mode` of `"editing"` or `"testing"`. *Test play* hides
  the editor panel, removes the pointer tool from `Input` (so left-drag scrolls and click
  selects, as in normal play) and shows a small *Back to editor* button. Esc also returns.
  The live `GameMap` is the same object, so unsaved changes are played and the undo history
  is kept (FR-003a). Collision overrides made with the developer keys during test play are
  cleared on return; they are never part of a map.
- **Rationale**: there's nothing to copy or reload, and it is cheap to build.
- **Alternatives**: export to a temporary registered map and boot normal play (rejected: needs a
  reload and loses the undo history).

## R3 — Painting without gaps, and one stroke as one change

- **Decision**: on pointer down the session starts a stroke. On each pointer move the adapter
  passes the previous and current *map positions* (fractional col/row, from
  `camera.screenToMap`). The session walks the segment in steps of at most 0.25 tile and paints
  every tile it enters. Tiles outside the map are skipped. Pointer up, pointer cancel, window
  blur or leaving test play ends the stroke. The stroke's tile changes (before/after terrain)
  are collected into **one** history entry, and a stroke that changed nothing records nothing.
- **Rationale**: pointer events arrive about every 16 ms, so a fast drag jumps several tiles
  between events. Walking the segment meets FR-008 at any speed and zoom.
- **Alternatives**: Bresenham on tile coordinates (works too, but the isometric axes make the
  fractional walk simpler and exact at diamond edges).

## R4 — Map file format, and reading it without running it

- **Decision**: export writes the existing `maps/*.js` style (contract
  `contracts/map-file.md`): a header comment, then `MCW.maps.register({ id, name, terrain:
  \`…\`, objects: [ … ] });`. The terrain is a template string with one line per row (default
  legend), and there is one object per line, sorted by row then column. Import reads the file
  with a small **literal-only reader** (`js/infrastructure/map-file.js`). It finds the
  `MCW.maps.register(` call and parses its single argument as a *JavaScript object literal
  subset*: `{}` objects with bare or quoted keys, `[]` arrays, `"…"`/`'…'` strings, template
  strings without `${`, numbers (including negative), `true`/`false`/`null`, `//` and `/* */`
  comments, and trailing commas. Anything else, such as a function call, an identifier used
  as a value, `${…}` or a second statement, is a read error.
- **Rationale**: it is the same file the game loads, so adding a map is "copy into `maps/` +
  one script tag" (FR-018a). It also reads every hand-written map already in `maps/`
  (FR-018c), and it never evaluates code from a file someone sent (FR-018d). The reader is
  about 150 lines of plain string handling and can be tested from the test page.
- **Alternatives**: `eval` / `new Function` / injecting a `<script>` (rejected: it runs the
  sender's code). JSON export (rejected: it doesn't match the existing files, and old
  hand-written maps couldn't be imported). An external parser library (rejected: Principle V,
  and it is not needed for this small subset).

## R5 — Where map validation lives

- **Decision**: move the "map problems" checks out of `map-parser.js` into a new domain
  function `MCW.mapChecks(map)`, which returns a list of `{ code, col, row, message }`. It
  covers bridges not between road/bridge tiles and objects standing on water. The parser keeps
  its parse-time warnings (ragged rows, unknown characters, bad objects) and calls `mapChecks`
  for the rest. The editor runs `mapChecks` after each change (debounced to once per frame)
  and again at export.
- **Rationale**: a loaded map and an edited map report problems the same way (spec Edge
  Cases), and there is one source of truth.
- **Alternatives**: duplicate the checks in the editor (rejected: they would drift apart).

## R6 — Changes to the domain map model

- **Decision**: `GameMap` gains:
  - `removeObject(id)`, which returns the removed object;
  - an `objectchange` event on place and on remove (today it fires only on variant change);
  - `setTerrain`, which clears the tile's `unknown` flag, resets its variant to `normal`, and
    emits `collisionchange` when the effective collision changed (FR-015, and `001` FR-026);
  - a `named` flag on objects placed with an explicit `id`, so export keeps author-given ids
    (`hospital`, `garage`, …) and drops generated `obj-N` ids;
  - `access` is kept as given.

  `main.js` adds `terrainchange` to the events that trigger a redraw.
- **Rationale**: these are the minimum operations an editor needs, and they keep collision
  queries, the developer overlay and future routing correct during editing.
- **Alternatives**: rebuild a new `GameMap` from a definition after every change (rejected:
  it costs about 10k tiles per stroke on big maps and would rebuild the renderer and caches).

## R7 — Turning a GameMap back into a definition

- **Decision**: a new domain function `MCW.serializeMap(map, meta)` returns a plain
  definition `{ id, name, terrain, objects }`. It is the inverse of `parseMap`: terrain as text
  using the default legend (one line per row), and objects sorted by `anchor.row`, then
  `anchor.col`, with `variant` only when damaged and `id`/`access` only when given. Saved works
  in progress store this same definition object, so save, export and import share one shape.
- **Rationale**: one shape is used for loading, saving and exporting. Round-trip equality
  (`parseMap(serializeMap(m))` gives the same layout) is a simple, strong unit test for SC-006
  and SC-009.

## R8 — Saving work in progress

- **Decision**: browser `localStorage` (Constitution: browser storage only), behind a small
  infrastructure module `MCW.workStore` with `list()`, `load(id)`, `save(work)` and
  `remove(id)`. The keys are `mcw.editor.index` (a list of `{ id, name, cols, rows,
  sourceMapId, savedAt }`) and `mcw.editor.work.<id>` (the definition). Every call is wrapped
  in try/catch. A failure returns `{ ok: false, reason }`, which the UI shows (FR-020). An
  unreadable entry is skipped and logged. The application layer reaches the store only
  through a port object passed in by `main.js`.
- **Rationale**: a 100×100 map is about 10 kB of terrain text plus its objects, far below the
  5 MB `localStorage` limit, and synchronous saves are instant. `localStorage` works over
  `file://` in Chrome/Edge. Firefox's `file://` behaviour depends on its settings, so
  quickstart step Q12 checks it. If storage is blocked, the FR-020 message appears and export
  still works.
- **Alternatives**: IndexedDB (rejected: async and more code for no present need).

## R9 — Downloading and choosing files

- **Decision**: `js/infrastructure/file-io.js` handles both directions. Download builds a
  `Blob` (`text/javascript`), creates an object URL and clicks a temporary
  `<a download="<id>.js">`. Choosing a file uses a hidden `<input type="file" accept=".js">` and
  `FileReader.readAsText`. Files over 1 MB are refused before reading.
- **Rationale**: both work over `file://` and static hosting in current Chrome/Edge/Firefox,
  with no server (Principle VI).

## R10 — Pointer tools and mouse buttons

- **Decision**: `Input` gains `setTool(tool | null)`. When a tool is set, a left-button press,
  move and release on the canvas go to `tool.down/move/up(mapPos, tile)` instead of panning.
  Right and middle buttons always pan, and the canvas context menu is suppressed while a tool
  is set. The *Select* tool is the default: no tool, so left-drag pans and a click selects,
  exactly as today. Keyboard scroll and zoom ignore key presses while a text field has focus,
  so typing `w`/`a`/`s`/`d` in the palette search doesn't scroll.
- **Rationale**: this is the smallest change to an adapter that is already tested by playtest,
  and normal play is unchanged because it never sets a tool.

## R11 — Palette contents and categories

- **Decision**: a new application module `MCW.palette` builds the piece list from
  `MCW.terrain.TYPES` (7 ground pieces) and `MCW.objectTypes.TYPES` (about 140 objects).
  Categories come from the type id: *Houses* (`house_`, `apartments_`, `mobilehomes_`), *Shops
  & food* (`cafe`, `pizza`, `icecream`, `fruitstand`, `gunshop`, `autoshop`, `gasstation`),
  *Public* (`hospital`, `clinic`, `firestation`, `policestation`, `church`, `water_`), *Work*
  (`office_`, `warehouse_`, `construction`, `contruction`), *Trees & nature* (kind `tree`,
  `rocks_`, `weed_`, `flowers_`) and *Street* (everything else). Search is a case-insensitive
  match on the id with `_` read as a space. Characters and vehicles aren't in the catalog, so
  FR-007 holds by construction.
- **Rationale**: there's no hand-kept list to go stale. A new type added to `object-types.js`
  appears in the palette automatically.

## R12 — Images the editor needs

- **Decision**: the editor preloads every image a painted map could need, not only the current
  map's: all road pieces and bridge bodies (normal + damaged), every ground tile, every
  grass/dirt shoreline piece, and every object's normal and damaged picture. A new
  `MCW.terrainArt.allImagePaths()` lists the terrain ones, and object pictures come from
  `MCW.objectArt.ART`. That is about 300 files (≈ 30 road/bridge pieces, 5 ground tiles, 24 clean shoreline
  pieces, and ≈ 240 object pictures), loaded behind the existing progress bar. Palette
  thumbnails use the same loaded images.
- **Rationale**: without this, the first road piece of a new shape would show the magenta
  placeholder. Normal play still loads only its own map's images, so the 5-second load budget
  for players is unaffected.

## R13 — Map ids, copies and replacing an existing file

- **Decision**: a map id is 1–40 characters of `a-z`, `0-9` and `-`, starting with a letter.
  A copy of a registered map keeps the source's id and name by default, because a developer who
  edits `sample-city` usually wants a new `sample-city.js` to replace the old file. At export:
  - if the id equals the work's `sourceMapId`, the export panel says "Replaces
    `maps/<id>.js` — no new script line needed";
  - if the id belongs to a *different* registered map, it warns about the clash and suggests
    `<id>-2` (the spec's edge case);
  - otherwise it shows the new script line.

  Saved works are keyed by id, so renaming a work's id moves it to the new key.
- **Rationale**: this fits the main way the team will use the tool (improve the sample map and
  send it to a teammate) and still prevents accidental clashes.
- **Note**: this sharpens spec FR-018b. The clash warning applies to a different map with the
  same id, not to a copy that intentionally replaces its own source file.

## R14 — Undo history size and contents

- **Decision**: `EditHistory` keeps up to 200 entries (spec: at least 100) and drops the oldest
  past that. Entry kinds are `paint` (a list of `{col,row,before,after}`), `place` (the object
  spec), `remove` (the full specs of the objects removed by one eraser click or stroke, including
  id/named/access/variant), `variant`
  (`{id, before, after}`) and `reset` (the full before/after definition). Undo applies the
  inverse, and redo re-applies. A new change after an undo clears the redo stack. The session
  tracks `revision` against `savedRevision` to know whether there are unsaved changes, so
  undoing back to the saved state shows no unsaved changes.
- **Rationale**: plain data entries are easy to test, and memory stays small (a full-map
  paint on a 100×100 map is 10k small records at most).

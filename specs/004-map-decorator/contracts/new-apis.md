# Contract: New and changed code interfaces

Layer rules come from Constitution VII. "Port" means a plain object of functions that
`main.js` passes inward, as `selectionPort` does today.

## Domain

### `MCW.GameMap` (changed: `js/domain/game-map.js`)

```text
placeObject(spec) → object | false     // now emits objectchange {id, change:"placed"};
                                       // object.named = !!spec.id
removeObject(id)  → object | null      // frees footprint; emits objectchange {id, change:"removed"}
                                       //   and collisionchange for each footprint tile
setTerrain(col, row, terrainId)        // also: unknown=false, variant="normal";
                                       //   emits collisionchange when effective collision changes
setObjectVariant(id, v)                // unchanged; event payload gains change:"variant"
```

### `MCW.mapChecks(map) → Problem[]` (new: `js/domain/map-checks.js`)

This is the bridge check moved from `map-parser.js`, plus the object-on-water check (research
R5). `parseMap` now calls it and turns each problem into a warning, so its output is the same
as before.

### `MCW.serializeMap(map, { id, name }) → Definition` (new: `js/domain/map-serializer.js`)

The inverse of `parseMap` (research R7): default-legend terrain text, with objects sorted by
row then column.

## Application

### `MCW.palette` (new: `js/application/palette.js`)

```text
palette.pieces()            → Piece[]                 // all ground + object pieces (data-model)
palette.categories()        → string[]                // in display order
palette.search(pieces, q)   → Piece[]                 // case-insensitive, "_" read as space
```

### `MCW.EditHistory` (new: `js/application/edit-history.js`)

```text
new EditHistory({ limit = 200 })
push(change)                // drops oldest past limit; clears redo
undo() → change | null      // caller applies the inverse
redo() → change | null
canUndo(), canRedo()
clear()
```

### `MCW.EditorSession` (new: `js/application/editor-session.js`)

```text
new EditorSession({ map, work, start, store, registered })
    // map: GameMap; work: Work Meta (data-model); start: Definition for reset
    // store: Work Store port; registered: { has(id) → bool, get(id) → Definition }
on(evt, fn)                 // "change" (any edit/undo/redo), "dirty", "mode", "tool", "problems"

// tools
setTool(tool); tool

// painting (positions are fractional map coords)
beginStroke(pos); extendStroke(pos); endStroke()     // one paint Change per stroke
paintAt(col, row)                                     // single click = begin+end

// objects
checkPlacement(type, col, row) → Placement Check
place(type, col, row) → bool
eraseAt(col, row) → bool                              // within a stroke, adds to one remove Change
toggleVariant(objectId) → bool

// history
undo() → bool; redo() → bool; canUndo(); canRedo()

// work
isDirty() → bool
save() → { ok, reason? }                              // store.save(serializeMap(...)); FR-017, FR-020
reset()                                                // one undoable Change
rename(name, id) → { ok, error? }                     // id rule + uniqueness against the store
problems() → Problem[]                                 // refreshed on change
exportInfo() → { definition, fileName, scriptLine | null, replaces: bool,
                 clash: string | null, problems }     // research R13

// modes
testPlay(); backToEditor(); mode                      // research R2
```

The static helpers below are the chooser logic. They need no map instance and are pure, so
they can be tested.

```text
EditorSession.validateNewMap({ name, id, cols, rows }, existingIds) → { ok, errors: {field: msg} }
EditorSession.blankDefinition({ id, name, cols, rows }) → Definition    // all grass
EditorSession.checkImport(definition, { knownTerrain, knownTypes, workIds })
    → { ok, errors?, conflict? }                       // contract map-file.md "Import validation"
EditorSession.suggestId(name) → string; EditorSession.nextFreeId(id, takenIds) → string
```

## Adapters

### `MCW.Input` (changed: `js/adapters/input/input.js`)

```text
setTool(tool | null)
   // tool: { down(pos, tile), move(pos, tile), up(pos, tile), cancel() }
   // with a tool: left button → tool; right/middle button → pan; contextmenu suppressed
   // without a tool: unchanged behaviour (normal play never sets one)
```

Keyboard handlers return early when `document.activeElement` is an `input`, `textarea` or
`select`.

### `MCW.terrainArt.allImagePaths()` (changed: `js/adapters/art/terrain-art.js`)

Every terrain image that painting could need (research R12).

### `MCW.EditorOverlay` (new: `js/adapters/render/editor-overlay.js`)

It registers renderer overlays. During editing, it draws the brush highlight, the placement
preview (the object picture at 55 % opacity, drawn in the top overlay, plus footprint diamonds
tinted by Placement Check), and the eraser target outline. It draws nothing in testing mode.

### `MCW.EditorUI` (new: `js/adapters/ui/editor-ui.js`)

The DOM for the chooser, palette, top bar, info strip, export panel and prompts
(contract `editor-ui.md`). It turns pointer events into session calls through an `Input` tool,
and binds the editor keys. It also adds the `beforeunload` warning while
`session.isDirty()`. Styles go in `css/editor.css`. The markup is created by script, so
`index.html` only gains the stylesheet and script tags.

## Infrastructure

### `MCW.mapFile` (new: `js/infrastructure/map-file.js`)

```text
mapFile.format(definition, { cols, rows, date }) → string     // contract map-file.md "Export"
mapFile.read(text) → { ok, definition?, error? }               // literal-only reader; never evaluates
mapFile.scriptLine(id) → '<script src="maps/<id>.js"></script>'
```

It uses no DOM and no browser APIs, so the test page loads and tests it.

### `MCW.workStore` (new: `js/infrastructure/work-store.js`)

`localStorage` implementation of the Work Store port (research R8). It never throws.

### `MCW.fileIO` (new: `js/infrastructure/file-io.js`)

```text
fileIO.download(fileName, text)
fileIO.pickText({ accept: ".js", maxBytes: 1048576 }) → Promise<{ ok, text?, name?, reason? }>
```

## Composition root: `js/main.js` (changed)

- It reads `edit`, `work` and `map`. Without `edit=1`, boot is unchanged.
- With `edit=1`, it calls `startEditor()`, which creates `EditorUI` in chooser state and
  passes it `workStore`, `fileIO`, `mapFile` and a `registered` port built from `MCW.maps`.
  When a work is chosen, it parses the definition, loads `allImagePaths()` + all object
  pictures, then creates the Camera, Renderer, Input, DebugOverlay, `EditorSession`,
  `EditorOverlay` and the editor panels, and runs the same frame loop. It creates no MenuUI,
  rain or attract drift, and sets `game.menuOpen = () => false`.
- It adds `"terrainchange"` to the map events that request a redraw.
- It holds no editing rules. It only wires things together.

## Script order in `index.html` (inside-out)

```text
domain:      … game-map.js, map-checks.js, map-parser.js, map-serializer.js
application: … game-session.js, palette.js, edit-history.js, editor-session.js
adapters:    … input.js, menu.js, editor-overlay.js, editor-ui.js
infra:       assets.js, map-registry.js, map-file.js, work-store.js, file-io.js
maps, main.js
```

## Tests (`tests/index.html`)

It loads the new domain and application files plus `map-file.js`, and adds:
`domain/map-checks.test.js`, `domain/map-serializer.test.js`, more cases in
`domain/game-map.test.js`, `application/palette.test.js`, `application/edit-history.test.js`,
`application/editor-session.test.js` (with an in-memory store port), and
`infrastructure/map-file.test.js`. `architecture.test.js` gains the new names in `LAYERS`,
and still asserts that `assets`, `maps`, `workStore`, `fileIO` and the DOM adapters are not
loaded.

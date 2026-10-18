# Contract: New and Changed Internal APIs

Everything in feature 001's `contracts/map-api.md` and feature 002's
`contracts/ui-screens.md` keeps its names and behaviour. Changes are listed here.

## Domain

### `MCW.objectTypes` (new, `js/domain/object-types.js`)

| Member | Value |
|---|---|
| `TYPES[type]` | `{ kind: "building" \| "tree" \| "prop", size: {w, h}, hasDamaged: boolean }` — same type names and sizes as the old catalog |
| `collisionFor(kind)` | building/tree → `BLOCKED`, prop → `OPEN` (unchanged rule) |

### `GameMap` changes

| Member | Change |
|---|---|
| `artAt(col, row)` | **removed** (moved to `TerrainArt`) |
| `setTerrain(col, row, id)` | now also emits `terrainchange {col, row}` |
| `setObjectVariant(id, "damaged")` | checks `objectTypes.TYPES[type].hasDamaged` (same outcome as before) |
| all other members | unchanged |

## Application

### `MCW.GameSession` (new, `js/application/game-session.js`)

```text
new MCW.GameSession({
  screens,             // ScreenMachine
  camera,              // Camera (map size already set)
  cols, rows,          // map size
  startView,           // { zoom: number, center: {x, y} | null }
  selection            // port: { get() → {hovered, selected}, set({hovered, selected}) }
})
```

| Member | Behaviour |
|---|---|
| `applyStartView()` | zoom = `startView.zoom`, centre on `startView.center` or the map centre |
| `backgroundActive()` | `true` on `menu`, `credits`, and `howto` with `returnTo === "menu"` |
| `update(dtMs)` | when the background is active: drift clock += dt, zoom = `attract.ZOOM`, centre on `attract.positionAt(clock, cols, rows)`; returns `true`; otherwise `false` |
| `on("playstart", fn)` | fired on menu → playing (after the start view is applied) |
| reacts to `screens` `change` | menu→playing: `applyStartView()`, emit `playstart`; playing→paused: save `{wx, wy, zoom, hovered, selected}`; paused→playing: restore exactly, then `selection.set(saved)`; `toMenu`: discard, `selection.set({hovered:null, selected:null})`, drift clock = 0 |

The constructor also calls `applyStartView()` once (same as `main.js` did at startup).

## Adapters

### `MCW.objectArt` (new, `js/adapters/art/object-art.js`)

| Member | Value |
|---|---|
| `ART[type]` | `{ file, damagedFile? }` — paths relative to `Isometric City/` (unchanged values) |
| `pictureFor(object)` | `damagedFile` when `object.variant === "damaged"` and it exists, else `file` |

### `MCW.terrainArt` + `MCW.TerrainArt` (was `MCW.autotile`, `js/adapters/art/terrain-art.js`)

| Member | Value |
|---|---|
| `terrainArt.roadMask / roadPiece / bridgePiece / shorePiece / tileArt` | same rules and results as `MCW.autotile.*` |
| `terrainArt.collectImagePaths(map, art)` | same set as the old `MCW.collectImagePaths(map)` |
| `new TerrainArt(map)` | cache object |
| `TerrainArt#artAt(col, row)` | layers for the tile, cached; cache for the tile + 8 neighbours cleared on `terrainchange` / `tilechange` |

### Renderer

`new MCW.Renderer(canvas, map, camera, terrainArt)` — fourth argument added; draws terrain
with `terrainArt.artAt` and objects with `MCW.objectArt.pictureFor`.

## Composition root (`js/main.js`) responsibilities — only these

1. Read URL settings (`map`, `menu`, `zoom`, `center`, `dev`).
2. Look up and parse the map; show the error overlay on failure.
3. Load images (`collectImagePaths`) with the progress bar.
4. Create: Camera, TerrainArt, Renderer, Input, DebugOverlay, RainLayer, ScreenMachine,
   GameSession (with the selection port over Input), MenuUI; publish them on `MCW.game`.
5. Connect events (screen change → input enabled/reset, rain enabled, redraw; `playstart` →
   dev mode once if `?dev=1`; map changes → redraw; resize → renderer, camera, rain).
6. Start: `loaded()` (+ `play()` instantly for `?menu=0`), then the frame loop
   (`session.update`, rain, input, camera glide, debug tick, draw when dirty).

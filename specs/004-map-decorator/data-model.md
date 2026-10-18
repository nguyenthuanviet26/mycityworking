# Data Model: Map Decorator

Plain data used by the domain and application layers. Function signatures are in
`contracts/new-apis.md`. The file format is in `contracts/map-file.md`.

## Map Definition (existing, from `001`)

The shape `parseMap` reads. Saved works, exported files and imported files all use it.

| Field | Type | Rules |
|---|---|---|
| `id` | string | required; map id rule (below) |
| `name` | string | display name, 1–60 chars; defaults to `id` |
| `legend` | object | optional on input; never written by the editor (default legend only) |
| `terrain` | string | one line per row, one character per tile |
| `objects` | array of Object Entry | optional |

**Object Entry**: `{ type, at: [col, row], variant?: "damaged", id?: string, access?: [col, row] }`.

**Map id rule**: `^[a-z][a-z0-9-]{0,39}$`.

## GameMap changes (domain, existing entity)

| Addition | Meaning |
|---|---|
| object field `named: boolean` | `true` when the object was placed with an explicit `id`. Only named ids are written on export |
| `removeObject(id)` | frees the footprint and returns the removed object (or `null`) |
| event `objectchange` `{ id, change: "placed" \| "removed" \| "variant" }` | now fired on place and remove too |
| `setTerrain` side effects | clears `unknown`, resets the tile variant to `normal`, fires `terrainchange`, and also fires `collisionchange` `{col,row,before,after}` when the effective collision differs |

## Map Problem (domain, new)

Returned by `mapChecks(map)`: `{ code, col, row, message }`.

| `code` | When |
|---|---|
| `bridge-not-crossing` | a bridge isn't between road/bridge tiles on one axis |
| `object-on-water` | any footprint tile of an object is water |

## Palette Piece (application, new)

| Field | Type | Notes |
|---|---|---|
| `key` | string | `"terrain:road"` or `"object:hospital_a"` |
| `kind` | `"terrain"` \| `"object"` | |
| `id` | string | terrain id or object type |
| `label` | string | id with `_` → space |
| `category` | string | `Ground`, `Houses`, `Shops & food`, `Public`, `Work`, `Trees & nature`, `Street` (research R11) |
| `size` | `{w,h}` | `{1,1}` for terrain |
| `hasDamaged` | boolean | objects only |

## Tool (application, new)

`{ kind: "select" }`, `{ kind: "paint", terrain }`, `{ kind: "place", type }` or
`{ kind: "erase" }`. The default is `select`.

## Placement Check (application, new)

`checkPlacement(type, col, row)` returns `{ ok, tiles: [{col,row,inside,free}], reason? }`, where
`reason` is `"outside"` or `"occupied"`. The editor overlay uses `tiles` to tint each footprint
diamond green or red.

## Change (application, new): one undo history entry

| `kind` | Payload | Undo | Redo |
|---|---|---|---|
| `paint` | `tiles: [{col,row,before,after}]` (terrain ids) | set every `before` | set every `after` |
| `place` | `spec` (Object Entry plus the assigned `id`) | `removeObject(spec.id)` | `placeObject(spec)` |
| `remove` | `specs: [...]`, one per removed object (id, named, variant, access); an eraser click or drag stroke is one entry | `placeObject` each | `removeObject` each |
| `variant` | `{ id, before, after }` | set `before` | set `after` |
| `reset` | `{ before: Definition, after: Definition }` | rebuild the layout from `before` | rebuild from `after` |

`reset` rebuilds the layout in place on the same `GameMap`: it sets every tile's terrain,
removes all objects and places the definition's objects, because the map size never changes.

Rules: a change that alters nothing is not recorded. A stroke is one `paint` entry. The history
holds 200 entries (the oldest is dropped), and a new entry clears the redo stack.

## Edit History (application, new)

`{ undoStack: Change[], redoStack: Change[], limit: 200 }`, plus the session's revision counter
(below).

## Editor Session (application, new)

| Field | Type | Notes |
|---|---|---|
| `map` | GameMap | the live map being edited |
| `work` | Work Meta | identity of what is being edited |
| `tool` | Tool | |
| `mode` | `"editing"` \| `"testing"` | research R2 |
| `stroke` | `null` \| `{ tiles: Map<index,{before,after}>, last: {x,y} }` | open paint stroke |
| `history` | Edit History | |
| `revision` / `savedRevision` | integers | there are unsaved changes when they differ (also true for a never-saved work) |
| `everSaved` | boolean | false for a new blank map or a copy until its first save (FR-017b) |
| `problems` | Map Problem[] | refreshed after changes |
| `start` | Definition | the layout to return to on reset (FR-019): the source map's definition, or all grass |

**State transitions**

```text
             open(work)                 testPlay()
 (chooser) ────────────▶ editing ◀────────────────▶ testing
                           │  ▲          backToEditor() / Esc
       leave() with        │  │ cancel
       unsaved changes     ▼  │
                       confirm-leave ── save ──▶ (chooser)
                                     └ discard ─▶ (chooser)
```

- `revision` goes up by 1 on every recorded change, undo or redo. Undo moves it down
  and redo moves it back up. Saving sets `savedRevision = revision` and `everSaved = true`.
- The dirty state is `!everSaved || revision !== savedRevision`. Exception: a never-saved new
  map with zero changes isn't dirty, so leaving it discards it silently.

## Work Meta / Work in Progress (application shape, stored by infrastructure)

| Field | Type | Notes |
|---|---|---|
| `id` | string | map id rule; also the storage key |
| `name` | string | display name |
| `cols`, `rows` | integers | 5–100 for new maps; fixed |
| `sourceMapId` | string \| null | the registered map this work was copied from |
| `savedAt` | ISO date string | set by the store |
| `definition` | Map Definition | stored layout (`serializeMap` output) |

**Store index** (`localStorage["mcw.editor.index"]`): an array of Work Meta without
`definition`. **Entry** (`localStorage["mcw.editor.work.<id>"]`): `{ meta, definition }`.

## Work Store port (application ← infrastructure)

`{ list() → Meta[], load(id) → {ok, work?, reason?}, save(work) → {ok, reason?},
remove(id) → {ok, reason?} }`. It never throws.

## Map File (infrastructure)

The text form of a Map Definition (contract `contracts/map-file.md`).
`mapFile.format(def, info)` returns a string, and `mapFile.read(text)` returns
`{ ok, definition?, error? }`.

## Import Result (application)

`{ ok, work?, conflict?: "work-id-exists", errors?: string[] }`. The application checks size
limits (5..100 per side; imports accept 1..100 to allow `tiny`-style maps), unknown terrain
characters and unknown object types. Any of these rejects the file, and nothing is
created (FR-018d).

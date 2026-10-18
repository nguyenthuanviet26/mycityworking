# Data Model: Isometric Tile Map System

All entities live in `js/core/` as plain JavaScript objects with no DOM or canvas
references (Constitution III). Types below use JSDoc-style notation.

## TileAddress

| Field | Type | Rules |
|---|---|---|
| `col` | integer | `0 ≤ col < map.cols` |
| `row` | integer | `0 ≤ row < map.rows` |

- Linear index: `index = row * cols + col` (used for storage and overrides).
- Neighbours: `NE (0,−1)`, `SE (+1,0)`, `SW (0,+1)`, `NW (−1,0)`; corners `N (−1,−1)`,
  `E (+1,−1)`, `S (+1,+1)`, `W (−1,+1)`.

## MapPosition

| Field | Type | Rules |
|---|---|---|
| `x` | number | fractional column; may be outside the map (then "off map") |
| `y` | number | fractional row |

- Tile containing a position: `(floor(x), floor(y))`. Tile centre: `(col + 0.5, row + 0.5)`.

## TerrainType

| Field | Type | Notes |
|---|---|---|
| `id` | string | `grass`, `dirt`, `concrete`, `asphalt`, `water`, `road`, `bridge` |
| `collision` | Collision | default, see table below |
| `autotile` | `"road"` \| `"shore"` \| `"water"` \| `null` | which autotiling rule applies |
| `art` | object | base image key(s) per variant |

Default collision (FR-022):

| Terrain | foot | vehicle | cost |
|---|---|---|---|
| road, bridge | true | true | 1 |
| grass, dirt, concrete, asphalt | true | false | 1 |
| water | false | false | ∞ |

## Tile

| Field | Type | Notes |
|---|---|---|
| `terrain` | TerrainType id | from the map definition |
| `variant` | `"normal"` \| `"damaged"` | default `normal`; changeable at runtime (FR-009) |
| `objectId` | string \| null | the object covering this tile, if any |
| `art` | image key | **derived**: computed by autotiling from terrain + neighbours + variant; recomputed for the tile and its 8 neighbours when terrain or variant changes |

Storage: parallel typed arrays / plain arrays indexed by tile index, owned by `GameMap`.

## MapObject

| Field | Type | Rules |
|---|---|---|
| `id` | string | unique in the map; auto-generated `"obj-<n>"` if not given |
| `type` | string | key in the object catalog, e.g. `hospital_a`, `house_small_blue_a`, `tree_common_large`, `sign_caution_a` |
| `kind` | `"building"` \| `"tree"` \| `"prop"` | from the catalog; decides default collision |
| `anchor` | TileAddress | the **back** (north-most) tile of the footprint |
| `size` | `{w, h}` | footprint in tiles, from the catalog (1×1 or 2×2) |
| `variant` | `"normal"` \| `"damaged"` | runtime-changeable when the art has a damaged version |
| `collision` | Collision | building/tree: `{false,false,∞}`; prop: `{true,true,1}` |
| `access` | TileAddress \| null | optional; default rule in research R11 (provisional) |

Validation: footprint must be fully inside the map and not overlap another object's
footprint (later object is skipped and a warning is logged).

## Collision

| Field | Type | Notes |
|---|---|---|
| `foot` | boolean | passable on foot |
| `vehicle` | boolean | passable by vehicle |
| `cost` | number | ≥ 1, `Infinity` when impassable for both |

Combination: `combine(a, b) = { foot: a.foot && b.foot, vehicle: a.vehicle && b.vehicle, cost: max(a.cost, b.cost) }`.
Effective = `combine(terrain, object?, override?)`.

## CollisionOverride

Sparse map `tileIndex → Collision`. Set with `setOverride(addr, partialCollision)` (missing
fields are taken as non-restrictive: `true`, `true`, `1`); cleared with `clearOverride(addr)`.
Each change emits `collisionchange { col, row, before, after }`.

## Camera

| Field | Type | Rules |
|---|---|---|
| `wx`, `wy` | number | world-pixel point at the screen centre |
| `zoom` | number | clamped to `[minZoom, maxZoom]` = `[0.5, 2]` |
| `viewW`, `viewH` | number | viewport size in CSS px |
| `bounds` | `{minX, minY, maxX, maxY}` | world box of the map plus 64 px margin |

Invariant (after every change): the viewport lies within `bounds` on each axis, or is centred
on `bounds` on an axis where `bounds` is smaller than the viewport.

## MapDefinition (input)

See [contracts/map-definition.md](./contracts/map-definition.md). Parsed into a `GameMap`
by `MCW.parseMap(def)` → `{ map, warnings[] }`.

## Selection / hover state (UI state, not saved)

| Field | Type |
|---|---|
| `hovered` | TileAddress \| null |
| `selected` | TileAddress \| null |
| `devMode` | boolean |
| `markers` | MapPosition[] (developer test markers) |

## State transitions

- **Tile variant**: `normal ⇄ damaged` via `setTileVariant`; triggers art recompute and redraw.
- **Object variant**: `normal ⇄ damaged` via `setObjectVariant`.
- **Collision override**: `none → set → cleared`; each transition emits `collisionchange`.

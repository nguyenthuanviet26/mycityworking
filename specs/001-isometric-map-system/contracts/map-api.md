# Contract: Map API for Future Features

This is the interface later features (characters, routing, incidents, weather) use. Everything
is reachable from the global namespace `MCW`. Functions under `MCW.iso`, `MCW.camera` and the
`GameMap` methods are pure logic (no DOM) and are covered by unit tests.

## Coordinates — `MCW.iso`

| Function | Returns | Notes |
|---|---|---|
| `mapToWorld(x, y)` | `{wx, wy}` | world pixels at zoom 1 |
| `worldToMap(wx, wy)` | `{x, y}` | exact inverse |
| `tileOf(x, y)` | `{col, row}` | `floor` of a map position |
| `tileCenter(col, row)` | `{x, y}` | `(col+0.5, row+0.5)` |
| `DIRS` | `{NE:[0,-1], SE:[1,0], SW:[0,1], NW:[-1,0]}` | `[dCol, dRow]` |
| `depthKey(x, y)` | number | `x + y`, for sorting characters with objects |

## Map — `GameMap` instance (`MCW.game.map`)

| Member | Returns / effect |
|---|---|
| `cols`, `rows` | map size |
| `inBounds(col, row)` | boolean |
| `getTile(col, row)` | `{ col, row, terrain, variant, objectId }` or `null` if out of bounds |
| `getObject(id)` / `objectAt(col, row)` | MapObject or `null` |
| `objects()` | array of all MapObjects |
| `collisionAt(col, row)` | effective `{foot, vehicle, cost}`; out of bounds → `{false,false,Infinity}` |
| `isPassable(col, row, mode)` | `mode` = `"foot"` \| `"vehicle"` |
| `neighbors(col, row, mode)` | array of `{col, row, dir, cost}` for passable 4-neighbours |
| `setOverride(col, row, partial)` | sets runtime collision override; emits `collisionchange` |
| `clearOverride(col, row)` | removes override; emits `collisionchange` |
| `setTileVariant(col, row, variant)` | `"normal"`/`"damaged"`; emits `tilechange` |
| `setObjectVariant(id, variant)` | emits `objectchange` |
| `on(event, handler)` / `off(event, handler)` | events: `collisionchange`, `tilechange`, `objectchange` |

Event payloads:
- `collisionchange`: `{ col, row, before: Collision, after: Collision }`
- `tilechange`: `{ col, row, variant }`
- `objectchange`: `{ id, variant }`

## Camera — `MCW.game.camera`

| Member | Effect |
|---|---|
| `screenToMap(sx, sy)` | `{x, y}` map position under a screen point |
| `mapToScreen(x, y)` | `{sx, sy}` |
| `tileAtScreen(sx, sy)` | `{col, row}` or `null` if outside the map |
| `panBy(dsx, dsy)` | move by screen pixels (clamped) |
| `zoomAt(factor, sx, sy)` | zoom keeping screen point fixed (clamped) |
| `centerOn(x, y, {smooth})` | centre on a map position |
| `zoom`, `minZoom`, `maxZoom` | read-only state |

## Rendering hooks — `MCW.game.renderer`

| Member | Effect |
|---|---|
| `addDrawable(d)` / `removeDrawable(d)` | `d = { x, y, draw(ctx, sx, sy, zoom) }`; drawn in pass 2 sorted by `depthKey(x, y)` with objects. This is how future characters appear. |
| `requestRedraw()` | marks the frame dirty |

## Selection — `MCW.game.input`

| Member | Effect |
|---|---|
| `on("tilehover", h)` | `h({col, row} \| null)` |
| `on("tileselect", h)` | `h({col, row})` on click without drag |

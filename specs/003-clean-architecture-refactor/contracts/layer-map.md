# Contract: Layer Map

## Layers and allowed dependencies

| Layer | Folder | May use |
|---|---|---|
| domain | `js/domain/` | `MCW` namespace + other domain files only |
| application | `js/application/` | domain |
| adapters | `js/adapters/` | application, domain, other adapters, browser APIs |
| infrastructure | `js/infrastructure/` | application, domain, browser APIs |
| composition root | `js/main.js` | everything (wiring only) |

## File moves (old → new)

| Old | New | Layer | Change |
|---|---|---|---|
| `js/core/namespace.js` | `js/domain/namespace.js` | domain | move only |
| `js/core/iso.js` | `js/domain/iso.js` | domain | move only |
| `js/core/terrain.js` | `js/domain/terrain.js` | domain | move only |
| `js/core/collision.js` | `js/domain/collision.js` | domain | move only |
| `js/core/catalog.js` | `js/domain/object-types.js` | domain | rules only: `{kind, size, hasDamaged}` + `collisionFor` |
| `js/core/catalog.js` | `js/adapters/art/object-art.js` | adapters | pictures only: `{file, damagedFile?}` |
| `js/core/game-map.js` | `js/domain/game-map.js` | domain | remove art cache; use `objectTypes`; emit `terrainchange` |
| `js/core/map-parser.js` | `js/domain/map-parser.js` | domain | use `objectTypes` |
| `js/core/camera.js` | `js/application/camera.js` | application | move only |
| `js/core/screens.js` | `js/application/screens.js` | application | move only |
| `js/core/attract.js` | `js/application/attract.js` | application | move only |
| `js/core/rain.js` | `js/application/rain.js` | application | move only |
| `js/main.js` (flow parts) | `js/application/game-session.js` | application | **new**: start view, pause/resume view, drift control |
| `js/core/autotile.js` | `js/adapters/art/terrain-art.js` | adapters | same rules; adds `TerrainArt` cache; `collectImagePaths` |
| `js/render/renderer.js` | `js/adapters/render/renderer.js` | adapters | uses `terrainArt.artAt`, `objectArt` |
| `js/render/debug-overlay.js` | `js/adapters/render/debug-overlay.js` | adapters | move only |
| `js/render/rain-layer.js` | `js/adapters/render/rain-layer.js` | adapters | move only |
| `js/input/input.js` | `js/adapters/input/input.js` | adapters | move only |
| `js/ui/menu.js` | `js/adapters/ui/menu.js` | adapters | move only |
| `js/render/assets.js` | `js/infrastructure/assets.js` | infrastructure | move only |
| `js/maps/registry.js` | `js/infrastructure/map-registry.js` | infrastructure | move only |
| `js/main.js` | `js/main.js` | composition root | wiring only (flow moved out) |
| `maps/*.js` | `maps/*.js` | content | unchanged |

Old folders `js/core/`, `js/render/`, `js/input/`, `js/ui/`, `js/maps/` are removed once empty.

## Script order (`index.html`)

1. domain: `namespace`, `iso`, `terrain`, `collision`, `object-types`, `game-map`, `map-parser`
2. application: `camera`, `screens`, `attract`, `rain`, `game-session`
3. adapters: `art/object-art`, `art/terrain-art`, `render/renderer`, `render/debug-overlay`,
   `render/rain-layer`, `input/input`, `ui/menu`
4. infrastructure: `assets`, `map-registry`
5. content: `maps/sample-city`, `maps/tiny`, `maps/big`
6. `js/main.js`

`tests/index.html` loads groups 1, 2 and only `art/object-art` + `art/terrain-art` from group 3,
then the harness and tests.

## Forbidden references (checked by `tests/architecture.test.js`)

| In | Must not mention |
|---|---|
| domain | `document`, `window`, `canvas`, `getContext`, `Image(`, `.png`, `setTimeout`, `requestAnimationFrame`, `performance`; any application, adapter or infrastructure export |
| application | the same browser tokens; any adapter or infrastructure export |

Exports by layer (used by the check):

- domain: `iso`, `terrain`, `collision`, `objectTypes`, `GameMap`, `parseMap`, `createEmitter`
- application: `Camera`, `ScreenMachine`, `attract`, `rain`, `GameSession`
- adapters: `objectArt`, `terrainArt`, `TerrainArt`, `Renderer`, `DebugOverlay`, `RainLayer`, `Input`, `MenuUI`
- infrastructure: `assets`, `maps`

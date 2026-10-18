# Phase 0 Research: Clean Architecture Refactor

The spec has no open questions. These are the design decisions for moving ~2,000 lines into
the four layers of Constitution Principle VII without changing behaviour.

## R1. Where every file goes

- **Decision**: See [contracts/layer-map.md](./contracts/layer-map.md) for the full old → new
  table. In short:
  - **domain** (`js/domain/`): `namespace.js`, `iso.js`, `terrain.js`, `collision.js`,
    `object-types.js` (rules half of `catalog.js`), `game-map.js` (without art), `map-parser.js`.
  - **application** (`js/application/`): `camera.js`, `screens.js`, `attract.js`, `rain.js`,
    and a new `game-session.js` holding the flow taken out of `main.js`.
  - **adapters** (`js/adapters/`): `art/terrain-art.js` (was `autotile.js`, plus the art cache
    that was inside the map), `art/object-art.js` (pictures half of `catalog.js`),
    `render/renderer.js`, `render/debug-overlay.js`, `render/rain-layer.js`, `input/input.js`,
    `ui/menu.js`.
  - **infrastructure** (`js/infrastructure/`): `assets.js` (image loader), `map-registry.js`.
  - Map definition files stay in `maps/` (content, not code; format unchanged).
  - `js/main.js` stays as the composition root.
- **Rationale**: Follows the constitution's layer table exactly. The camera and rain
  simulation are application code: they hold view and effect *state* with pure maths and no
  DOM, used by both the session flow and the adapters.
- **Alternatives considered**: Camera in adapters (it's DOM-free and the session's
  pause/restore needs it, so application fits better); rain simulation in adapters (it is
  pure and already unit-tested; only its drawing is an adapter).

## R2. The shared namespace

- **Decision**: `namespace.js` (the `MCW` object and `createEmitter`) is the innermost file
  and lives in `js/domain/`. Every layer may use it. It's the only "global" any domain file
  touches (`window.MCW`), which Principle VII explicitly allows.
- **Rationale**: Without a module system (Constitution VI), one shared namespace is how files
  find each other; it contains no game rules and no browser access.

## R3. Taking pictures out of the map (violation 1)

- **Decision**:
  - `GameMap` loses `_art`, `artAt` and `_invalidateArt`. Instead it emits a new
    `terrainchange {col, row}` event from `setTerrain` (in addition to the existing
    `tilechange` for variants). It already exposes everything art needs: `terrain[]`,
    `variant[]`, `inBounds`, `index`, `objects()`.
  - New adapter `MCW.TerrainArt(map)` owns the per-tile picture cache: `artAt(col, row)`
    computes via the road/shore/bridge rules (moved verbatim from `autotile.js`) and caches;
    it listens to `terrainchange` and `tilechange` and clears the tile and its 8 neighbours,
    exactly as the map did before.
  - `catalog.js` is split by a regeneration of the same data:
    - domain `MCW.objectTypes.TYPES[type] = { kind, size: {w,h}, hasDamaged }` and
      `collisionFor(kind)`;
    - adapter `MCW.objectArt.ART[type] = { file, damagedFile? }`.
    `GameMap.setObjectVariant` checks `hasDamaged` instead of `damagedFile` — same result.
  - `collectImagePaths(map)` moves to the art adapter as `MCW.terrainArt.collectImagePaths(map, terrainArt)`.
- **Rationale**: The map answers "what is here" (terrain, variant, neighbours); the adapter
  answers "which picture shows it". The domain asks nothing of the outside.
- **Consistency guard**: an adapter test checks that `objectTypes` and `objectArt` list the
  same types and that `hasDamaged` is true exactly when `damagedFile` exists.

## R4. Taking flow out of `main.js` (violation 2)

- **Decision**: New application object `MCW.GameSession({ screens, camera, cols, rows,
  startView, selection })`:
  - `startView` = `{ zoom, center: {x, y} | null }` read from the URL by `main.js`.
  - `selection` is a small **port** supplied by `main.js`:
    `{ get() → {hovered, selected}, set({hovered, selected}) }`, implemented over the input
    adapter. This keeps the application layer free of adapter references (dependency
    inversion).
  - It listens to `screens` `change` and does what `main.js` did: on menu → playing apply the
    start view and emit `playstart`; on playing → paused save `{wx, wy, zoom, hovered,
    selected}`; on paused → playing restore it; on `toMenu` discard it, clear selection
    (`selection.set({hovered: null, selected: null})`), reset the drift clock.
  - `backgroundActive()` → true on `menu`, `credits`, and `howto` opened from the menu.
  - `update(dtMs)` → when the background is active, advances the drift clock, sets zoom
    `MCW.attract.ZOOM`, centres the camera on `MCW.attract.positionAt(...)`, returns `true`.
- `main.js` keeps only: read URL settings, load map + images, create objects, connect events
  (`screens change → input.enabled / input.reset / rainLayer.enabled = session.backgroundActive() /
  redraw`, `session playstart → dev mode if ?dev=1`, resize forwarding), run the frame loop.
- **Rationale**: Every "decision" moves to the application layer and gains unit tests
  (spec US3); `main.js` becomes wiring only (SC-005: ≥ 30% shorter than 155 lines).

## R5. Proving the dependency rule on the test page

- **Decision**: Two complementary checks, both running over `file://` with no install:
  1. **Load isolation**: `tests/index.html` loads only `js/domain/*`, `js/application/*` and
     the DOM-free art adapters (`terrain-art.js`, `object-art.js`). If an inner file referenced
     an outer object at load or call time, its tests would throw.
  2. **Source scan** (`tests/architecture.test.js`): for each layer, collect the source text
     of every function reachable from that layer's exports (`Function.prototype.toString` on
     functions and prototype methods). Fail if a domain function mentions any of
     `document`, `window` (the `(window.MCW)` IIFE wrapper is outside the scanned function
     bodies, so it doesn't count), `canvas`, `getContext`, `Image(`, `.png`, `setTimeout`, `requestAnimationFrame`, `performance`, or an
     application/adapter/infrastructure export name (`MCW.Camera`, `MCW.ScreenMachine`,
     `MCW.GameSession`, `MCW.attract`, `MCW.rain`, `MCW.TerrainArt`, `MCW.terrainArt`,
     `MCW.objectArt`, `MCW.Renderer`, `MCW.Input`, `MCW.MenuUI`, `MCW.RainLayer`,
     `MCW.DebugOverlay`, `MCW.assets`, `MCW.maps`). Application functions are scanned for the
     same browser tokens and for adapter/infrastructure names.
- **Rationale**: `fetch` of source files is blocked over `file://`, but function source text
  is always available in the page. The list of exports per layer lives in the test.
- **Alternatives considered**: A Node script scanning files (needs a tool to be run —
  against the "nothing to install or run" spirit); manual review only (not repeatable).

## R6. Test reorganisation

- **Decision**: `tests/` mirrors the layers: `tests/domain/` (iso, map-parser, game-map),
  `tests/application/` (camera, screens, attract, rain, game-session — new),
  `tests/adapters/` (terrain-art — was autotile; object-art — new consistency test),
  `tests/architecture.test.js`. Two existing tests that read pictures through the map
  (`game-map › variants › setTileVariant ... changes art`, `autotile › roadMask reads
  neighbours` / `bridge orientation` / `collectImagePaths`) keep the same names and checks but
  ask `TerrainArt` instead of `map.artAt`. The total of pre-existing tests stays 70.
- **Rationale**: FR-002 (no test deleted or weakened) and FR-015 (test page loads no drawing code).

## R7. Script loading order

- **Decision**: `index.html` and `tests/index.html` load inside-out: domain → application →
  adapters (art first) → infrastructure → map files → `main.js`. Infrastructure is loaded
  after adapters only because `maps/*.js` need the registry before they run; nothing in
  adapters needs infrastructure at load time.
- **Rationale**: Classic scripts run in order; inner layers must exist first.

## R8. Proving "no behaviour change"

- **Decision**: Before touching code, capture a baseline (see quickstart):
  - unit test result (70/70);
  - screenshots: menu at 1600×1000 (`index.html`), map at `?menu=0&zoom=0.5|1|2&center=16,16`,
    and `?map=big&menu=0&zoom=0.5`;
  - draw time on `?map=big&menu=0&zoom=0.5` (3.25 ms baseline from feature 001, re-measured).
  After the refactor, the map screenshots are compared pixel by pixel (they are static; the
  menu one is compared visually because rain and drift move).
- **Rationale**: SC-003 and SC-006 need a before/after on the same machine.

## R9. Order of work (keep the game playable at every step)

- **Decision**: Move in small steps, each ending with the test page green and the game
  starting: (1) baseline; (2) create folders and move files unchanged + update both
  `index.html` files; (3) split the catalog; (4) move art out of the map; (5) add
  `GameSession` and shrink `main.js`; (6) reorganise tests + architecture test;
  (7) compare baseline, update docs.
- **Rationale**: Constitution I (always playable) and easy rollback if a step breaks.
